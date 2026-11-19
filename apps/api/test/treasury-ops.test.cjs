'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {TreasuryOpsService}=require('../dist/treasury/treasury-ops.service');
const {TreasuryOpsController}=require('../dist/treasury/treasury-ops.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'tr-ops',mustChangePassword:false};
const token='A'.repeat(43);
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
const active={DRVO_TREASURY_OPS_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL touched')}};
test('Treasury ops OFF by default',async()=>{
 await withEnv({...active,DRVO_TREASURY_OPS_ENABLED:null},async()=>{
  const svc=new TreasuryOpsService(deadDb);
  await assert.rejects(()=>svc.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
 });
});
test('movement create rejects GL-looking and malformed payloads before SQL',async()=>{
 await withEnv(active,async()=>{
  const svc=new TreasuryOpsService(deadDb);
  const good={dayId:ID(5),shiftId:ID(6),direction:'IN',amountMinor:100,currency:'EGP',
   fromRail:'OTHER',toRail:'CASH',note:'float'};
  for(const bad of [
   {...good,amountMinor:0},{...good,posted:true},{...good,glPost:true},
   {...good,direction:'POST'},{...good,fromRail:'WALLET'},null,
   {...good,note:' x'},
  ])await assert.rejects(()=>svc.createMovement(actor,token,ID(3),ID(4),ID(9),bad),
   e=>e.getStatus?.()===400);
 });
});
test('recon rejects invalid counted amounts and extra fields',async()=>{
 await withEnv(active,async()=>{
  const svc=new TreasuryOpsService(deadDb);
  for(const bad of [
   {shiftId:ID(6),rail:'CASH',countedMinor:-1,note:'x'},
   {shiftId:ID(6),rail:'CASH',countedMinor:1,note:'x',postVariance:true},
   {shiftId:'bad',rail:'CASH',countedMinor:0,note:'x'},null,
  ])await assert.rejects(()=>svc.createRecon(actor,token,ID(3),ID(4),ID(9),bad),
   e=>e.getStatus?.()===400);
 });
});
test('Treasury ops Origin checked before identity',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new TreasuryOpsController({actorFromToken(){throw Error('Auth')}},{});
  await assert.rejects(()=>ctrl.createMovement('https://evil.example',ID(9),{headers:{}},
   {setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
 });
});
test('list never claims settlement or GL post',async()=>{
 await withEnv(active,async()=>{
  const pool={request(){return {input(){return this},
   execute:async name=>{assert.equal(name,'core.ReadTreasuryCashMovements');
    return {recordsets:[[],[]],recordset:[]};}}}};
  const svc=new TreasuryOpsService({getInternalPool(){return pool}});
  const data=await svc.list(actor,token,ID(3),ID(4));
  assert.equal(data.state,'NONPOSTING_TREASURY_MOVEMENTS_AND_RECON_ONLY');
  assert.equal(data.glPostState,'GATED');
  assert.equal(data.accountingState,'NOT_POSTED');
  assert.equal(data.settlementState,'NO_SETTLEMENT');
  assert.equal(data.balanceState,'COMPUTED_FROM_MOVEMENTS_ONLY');
 });
});
