'use strict';
/**
 * POS-03 tips characterization. Pin: casher@046bf19. DRVO owns NON-POSTING tip math +
 * preview UX only. Tip recording (cash-in + employee ledger credit + WhatsApp) stays BLOCKED
 * behind ADR-031 / HR ledger / Treasury. Source-level tests: no SQL, no browser, no Cashier DB.
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
 'tipMath.ts':['src/lib/pos/tipMath.ts','2b140c817618421c1842662c8a9b88c635db9ec7'],
 'TipsModal.tsx':['src/components/pos/TipsModal.tsx','6fdbc6da3c0ff0b0b4ec3b07288f11ac5bbcae25'],
};
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const drvo=require('../dist/packages/business-modules/pos/src/tip-preview');
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
const roundMoney=v=>Math.round(v*100)/100; // Cashier src/lib/reportMonthUtils.ts roundMoney (line 49-51)
const cashier=run(read('_cashier_source/pos-tips/tipMath.ts'),
 id=>id==='@/lib/reportMonthUtils'?{roundMoney}:{});
const sanitizeSource=/function sanitizeAmountInput\(value: string\): string \{[\s\S]*?\n\}/
 .exec(read('_cashier_source/pos-tips/TipsModal.tsx'));
const cashierSanitize=run(sanitizeSource[0]+'\nexports.f=sanitizeAmountInput;').f;
const web=run(read(WEB+'cashier-tip-preview.ts'));
const plain=x=>JSON.parse(JSON.stringify(x));
const isTypeError=e=>Boolean(e)&&e.name==='TypeError'; // vm-realm errors are not instanceof the outer TypeError
const guid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');

test('Cashier tip excerpts are the exact pinned blobs and match the locked baseline',()=>{
 assert.equal(ledger.sourceRevision,PIN);
 const byPath=new Map(baseline.files.map(f=>[f.path,f.blob]));
 for(const [file,[src,blob]] of Object.entries(BLOBS)){
  assert.equal(gitBlob(read('_cashier_source/pos-tips/'+file)),blob,file);
  assert.equal(byPath.get(src),blob,src);
 }
 assert.ok(sanitizeSource,'sanitizeAmountInput must be extractable from the pinned TipsModal');
});

test('tip = presented - total: DRVO integer minor math equals Cashier calculateTipAmount',()=>{
 const cents=[0,1,50,99,100,101,9500,9999,10000,10001,10500,123456];
 for(const total of cents)for(const paid of cents){
  const c=Math.round(cashier.calculateTipAmount(paid/100,total/100)*100);
  const d=drvo.previewTenderSurplus(total,paid);
  assert.equal(d.amountDifferenceMinor,c,paid+'-'+total);
  assert.equal(d.possibleTipMinor,Math.max(c,0));
  assert.equal(d.shortfallMinor,Math.max(-c,0));
  assert.equal(d.state,'NOT_COLLECTED');
 }
});

test('executor candidates equal Cashier resolveTipBarberCandidates (grouping, order, products skipped)',()=>{
 const items=[
  {EmpID:5,EmpName:'A',SPrice:20,Qty:1},
  {EmpID:6,EmpName:'B',SPrice:40,Qty:1},
  {EmpID:5,EmpName:'A',SPrice:15,Qty:2},   // 5 => 50
  {EmpID:0,EmpName:'',SPrice:99,Qty:1},    // product / no executor skipped
  {EmpID:7,EmpName:'C',SPrice:10.5,Qty:2}, // 7 => 21
 ];
 const c=plain(cashier.resolveTipBarberCandidates(items)).map(x=>[guid(x.empId),Math.round(x.lineTotal*100)]);
 const d=drvo.rankServiceExecutorTipCandidates(items.filter(i=>i.EmpID)
  .map(i=>({employeeId:guid(i.EmpID),lineSubtotalMinor:Math.round(i.SPrice*i.Qty*100)})))
  .map(x=>[x.employeeId,x.serviceValueMinor]);
 assert.deepEqual(d,c);
 assert.deepEqual(d.map(x=>x[0]),[guid(5),guid(6),guid(7)]);
 // Documented divergence: equal revenue is first-seen in Cashier, employeeId order in DRVO
 // (deterministic, independent of cart order).
 const tied=[{EmpID:9,SPrice:10,Qty:1,EmpName:'9'},{EmpID:2,SPrice:10,Qty:1,EmpName:'2'}];
 assert.deepEqual(plain(cashier.resolveTipBarberCandidates(tied)).map(x=>x.empId),[9,2]);
 assert.deepEqual(drvo.rankServiceExecutorTipCandidates(tied.map(i=>
  ({employeeId:guid(i.EmpID),lineSubtotalMinor:1000}))).map(x=>x.employeeId),[guid(2),guid(9)]);
});

test('previewTipEntry mirrors TipsModal: default top barber, strictly positive tip, never recorded',()=>{
 const lines=[{employeeId:guid(5),lineSubtotalMinor:2000},{employeeId:guid(6),lineSubtotalMinor:4000}];
 const none=drvo.previewTipEntry(6000,null,lines,null);
 assert.deepEqual([none.outcome,none.possibleTipMinor,none.shortfallMinor,none.recipientEmployeeId,
  none.cashierWouldEnableSubmit],['NO_AMOUNT',0,0,guid(6),false]);
 const tip=drvo.previewTipEntry(6000,6500,lines,null);
 assert.deepEqual([tip.outcome,tip.possibleTipMinor,tip.cashierWouldEnableSubmit],['TIP',500,true]);
 assert.equal(drvo.previewTipEntry(6000,6500,lines,guid(5).toUpperCase()).recipientEmployeeId,guid(5));
 const exact=drvo.previewTipEntry(6000,6000,lines,null);
 assert.deepEqual([exact.outcome,exact.cashierWouldEnableSubmit],['NO_TIP',false]);
 const low=drvo.previewTipEntry(6000,5500,lines,null);
 assert.deepEqual([low.outcome,low.shortfallMinor,low.cashierWouldEnableSubmit],['BELOW_INVOICE',500,false]);
 // No executor on any service line: Cashier shows no barber and cannot submit.
 const noExec=drvo.previewTipEntry(6000,6500,[],null);
 assert.deepEqual([noExec.recipientEmployeeId,noExec.cashierWouldEnableSubmit],[null,false]);
 for(const s of [none,tip,exact,low,noExec]){
  assert.equal(s.state,'UNPOSTED_TIP_ENTRY_PREVIEW');assert.equal(s.persisted,false);
  assert.equal(s.paymentState,'NOT_COLLECTED');
  assert.equal(s.tipRecordingState,'BLOCKED_ADR_031_HR_TREASURY');
  assert.equal(s.employeeLedgerCredit,'NOT_AUTHORIZED');assert.equal(s.treasuryCashIn,'NOT_AUTHORIZED');
 }
 assert.throws(()=>drvo.previewTipEntry(6000,6500,lines,guid(99)),TypeError); // not a cart executor
 assert.throws(()=>drvo.previewTipEntry(6000,6500,lines,'EMP-5'),TypeError);
 assert.throws(()=>drvo.previewTipEntry(-1,100,lines,null),TypeError);
 assert.throws(()=>drvo.previewTipEntry(100,100.5,lines,null),TypeError);
 assert.throws(()=>drvo.previewTipEntry(100,NaN,lines,null),TypeError);
});

test('web helper sanitizeTipAmountInput equals the pinned TipsModal sanitizeAmountInput',()=>{
 for(const raw of ['','250','2,50','2.50','1,234.5','a1b2','1.2.3','..','1,,2','-5','1e3',' 12 ','١٢','12.345.6'])
  assert.equal(web.sanitizeTipAmountInput(raw),cashierSanitize(raw),JSON.stringify(raw));
});

test('web helper readTipAmountMinor is exact, bounded and stricter than Cashier Number()',()=>{
 const ok={'250':25000,'2.5':250,'2.50':250,'2,50':250,'0.05':5,'.5':50,'7.':700,'0':0,'  12.34 ':1234,'1,2,3':123 /* Cashier sanitize joins extra separators: 1.23 */};
 for(const [k,v] of Object.entries(ok))assert.equal(web.readTipAmountMinor(k),v,k);
 for(const bad of ['','.',',','abc','1.234','12345678901','90000000000.00','1,2,345'])
  assert.equal(web.readTipAmountMinor(bad),null,JSON.stringify(bad));
});

