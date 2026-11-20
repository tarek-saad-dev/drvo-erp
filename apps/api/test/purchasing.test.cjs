'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {PurchasingService}=require('../dist/purchasing/purchasing.service');
const {PurchasingController}=require('../dist/purchasing/purchasing.controller');
const {lineExtMinor,previewPurchaseAp,AP_PREVIEW_STATE}=require('../dist/purchasing/ap-preview');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'pur-ci',mustChangePassword:false};
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
const active={DRVO_K5_AUTH_ENABLED:'YES',DRVO_PURCHASING_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL must not be reached')}};
test('Purchasing disabled by default before SQL',async()=>{
 await withEnv({DRVO_PURCHASING_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const service=new PurchasingService(deadDb);
  await assert.rejects(()=>service.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
 });
});
test('AP preview math matches QtyMilli*UnitCostMinor/1000 and never posts',()=>{
 assert.equal(lineExtMinor(1000,2500),2500);
 assert.equal(lineExtMinor(1500,1000),1500);
 const preview=previewPurchaseAp([
  {lineNo:1,offeringId:ID(5),qtyMilli:2000,unitCostMinor:1250},
  {lineNo:2,offeringId:ID(6),qtyMilli:500,unitCostMinor:400},
 ]);
 assert.equal(preview.apTotalMinor,2700);
 assert.equal(preview.state,AP_PREVIEW_STATE.state);
 assert.equal(preview.treasuryState,'NOT_PAID');
 assert.equal(preview.accountingState,'NOT_POSTED');
 assert.equal(preview.adr031,'NOT_IN_SCOPE');
 assert.throws(()=>previewPurchaseAp([{lineNo:1,offeringId:ID(5),qtyMilli:0,unitCostMinor:1}]));
});
test('Purchasing rejects payable injection and bad lines',async()=>{
 await withEnv(active,async()=>{
  const service=new PurchasingService(deadDb);
  const good={supplierId:null,supplierNote:'PO-1',currency:'EGP',
   lines:[{offeringId:ID(5),qtyMilli:1000,unitCostMinor:100}]};
  for(const body of [
   {...good,paid:true},{...good,currency:'BTC'},
   {...good,lines:[{offeringId:ID(5),qtyMilli:0,unitCostMinor:100}]},
   {...good,lines:[{offeringId:ID(5),qtyMilli:1000,unitCostMinor:-1,apPosted:true}]},
   {supplierId:ID(7),supplierNote:'x',currency:'EGP',lines:good.lines,treasuryPaid:true},
  ])await assert.rejects(()=>service.createReceive(actor,token,ID(3),ID(4),ID(8),body),
   e=>e.getStatus?.()===400);
 });
});
test('Purchasing Origin gate before actor',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new PurchasingController({actorFromToken(){throw Error('Auth touched')}},{});
  await assert.rejects(()=>ctrl.receive('http://erp-stage.drvotech.com',ID(6),
   {headers:{}},{setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
 });
});
