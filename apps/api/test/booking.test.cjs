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
