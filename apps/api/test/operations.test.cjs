'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {OperationsService}=require('../dist/operations/operations.service');
const {OperationsController}=require('../dist/operations/operations.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'ops-ci',mustChangePassword:false};
const token='A'.repeat(43);
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
const active={DRVO_OPERATIONS_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL touched')}};
test('Operations OFF by default and never touches DB',async()=>{
 await withEnv({...active,DRVO_OPERATIONS_ENABLED:null},async()=>{
  const svc=new OperationsService(deadDb);
  await assert.rejects(()=>svc.read(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
 });
});
test('open day rejects non-trusted dates and extra fields before SQL',async()=>{
 await withEnv(active,async()=>{
  const svc=new OperationsService(deadDb);
  const today=new Date().toISOString().slice(0,10);
  for(const bad of [{businessDate:'2020-01-01'},{businessDate:today,force:true},null,
   {businessDate:'2026-02-30'}])
   await assert.rejects(()=>svc.openDay(actor,token,ID(3),ID(4),ID(9),bad),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.openDay(actor,token,ID(3),ID(4),'bad',{businessDate:today}),
   e=>e.getStatus?.()===400);
 });
});
test('close day/shift reject malformed payloads before SQL',async()=>{
 await withEnv(active,async()=>{
  const svc=new OperationsService(deadDb);
  await assert.rejects(()=>svc.closeDay(actor,token,ID(3),ID(4),ID(5),ID(6),{}),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.closeDay(actor,token,ID(3),ID(4),ID(5),ID(6),
   {forceCloseShifts:'yes'}),e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.openShift(actor,token,ID(3),ID(4),ID(9),{dayId:'bad'}),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.closeShift(actor,token,ID(3),ID(4),ID(5),ID(6),{x:1}),
   e=>e.getStatus?.()===400);
 });
});
test('Operations Origin checked before identity/SQL',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new OperationsController({actorFromToken(){throw Error('Auth')}},{});
  await assert.rejects(()=>ctrl.openDay('https://evil.example',ID(9),{headers:{}},
   {setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
 });
});
test('read model never authorizes financial posting',async()=>{
 await withEnv(active,async()=>{
  const today=new Date().toISOString().slice(0,10);
  const pool={request(){return {input(){return this},
   execute:async name=>{assert.equal(name,'core.ReadOperationsDayShift');
    return {recordsets:[[
     {dayId:ID(8),businessDate:today,status:'OPEN',openedByAccountId:ID(2),
      openedAtUtc:new Date('2026-11-19T08:00:00Z'),closedAtUtc:null}],
     [{shiftId:ID(7),dayId:ID(8),actorAccountId:ID(2),status:'OPEN',
      openedAtUtc:new Date('2026-11-19T08:05:00Z'),closedAtUtc:null}]],
     recordset:[{dayId:ID(8),businessDate:today,status:'OPEN',openedByAccountId:ID(2),
      openedAtUtc:new Date('2026-11-19T08:00:00Z'),closedAtUtc:null}]};}}}};
  const svc=new OperationsService({getInternalPool(){return pool}});
  const result=await svc.read(actor,token,ID(3),ID(4));
  assert.equal(result.state,'NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY');
  assert.equal(result.accountingState,'NOT_POSTED');
  assert.equal(result.glPostState,'GATED');
  assert.equal(result.readiness.financialPostingState,'NOT_AUTHORIZED');
  assert.equal(result.readiness.state,'READY_FOR_NONFINANCIAL_WORK');
 });
});