test('web computeTipEntry agrees with the DRVO package previewTipEntry',()=>{
 const sets=[[],[{employeeId:guid(5),lineSubtotalMinor:2000}],
  [{employeeId:guid(5),lineSubtotalMinor:2000},{employeeId:guid(6),lineSubtotalMinor:4000},
   {employeeId:guid(5).toUpperCase(),lineSubtotalMinor:3000}],
  [{employeeId:guid(3),lineSubtotalMinor:1000},{employeeId:guid(2),lineSubtotalMinor:1000}]];
 for(const lines of sets)for(const sel of [null,...lines.map(l=>l.employeeId)])
  for(const total of [0,6000,10000])for(const paid of [null,0,5999,6000,6001,12345]){
   const a=drvo.previewTipEntry(total,paid,lines,sel),b=web.computeTipEntry(total,paid,lines,sel);
   assert.deepEqual(JSON.parse(JSON.stringify(b)),JSON.parse(JSON.stringify({
    outcome:a.outcome,possibleTipMinor:a.possibleTipMinor,shortfallMinor:a.shortfallMinor,
    recipientEmployeeId:a.recipientEmployeeId,candidates:a.candidates,
    cashierWouldEnableSubmit:a.cashierWouldEnableSubmit})),[total,paid,sel].join('/'));
  }
 const lines=[{employeeId:guid(5),lineSubtotalMinor:100}];
 for(const args of [[-1,1,lines,null],[1,1.5,lines,null],[1,1,lines,guid(9)],[1,1,lines,'x'],
  [1,1,[{employeeId:'x',lineSubtotalMinor:1}],null],[1,1,[{employeeId:guid(1),lineSubtotalMinor:-1}],null]])
  assert.throws(()=>web.computeTipEntry(...args),isTypeError,JSON.stringify(args));
});

