const test=require("node:test");
const assert=require("node:assert/strict");
const {BookingService}=require("../dist/booking/booking.service");
const {BookingController}=require("../dist/booking/booking.controller");
const GUID=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const actor={tenantId:GUID(1),accountId:GUID(2),sessionVersion:1,mustChangePassword:false,username:"ci"};
const token="A".repeat(43);
const good={customerId:GUID(5),offeringId:GUID(6),resourceId:GUID(7),
 startsAtUtc:"2027-01-01T12:00:00.000Z"};
function on(fn){const old={};for(const [k,v] of Object.entries(fn)){
 old[k]=process.env[k];process.env[k]=v;
}return ()=>{for(const [k,v] of Object.entries(old)){
 if(v===undefined)delete process.env[k];else process.env[k]=v;
}};}

test("Booking disabled by default, no database touched",async()=>{
 const old=process.env.DRVO_BOOKING_ENABLED;
 try{
  delete process.env.DRVO_BOOKING_ENABLED;
  const service=new BookingService({getInternalPool(){throw Error("database access must not occur");}});
  await assert.rejects(()=>service.list(actor,token,GUID(3),GUID(4)),e=>e.getStatus?.()===503);
  await assert.rejects(()=>service.addResource(actor,token,GUID(3),GUID(4),GUID(8),
    {displayName:"Chair",kind:"CHAIR"}),e=>e.getStatus?.()===503);
 }finally{if(old===undefined)delete process.env.DRVO_BOOKING_ENABLED;
 else process.env.DRVO_BOOKING_ENABLED=old;}
});

test("Booking rejects injected scope, invalid resource, date and unknown fields before SQL",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const svc=new BookingService({getInternalPool(){throw Error("database access must not occur");}});
  for(const a of [{...actor,mustChangePassword:true},{...actor,tenantId:"spoof"},
    {...actor,sessionVersion:0}]){
   await assert.rejects(()=>svc.list(a,token,GUID(3),GUID(4)),e=>e.getStatus?.()===404);
  }
  await assert.rejects(()=>svc.list(actor,"invalid",GUID(3),GUID(4)),e=>e.getStatus?.()===404);
  for(const d of [
   {displayName:"",kind:"CHAIR"},{displayName:" Chair",kind:"CHAIR"},
   {displayName:"Chair",kind:"CHAIR",tenantId:GUID(1)},
   {displayName:"Chair",kind:"UNREVIEWED"},{displayName:"Z".repeat(101),kind:"PERSON"},
  ])await assert.rejects(()=>svc.addResource(actor,token,GUID(3),GUID(4),GUID(8),d),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.addResource(actor,token,GUID(3),GUID(4),"no-guid",
    {displayName:"Chair",kind:"CHAIR"}),e=>e.getStatus?.()===400);
  for(const d of [
   {...good,tenantId:GUID(1)},{...good,customerId:"invalid"},
   {...good,resourceId:"invalid"},{...good,startsAtUtc:"2027-01-01T12:00:01.000Z"},
   {...good,startsAtUtc:"2027-01-01T12:00:00+00:00"},
   {...good,startsAtUtc:"2027-02-29T12:00:00.000Z"},
  ])await assert.rejects(()=>svc.addAppointment(actor,token,GUID(3),GUID(4),GUID(8),d),
    e=>e.getStatus?.()===400);
 }finally{restore();}
});

test("Booking controller denies forged Origin before loading actor or invoking SQL",async()=>{
 const restore=on({
  DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES",
  DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com",
 });
 try{
  const controller=new BookingController(
   {actorFromToken(){throw Error("must not authorize");}},
   {addResource(){throw Error("must not execute");}},
  );
  await assert.rejects(()=>controller.addResource("https://malicious.example",GUID(8),
    {headers:{}},{setHeader(){}},GUID(3),GUID(4),{displayName:"Chair",kind:"CHAIR"}),
    e=>e.getStatus?.()===401);
 }finally{restore();}
});

