'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');

test('packages section expands required SERVICE includes without payment APIs',()=>{
 const ui=fs.readFileSync(path.join(root,'cashier-packages-section.tsx'),'utf8');
 assert.match(ui,/data-cashier-pos="packages-section"/);
 assert.match(ui,/\/catalog\/packages/);
 assert.match(ui,/expandPackageToDraftLines/);
 assert.match(ui,/kind!=="SERVICE"/);
 assert.match(ui,/maxLines\?\?20/);
 assert.match(ui,/مفيش استرداد باقة ولا دفع/);
 assert.doesNotMatch(ui,/method:\s*"POST"|\/api\/sales|localStorage/);
});

test('workstation hosts packages + selected barber default executor wiring',()=>{
 const client=fs.readFileSync(path.join(root,'pos-preview-client.tsx'),'utf8');
 assert.match(client,/CashierPackagesSection/);
 assert.match(client,/defaultExecutorEmployeeId=\{selectedBarberId/);
 assert.match(client,/selectedExecutorEmployeeId=\{selectedBarberId\}/);
 const rich=fs.readFileSync(path.join(root,'cashier-rich-draft-actions.tsx'),'utf8');
 assert.match(rich,/defaultExecutorEmployeeId/);
 assert.match(rich,/lineKinds\?\.\[l\.offeringId\]==="PRODUCT"/);
 assert.match(rich,/منتج — بدون منفذ/);
 const cart=fs.readFileSync(path.join(root,'cashier-cart-panel.tsx'),'utf8');
 assert.match(cart,/selectedExecutorEmployeeId/);
 assert.match(cart,/data-cashier-pos="cart-executor"/);
});
