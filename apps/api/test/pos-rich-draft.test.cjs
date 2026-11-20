'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseCashierRichDraftInput,PosRichService}=require('../dist/pos-drafts/pos-rich.service');
const {PosRichController}=require('../dist/pos-drafts/pos-rich.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),username:'pos-rich-ci',sessionVersion:1,mustChangePassword:false};
const token='A'.repeat(43),base={lines:[{offeringId:ID(3),quantity:2,
 lineDiscountPercentBps:1000,executorEmployeeId:ID(4)}],
 customerId:ID(5),headerDiscountPercentBps:1000,expectedTotalMinor:16200};
const active={DRVO_K5_AUTH_ENABLED:'YES',DRVO_CATALOG_ENABLED:'YES',
 DRVO_POS_DRAFTS_ENABLED:'YES',DRVO_POS_RICH_ENABLED:'YES'};
async function env(m,fn){
 const old=Object.fromEntries(Object.keys(m).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(m)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 try{return await fn();}finally{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }}
}
const dead={getInternalPool(){throw Error('DB touched')}};
test('SQL022 source rich parser preserves Cashier inputs and canonical idempotency',()=>{
 const a=parseCashierRichDraftInput(base);
 const b=parseCashierRichDraftInput({...base,
  customerId:ID(5).toUpperCase(),
  lines:[{offeringId:ID(3).toUpperCase(),quantity:2,
   executorEmployeeId:ID(4).toUpperCase(),lineDiscountPercentBps:1000}]});
 assert.equal(a.hash,b.hash);
 assert.equal(a.data.customerId,ID(5));
 assert.equal(a.data.lines[0].executorEmployeeId,ID(4));
 assert.equal(a.data.lines[0].lineDiscountPercentBps,1000);
 assert.equal(a.data.expectedTotalMinor,16200);
 assert.equal(a.data.lines[0].packageId,null);
 assert.match(a.linesJson,/executorEmployeeId/);
 assert.doesNotMatch(a.linesJson,/packageId/);
 assert.match(a.hash,/^[0-9a-f]{64}$/);
});
test('SQL038 package snapshots parse, hash, and reject broken groups',()=>{
 const pkg=ID(40),svcA=ID(41),svcB=ID(42),group='pkg-'+pkg+'-ci';
 const withPkg={
  lines:[
   {offeringId:svcA,quantity:1,packageId:pkg,packageGroupKey:group,
    packageRole:'anchor',commercialPackagePriceMinor:150000},
   {offeringId:svcB,quantity:1,packageId:pkg,packageGroupKey:group,
    packageRole:'included',commercialPackagePriceMinor:150000},
  ],
  expectedTotalMinor:150000,
 };
 const parsed=parseCashierRichDraftInput(withPkg);
 assert.equal(parsed.data.lines[0].packageId,pkg);
 assert.equal(parsed.data.lines[0].packageRole,'anchor');
 assert.equal(parsed.data.lines[1].packageRole,'included');
 assert.equal(parsed.data.lines[1].commercialPackagePriceMinor,150000);
 assert.match(parsed.linesJson,/packageGroupKey/);
 assert.throws(()=>parseCashierRichDraftInput({
  ...withPkg,lines:[{...withPkg.lines[0]},{...withPkg.lines[1],packageRole:'anchor'}],
 }),e=>e.getStatus?.()===400);
 assert.throws(()=>parseCashierRichDraftInput({
  ...withPkg,lines:[{...withPkg.lines[0],packageId:null}],
 }),e=>e.getStatus?.()===400);
});
test('strict input denies spoofed price, paid flag, foreign tenant, malformed numeric or duplicate',()=>{
 for(const input of [
  {...base,unitPriceMinor:1},{...base,paid:true},{...base,tenantId:ID(6)},
  {...base,expectedTotalMinor:1.1},{...base,expectedTotalMinor:-1},
  {...base,expectedTotalMinor:9000000000001},{...base,customerId:'bogus'},
  {...base,lines:[base.lines[0],base.lines[0]]},
  {...base,lines:[{...base.lines[0],priceMinor:1}]},
  {...base,lines:[{...base.lines[0],lineDiscountMinor:100.5}]},
  {...base,lines:[{...base.lines[0],lineDiscountPercentBps:10001}]},
  {...base,lines:[{...base.lines[0],executorEmployeeId:'invalid'}]},
  {...base,lines:[{...base.lines[0],quantity:21}]},
  {...base,headerDiscountMinor:-1},
  {...base,headerDiscountPercentBps:10001},
  {...base,lines:[]},null,
 ])assert.throws(()=>parseCashierRichDraftInput(input),e=>e.getStatus?.()===400);
});
test('default OFF denies before identity or SQL',async()=>{
 await env({...active,DRVO_POS_RICH_ENABLED:undefined},async()=>{
  const svc=new PosRichService(dead);
  await assert.rejects(()=>svc.list(actor,token,ID(7),ID(8)),e=>e.getStatus?.()===503);
  const ctrl=new PosRichController({actorFromToken(){throw Error('auth touched')}},svc);
  await assert.rejects(()=>ctrl.list({headers:{}},{setHeader(){}},ID(7),ID(8)),
   e=>e.getStatus?.()===503);
 });
});
test('private POST exact origin is enforced before auth',async()=>{
 await env({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const c=new PosRichController({actorFromToken(){throw Error('auth touched')}},{});
  for(const origin of [undefined,'http://erp-stage.drvotech.com','https://evil.example'])
   await assert.rejects(()=>c.create(origin,ID(9),{headers:{}},{setHeader(){}},
    ID(7),ID(8),base),e=>e.getStatus?.()===401);
 });
});
test('Nest create passes scoped SQL parameters, never client price or finance data',async()=>{
 await env(active,async()=>{
  const calls=[],params=[];
  const pool={request(){return {input(key,type,value){params.push({key,value});return this},
   execute:async name=>{calls.push(name);return {recordset:[{
    id:ID(10),created:true,version:1,grandTotalMinor:16200}]};}}}};
  const svc=new PosRichService({getInternalPool(){return pool}});
  const saved=await svc.create(actor,token,ID(7),ID(8),ID(9),base);
  assert.deepEqual(calls,['core.CreateBranchPosCashierDraft']);
  assert.equal(saved.status,'DRAFT');
  assert.equal(saved.discountsPersisted,true);
  assert.equal(saved.paymentState,'NOT_COLLECTED');
  assert.equal(saved.accountingState,'NOT_POSTED');
  assert.equal(saved.inventoryState,'NOT_DECREMENTED');
  const keys=params.map(x=>x.key);
  for(const k of ['TenantId','BusinessId','BranchId','AccountId','TokenHash',
   'ClientRequestId','PayloadHash','LinesJson','CustomerId','HeaderDiscountMinor',
   'HeaderDiscountBps','ExpectedTotalMinor'])assert.ok(keys.includes(k),k);
  for(const forbidden of ['priceMinor','paid','transactionId','paymentMethod','stock'])
   assert.ok(!keys.includes(forbidden));
  const json=JSON.parse(params.find(x=>x.key==='LinesJson').value);
  assert.equal(json[0].lineDiscountPercentBps,1000);
  assert.equal(json[0].executorEmployeeId,ID(4));
 });
});
test('rich read returns separate immutable snapshots instead of paid invoices',async()=>{
 await env(active,async()=>{
  const pool={request(){return {input(){return this},execute:async()=>({recordsets:[
   [{draftId:ID(10),createdAtUtc:new Date('2026-11-17T00:00:00Z'),currency:'EGP',
    subtotalMinor:'25000',customerId:ID(5),headerDiscountMinor:'2300',
    linesNetMinor:'23000',totalDiscountMinor:'4500',grandTotalMinor:'20700'}],
   [{draftId:ID(10),lineNo:1,offeringId:ID(3),displayName:'Haircut',kind:'SERVICE',
    quantity:2,unitPriceMinor:'10000',grossMinor:'20000',executorEmployeeId:ID(4),
    discountMinor:'2000',netMinor:'18000',packageId:null,packageGroupKey:null,
    packageRole:null,commercialPackagePriceMinor:null},
    {draftId:ID(10),lineNo:2,offeringId:ID(11),displayName:'Pkg Anchor',kind:'SERVICE',
    quantity:1,unitPriceMinor:'5000',grossMinor:'5000',executorEmployeeId:null,
    discountMinor:'0',netMinor:'5000',packageId:ID(40),packageGroupKey:'pkg-ci',
    packageRole:'anchor',commercialPackagePriceMinor:150000}],
  ]})}}};
  const svc=new PosRichService({getInternalPool(){return pool}});
  const r=await svc.list(actor,token,ID(7),ID(8));
  assert.equal(r.state,'CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY');
  assert.equal(r.drafts.length,1);
  assert.equal(r.drafts[0].grandTotalMinor,20700);
  assert.equal(r.drafts[0].lines[0].executorEmployeeId,ID(4));
  assert.equal(r.drafts[0].lines[0].packageId,null);
  assert.equal(r.drafts[0].lines[1].packageId,ID(40));
  assert.equal(r.drafts[0].lines[1].packageRole,'anchor');
  assert.equal(r.drafts[0].lines[1].commercialPackagePriceMinor,150000);
  assert.equal(r.accountingState,'NOT_POSTED');
  assert.equal(r.paymentState,'NOT_COLLECTED');
 });
});
function draftPool(){
 return {request(){return {input(){return this},execute:async()=>({recordsets:[
  [{draftId:ID(10),createdAtUtc:new Date('2026-11-17T00:00:00Z'),currency:'EGP',
   subtotalMinor:'20000',customerId:ID(5),headerDiscountMinor:'1800',
   linesNetMinor:'18000',totalDiscountMinor:'3800',grandTotalMinor:'16200'}],
  [{draftId:ID(10),lineNo:1,offeringId:ID(3),displayName:'Haircut',kind:'SERVICE',
   quantity:2,unitPriceMinor:'10000',grossMinor:'20000',executorEmployeeId:ID(4),
   discountMinor:'2000',netMinor:'18000'}],
 ]})}}};
}
test('draft print-preview is disabled by default before identity or SQL',async()=>{
 await env({...active,DRVO_POS_RICH_ENABLED:undefined},async()=>{
  const svc=new PosRichService(dead);
  await assert.rejects(()=>svc.printPreview(actor,token,ID(7),ID(8),ID(10)),
   e=>e.getStatus?.()===503);
  const ctrl=new PosRichController({actorFromToken(){throw Error('auth touched')}},svc);
  await assert.rejects(()=>ctrl.printPreviewGet(undefined,{headers:{}},{setHeader(){}},
   ID(7),ID(8),ID(10)),e=>e.getStatus?.()===503);
 });
});
test('POST print-preview exact origin is enforced before auth',async()=>{
 await env({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const c=new PosRichController({actorFromToken(){throw Error('auth touched')}},{});
  for(const origin of [undefined,'http://erp-stage.drvotech.com','https://evil.example'])
   await assert.rejects(()=>c.printPreviewPost(origin,undefined,{headers:{}},{setHeader(){}},
    ID(7),ID(8),ID(10),{}),e=>e.getStatus?.()===401);
 });
});
test('print-preview returns POS_DRAFT_RECEIPT from scoped draft read without finance writes',async()=>{
 await env(active,async()=>{
  const calls=[];
  const pool={request(){return {input(){return this},execute:async name=>{
   calls.push(name);return draftPool().request().execute(name);
  }}}};
  const svc=new PosRichService({getInternalPool(){return pool}});
  const preview=await svc.printPreview(actor,token,ID(7),ID(8),ID(10),{
   customerDisplayName:'عميل',executorNames:{[ID(4)]:'حلاق'},businessLabel:'DRVO POS',
  });
  assert.deepEqual(calls,['core.ReadBranchPosCashierDrafts']);
  assert.equal(preview.state,'POS_DRAFT_PRINT_PREVIEW');
  assert.equal(preview.receipt.documentKind,'POS_DRAFT_RECEIPT');
  assert.equal(preview.receipt.posting,'NOT_POSTED');
  assert.equal(preview.receipt.paymentState,'NOT_COLLECTED');
  assert.equal(preview.receipt.thermalAgent,'NOT_AVAILABLE');
  assert.equal(preview.receipt.postedReprint,'NOT_AUTHORIZED');
  assert.equal(preview.receipt.grandTotalMinor,16200);
  assert.equal(preview.receipt.lines[0].executorDisplayName,'حلاق');
  assert.match(preview.html,/مسودة — غير محصّلة \/ غير مرحّلة/);
  assert.equal(preview.paymentState,'NOT_COLLECTED');
  assert.equal(preview.accountingState,'NOT_POSTED');
  assert.equal(preview.inventoryState,'NOT_DECREMENTED');
  await assert.rejects(()=>svc.printPreview(actor,token,ID(7),ID(8),ID(99)),
   e=>e.getStatus?.()===404);
 });
});
test('GET print-preview can alternate text/html without Origin; POST keeps Origin',async()=>{
 await env({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const svc=new PosRichService({getInternalPool(){return draftPool()}});
  const identity={async actorFromToken(){return actor;}};
  const headers=[];
  const ctrl=new PosRichController(identity,svc);
  const cookie='__Host-drvo-session='+token;
  const html=await ctrl.printPreviewGet('text/html',{headers:{cookie}},
   {setHeader(k,v){headers.push([k,v]);}},ID(7),ID(8),ID(10));
  assert.match(String(html),/POS_DRAFT_RECEIPT/);
  assert.ok(headers.some(([k,v])=>k==='Content-Type'&&String(v).includes('text/html')));
  const json=await ctrl.printPreviewPost('https://erp-stage.drvotech.com','application/json',
   {headers:{cookie}},{setHeader(){}},ID(7),ID(8),ID(10),
   {customerDisplayName:'X'});
  assert.equal(json.state,'POS_DRAFT_PRINT_PREVIEW');
 });
});