test("status lifecycle rejects forged scope/fields before SQL",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const svc=new BookingService({getInternalPool(){throw Error("DB must not be used");}});
  const book=GUID(13),id=GUID(14);
  for(const body of [
   {status:"POSTED"},{status:"BOOKED"},{status:"no_show"},{status:"CANCELLED",tenantId:GUID(1)},
   {status:"COMPLETED",posted:true},{},{status:null},
  ])await assert.rejects(()=>svc.changeAppointmentStatus(
   actor,token,GUID(3),GUID(4),id,book,body),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.changeAppointmentStatus(actor,"bad",GUID(3),
    GUID(4),id,book,{status:"CANCELLED"}),e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.changeAppointmentStatus(actor,token,GUID(3),
    GUID(4),"bad",book,{status:"CANCELLED"}),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.changeAppointmentStatus(actor,token,GUID(3),
    GUID(4),id,"other", {status:"CANCELLED"}),e=>e.getStatus?.()===400);
 }finally{restore();}
});

test("status change endpoint rejects foreign Origin before auth",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES",
  DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com"});
 try{
  const controller=new BookingController(
    {actorFromToken(){throw Error("must not authenticate");}},
    {changeAppointmentStatus(){throw Error("must not update");}},
  );
  await assert.rejects(()=>controller.changeStatus(
   "https://malicious.invalid",GUID(8),{headers:{}},{setHeader(){}},
   GUID(3),GUID(4),GUID(5),{status:"CANCELLED"}),e=>e.getStatus?.()===401);
 }finally{restore();}
});


test("dated availability rejects unknown fields and invalid UTC windows before SQL",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const svc=new BookingService({getInternalPool(){throw Error("no SQL");}});
  const start="2027-02-01T08:00:00.000Z";
  for(const body of [
   {resourceId:GUID(7),startsAtUtc:start,endsAtUtc:start},
   {resourceId:GUID(7),startsAtUtc:start,endsAtUtc:"2027-02-03T08:00:00.000Z"},
   {resourceId:GUID(7),startsAtUtc:start,endsAtUtc:"not-a-date"},
   {resourceId:"bad",startsAtUtc:start,endsAtUtc:"2027-02-01T09:00:00.000Z"},
   {resourceId:GUID(7),startsAtUtc:start,endsAtUtc:"2027-02-01T09:00:00.000Z",tenantId:GUID(1)},
  ])await assert.rejects(()=>svc.addWindow(actor,token,GUID(3),GUID(4),
   GUID(8),body),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.listWindows(actor,"wrong",GUID(3),GUID(4)),
   e=>e.getStatus?.()===404);
 }finally{restore();}
});
test("window creation rejects forged Origin before reading K5 session",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES",
  DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com"});
 try{
  const controller=new BookingController(
   {actorFromToken(){throw Error("should not authorize");}},
   {addWindow(){throw Error("should not mutate");}},
  );
  await assert.rejects(()=>controller.addWindow(
   "https://attacker.invalid",GUID(8),{headers:{}},{setHeader(){}},
   GUID(3),GUID(4),{
    resourceId:GUID(7),startsAtUtc:"2027-02-01T08:00:00.000Z",
    endsAtUtc:"2027-02-01T09:00:00.000Z",
   }),e=>e.getStatus?.()===401);
 }finally{restore();}
});


test("window closure rejects forged body, invalid IDs and token before touching SQL",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const svc=new BookingService({getInternalPool(){throw Error("no DB call allowed");}});
  for(const body of [{tenantId:GUID(1)},null,{status:"CLOSED"},{windowId:GUID(2)}])
   await assert.rejects(()=>svc.closeWindow(actor,token,GUID(3),GUID(4),
    GUID(5),GUID(6),body),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.closeWindow(actor,token,GUID(3),GUID(4),
   "not-uuid",GUID(6),{}),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.closeWindow(actor,token,GUID(3),GUID(4),
   GUID(5),"not-uuid",{}),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.closeWindow(actor,"bad",GUID(3),GUID(4),
   GUID(5),GUID(6),{}),e=>e.getStatus?.()===404);
 }finally{restore();}
});
test("window close endpoint rejects forged Origin before identity lookup",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES",
  DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com"});
 try{
  const controller=new BookingController(
    {actorFromToken(){throw Error("should not access identity");}},
    {closeWindow(){throw Error("should not write SQL");}},
  );
  await assert.rejects(()=>controller.closeWindow(
   "https://attacker.invalid",GUID(5),{headers:{}},{setHeader(){}},
   GUID(3),GUID(4),GUID(6),{}),e=>e.getStatus?.()===401);
 }finally{restore();}
});

