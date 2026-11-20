'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Inventory page requires K5 and independent web feature flag',()=>{
 const page=read('inventory/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_INVENTORY_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});

test('Inventory Client uses owned inventory API with nonposting receive/adjust',()=>{
 const client=read('inventory/inventory-client.tsx');
 assert.match(client,/\/api\/workspaces\//);
 assert.match(client,/\/inventory/);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/NONPOSTING_BRANCH_STOCK_BALANCES/);
 assert.match(client,/NOT_POSTED/);
 assert.match(client,/NOT_IN_SCOPE/);
 assert.match(client,/\/receives/);
 assert.match(client,/\/adjusts/);
 assert.match(client,/purchasingPosts/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB/);
 // INV-03 transfer UI lives in inventory-transfers.test.cjs
 assert.match(client,/home\+"\/inventory\/transfers"/);
});

test('Branch launcher reveals Inventory after inventory API auth, Other Income independently',()=>{
 const home=read('workspace-home-client.tsx');
 const route=read('page.tsx');
 assert.match(home,/if\(inventoryWebEnabled\)/);
 assert.match(home,/base\+"\/inventory"/);
 assert.match(home,/otherIncomeWebEnabled/);
 assert.match(home,/base\+"\/other-income"/);
 assert.match(route,/otherIncomeWebEnabled=\{process\.env\.DRVO_OTHER_INCOME_WEB_ENABLED==="YES"\}/);
 assert.match(route,/inventoryWebEnabled=\{process\.env\.DRVO_INVENTORY_WEB_ENABLED==="YES"\}/);
});

test('Other Income page is flagged and non-sale',()=>{
 const page=read('other-income/page.tsx');
 const client=read('other-income/other-income-client.tsx');
 assert.match(page,/DRVO_OTHER_INCOME_WEB_ENABLED/);
 assert.match(client,/NONPOSTING_OTHER_INCOME_DRAFTS_ONLY/);
 assert.match(client,/notSalesRevenue/);
 assert.match(client,/\/other-income/);
});

test('Light V1 inventory styles reuse ADR-024 tokens',()=>{
 const css=fs.readFileSync(path.resolve(__dirname,'../src/app/drvo-light.css'),'utf8');
 assert.match(css,/\.drvo-inventory-banner/);
 assert.match(css,/\.drvo-inventory-kpis/);
 assert.match(css,/var\(--drvo-deep\)/);
});
