'use strict';
// HR-01 admin UX: pure-model behavior (transpiled from TS) + SOURCE-LEVEL contracts.
// No browser run; Browser/Data/Pilot proof stay OPEN in the workflow ledger.
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const ts=require('typescript');
const root=join(__dirname,'../src/app/workspace/[businessId]/[branchId]/hr');
const read=p=>readFileSync(join(root,p),'utf8');
const code=t=>t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
const modelSrc=read('hr-admin-model.ts');
const model=(()=>{
 const out=ts.transpileModule(modelSrc,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
 const m={exports:{}};new Function('module','exports',out.outputText)(m,m.exports);return m.exports;
})();
const client=read('hr-client.tsx'),ledger=read('hr-ledger-preview-panel.tsx'),
 target=read('hr-target-preview-panel.tsx'),page=read('page.tsx');
const E=(over)=>({employeeId:'00000001-0000-4000-8000-000000000001',employeeCode:'BARBER_01',
 displayName:'Ahmed Barber',employmentType:'full_time',payrollMethod:'daily',isActive:true,
 branchActive:true,isBookable:false,resourceId:null,resourceName:null,...over});
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';

test('roster filters: status tabs, search, employment/payroll/barber combine',()=>{
 const list=[
  E(),
  E({employeeId:ID(2),employeeCode:'REC_02',displayName:'Mona',employmentType:'part_time',payrollMethod:'hourly'}),
  E({employeeId:ID(3),employeeCode:'OLD_03',displayName:'Old Timer',branchActive:false}),
  E({employeeId:ID(4),employeeCode:'GONE_04',displayName:'Gone',isActive:false}),
  E({employeeId:ID(5),employeeCode:'FREE_05',displayName:'Sara',employmentType:'freelance',
   isBookable:true,resourceId:ID(9),resourceName:'Chair Alpha'}),
 ];
 const f=over=>model.filterEmployees(list,{...model.DEFAULT_HR_FILTERS,...over}).map(e=>e.employeeCode);
 assert.deepEqual(f({}),['BARBER_01','REC_02','FREE_05']);                 // default = active
 assert.deepEqual(f({status:'inactive'}),['OLD_03','GONE_04']);
 assert.equal(f({status:'all'}).length,5);
 assert.deepEqual(f({status:'all',query:'  mona '}),['REC_02']);
 assert.deepEqual(f({query:'chair'}),['FREE_05']);                          // resource name is searchable
 assert.deepEqual(f({query:'rec_'}),['REC_02']);
 assert.deepEqual(f({employment:'part_time'}),['REC_02']);
 assert.deepEqual(f({payroll:'hourly'}),['REC_02']);
 assert.deepEqual(f({barber:'barber'}),['FREE_05']);
 assert.deepEqual(f({barber:'not_barber',status:'all'}),['BARBER_01','REC_02','OLD_03','GONE_04']);
 assert.deepEqual(f({query:'zzz'}),[]);
 assert.deepEqual(model.summarizeRoster(list),{total:5,active:3,inactive:2,barbers:1,freelance:1});
 assert.equal(model.rosterMayBeTruncated(Array(199).fill(E())),false);
 assert.equal(model.rosterMayBeTruncated(Array(200).fill(E())),true);
});

test('tabs resolve safely and unknown ?tab falls back to employees',()=>{
 assert.deepEqual(model.HR_ADMIN_TABS.map(t=>t.id),['employees','ledger-preview','target-preview']);
 assert.equal(model.resolveHrTab('ledger-preview'),'ledger-preview');
 for(const bad of [null,undefined,'','payroll','daily-payroll','__proto__'])
  assert.equal(model.resolveHrTab(bad),'employees');
});

test('money and percent parsing is integer-only and bounded',()=>{
 assert.equal(model.parseMoneyToMinor('1'),100);
 assert.equal(model.parseMoneyToMinor('12.5'),1250);
 assert.equal(model.parseMoneyToMinor('0.01'),1);
 for(const bad of ['','0','0.00','-1','1.234','1,5','abc','1e3',' ','123456789012'])
  assert.equal(model.parseMoneyToMinor(bad),null,bad);
 assert.equal(model.parseNonNegativeMoneyToMinor('0'),0);
 assert.equal(model.parseNonNegativeMoneyToMinor('0.00'),0);
 assert.equal(model.parseNonNegativeMoneyToMinor('-0'),null);
 assert.equal(model.formatMinor(123456),'1,234.56');
 assert.equal(model.formatMinor(-5),'-0.05');
 assert.equal(model.parsePercentToBp('10'),1000);
 assert.equal(model.parsePercentToBp('12.5'),1250);
 assert.equal(model.parsePercentToBp('100'),10000);
 for(const bad of ['100.01','101','-1','','1.234','x'])assert.equal(model.parsePercentToBp(bad),null,bad);
});

test('ledger draft body matches the strict API shape and rejects bad drafts',()=>{
 const row=(over)=>({key:'r1',employeeId:ID(1).toUpperCase(),entryDate:'2026-11-01',direction:'credit',
  reason:'monthly_salary',amountText:'1000.50',...over});
 const ok=model.buildLedgerPreviewBody([row()],null);
 assert.equal(ok.ok,true);
 assert.deepEqual(ok.body,{entries:[{employeeId:ID(1),entryDate:'2026-11-01',direction:'credit',
  reason:'monthly_salary',amountMinor:100050}],proposal:null});
 assert.deepEqual(Object.keys(ok.body).sort(),['entries','proposal']);
 assert.deepEqual(Object.keys(ok.body.entries[0]).sort(),
  ['amountMinor','direction','employeeId','entryDate','reason']);
 const withProposal=model.buildLedgerPreviewBody([],{employeeId:ID(1),kind:'advance',amountText:'50'});
 assert.deepEqual(withProposal.body.proposal,{employeeId:ID(1),kind:'advance',amountMinor:5000});
 for(const bad of [row({entryDate:'2026-02-30'}),row({employeeId:'x'}),row({direction:'debit'}),
  row({reason:'payroll_payment'}),row({amountText:'0'}),row({amountText:'1.234'}),
  row({reason:'advance',direction:'credit'})])
  assert.equal(model.buildLedgerPreviewBody([bad],null).ok,false,JSON.stringify(bad));
 assert.equal(model.buildLedgerPreviewBody([],{employeeId:'x',kind:'advance',amountText:'5'}).ok,false);
 assert.equal(model.buildLedgerPreviewBody(Array(501).fill(row()),null).ok,false);
 // settlement is the only reason allowing both directions
 assert.deepEqual([...model.directionsForReason('settlement')],['credit','debit']);
 assert.deepEqual([...model.directionsForReason('payout')],['debit']);
 assert.deepEqual([...model.directionsForReason('nope')],[]);
});

test('every UI ledger reason is one the API accepts (same vocabulary as ledger-policy)',()=>{
 const policy=readFileSync(join(__dirname,'../../api/src/hr/ledger-policy.ts'),'utf8');
 const list=policy.match(/LEDGER_REASONS = \[([\s\S]*?)\] as const/)[1].match(/"([a-z_]+)"/g).map(s=>s.slice(1,-1));
 assert.deepEqual(model.LEDGER_REASON_OPTIONS.map(o=>o.reason).sort(),[...list].sort());
});

test('target draft body validates tiers and mirrors the strict API shape',()=>{
 const tier=(s,r,k)=>({key:k||'t',startText:s,ratePercentText:r});
 const ok=model.buildTargetPreviewBody('25000','20000',[tier('0','0','a'),tier('10000','10','b'),tier('20000','20.5','c')]);
 assert.equal(ok.ok,true);
 assert.deepEqual(ok.body,{mtdSalesMinor:2500000,priorMtdSalesMinor:2000000,
  tiers:[{startMinor:0,rateBp:0},{startMinor:1000000,rateBp:1000},{startMinor:2000000,rateBp:2050}]});
 assert.deepEqual(Object.keys(ok.body).sort(),['mtdSalesMinor','priorMtdSalesMinor','tiers']);
 for(const args of [
  ['x','0',[tier('0','1')]],['10','20',[tier('0','1')]],['10','5',[]],
  ['10','5',[tier('5','1'),tier('5','2')]],['10','5',[tier('9','1'),tier('5','2')]],
  ['10','5',[tier('0','101')]],['10','5',[tier('-1','1')]],
 ]) assert.equal(model.buildTargetPreviewBody(...args).ok,false,JSON.stringify(args));
 assert.equal(model.buildTargetPreviewBody('1','0',Array(51).fill(tier('1','1'))).ok,false);
});

test('preview responses render only when explicitly unposted and unpersisted',()=>{
 const good={state:'UNPOSTED_HR_LEDGER_PREVIEW',persisted:false,financialPostingState:'NOT_AUTHORIZED'};
 assert.equal(model.isSafePreview(good),true);
 for(const bad of [{},{...good,persisted:true},{...good,state:'POSTED'},
  {...good,financialPostingState:'AUTHORIZED'},{...good,persisted:undefined}])
  assert.equal(model.isSafePreview(bad),false);
});

test('private route keeps both flags and the client keeps no browser persistence',()=>{
 assert.match(page,/DRVO_K5_WEB_ENABLED/);assert.match(page,/DRVO_HR_WEB_ENABLED/);
 for(const src of [client,ledger,target,modelSrc])
  assert.doesNotMatch(code(src),/localStorage|sessionStorage|IndexedDB|document\.cookie/);
});

test('employees tab exposes search, status tabs, filters, KPIs and real API calls',()=>{
 assert.match(client,/data-hr="search"/);assert.match(client,/data-hr="filters"/);
 assert.match(client,/data-hr="kpis"/);assert.match(client,/data-hr-status=\{s\.id\}/);
 assert.match(client,/filterEmployees\(employees,filters\)/);
 assert.match(client,/summarizeRoster\(employees\)/);
 assert.match(client,/\/hr\/employees"/);assert.match(client,/\/barber"/);
 assert.match(client,/headers:\{"Content-Type":"application\/json","Idempotency-Key":requestId\.current\}/);
 assert.match(client,/Idempotency-Key":configIds\.current\[e\.employeeId\]/);
 assert.match(client,/hrBase\+"\/ledger-preview"/);assert.match(client,/hrBase\+"\/target-preview"/);
 assert.match(client,/employees\.filter\(isRosterActive\)/);          // ledger only offers active roster
 assert.match(client,/URLSearchParams\(window\.location\.search\)\.get\("tab"\)/);
 assert.match(client,/data-hr-tab=\{t\.id\}/);
});

test('archive is honestly blocked: no archive/deactivate network call exists',()=>{
 assert.match(client,/data-hr="archive-blocked"/);
 assert.match(client,/<button type="button" disabled aria-disabled="true" data-hr="archive-blocked"/);
 assert.doesNotMatch(code(client),/\/archive|\/deactivate|method:"(DELETE|PUT|PATCH)"/);
 assert.doesNotMatch(code(client),/archive\w*\(/);
});

test('ledger and target panels are preview-only: no write keys, no payout/payroll/treasury calls',()=>{
 for(const src of [code(ledger),code(target)]){
  assert.doesNotMatch(src,/Idempotency-Key|crypto\.randomUUID|Math\.random|Date\.now/);
  assert.doesNotMatch(src,/\/treasury|\/payout|\/payroll|\/cash|\/expenses|\/reports|\/pos-drafts/i);
  assert.doesNotMatch(src,/method:"(PUT|PATCH|DELETE)"/);
  assert.match(src,/method:"POST",credentials:"same-origin",cache:"no-store"/);
  assert.match(src,/isSafePreview\(data\)/);
  assert.match(src,/ADR-031/);
 }
 assert.match(ledger,/data-hr="ledger-payout-blocked"/);
 assert.match(ledger,/disabled aria-disabled="true" data-hr="ledger-payout-blocked"/);
 assert.match(ledger,/UNPOSTED_HR_LEDGER_PREVIEW/);
 assert.match(ledger,/previewUrl/);assert.match(target,/previewUrl/);
 assert.doesNotMatch(client,/\/hr\/(payroll|payout|ledger(?!-preview))/);
});