// ---- BK-06 / SQL033 reschedule + validate-move ----
const move={resourceId:GUID(7),startsAtUtc:"2027-03-01T12:00:00.000Z"};
function fakePool(handler){
 const calls=[];
 return {calls,getInternalPool(){return {request(){
  const inputs={};
  const req={input(name,_type,value){inputs[name]=value;return req;},
   async execute(procedure){calls.push({procedure,inputs});return handler(procedure,inputs);}};
  return req;
 }};}};
}
test("reschedule/validate-move reject forged fields, ids, token and bad starts before SQL",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const svc=new BookingService({getInternalPool(){throw Error("no SQL");}});
  const bad=[
   {...move,tenantId:GUID(1)},{...move,businessId:GUID(3)},{...move,branchId:GUID(4)},
   {...move,status:"CANCELLED"},{resourceId:GUID(7)},{startsAtUtc:move.startsAtUtc},
   {...move,resourceId:"invalid"},{...move,startsAtUtc:"2027-03-01T12:00:30.000Z"},
   {...move,startsAtUtc:"2027-03-01T12:00:00+00:00"},
   {...move,startsAtUtc:"2027-02-30T12:00:00.000Z"},null,[],"x",
  ];
  for(const body of bad){
   await assert.rejects(()=>svc.reschedule(actor,token,GUID(3),GUID(4),GUID(8),GUID(9),body),
    e=>e.getStatus?.()===400,JSON.stringify(body));
   await assert.rejects(()=>svc.validateMove(actor,token,GUID(3),GUID(4),GUID(9),body),
    e=>e.getStatus?.()===400,JSON.stringify(body));
  }
  await assert.rejects(()=>svc.reschedule(actor,token,GUID(3),GUID(4),"no-guid",GUID(9),move),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.reschedule(actor,token,GUID(3),GUID(4),undefined,GUID(9),move),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.reschedule(actor,token,GUID(3),GUID(4),GUID(8),"bad",move),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.validateMove(actor,token,GUID(3),GUID(4),"bad",move),
   e=>e.getStatus?.()===400);
  for(const a of [{...actor,tenantId:"spoof"},{...actor,mustChangePassword:true},
   {...actor,sessionVersion:0}]){
   await assert.rejects(()=>svc.reschedule(a,token,GUID(3),GUID(4),GUID(8),GUID(9),move),
    e=>e.getStatus?.()===404);
   await assert.rejects(()=>svc.validateMove(a,token,GUID(3),GUID(4),GUID(9),move),
    e=>e.getStatus?.()===404);
  }
  await assert.rejects(()=>svc.reschedule(actor,"bad",GUID(3),GUID(4),GUID(8),GUID(9),move),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.reschedule(actor,token,"spoof",GUID(4),GUID(8),GUID(9),move),
   e=>e.getStatus?.()===404);
 }finally{restore();}
});

test("reschedule disabled by default and never touches the database",async()=>{
 const old=process.env.DRVO_BOOKING_ENABLED;
 try{
  delete process.env.DRVO_BOOKING_ENABLED;
  const svc=new BookingService({getInternalPool(){throw Error("no SQL");}});
  await assert.rejects(()=>svc.reschedule(actor,token,GUID(3),GUID(4),GUID(8),GUID(9),move),
   e=>e.getStatus?.()===503);
  await assert.rejects(()=>svc.validateMove(actor,token,GUID(3),GUID(4),GUID(9),move),
   e=>e.getStatus?.()===503);
 }finally{if(old===undefined)delete process.env.DRVO_BOOKING_ENABLED;
 else process.env.DRVO_BOOKING_ENABLED=old;}
});

