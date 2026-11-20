'use strict';
// SOURCE-LEVEL guards only (no browser run): returns panel is preview-only and cannot void/refund.
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const root=join(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const read=p=>readFileSync(join(root,p),'utf8');
const code=t=>t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const panel=read('cashier-returns-preview.tsx');
const helper=read('cashier-return-preview.ts');
const client=read('pos-preview-client.tsx');
const quick=read('cashier-quick-actions.tsx');

test('POS workstation hosts the returns preview panel',()=>{
 assert.match(client,/CashierReturnsPreview/);
 assert.match(client,/disabled=\{busy\|\|draftBusy\}/);
 assert.match(panel,/data-cashier-pos="returns-preview"/);
 assert.match(panel,/data-cashier-pos="returns-nonposting-banner"/);
});

test('returns panel and helper never fetch, store, delete, refund, or message',()=>{
 for(const src of [code(panel),code(helper)]){
  assert.doesNotMatch(src,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|IndexedDB|Idempotency-Key/);
  assert.doesNotMatch(src,/\/api\/sales|\/api\/pos\/|DELETE|whatsapp|sendMessage/i);
  assert.doesNotMatch(src,/Date\.now|Math\.random|process\.env|crypto\./);
  assert.doesNotMatch(src,/stockIncrement\s*=\s*[1-9]|UPDATE\s+stock|refundCash|treasury/i);
 }
 assert.doesNotMatch(panel,/method:\s*"(POST|PUT|PATCH|DELETE)"|onSubmit|type="submit"/);
});

test('void/refund button is disabled and labelled blocked; panel states NONPOSTING limits',()=>{
 assert.match(panel,/data-cashier-pos="return-void-blocked"/);
 assert.match(panel,/<button type="button"[^>]*disabled aria-disabled="true"/);
 assert.match(panel,/BLOCKED_ADR_031_SALES_VOID/);
 assert.match(panel,/NONPOSTING/);
 assert.match(panel,/معاينة فقط/);
 assert.match(panel,/ADR-031/);
 assert.match(panel,/لا عكس بيع · لا مخزون\+ · لا خزينة · لا نقاط · لا قيد · لا واتساب/);
 assert.doesNotMatch(panel,/onClick=/);
});

test('quick actions keep the returns button disabled and point at the preview panel',()=>{
 assert.match(quick,/id:"returns"[\s\S]*?ADR-031 Sales void gated/);
 assert.match(quick,/disabled/);
 assert.doesNotMatch(quick,/fetch\(|onClick/);
});

test('return helper is a pure port of the pinned Cashier reason/confirm gate',()=>{
 assert.match(helper,/casher@046bf19/);
 assert.match(helper,/d7af1617/);
 assert.match(helper,/e38b5cea/);
 assert.match(helper,/cashierWouldEnableConfirm/);
 assert.match(helper,/reason\.trim\(\)/);
});
