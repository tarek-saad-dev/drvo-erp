'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {QueueService}=require('../dist/queue/queue.service');
const {QueueController}=require('../dist/queue/queue.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'q-ci',mustChangePassword:false};
const token='A'.repeat(43);
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
const active={DRVO_QUEUE_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL touched')}};
test('Queue OFF by default and never touches DB',async()=>{
 await withEnv({...active,DRVO_QUEUE_ENABLED:null},async()=>{
  const svc=new QueueService(deadDb);
  await assert.rejects(()=>svc.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
 });
});
test('Walk-in create rejects injection and malformed UTC before SQL',async()=>{
 await withEnv(active,async()=>{
  const svc=new QueueService(deadDb);
  const good={customerId:null,resourceId:ID(5),offeringId:null,durationMinutes:30,
   expectedStartAtUtc:'2027-01-01T12:00:00.000Z'};
  for(const bad of [
   {...good,tenantId:ID(1)},{...good,durationMinutes:3},
   {...good,expectedStartAtUtc:'2027-01-01T12:00:01.000Z'},
   {...good,resourceId:'bad'},{...good,customerId:'bad'},null,
  ])await assert.rejects(()=>svc.createWalkIn(actor,token,ID(3),ID(4),ID(9),bad),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.createWalkIn(actor,token,ID(3),ID(4),'bad',good),
   e=>e.getStatus?.()===400);
 });
});
test('Booking handoff and status transition reject invalid payloads before SQL',async()=>{
 await withEnv(active,async()=>{
  const svc=new QueueService(deadDb);
  await assert.rejects(()=>svc.handoffFromBooking(actor,token,ID(3),ID(4),ID(9),
   {bookingId:'bad'}),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.handoffFromBooking(actor,token,ID(3),ID(4),ID(9),
   {bookingId:ID(8),posted:true}),e=>e.getStatus?.()===400);
  for(const status of ['WAITING','POSTED','PAID',null])
   await assert.rejects(()=>svc.changeStatus(actor,token,ID(3),ID(4),ID(9),ID(7),
    {status}),e=>e.getStatus?.()===400);
 });
});
test('Queue controller Origin is checked before identity/SQL',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new QueueController({actorFromToken(){throw Error('Auth')}},{});
  await assert.rejects(()=>ctrl.create('https://evil.example',ID(9),{headers:{}},
   {setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
 });
});
test('List maps nonposting queue state and never claims paid/posted',async()=>{
 await withEnv(active,async()=>{
  const pool={request(){return {input(){return this},
   execute:async name=>{assert.equal(name,'core.ReadBranchQueue');
    return {recordset:[{ticketId:ID(9),ticketCode:'Q-ABCDEF12',customerId:null,
     resourceId:ID(5),offeringId:null,bookingId:null,customerName:'',
     resourceName:'Chair',offeringName:'',durationMinutes:30,
     expectedStartAtUtc:new Date('2027-01-01T12:00:00Z'),
     expectedEndAtUtc:new Date('2027-01-01T12:30:00Z'),
     status:'WAITING',source:'WALK_IN',createdAtUtc:new Date('2027-01-01T11:00:00Z')}]};}}}};
  const svc=new QueueService({getInternalPool(){return pool}});
  const result=await svc.list(actor,token,ID(3),ID(4));
  assert.equal(result.state,'NONPOSTING_QUEUE_TICKETS_ONLY');
  assert.equal(result.treasuryState,'NOT_PAID');
  assert.equal(result.accountingState,'NOT_POSTED');
  assert.equal(result.tickets[0].status,'WAITING');
 });
});