test("reschedule binds Tenant/Business/Branch/Account from session+path only and calls SQL033 proc",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const row={id:GUID(9),resourceId:GUID(7),startsAtUtc:new Date(move.startsAtUtc),
   endsAtUtc:new Date("2027-03-01T12:30:00.000Z"),changed:true,validateOnly:false};
  const pool=fakePool(()=>({recordset:[row]}));
  const svc=new BookingService(pool);
  const done=await svc.reschedule(actor,token,GUID(3),GUID(4),GUID(8),GUID(9),move);
  assert.deepEqual(done,{id:GUID(9),resourceId:GUID(7),startsAtUtc:move.startsAtUtc,
   endsAtUtc:"2027-03-01T12:30:00.000Z",changed:true,validateOnly:false});
  const c=pool.calls[0];
  assert.equal(c.procedure,"core.RescheduleBookingAppointment");
  assert.equal(c.inputs.TenantId,actor.tenantId);
  assert.equal(c.inputs.BusinessId,GUID(3));
  assert.equal(c.inputs.BranchId,GUID(4));
  assert.equal(c.inputs.AccountId,actor.accountId);
  assert.equal(c.inputs.ClientRequestId,GUID(8));
  assert.equal(c.inputs.BookingId,GUID(9));
  assert.equal(c.inputs.Validate,false);
  assert.match(c.inputs.TokenHash,/^[0-9a-f]{64}$/);
  const v=await new BookingService(fakePool(()=>({recordset:[{...row,changed:false,validateOnly:true}]})))
   .validateMove(actor,token,GUID(3),GUID(4),GUID(9),move);
  assert.equal(v.validateOnly,true);assert.equal(v.changed,false);
  const vpool=fakePool(()=>({recordset:[{...row,changed:false,validateOnly:true}]}));
  await new BookingService(vpool).validateMove(actor,token,GUID(3),GUID(4),GUID(9),move);
  assert.equal(vpool.calls[0].inputs.Validate,true);
  assert.equal(vpool.calls[0].inputs.ClientRequestId,null);
  // An empty recordset is a failure, never a fabricated success.
  await assert.rejects(()=>new BookingService(fakePool(()=>({recordset:[]})))
   .reschedule(actor,token,GUID(3),GUID(4),GUID(8),GUID(9),move),e=>e.getStatus?.()===503);
 }finally{restore();}
});

test("reschedule maps SQL guard errors: conflict/availability/queue=409, not found/denied=404",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const expected={51151:404,51152:409,51153:409,51154:400,51155:409,51156:404,51157:409,51158:409,1205:503};
  for(const [number,status] of Object.entries(expected)){
   const svc=new BookingService(fakePool(()=>{throw Object.assign(Error("sql"),{number:Number(number)});}));
   await assert.rejects(()=>svc.reschedule(actor,token,GUID(3),GUID(4),GUID(8),GUID(9),move),
    e=>e.getStatus?.()===status,"reschedule "+number);
   await assert.rejects(()=>svc.validateMove(actor,token,GUID(3),GUID(4),GUID(9),move),
    e=>e.getStatus?.()===status,"validate "+number);
  }
 }finally{restore();}
});

test("reschedule and validate-move endpoints reject foreign Origin before identity lookup",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES",
  DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com"});
 try{
  const controller=new BookingController(
   {actorFromToken(){throw Error("must not authenticate");}},
   {reschedule(){throw Error("must not write");},validateMove(){throw Error("must not read");}},
  );
  await assert.rejects(()=>controller.reschedule("https://attacker.invalid",GUID(8),
   {headers:{}},{setHeader(){}},GUID(3),GUID(4),GUID(9),move),e=>e.getStatus?.()===401);
  await assert.rejects(()=>controller.validateMove("https://attacker.invalid",
   {headers:{}},{setHeader(){}},GUID(3),GUID(4),GUID(9),move),e=>e.getStatus?.()===401);
 }finally{restore();}
});

