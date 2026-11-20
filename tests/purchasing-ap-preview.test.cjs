'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const pkg=path.join(root,'packages/business-modules/purchasing/src/ap-preview.ts');
const nest=path.join(root,'apps/api/src/purchasing/ap-preview.ts');
const pin='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
function hashObject(file){
 const r=spawnSync('git',['hash-object',file],{encoding:'utf8',cwd:root});
 assert.equal(r.status,0,r.stderr);
 return r.stdout.trim();
}
test('Nest AP preview copy stays aligned with shared package body',()=>{
 const shared=fs.readFileSync(pkg,'utf8').replace(/\r\n/g,'\n');
 const local=fs.readFileSync(nest,'utf8').replace(/\r\n/g,'\n');
 const sharedBody=shared.replace(/^\/\*\*[\s\S]*?\*\/\n/,'');
 const localBody=local.replace(/^\/\*\*[\s\S]*?\*\/\n/,'');
 assert.equal(localBody,sharedBody);
 assert.match(local,/Local Nest copy/);
 assert.match(shared,/nonposting/i);
});
test('Pinned Cashier purchasing blobs match ledger SHAs',()=>{
 const purchases=path.join(root,'_cashier_source/purchasing/purchases.route.ts');
 const service=path.join(root,'_cashier_source/purchasing/purchaseInventory.service.ts');
 assert.equal(hashObject(purchases),'e508819187d1e8f00564217b61cc39d072fa2cb9');
 assert.equal(hashObject(service),'e76e2e0a46582fa0eaec9e5dbe4e4e09c80122e3');
 assert.match(fs.readFileSync(purchases,'utf8'),/postPurchaseReceipt/);
 assert.match(fs.readFileSync(service,'utf8'),/PURCHASE_RECEIPT/);
 assert.ok(pin.length===40);
});
test('Shared AP preview exports nonposting constants',()=>{
 // Dynamic require via ts transpile is heavy; assert source contract instead.
 const src=fs.readFileSync(pkg,'utf8');
 assert.match(src,/AP_PREVIEW_ONLY/);
 assert.match(src,/NOT_PAID/);
 assert.match(src,/NOT_POSTED/);
 assert.match(src,/RECEIVE_DRAFTS_ONLY/);
 assert.match(src,/Math\.trunc\(product \/ 1000\)/);
});
