'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {BadRequestException,NotFoundException}=require('@nestjs/common');
const {PosPreviewService,computeCashierQuotePreview}=require('../dist/pos-preview/pos-preview.service.js');
const {PosPreviewController}=require('../dist/pos-preview/pos-preview.controller.js');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const offerings=[
 {offeringId:ID(1),kind:'SERVICE',displayName:'Haircut',isActive:true,
  priceMinor:20000,currency:'EGP'},
 {offeringId:ID(2),kind:'PRODUCT',displayName:'Wax',isActive:true,
  priceMinor:10000,currency:'EGP'},
 {offeringId:ID(3),kind:'SERVICE',displayName:'Inactive',isActive:false,
  priceMinor:6000,currency:'EGP'},
 {offeringId:ID(4),kind:'SERVICE',displayName:'Foreign currency',isActive:true,
  priceMinor:12000,currency:'USD'},
];
const actor={tenantId:ID(10),accountId:ID(11),sessionVersion:1,mustChangePassword:false};
const token='A'.repeat(43);
const env={DRVO_K5_AUTH_ENABLED:'YES',DRVO_CATALOG_ENABLED:'YES',
 DRVO_POS_PREVIEW_ENABLED:'YES',DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'};
async function withEnv(fn){
 const old=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
 Object.assign(process.env,env);
 try{return await fn();}finally{
  for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];
   else process.env[k]=v;}
 }
}
const order={lines:[{offeringId:ID(1),quantity:2,lineDiscountPercentBps:1000},
 {offeringId:ID(2),quantity:1,lineDiscountMinor:1000}],
 headerDiscountPercentBps:1000};
test('real Cashier pricing over freshly scoped Catalog items, no payment/invoice writes',async()=>{
 const quote=computeCashierQuotePreview(offerings,order);
 assert.equal(quote.state,'CASHIER_INVOICE_PRICE_QUOTE_ONLY');
 assert.equal(quote.priceSource,'FRESH_AUTHORIZED_CATALOG');
 assert.equal(quote.sourceRule,'CASHIER_LINE_AND_HEADER_DISCOUNT');
 assert.equal(quote.subtotalMinor,50000);
 assert.equal(quote.lineDiscountTotalMinor,5000);
 assert.equal(quote.linesNetTotalMinor,45000);
 assert.equal(quote.headerDiscountMinor,4500);
 assert.equal(quote.grandTotalMinor,40500);
 assert.equal(quote.persisted,false);
 assert.equal(quote.accountingState,'NOT_POSTED');
 assert.equal(quote.paymentState,'NOT_COLLECTED');
 assert.equal(quote.inventoryState,'NOT_DECREMENTED');
 assert.equal(quote.taxComputed,false);
 assert.equal(quote.lines[1].kind,'PRODUCT');
 assert.equal(quote.lines[1].unitPriceMinor,10000);
 assert.equal(quote.lines[0].discountPercentBps,1000);
});
test('foreign, inactive, duplicate, mixed currency and browser price injection fail closed',()=>{
 const bad=[
  {...order,createdByAccountId:ID(12)},
  {lines:[{offeringId:ID(1),quantity:1,priceMinor:1}]},
  {lines:[{offeringId:ID(1),quantity:1,employeeId:ID(13)}]},
  {lines:[{offeringId:ID(1),quantity:1,qty:1}]},
  {lines:[{offeringId:ID(1),quantity:1,discountValue:100}]},
  {lines:[{offeringId:ID(1),quantity:1},{offeringId:ID(1),quantity:1}]},
  {lines:[{offeringId:ID(1),quantity:1},{offeringId:ID(4),quantity:1}]},
  {lines:[{offeringId:ID(1),quantity:21}]},
  {lines:[{offeringId:ID(1),quantity:1,lineDiscountMinor:'200'}]},
  {lines:[{offeringId:ID(1),quantity:1}],headerDiscountPercentBps:11000},
  {lines:[]},
 ];
 for(const b of bad)assert.throws(()=>computeCashierQuotePreview(offerings,b));
 assert.throws(()=>computeCashierQuotePreview(offerings,{
  lines:[{offeringId:ID(3),quantity:1}],
 }),NotFoundException);
 assert.throws(()=>computeCashierQuotePreview(offerings,{
  lines:[{offeringId:ID(999),quantity:1}],
 }),NotFoundException);
});
test('service delegates to K5-scoped Catalog, not DB/financial layer',async()=>{
 await withEnv(async()=>{
  const queries=[];
  const catalog={async list(a,t,b,br){
   queries.push({a,t,b,br});
   assert.equal(b,ID(14));assert.equal(br,ID(15));
   return {offerings};
  }};
  const service=new PosPreviewService(catalog);
  const result=await service.cashierQuote(actor,token,ID(14),ID(15),order);
  assert.equal(result.grandTotalMinor,40500);
  assert.equal(queries.length,1);
  assert.equal(queries[0].a,actor);
  // AuthZ is delegated to the same SQL-backed Catalog.read owner.
  assert.equal(queries[0].t,token);
 });
});
test('controller fails on cross-origin before session and NEVER exposes payment action',async()=>{
 await withEnv(async()=>{
  const ctr=new PosPreviewController({
   async actorFromToken(){throw Error('Authentication must not run')}
  },{});
  for(const origin of [undefined,'http://erp-stage.drvotech.com','https://evil.example'])
   await assert.rejects(()=>ctr.cashierQuote(origin,{headers:{}},{setHeader(){}},
    ID(14),ID(15),order),e=>e.getStatus?.()===401);
 });
});