// SQL041: no-show is authorized by Booking, never written by frontend SQL.
test("Booking NO_SHOW calls existing scoped idempotent stored procedure",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const calls=[];
  const db={getInternalPool(){return {request(){
   const data={};const req={input(key,_type,value){data[key]=value;return req;},
    async execute(procedure){calls.push({procedure,data});return {recordset:[{
      id:GUID(21),status:"NO_SHOW",changed:true}]};}};
   return req;
  }};}};
  const svc=new BookingService(db);
  assert.deepEqual(await svc.changeAppointmentStatus(actor,token,GUID(3),GUID(4),GUID(20),
    GUID(21),{status:"NO_SHOW"}),{id:GUID(21),status:"NO_SHOW",changed:true});
  assert.equal(calls.length,1);
  assert.equal(calls[0].procedure,"core.ChangeBookingAppointmentStatus");
  assert.equal(calls[0].data.TargetStatus,"NO_SHOW");
  assert.equal(calls[0].data.TenantId,actor.tenantId);
  assert.equal(calls[0].data.BusinessId,GUID(3));
  assert.equal(calls[0].data.BranchId,GUID(4));
 }finally{restore();}
});

test("Booking -> POS read handoff enforces K5 scope, requested ID and COMPLETE status",async()=>{
 const restore=on({DRVO_BOOKING_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
 try{
  const booking=GUID(51),customer=GUID(52),offering=GUID(53);
  const fake=fakePool((procedure,inputs)=>{
   assert.equal(procedure,"core.ReadCompletedBookingForPosDraft");
   assert.equal(inputs.TenantId,actor.tenantId);
   assert.equal(inputs.BusinessId,GUID(3));
   assert.equal(inputs.BranchId,GUID(4));
   assert.equal(inputs.BookingId,booking);
   return {recordset:[{bookingId:booking,customerId:customer,offeringId:offering,status:"COMPLETED"}]};
  });
  const svc=new BookingService(fake);
  assert.deepEqual(await svc.verifiedPosHandoff(actor,token,GUID(3),GUID(4),booking),
   {bookingId:booking,customerId:customer,offeringId:offering,status:"COMPLETED"});
  assert.equal(fake.calls.length,1);
  for(const id of ["bad-id",undefined,null])
   await assert.rejects(()=>svc.verifiedPosHandoff(actor,token,GUID(3),GUID(4),id),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.verifiedPosHandoff(actor,"bad",GUID(3),GUID(4),booking),
   e=>e.getStatus?.()===404);
  for(const row of [
   {bookingId:booking,customerId:customer,offeringId:offering,status:"BOOKED"},
   {bookingId:booking,customerId:customer,offeringId:offering,status:"NO_SHOW"},
   {bookingId:GUID(89),customerId:customer,offeringId:offering,status:"COMPLETED"},
   {bookingId:booking,customerId:"bad",offeringId:offering,status:"COMPLETED"},
  ]){
   const bad=new BookingService(fakePool(()=>({recordset:[row]})));
   await assert.rejects(()=>bad.verifiedPosHandoff(actor,token,GUID(3),GUID(4),booking),
    e=>e.getStatus?.()===404);
  }
 }finally{restore();}
});
test("Booking handoff GET disabled by default and lacks public/unsafe Origin bypass",async()=>{
 const original=process.env.DRVO_BOOKING_ENABLED;
 try{
  delete process.env.DRVO_BOOKING_ENABLED;
  const svc=new BookingService({getInternalPool(){throw Error("not allowed");}});
  await assert.rejects(()=>svc.verifiedPosHandoff(actor,token,GUID(3),GUID(4),GUID(9)),
   e=>e.getStatus?.()===503);
 }finally{if(original===undefined)delete process.env.DRVO_BOOKING_ENABLED;
  else process.env.DRVO_BOOKING_ENABLED=original;}
});
