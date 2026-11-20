'use strict';
/** INV-03 private Light transfer UI source guards — no browser, no SQL. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Inventory transfers page requires K5 + inventory web flags',()=>{
 const page=read('inventory/transfers/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_INVENTORY_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});

test('Transfers Client lists/creates/cancels via owned API with NONPOSTING banners',()=>{
 const client=read('inventory/transfers/transfers-client.tsx');
 assert.match(client,/\/api\/workspaces\//);
 assert.match(client,/\/inventory\/transfers/);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/NONPOSTING_BRANCH_TRANSFERS/);
 assert.match(client,/ATOMIC_APPLY_CANCEL_REVERSE/);
 assert.match(client,/NOT_POSTED/);
 assert.match(client,/NOT_IN_SCOPE/);
 assert.match(client,/NOT_PAID/);
 assert.match(client,/Idempotency-Key/);
 assert.match(client,/\{toBranchId,note,lines\}/);
 assert.match(client,/\/cancel/);
 assert.match(client,/direction==="OUT"/);
 // Source stock guard mirrors SQL032 (Cashier allowNegativeOverride=false).
 assert.match(client,/qtyMilli>item\.qtyMilli/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB/);
 // Banner may say "بدون … COGS …"; forbid payment/cost fields on the wire body.
 assert.doesNotMatch(client,/\bpaid\s*:|journal|glAccount|unitCost/i);
 assert.match(client,/بدون GL أو COGS أو AP/);
});

test('Main inventory client only links to transfers; does not POST transfer payloads',()=>{
 const client=read('inventory/inventory-client.tsx');
 assert.match(client,/home\+"\/inventory\/transfers"/);
 assert.doesNotMatch(client,/api\+"\/transfers/);
});
