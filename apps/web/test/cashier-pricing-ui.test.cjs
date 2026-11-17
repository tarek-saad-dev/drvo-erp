'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('real private POS price quote reuses the K5 flag-gated POS page, not synthetic demo',()=>{
 const page=read('page.tsx'),client=read('pos-preview-client.tsx'),panel=read('cashier-pricing-panel.tsx');
 assert.match(page,/notFound\(\)/);
 assert.match(client,/CashierPricingPanel/);
 assert.match(panel,/cashier-invoice-quote/);
 assert.match(panel,/credentials:"same-origin"/);
 assert.match(panel,/cache:"no-store"/);
 assert.match(panel,/priceSource!=="FRESH_AUTHORIZED_CATALOG"/);
});
test('Cashier line+header discount and gross/net calculation are a visible operator workflow',()=>{
 const panel=read('cashier-pricing-panel.tsx');
 for(const token of ['lineDiscountMinor','lineDiscountPercentBps','headerDiscountMinor',
  'headerDiscountPercentBps','linesNetTotalMinor','lineDiscountTotalMinor',
  'grandTotalMinor','NOT_COLLECTED','NOT_POSTED','NOT_DECREMENTED','taxComputed'])
  assert.ok(panel.includes(token),token);
 assert.match(panel,/lineDiscountPercentBps":"lineDiscountMinor"/);
 assert.match(panel,/setQuote\(null\)/);
 assert.match(panel,/Array\.isArray\(result\.lines\)/);
});
test('No synthetic fixture, postable invoice, payment or login bypass introduced',()=>{
 const panel=read('cashier-pricing-panel.tsx');
 assert.doesNotMatch(panel,/DEMO_|localStorage|sessionStorage|IndexedDB|\/sales\/create|\/payment\/charge|\/api\/ledger/);
 assert.match(panel,/POS Draft V2|الخصومات دي مش محفوظة لسه|تقدر تحفظ الخصومات في SQL/);
 const client=read('pos-preview-client.tsx');
 assert.match(client,/key=\{JSON\.stringify\(lines\)\}/);
});
