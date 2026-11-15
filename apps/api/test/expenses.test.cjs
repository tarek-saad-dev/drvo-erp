'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ExpensesService}=require('../dist/expenses/expenses.service');
const {ExpensesController}=require('../dist/expenses/expenses.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'expenses-ci',mustChangePassword:false};
const token='A'.repeat(43);
function withEnv(settings,fn){
 const original=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(settings)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{
  for(const [k,v]of Object.entries(original)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
 });
}
const active={DRVO_K5_AUTH_ENABLED:'YES',DRVO_EXPENSES_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL must not be reached')}};
test('Expenses is default disabled before touching authentication or SQL',async()=>{
 await withEnv({DRVO_EXPENSES_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const service=new ExpensesService(deadDb);
  await assert.rejects(()=>service.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
  const ctrl=new ExpensesController({actorFromToken(){throw Error('Auth touched')}},service);
  await assert.rejects(()=>ctrl.list({headers:{}},{setHeader(){}},ID(3),ID(4)),
    e=>e.getStatus?.()===503);
 });
});
test('Strict category fields, idempotency and Tenant injection are rejected before DB',async()=>{
 await withEnv(active,async()=>{
  const service=new ExpensesService(deadDb);
  for(const body of [
   {displayName:''},{displayName:' Rent'},{displayName:'X '.repeat(70)},
   {displayName:'Rent',tenantId:ID(7)},{displayName:45},[]
  ])await assert.rejects(()=>service.createCategory(actor,token,ID(3),ID(4),ID(5),body),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.createCategory(actor,token,ID(3),ID(4),'bad',
   {displayName:'Rent'}),e=>e.getStatus?.()===400);
 });
});
test('Money is safe integer minor units and no payment fields can be injected',async()=>{
 await withEnv(active,async()=>{
  const service=new ExpensesService(deadDb);
  const data={categoryId:ID(5),amountMinor:15025,currency:'EGP',note:'Rent'};
  for(const body of [
   {...data,amountMinor:0},{...data,amountMinor:-1},
   {...data,amountMinor:12.5},{...data,amountMinor:9000000000001},
   {...data,amountMinor:'15025'},{...data,currency:'BTC'},
   {...data,note:' Notes'},{...data,note:'x'.repeat(241)},
   {...data,paid:true},{...data,tenantId:ID(8)}
  ])await assert.rejects(()=>service.createDraft(actor,token,ID(3),ID(4),ID(7),body),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.createDraft(actor,token,'bogus',ID(4),ID(7),data),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>service.createDraft({...actor,mustChangePassword:true},
   token,ID(3),ID(4),ID(7),data),e=>e.getStatus?.()===404);
 });
});
test('Cancellation has no user-controlled accounting, scope or settlement fields',async()=>{
 await withEnv(active,async()=>{
  const service=new ExpensesService(deadDb);
  for(const body of [{tenantId:ID(8)},{paymentMethod:'CASH'},{posted:true},null])
   await assert.rejects(()=>service.cancelDraft(actor,token,ID(3),ID(4),ID(5),ID(7),body),
    e=>e.getStatus?.()===400);
 });
});
test('POST Origin is exact trusted HTTPS and checked before actor resolution',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new ExpensesController({actorFromToken(){throw Error('Auth touched')}},{});
  const args=[ID(3),ID(4)];
  await assert.rejects(()=>ctrl.category('https://evil.example',ID(6),
   {headers:{}},{setHeader(){}},...args,{}),e=>e.getStatus?.()===401);
  await assert.rejects(()=>ctrl.draft('http://erp-stage.drvotech.com',ID(6),
   {headers:{}},{setHeader(){}},...args,{}),e=>e.getStatus?.()===401);
  await assert.rejects(()=>ctrl.cancel(undefined,ID(6),
   {headers:{}},{setHeader(){}},...args,ID(5),{}),e=>e.getStatus?.()===401);
 });
});
test('A correct expense read model reports NOT_PAID / NOT_POSTED, no GL',async()=>{
 await withEnv(active,async()=>{
  const executed=[];
  const pool={request(){return {
   input(){return this},
   execute:async(name)=>{executed.push(name);return {recordsets:[
    [{categoryId:ID(5),displayName:'Rent',isActive:true}],
    [{draftId:ID(8),categoryId:ID(5),categoryName:'Rent',amountMinor:'15025',
     currency:'EGP',note:'Note',status:'DRAFT',createdAtUtc:new Date('2026-11-15T00:00:00Z')}],
   ]};}
  }}};
  const service=new ExpensesService({getInternalPool(){return pool}});
  const result=await service.list(actor,token,ID(3),ID(4));
  assert.deepEqual(executed,['core.ReadExpenseWorkspace']);
  assert.equal(result.treasuryState,'NOT_PAID');
  assert.equal(result.accountingState,'NOT_POSTED');
  assert.equal(result.drafts[0].amountMinor,15025);
  assert.equal(result.drafts[0].status,'DRAFT');
  assert.equal(result.drafts[0].createdAtUtc,'2026-11-15T00:00:00.000Z');
 });
});
