'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {TreasuryService}=require('../dist/treasury/treasury.service');
const {TreasuryController}=require('../dist/treasury/treasury.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'treasury-unit',mustChangePassword:false};
const token='A'.repeat(43),deadDb={getInternalPool(){throw Error('SQL touched')}};
const active={DRVO_K5_AUTH_ENABLED:'YES',DRVO_TREASURY_COUNTS_ENABLED:'YES'};
async function withEnv(settings,fn){
 const old=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(settings)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 try{return await fn();}finally{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }}
}
test('cash counts OFF by default; cannot touch K5 or SQL',async()=>{
 await withEnv({...active,DRVO_TREASURY_COUNTS_ENABLED:undefined},async()=>{
  const svc=new TreasuryService(deadDb),ctrl=new TreasuryController({
   actorFromToken(){throw Error('auth touched')}
  },svc);
  await assert.rejects(()=>svc.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
  await assert.rejects(()=>ctrl.list({headers:{}},{setHeader(){}},ID(3),ID(4)),
   e=>e.getStatus?.()===503);
 });
});
test('count create strictly enforces integer minor, currency, note, UUID and scope',async()=>{
 await withEnv(active,async()=>{
  const svc=new TreasuryService(deadDb);
  const normal={countedMinor:12345,currency:'EGP',note:'Cash drawer'};
  const bad=[
   {...normal,countedMinor:-1},{...normal,countedMinor:1.2},
   {...normal,countedMinor:'12345'},{...normal,countedMinor:9000000000001},
   {...normal,currency:'BTC'},{...normal,note:' A'},
   {...normal,note:'x'.repeat(241)},{...normal,posted:true},
   {...normal,shiftId:ID(8)},{...normal,businessId:ID(6)},
  ];
  for(const data of bad)
   await assert.rejects(()=>svc.create(actor,token,ID(3),ID(4),ID(5),data),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.create(actor,token,ID(3),ID(4),'bad',normal),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.create(actor,token,'bad',ID(4),ID(5),normal),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.create({...actor,mustChangePassword:true},token,ID(3),ID(4),
   ID(5),normal),e=>e.getStatus?.()===404);
 });
});
test('cancel only accepts empty body and valid request IDs',async()=>{
 await withEnv(active,async()=>{
  const svc=new TreasuryService(deadDb);
  for(const payload of [null,{posted:true},{note:'x'},{tenantId:ID(9)}])
   await assert.rejects(()=>svc.cancel(actor,token,ID(3),ID(4),ID(5),ID(6),payload),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.cancel(actor,token,ID(3),ID(4),'bad',ID(6),{}),
   e=>e.getStatus?.()===400);
 });
});
test('origin must match exact trusted HTTPS and precede actor',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new TreasuryController({actorFromToken(){throw Error('auth touched')}},{});
  for(const origin of [undefined,'https://attacker.example','http://erp-stage.drvotech.com']){
   await assert.rejects(()=>ctrl.create(origin,ID(7),{headers:{}},{setHeader(){}},
    ID(3),ID(4),{}),e=>e.getStatus?.()===401);
   await assert.rejects(()=>ctrl.cancel(origin,ID(7),{headers:{}},{setHeader(){}},
    ID(3),ID(4),ID(5),{}),e=>e.getStatus?.()===401);
  }
 });
});
test('read model is strictly count-only, never cash balance',async()=>{
 await withEnv(active,async()=>{
  const calls=[],pool={request(){return {input(){return this},
   async execute(proc){calls.push(proc);return {recordset:[
    {countId:ID(5),countedMinor:0,currency:'EGP',note:'',
     status:'DRAFT',createdAtUtc:new Date('2026-11-15T01:00:00Z'),
     cancelledAtUtc:null},
   ]};}}}};
  const svc=new TreasuryService({getInternalPool(){return pool}});
  const data=await svc.list(actor,token,ID(3),ID(4));
  assert.deepEqual(calls,['core.ReadTreasuryCountDrafts']);
  assert.equal(data.drafts[0].countedMinor,0);
  assert.equal(data.drafts[0].createdAtUtc,'2026-11-15T01:00:00.000Z');
  assert.equal(data.balanceState,'NOT_COMPUTED');
  assert.equal(data.reconciliationState,'NOT_PERFORMED');
  assert.equal(data.settlementState,'NO_SETTLEMENT');
  assert.equal(data.accountingState,'NOT_POSTED');
  for(const key of ['balance','totalIn','totalOut','paid','posted','cashMove'])
   assert.equal(Object.prototype.hasOwnProperty.call(data,key),false);
 });
});
