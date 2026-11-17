'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('private server flags gate rich POS UI separately from legacy draft',()=>{
 const page=read('page.tsx'),client=read('pos-preview-client.tsx');
 assert.match(page,/DRVO_POS_RICH_WEB_ENABLED==="YES"/);
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(client,/richEnabled=\{draftsEnabled&&richEnabled\}/);
 assert.match(client,/afterSaved=\{\(\)=>void loadDrafts\(\)\}/);
});
test('only actual K5 authorized Customer and HR rosters, never synthetic fixtures',()=>{
 const rich=read('cashier-rich-draft-actions.tsx');
 assert.match(rich,/api\+"\/customers"/);
 assert.match(rich,/api\+"\/hr\/employees"/);
 assert.match(rich,/draftApi\+"\/cashier"/);
 assert.match(rich,/credentials:"same-origin",cache:"no-store"/);
 assert.match(rich,/setState\("denied"\)/);
 assert.doesNotMatch(rich,/DEMO_|localStorage|sessionStorage|IndexedDB|window\.location/);
});
test('saved Cashier price snapshot includes review quote, discount lines, customer and executor',()=>{
 const pricing=read('cashier-pricing-panel.tsx');
 const rich=read('cashier-rich-draft-actions.tsx');
 assert.match(pricing,/approvedInput/);
 assert.match(pricing,/CashierRichDraftActions/);
 assert.match(pricing,/expectedTotalMinor|quoteTotalMinor/);
 for(const field of ['lineDiscountMinor','lineDiscountPercentBps','executorEmployeeId',
  'customerId','expectedTotalMinor','Idempotency-Key','NOT_COLLECTED','NOT_POSTED'])
  assert.ok(rich.includes(field),'Missing persisted field or safeguard '+field);
 assert.doesNotMatch(rich,/\/api\/payments|\/api\/sales|\/api\/ledger|paidSale|CashMove/);
});
test('quote is cleared on discount edits so persisted draft requires fresh review',()=>{
 const pricing=read('cashier-pricing-panel.tsx');
 assert.match(pricing,/setQuote\(null\);setApprovedInput\(null\)/);
 assert.match(pricing,/quote&&approvedInput/);
});
