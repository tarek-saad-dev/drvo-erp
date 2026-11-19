'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {OtherIncomeService}=require('../dist/other-income/other-income.service');
const {OtherIncomeController}=require('../dist/other-income/other-income.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'oi-ci',mustChangePassword:false};
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
const active={DRVO_K5_AUTH_ENABLED:'YES',DRVO_OTHER_INCOME_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL must not be reached')}};
test('Other income disabled by default before SQL',async()=>{
 await withEnv({DRVO_OTHER_INCOME_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const service=new OtherIncomeService(deadDb);
  await assert.rejects(()=>service.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
 });
});
test('Other income rejects sale/payment injection and bad money',async()=>{
 await withEnv(active,async()=>{
  const service=new OtherIncomeService(deadDb);
  const data={categoryId:ID(5),amountMinor:2500,currency:'EGP',note:'Rent recovery'};
  for(const body of [
   {...data,amountMinor:0},{...data,paid:true},{...data,saleId:ID(9)},
   {...data,currency:'BTC'},{...data,note:' padded '},
  ])await assert.rejects(()=>service.createDraft(actor,token,ID(3),ID(4),ID(7),body),
   e=>e.getStatus?.()===400);
 });
});
test('Other income Origin gate before actor',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new OtherIncomeController({actorFromToken(){throw Error('Auth touched')}},{});
  await assert.rejects(()=>ctrl.draft('http://erp-stage.drvotech.com',ID(6),
   {headers:{}},{setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
 });
});
