'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');

test('packages section expands via commercial resolve without payment APIs',()=>{
 const ui=fs.readFileSync(path.join(root,'cashier-packages-section.tsx'),'utf8');
 assert.match(ui,/data-cashier-pos="packages-section"/);
 assert.match(ui,/data-cashier-pos="package-extras"/);
 assert.match(ui,/data-cashier-pos="package-home-visit"/);
 assert.match(ui,/\/catalog\/packages/);
 assert.match(ui,/\/resolve/);
 assert.match(ui,/expandPackageToDraftLines/);
 assert.match(ui,/mutuallyExclusive|home_visit|زيارة/);
 assert.match(ui,/مفيش دفع/);
 assert.match(ui,/SQL038/);
 assert.doesNotMatch(ui,/\/api\/sales|localStorage|ADR-031/);
});
test('SQL038 package snapshots persist on rich save and reload into cart',()=>{
 const rich=fs.readFileSync(path.join(root,'cashier-rich-draft-actions.tsx'),'utf8');
 assert.match(rich,/packageGroupKey/);
 assert.match(rich,/commercialPackagePriceMinor/);
 assert.match(rich,/packageRole/);
 const history=fs.readFileSync(path.join(root,'cashier-draft-history.tsx'),'utf8');
 assert.match(history,/hydratePackageMetaFromSnapshots/);
 assert.match(history,/data-cashier-pos="draft-reload-package-snapshots"/);
 const helper=fs.readFileSync(path.join(root,'cashier-package-cart.ts'),'utf8');
 assert.match(helper,/hydratePackageMetaFromSnapshots/);
 assert.match(helper,/PACKAGE_SNAPSHOT_ROLES/);
});

test('cart groups commercial package rows for display',()=>{
 const cart=fs.readFileSync(path.join(root,'cashier-cart-panel.tsx'),'utf8');
 assert.match(cart,/groupCartForDisplay/);
 assert.match(cart,/data-cashier-pos="cart-package-group"/);
 assert.match(cart,/حذف الباقة/);
 const helper=fs.readFileSync(path.join(root,'cashier-package-cart.ts'),'utf8');
 assert.match(helper,/findOverlappingRequiredCartItems/);
 assert.match(helper,/groupCartForDisplay/);
 assert.match(helper,/commercialPackagePriceMinor/);
});

test('workstation hosts packages + selected barber default executor wiring',()=>{
 const client=fs.readFileSync(path.join(root,'pos-preview-client.tsx'),'utf8');
 assert.match(client,/CashierPackagesSection/);
 assert.match(client,/defaultExecutorEmployeeId=\{selectedBarberId/);
 assert.match(client,/packageMeta/);
 assert.match(client,/groupKey/);
 const rich=fs.readFileSync(path.join(root,'cashier-rich-draft-actions.tsx'),'utf8');
 assert.match(rich,/defaultExecutorEmployeeId/);
 assert.match(rich,/lineKinds\?\.\[l\.offeringId\]==="PRODUCT"/);
 assert.match(rich,/منتج — بدون منفذ/);
 const cart=fs.readFileSync(path.join(root,'cashier-cart-panel.tsx'),'utf8');
 assert.match(cart,/selectedExecutorEmployeeId/);
 assert.match(cart,/data-cashier-pos="cart-executor"/);
});
