'use strict';
// SOURCE-LEVEL guards: DRAFT print is NONPOSTING browser preview; no thermal/POSTED/finance writes.
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const root=join(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const read=p=>readFileSync(join(root,p),'utf8');
const code=t=>t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const history=read('cashier-draft-history.tsx');
const view=read('cashier-draft-print-view.tsx');
const helper=read('cashier-draft-print.ts');
const page=read('draft-print/page.tsx');
const client=read('pos-preview-client.tsx');
const quick=read('cashier-quick-actions.tsx');

test('POS workstation wires draft history print path and hosts draft-print page flags',()=>{
 assert.match(client,/printBasePath=\{home\+"\/pos-preview"\}/);
 assert.match(history,/data-cashier-pos="draft-print-open"/);
 assert.match(history,/طباعة المسودة/);
 assert.match(history,/مسودة — غير محصّلة \/ غير مرحّلة/);
 assert.match(page,/DRVO_POS_RICH_WEB_ENABLED!=="YES"/);
 assert.match(page,/CashierDraftPrintView/);
 assert.match(page,/draftId/);
});

test('draft print view posts print-preview, shows banner, and uses browser print only',()=>{
 assert.match(view,/data-cashier-pos="draft-print-view"/);
 assert.match(view,/data-cashier-pos="draft-print-banner"/);
 assert.match(view,/DRAFT_PRINT_BANNER_AR/);
 assert.match(helper,/مسودة — غير محصّلة \/ غير مرحّلة/);
 assert.match(view,/method:"POST"/);
 assert.match(view,/\/print-preview/);
 assert.match(view,/openDraftBrowserPrint/);
 assert.match(view,/data-cashier-pos="draft-print-action"/);
 assert.match(helper,/POS_DRAFT_RECEIPT/);
 assert.match(helper,/NOT_COLLECTED/);
 assert.match(helper,/NOT_AVAILABLE/);
 assert.match(helper,/window\.print/);
 assert.match(helper,/thermalAgent:\s*"NOT_AVAILABLE"/);
 assert.doesNotMatch(code(helper),/printHtmlViaLocalService|PayCash|\/api\/sales/i);
});

test('draft print never invents paid posting, stock decrement, treasury, or GL',()=>{
 for(const src of [code(view),code(helper),code(page)]){
  assert.doesNotMatch(src,/accountingState\s*:\s*"POSTED"|paymentState\s*:\s*"COLLECTED"/);
  assert.doesNotMatch(src,/Idempotency-Key|localStorage|sessionStorage|IndexedDB/);
  assert.doesNotMatch(src,/\/api\/sales|whatsapp|stockDecrement|treasury/i);
 }
 assert.doesNotMatch(view,/method:\s*"(PUT|PATCH|DELETE)"/);
});

test('quick actions keep POSTED paid print blocked and point at draft print',()=>{
 assert.match(quick,/id:"print"[\s\S]*?POSTED reprint OPEN/);
 assert.match(quick,/سجل المسودات/);
 assert.match(quick,/disabled/);
});