test('Nest/API surface is untouched: no tip route, no SQL, no posting in the tip module',()=>{
 const src=read('packages/business-modules/pos/src/tip-preview.ts');
 const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.doesNotMatch(code,/process\.env|sql\.|fetch\(|require\(|import\s|Date\.now|Math\.random|sendMessage|whatsapp/i);
 const tipFiles=fs.readdirSync(path.join(root,'apps/api/src'),{recursive:true})
  .filter(f=>/(^|[\\/])tips?[\\/.-]|tip\.(controller|service)/i.test(String(f)));
 assert.deepEqual(tipFiles,[],'no Nest tip controller/service until ADR-031 + HR + Treasury owners exist');
});

test('ledger keeps POS-03 honest: PORTING (preview only), finance still gated, no browser proof',()=>{
 const row=ledger.workflows.find(w=>w.ID==='POS-03');
 assert.ok(row);
 assert.ok(['PORTING','SOURCE_TESTED','BLOCKED'].includes(row.Status),row.Status);
 for(const k of ['BrowserProof','DataProof','PilotProof','SQLHTTPTest','UIProof'])assert.equal(row[k],'OPEN',k);
 assert.ok(row.TargetPaths.some(p=>p.includes('tip-preview.ts')));
 assert.ok(row.TargetPaths.some(p=>p.includes('cashier-tips-preview.tsx')));
 assert.match(row.DomainTest,/pos-tips-source\.test\.cjs/);
 assert.match(row.Blocker,/ADR-031/);
 assert.match(row.Blocker,/(ledger|Treasury)/i);
});
