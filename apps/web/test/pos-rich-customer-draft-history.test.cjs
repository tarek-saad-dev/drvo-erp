'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('customer draft history is private, scoped to existing SQL V2 read and default OFF flags',()=>{
 const page=read('page.tsx'),client=read('pos-preview-client.tsx'),history=read('cashier-draft-history.tsx');
 assert.match(page,/DRVO_POS_RICH_WEB_ENABLED==="YES"/);
 assert.match(client,/draftsEnabled&&richEnabled&&<CashierDraftHistory/);
 for(const route of ['/customers','/hr/employees','/cashier'])
  assert.ok(history.includes(route),route);
 assert.match(history,/credentials:"same-origin",cache:"no-store"/);
 assert.match(history,/CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY/);
 assert.match(history,/NOT_COLLECTED/);
 assert.match(history,/NOT_POSTED/);
 assert.match(history,/setState\("denied"\)/);
 assert.doesNotMatch(history,/localStorage|sessionStorage|\/demo\/salon|\/api\/payments|\/api\/sales/);
});
test('history distinguishes limited draft evidence from paid purchase history',()=>{
 const h=read('cashier-draft-history.tsx');
 assert.match(h,/dx\.limit!==50/);
 assert.match(h,/mayBeTruncated/);
 assert.match(h,/filter==="UNLINKED"/);
 assert.match(h,/filter==="ALL"/);
 assert.match(h,/customerId\?\.toLowerCase/);
 assert.match(h,/مش سجل مشتريات أو فواتير مدفوعة/);
 assert.match(h,/عرض الأصناف والمنفّذين/);
});
test('restored rich draft uses authorized current Catalog; never trusts saved money or state',()=>{
 const h=read('cashier-draft-history.tsx'),client=read('pos-preview-client.tsx');
 assert.match(h,/onUseDraft\(d\.lines\.map\(l=>\(\{offeringId:l\.offeringId,quantity:l\.quantity\}\)\)\)/);
 assert.match(client,/onUseDraft=\{savedLines=>createNewFromDraft\(\{lines:savedLines\}\)\}/);
 assert.match(client,/!offerings\.some\(o=>o\.offeringId===x\.offeringId&&o\.isActive\)/);
 assert.match(client,/setPreview\(null\);setAdjustment\(null\)/);
 assert.match(client,/setCartRevision\(v=>v\+1\)/);
 assert.match(client,/key=\{JSON\.stringify\(lines\)\+"-"\+cartRevision\+"-"\+selectedBarberId\}/);
 assert.doesNotMatch(h,/priceMinor\s*[:=]|setPaid|postInvoice|applyDiscount/);
});
test('saving rich draft refreshes separately authorized history',()=>{
 const client=read('pos-preview-client.tsx');
 assert.match(client,/setRichHistoryRevision\(v=>v\+1\)/);
});
