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
   {status:"POSTED"},{status:"BOOKED"},{status:"CANCELLED",tenantId:GUID(1)},
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
