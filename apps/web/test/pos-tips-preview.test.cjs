'use strict';
// SOURCE-LEVEL guards only (no browser run): tips panel is preview-only and cannot record a tip.
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const root=join(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const read=p=>readFileSync(join(root,p),'utf8');
const code=t=>t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const panel=read('cashier-tips-preview.tsx');
const helper=read('cashier-tip-preview.ts');
const client=read('pos-preview-client.tsx');
const quick=read('cashier-quick-actions.tsx');

test('POS workstation hosts the tips preview fed by the server-priced total',()=>{
 assert.match(client,/CashierTipsPreview/);
 assert.match(client,/adjustment\?adjustment\.afterDiscountMinor:preview\?preview\.listPriceSubtotalMinor:null/);
 assert.match(client,/o\.kind==="SERVICE"/);               // PRODUCT lines carry no executor
 assert.match(client,/onRoster=\{onRoster\}/);
 assert.match(panel,/data-cashier-pos="tips-preview"/);
 // Cart edits already null preview/adjustment, which removes the total and thus the tip basis.
 assert.match(client,/function quickAdd[\s\S]*?setPreview\(null\);setAdjustment\(null\)/);
});

test('tips panel and helper never record, fetch, store, or message',()=>{
 for(const src of [code(panel),code(helper)]){
  assert.doesNotMatch(src,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|IndexedDB|Idempotency-Key/);
  assert.doesNotMatch(src,/\/api\/pos\/tips|\/api\/sales|\/tips["'`]|whatsapp|sendMessage/i);
  assert.doesNotMatch(src,/Date\.now|Math\.random|process\.env|crypto\./);
 }
 assert.doesNotMatch(panel,/method:\s*"(POST|PUT|PATCH|DELETE)"|onSubmit|type="submit"/);
});

test('record button is disabled and labelled blocked; panel states the nonposting limits',()=>{
 assert.match(panel,/data-cashier-pos="tip-record-blocked"/);
 assert.match(panel,/<button type="button"[^>]*disabled aria-disabled="true"/);
 assert.match(panel,/BLOCKED_ADR_031_HR_TREASURY/);
 assert.match(panel,/معاينة فقط/);
 assert.match(panel,/لم يُحصَّل/);
 assert.match(panel,/ADR-031/);
 assert.match(panel,/لا تحصيل · لا قيد · لا واتساب/);
 assert.doesNotMatch(panel,/onClick=/);
});

test('quick actions keep the tips button disabled and point at the preview panel',()=>{
 assert.match(quick,/id:"tips"[\s\S]*?HR\/Treasury gated/);
 assert.match(quick,/disabled/);
 assert.doesNotMatch(quick,/fetch\(|onClick/);
});

test('tip helper is a pure UUID-guarded port of the pinned Cashier math',()=>{
 assert.match(helper,/casher@046bf19/);
 assert.match(helper,/2b140c81/);
 assert.match(helper,/6fdbc6da/);
 assert.match(helper,/UUID\.test\(line\.employeeId\)/);
 assert.match(helper,/Tip recipient must be a cart service executor/);
});
