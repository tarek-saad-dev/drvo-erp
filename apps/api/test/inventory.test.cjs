'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {InventoryService}=require('../dist/inventory/inventory.service');
const {InventoryController}=require('../dist/inventory/inventory.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'inv-ci',mustChangePassword:false};
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
const active={DRVO_K5_AUTH_ENABLED:'YES',DRVO_INVENTORY_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL must not be reached')}};
test('Inventory is default disabled before auth/SQL',async()=>{
 await withEnv({DRVO_INVENTORY_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const service=new InventoryService(deadDb);
  await assert.rejects(()=>service.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
 });
});
test('Receive rejects payment/GL injection and bad lines before SQL',async()=>{
 await withEnv(active,async()=>{
  const service=new InventoryService(deadDb);
  const good={sourceType:'PURCHASE',supplierNote:'Vendor',lines:[
   {lineNo:1,offeringId:ID(5),qtyMilli:1000,unitCostMinor:1500}]};
  for(const body of [
   {...good,paid:true},{...good,lines:[]},
   {sourceType:'PURCHASE',supplierNote:'x',lines:[{lineNo:1,offeringId:ID(5),qtyMilli:0,unitCostMinor:0}]},
   {sourceType:'SALE',supplierNote:'x',lines:good.lines},
  ])await assert.rejects(()=>service.createReceive(actor,token,ID(3),ID(4),ID(7),body),
   e=>e.getStatus?.()===400);
 });
});
test('Adjust requires non-zero milli qty and trimmed reason',async()=>{
 await withEnv(active,async()=>{
  const service=new InventoryService(deadDb);
  for(const body of [
   {offeringId:ID(5),deltaMilli:0,reason:'ok'},
   {offeringId:ID(5),deltaMilli:1000,reason:' padded '},
   {offeringId:ID(5),deltaMilli:1000,reason:'',tenantId:ID(9)},
  ])await assert.rejects(()=>service.createAdjust(actor,token,ID(3),ID(4),ID(7),body),
   e=>e.getStatus?.()===400);
 });
});
test('POST Origin checked before actor resolution',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new InventoryController({actorFromToken(){throw Error('Auth touched')}},{});
  await assert.rejects(()=>ctrl.receive('https://evil.example',ID(6),
   {headers:{}},{setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
 });
});
test('Transfer create rejects same-branch, payment injection and bad lines before SQL',async()=>{
 await withEnv(active,async()=>{
  const service=new InventoryService(deadDb);
  const good={toBranchId:ID(8),note:'Restock',lines:[{lineNo:1,offeringId:ID(5),qtyMilli:1000}]};
  for(const body of [
   {...good,paid:true},{...good,toBranchId:ID(4)},{...good,toBranchId:'not-a-guid'},
   {...good,lines:[]},{...good,note:'x'.repeat(161)},
   {...good,lines:[{lineNo:1,offeringId:ID(5),qtyMilli:0}]},
   {...good,lines:[{lineNo:1,offeringId:ID(5),qtyMilli:-1000}]},
   {...good,lines:[{lineNo:1,offeringId:ID(5),qtyMilli:1.5}]},
   {...good,lines:[{lineNo:1,offeringId:ID(5),qtyMilli:1000,unitCostMinor:5}]},
   {...good,lines:[{lineNo:1,offeringId:ID(5),qtyMilli:1000},{lineNo:2,offeringId:ID(5),qtyMilli:1}]},
   {...good,lines:[{lineNo:1,offeringId:ID(5),qtyMilli:1000},{lineNo:1,offeringId:ID(6),qtyMilli:1}]},
  ])await assert.rejects(()=>service.createTransfer(actor,token,ID(3),ID(4),ID(7),body),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.createTransfer(actor,token,ID(3),ID(4),'bad-key',good),
   e=>e.getStatus?.()===400);
 });
});
test('Transfer cancel requires empty body and valid ids before SQL',async()=>{
 await withEnv(active,async()=>{
  const service=new InventoryService(deadDb);
  await assert.rejects(()=>service.cancelTransfer(actor,token,ID(3),ID(4),ID(9),ID(7),{reason:'x'}),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.cancelTransfer(actor,token,ID(3),ID(4),'nope',ID(7),{}),
   e=>e.getStatus?.()===400);
 });
});
test('Transfers are default disabled and POST Origin is checked first',async()=>{
 await withEnv({DRVO_INVENTORY_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const service=new InventoryService(deadDb);
  await assert.rejects(()=>service.listTransfers(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
 });
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new InventoryController({actorFromToken(){throw Error('Auth touched')}},{});
  await assert.rejects(()=>ctrl.createTransfer('https://evil.example',ID(6),
   {headers:{}},{setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
  await assert.rejects(()=>ctrl.cancelTransfer('https://evil.example',ID(6),
   {headers:{}},{setHeader(){}},ID(3),ID(4),ID(9),{}),e=>e.getStatus?.()===401);
 });
});
test('Transfer list maps SQL032 recordsets and never claims posting',async()=>{
 await withEnv(active,async()=>{
  const sets=[
   [{transferId:ID(20),fromBranchId:ID(4),fromBranchName:'A',toBranchId:ID(8),toBranchName:'B',
     direction:'OUT',transferNote:'n',status:'APPLIED',createdAtUtc:new Date(0),
     cancelledAtUtc:null,lineCount:1}],
   [{transferId:ID(20),lineNo:1,offeringId:ID(5),offeringName:'Wax',qtyMilli:2500}],
   [{branchId:ID(8),displayName:'B'}],
   [{offeringId:ID(5),displayName:'Wax',qtyMilli:2500}],
  ];
  const db={getInternalPool(){return {request(){
   const r={input(){return r;},async execute(name){
    assert.equal(name,'core.ReadStockTransfers');return {recordsets:sets};}};
   return r;}};}};
  const data=await new InventoryService(db).listTransfers(actor,token,ID(3),ID(4));
  assert.equal(data.state,'NONPOSTING_BRANCH_TRANSFERS');
  assert.equal(data.posting,'NOT_POSTED');
  assert.equal(data.adr031,'NOT_IN_SCOPE');
  assert.equal(data.transfers[0].lines[0].qtyMilli,2500);
  assert.equal(data.destinations[0].branchId,ID(8));
  assert.equal(data.items[0].qtyMilli,2500);
  sets[0][0].status='POSTED';
  await assert.rejects(()=>new InventoryService(db).listTransfers(actor,token,ID(3),ID(4)),
   e=>e.getStatus?.()===503);
 });
});
