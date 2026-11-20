'use strict';
/**
 * POS-16 returns/void characterization. Pin: casher@046bf19. DRVO owns NON-POSTING
 * confirm-gate preview only. Sale delete / stock reverse / Treasury refund / loyalty reverse
 * stay BLOCKED behind ADR-031 / Sales void owner. Source-level tests: no SQL, no browser.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const ts=require('typescript');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const BLOBS={
 'DeleteInvoiceDialog.tsx':['src/components/sales/DeleteInvoiceDialog.tsx','d7af16171c1fe2a05e06ee109476b76afc244e81'],
 'deleteSalesInvoice.ts':['src/lib/deleteSalesInvoice.ts','e38b5ceab439dc5ac823375fd95352e4b3e688d6'],
};
const ROUTE_BLOB='2e9746f0003587b94dc36344877bc7f61210d9e1';
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const drvo=require('../dist/packages/business-modules/pos/src/return-preview');
const WEB='apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/';

function gitBlob(text){
 const bytes=Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function transpile(code){
 return ts.transpileModule(code,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
}
function run(code,req){
 const exports={};
 vm.runInNewContext(transpile(code),{exports,module:{exports},require:req||(()=>({})),Date},{timeout:1000});
 return exports;
}
const isTypeError=e=>Boolean(e)&&e.name==='TypeError';
const web=run(read(WEB+'cashier-return-preview.ts'));
const guard=run(read('_cashier_source/pos-returns/deleteReasonGuard.ts'));
const dialog=read('_cashier_source/pos-returns/DeleteInvoiceDialog.tsx');
const helperSrc=read('_cashier_source/pos-returns/deleteSalesInvoice.ts');

test('Cashier return excerpts are the exact pinned blobs and match the locked baseline',()=>{
 assert.equal(ledger.sourceRevision,PIN);
 const byPath=new Map(baseline.files.map(f=>[f.path,f.blob]));
 for(const [file,[src,blob]] of Object.entries(BLOBS)){
  assert.equal(gitBlob(read('_cashier_source/pos-returns/'+file)),blob,file);
  assert.equal(byPath.get(src),blob,src);
 }
 assert.equal(byPath.get('src/app/api/sales/[id]/route.ts'),ROUTE_BLOB);
 assert.match(dialog,/disabled=\{deleting \|\| !reason\.trim\(\)\}/);
 assert.match(dialog,/سبب مسح فاتورة المبيعات مطلوب/);
 assert.match(helperSrc,/normalizedReason = reason\.trim\(\)/);
 assert.match(helperSrc,/سبب مسح فاتورة المبيعات مطلوب/);
});

test('Cashier reason guard + DRVO normalizeReturnReason agree on trim/empty',()=>{
 for(const raw of ['','   ','\t','سبب','  سبب  ','a'.repeat(50)]){
  const trimmed=typeof raw==='string'?raw.trim():'';
  if(!trimmed){
   assert.throws(()=>guard.requireDeleteReason({reason:raw}),/سبب مسح/);
   assert.equal(drvo.normalizeReturnReason(raw),'');
   assert.equal(drvo.previewReturnRefund('1042',raw).outcome,'NO_REASON');
   assert.equal(drvo.previewReturnRefund('1042',raw).cashierWouldEnableConfirm,false);
  }else{
   assert.equal(guard.requireDeleteReason({reason:raw}),trimmed);
   assert.equal(drvo.normalizeReturnReason(raw),trimmed);
   assert.equal(drvo.previewReturnRefund('1042',raw).outcome,'READY_IN_CASHIER');
   assert.equal(drvo.previewReturnRefund('1042',raw).cashierWouldEnableConfirm,true);
  }
 }
});

test('previewReturnRefund mirrors DeleteInvoiceDialog confirm gate and never authorizes writes',()=>{
 const none=drvo.previewReturnRefund(null,'');
 assert.deepEqual([none.outcome,none.cashierWouldEnableConfirm,none.saleDisplayRef],
  ['NO_REASON',false,null]);
 const missing=drvo.previewReturnRefund(null,'عميل رجّع المنتج');
 assert.deepEqual([missing.outcome,missing.cashierWouldEnableConfirm],['MISSING_SALE_REF',false]);
 const blankRef=drvo.previewReturnRefund('   ','عميل رجّع المنتج');
 assert.equal(blankRef.outcome,'MISSING_SALE_REF');
 const ready=drvo.previewReturnRefund('1042','  خطأ إدخال  ');
 assert.deepEqual([ready.outcome,ready.normalizedReason,ready.saleDisplayRef,ready.cashierWouldEnableConfirm],
  ['READY_IN_CASHIER','خطأ إدخال','1042',true]);
 for(const s of [none,missing,blankRef,ready]){
  assert.equal(s.state,'UNPOSTED_RETURN_REFUND_PREVIEW');assert.equal(s.persisted,false);
  assert.equal(s.paymentState,'NOT_COLLECTED');
  assert.equal(s.saleReverseState,'BLOCKED_ADR_031_SALES_VOID');
  assert.equal(s.stockIncrement,'NOT_AUTHORIZED');
  assert.equal(s.treasuryCashRefund,'NOT_AUTHORIZED');
  assert.equal(s.loyaltyReverse,'NOT_AUTHORIZED');
  assert.equal(s.glPosting,'NOT_AUTHORIZED');
  assert.equal(s.outboundMessaging,'NOT_AUTHORIZED');
 }
 assert.throws(()=>drvo.previewReturnRefund(1,'x'),TypeError);
 assert.throws(()=>drvo.previewReturnRefund('1042',null),TypeError);
 assert.throws(()=>drvo.previewReturnRefund('../etc/passwd','x'),TypeError);
 assert.throws(()=>drvo.previewReturnRefund('a/b','x'),TypeError);
 assert.throws(()=>drvo.normalizeReturnReason('x'.repeat(2001)),TypeError);
});

test('web computeReturnEntry agrees with the DRVO package previewReturnRefund',()=>{
 const refs=[null,'','  ','1042','#88','فاتورة-1'];
 const reasons=['','  ','سبب','  سبب مرتجع  '];
 for(const ref of refs)for(const reason of reasons){
  const a=drvo.previewReturnRefund(ref===''||(typeof ref==='string'&&!ref.trim())?null:ref,reason);
  const b=web.computeReturnEntry(ref===''||(typeof ref==='string'&&!ref.trim())?null:ref,reason);
  assert.deepEqual(JSON.parse(JSON.stringify(b)),JSON.parse(JSON.stringify({
   outcome:a.outcome,normalizedReason:a.normalizedReason,saleDisplayRef:a.saleDisplayRef,
   cashierWouldEnableConfirm:a.cashierWouldEnableConfirm})),[ref,reason].join('/'));
 }
 for(const args of [[1,'x'],['1042',null],['x'.repeat(65),'ok'],['ok','x'.repeat(2001)]])
  assert.throws(()=>web.computeReturnEntry(...args),isTypeError,JSON.stringify(args));
});

test('Nest/API surface is untouched: no void/refund route, no SQL, no posting in the return module',()=>{
 const src=read('packages/business-modules/pos/src/return-preview.ts');
 const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.doesNotMatch(code,/process\.env|sql\.|fetch\(|require\(|import\s|Date\.now|Math\.random|sendMessage|whatsapp/i);
 const returnFiles=fs.readdirSync(path.join(root,'apps/api/src'),{recursive:true})
  .filter(f=>/(^|[\\/])(refunds?|returns?|void-sale)[\\/.-]/i.test(String(f)));
 assert.deepEqual(returnFiles,[],'no Nest refund/void controller until ADR-031 + Sales void owner exist');
});

test('ledger keeps POS-16 honest: PORTING (preview only), finance still gated, no browser proof',()=>{
 const row=ledger.workflows.find(w=>w.ID==='POS-16');
 assert.ok(row);
 assert.ok(['PORTING','SOURCE_TESTED','BLOCKED'].includes(row.Status),row.Status);
 for(const k of ['BrowserProof','DataProof','PilotProof','SQLHTTPTest','UIProof'])assert.equal(row[k],'OPEN',k);
 assert.ok(row.TargetPaths.some(p=>p.includes('return-preview.ts')));
 assert.ok(row.TargetPaths.some(p=>p.includes('cashier-returns-preview.tsx')));
 assert.match(row.DomainTest,/pos-returns-source\.test\.cjs/);
 assert.match(row.Blocker,/ADR-031/);
 assert.match(row.Blocker,/(void|Sales)/i);
 assert.notEqual(row.Status,'DRVO_CI_PASS');
});
