'use strict';
/**
 * Cashier employee ledger / advances / deductions / targets characterization.
 * Pin: casher@046bf19. DRVO owns NON-POSTING integer-minor preview math only;
 * payout, payroll posting, cash movement and persisted ledger remain BLOCKED (ADR-031).
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
const ts=require('typescript');
const vm=require('node:vm');

const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const BLOBS={
 'employee-withdrawal-buckets.ts':'954a5767cba37c339c0eacbf9a9021be1b6a31c5',
 'employee-ledger-running-balance.ts':'c2e5baffc06aefb1e87411e966ff167516c5059f',
 'employee-ledger-liquidity.ts':'fd7415ff16a95478453ef311e9f4b44f92dc4e8d',
 'interBranchSettlementMath.ts':'0c0e2fe0ce65ac058a18e773c348a0763a8e020a',
 'employee-ledger-types.ts':'3ab3669fcd42f02d9570f27d6f2a18d40faec582',
};
const SOURCE_PATH={
 'employee-withdrawal-buckets.ts':'src/lib/hr/employee-withdrawal-buckets.ts',
 'employee-ledger-running-balance.ts':'src/lib/hr/employee-ledger-running-balance.ts',
 'employee-ledger-liquidity.ts':'src/lib/hr/employee-ledger-liquidity.ts',
 'interBranchSettlementMath.ts':'src/lib/hr/interBranchSettlementMath.ts',
 'employee-ledger-types.ts':'src/lib/types/employee-ledger.ts',
};
function pinned(file,requireStub){
 const s=readFileSync(resolve(__dirname,'fixtures/cashier',file),'utf8');
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'),
  BLOBS[file],'fixture blob drift for '+file);
 const exports={};
 const code=ts.transpileModule(s,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,module:{exports},require:requireStub||(()=>({}))},{timeout:1000});
 return exports;
}
// Cashier src/lib/reportMonthUtils.ts#580cf8f roundMoney: Math.round(value*100)/100.
const legacyRound={'@/lib/reportMonthUtils':{roundMoney:n=>Math.round(n*100)/100}};
const requireStub=name=>legacyRound[name]||{};
const buckets=pinned('employee-withdrawal-buckets.ts');
const running=pinned('employee-ledger-running-balance.ts',requireStub);
const liquidity=pinned('employee-ledger-liquidity.ts');
const settle=pinned('interBranchSettlementMath.ts');
const types=pinned('employee-ledger-types.ts');
const drvo=require('../dist/packages/business-modules/hr/src/employee-ledger');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const guid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const E1=guid(11),E2=guid(12);
const entry=(employeeId,entryDate,direction,reason,amountMinor)=>
 ({employeeId,entryDate,direction,reason,amountMinor});

test('pinned fixtures match locked Cashier baseline blobs at the pinned SHA',()=>{
 assert.equal(ledger.sourceRevision,PIN);
 const byPath=new Map(baseline.files.map(f=>[f.path,f.blob]));
 for(const [file,blob] of Object.entries(BLOBS))
  assert.equal(byPath.get(SOURCE_PATH[file]),blob,file);
});

test('DRVO reason vocabulary equals Cashier EMP_LEDGER_ENTRY_REASONS',()=>{
 assert.deepEqual([...drvo.LEDGER_REASONS],[...types.EMP_LEDGER_ENTRY_REASONS]);
 // Cashier credit/debit reason groups survive in DRVO direction rules.
 for(const reason of [...types.EMP_LEDGER_SALARY_CREDIT_REASONS,
   ...types.EMP_LEDGER_TARGET_CREDIT_REASONS,...types.EMP_LEDGER_FUNDING_CREDIT_REASONS,
   ...types.EMP_LEDGER_TIP_CREDIT_REASONS,...types.EMP_LEDGER_ADVANCE_REPAYMENT_CREDIT_REASONS]){
  assert.equal(drvo.normalizeLedgerEntries([entry(E1,'2026-11-01','credit',reason,100)]).length,1);
  assert.throws(()=>drvo.normalizeLedgerEntries([entry(E1,'2026-11-01','debit',reason,100)]),TypeError);
 }
 for(const reason of [...types.EMP_LEDGER_ADVANCE_DEBIT_REASONS,...types.EMP_LEDGER_PAYOUT_DEBIT_REASONS,
   'deduction']){
  assert.equal(drvo.normalizeLedgerEntries([entry(E1,'2026-11-01','debit',reason,100)]).length,1);
  assert.throws(()=>drvo.normalizeLedgerEntries([entry(E1,'2026-11-01','credit',reason,100)]),TypeError);
 }
 // settlement is two-sided (inter-branch legs); adjustment credit is a deliberate DRVO rejection.
 for(const direction of ['credit','debit'])
  assert.equal(drvo.normalizeLedgerEntries([entry(E1,'2026-11-01',direction,'settlement',100)]).length,1);
 assert.throws(()=>drvo.normalizeLedgerEntries([entry(E1,'2026-11-01','credit','adjustment',100)]),TypeError);
});

test('withdrawal buckets: DRVO minor-unit math equals pinned Cashier (golden + sweep)',()=>{
 const golden=[[310,0,0],[300,0,0],[200,0,50],[100,80,0],[40,60,50],[310,90,50],[0,0,100],[50,0,500]];
 for(const [advance,payout,cover] of golden){
  const old=buckets.computeEmployeeWithdrawalBuckets({advanceDebits:advance,payoutDebits:payout,
   salaryAndTarget:0,revenue:cover});
  const now=drvo.computeWithdrawalBuckets({advanceDebitsMinor:advance*100,
   payoutDebitsMinor:payout*100,coverCreditsMinor:cover*100});
  assert.equal(now.moneyTakenMinor,Math.round(old.moneyTaken*100));
  assert.equal(now.payoutWithinDuesMinor,Math.round(old.payoutWithinDues*100));
  assert.equal(now.revenueWithdrawalMinor,Math.round(old.revenueWithdrawal*100));
  assert.equal(now.advanceExcessMinor,Math.round(old.advanceExcess*100));
 }
 // deterministic sweep including fractional cents values where Cashier float rounding is exact
 let seed=7;const next=()=>(seed=(seed*1103515245+12345)%2147483648)%100000;
 for(let i=0;i<500;i++){
  const a=next(),p=next(),c=next();
  const old=buckets.computeEmployeeWithdrawalBuckets({advanceDebits:a/100,payoutDebits:p/100,
   salaryAndTarget:0,revenue:c/100});
  const now=drvo.computeWithdrawalBuckets({advanceDebitsMinor:a,payoutDebitsMinor:p,coverCreditsMinor:c});
  assert.equal(now.payoutWithinDuesMinor,Math.round(old.payoutWithinDues*100));
  assert.equal(now.revenueWithdrawalMinor,Math.round(old.revenueWithdrawal*100));
  assert.equal(now.advanceExcessMinor,Math.round(old.advanceExcess*100));
  assert.equal(now.revenueWithdrawalMinor+now.payoutWithinDuesMinor+now.advanceExcessMinor,
   now.moneyTakenMinor);
 }
 assert.throws(()=>drvo.computeWithdrawalBuckets({advanceDebitsMinor:-1,payoutDebitsMinor:0,
  coverCreditsMinor:0}),TypeError);
});

test('running balance: newest-first input, chronological credit - debit like Cashier',()=>{
 const rows=[
  entry(E1,'2026-07-03','debit','advance',5000),
  entry(E1,'2026-07-02','credit','monthly_salary',20000),
  entry(E1,'2026-07-01','credit','target',10000),
 ];
 const old=running.attachRunningBalances(rows.map((r,i)=>({id:rows.length-i,empId:1,
  entryDate:r.entryDate,entryDirection:r.direction,amount:r.amountMinor/100})));
 const now=drvo.attachRunningBalances(rows);
 assert.deepEqual(now.map(r=>r.runningBalanceMinor),old.map(r=>Math.round(r.runningBalance*100)));
 assert.deepEqual(now.map(r=>r.runningBalanceMinor),[25000,30000,10000]);
 assert.throws(()=>drvo.attachRunningBalances([{direction:'credit',amountMinor:0}]),TypeError);
});

test('summary: Cashier branch-breakdown balance formula equals credits - debits',()=>{
 const rows=[
  entry(E1,'2026-11-01','credit','monthly_salary',100000),
  entry(E1,'2026-11-02','credit','target',25000),
  entry(E1,'2026-11-03','credit','tip',3000),
  entry(E1,'2026-11-04','debit','advance',40000),
  entry(E1,'2026-11-05','debit','payout',10000),
  entry(E1,'2026-11-06','debit','deduction',5000),
  entry(E1,'2026-11-07','credit','advance_repayment',2000),
  entry(E1,'2026-11-08','credit','settlement',7000),
  entry(E1,'2026-11-09','debit','settlement',1000),
  entry(E2,'2026-11-02','debit','advance',15000),
 ];
 const [a,b]=drvo.summarizeLedgerByEmployee(rows);
 assert.equal(a.employeeId,E1);
 assert.equal(a.salaryCreditsMinor,100000);assert.equal(a.targetCreditsMinor,25000);
 assert.equal(a.fundingCreditsMinor,3000);assert.equal(a.repaymentCreditsMinor,2000);
 assert.equal(a.settlementCreditsMinor,7000);assert.equal(a.settlementDebitsMinor,1000);
 // funding(3000)+repayment(2000) cover advance first: revenueWithdrawal 5000, advance excess 35000
 assert.equal(a.revenueWithdrawalMinor,5000);assert.equal(a.advanceExcessMinor,35000);
 assert.equal(a.payoutWithinDuesMinor,10000);
 const credits=100000+25000+3000+2000+7000,debits=40000+10000+5000+1000;
 assert.equal(a.balanceMinor,credits-debits);
 assert.equal(a.outstandingAdvanceMinor,0);
 assert.equal(b.balanceMinor,-15000);assert.equal(b.outstandingAdvanceMinor,15000);
 const liq=drvo.summarizeBranchLiquidity([a,b]);
 const old=liquidity.calculateBranchLedgerLiquidity(
  [{branchId:1,branchCode:'B',branchName:'B',label:'B'}],
  [a,b].map(s=>({branches:{B:{branchId:1,balance:s.balanceMinor/100}}})))[0];
 assert.equal(liq.cashRequiredMinor,Math.round(old.cashRequired*100));
 assert.equal(liq.employeeDebtMinor,Math.round(old.employeeDebt*100));
 assert.equal(liq.netMinor,Math.round(old.netBalance*100));
 assert.equal(liq.cashRequiredMinor,a.balanceMinor);assert.equal(liq.employeeDebtMinor,15000);
});

test('advance repayment cap mirrors Cashier outstanding = max(0,-balance) guard',()=>{
 assert.deepEqual(drvo.previewAdvanceRepayment(-15000,5000),{state:'UNPOSTED_HR_LEDGER_PREVIEW',
  outstandingBeforeMinor:15000,repaymentMinor:5000,outstandingAfterMinor:10000,balanceAfterMinor:-10000});
 assert.equal(drvo.previewAdvanceRepayment(-15000,15000).outstandingAfterMinor,0);
 assert.throws(()=>drvo.previewAdvanceRepayment(-15000,15001),RangeError);
 assert.throws(()=>drvo.previewAdvanceRepayment(0,1),RangeError);
 assert.throws(()=>drvo.previewAdvanceRepayment(500,1),RangeError);
 assert.throws(()=>drvo.previewAdvanceRepayment(-100,0),TypeError);
 assert.throws(()=>drvo.previewAdvanceRepayment(-100,1.5),TypeError);
 // advances may exceed dues; the excess is outstanding debt, never silently capped
 assert.deepEqual(drvo.previewAdvanceDisbursement(10000,25000),{state:'UNPOSTED_HR_LEDGER_PREVIEW',
  coveredByDuesMinor:10000,becomesOutstandingMinor:15000,balanceAfterMinor:-15000,
  outstandingAfterMinor:15000});
 assert.equal(drvo.previewAdvanceDisbursement(-500,100).coveredByDuesMinor,0);
});

test('inter-branch max settlement equals Cashier computeMaxSettlementAmount',()=>{
 for(const [src,dst] of [[10000,-4000],[4000,-10000],[0,-100],[100,0],[-100,-100],[100,100],[5050,-5050]]){
  assert.equal(drvo.computeMaxSettlementMinor(src,dst),
   Math.round(settle.computeMaxSettlementAmount(src/100,dst/100)*100));
 }
});

test('statements: per-employee newest-first with running balance, stable on same date',()=>{
 const st=drvo.buildEmployeeStatements([
  entry(E1,'2026-11-01','credit','monthly_salary',10000),
  entry(E2,'2026-11-01','credit','target',999),
  entry(E1,'2026-11-02','debit','advance',3000),
  entry(E1,'2026-11-02','debit','deduction',500),
 ]);
 assert.equal(st.length,2);
 const [s1]=st;
 assert.deepEqual(s1.entries.map(e=>e.reason),['deduction','advance','monthly_salary']);
 assert.deepEqual(s1.entries.map(e=>e.runningBalanceMinor),[6500,7000,10000]);
});

// Golden values copied from Cashier src/lib/__tests__/employeeDailyTarget.test.ts#ae2aa9d.
const T=(startMinor,ratePercent)=>({startMinor:startMinor*100,rateBp:Math.round(ratePercent*100)});
test('progressive target tiers match Cashier golden cases (integer bp, one final round)',()=>{
 const cases=[
  [8000,[T(10000,10),T(20000,20)],0,null],
  [40000,[T(10000,10),T(20000,20)],5000,2],
  [40000,[T(10000,10),T(20000,20),T(30000,20)],5000,3],
  [25000,[T(10000,10),T(20000,20)],2000,2],
  [800,[T(1000,20)],0,null],
  [1000,[T(1000,20)],0,null],
  [1500,[T(1000,20)],100,1],
  [1500,[T(0,20)],300,1],
  [0,[T(0,20)],0,null],
 ];
 for(const [sales,tiers,expected,active] of cases){
  const r=drvo.calculateTargetMinor(sales*100,tiers);
  assert.equal(r.targetMinor,expected*100);assert.equal(r.activeTierIndex,active);
 }
 const mtd=drvo.calculateMtdDayTarget(25000*100,20000*100,[T(10000,10),T(20000,20)]);
 assert.equal(mtd.dayDeltaMinor,100000);// Cashier: mtdTarget(25k) 2000 - prior(20k) 1000
 // Cashier tier 5/6: 6dp thresholds are not representable in minor units, so check the
 // same shape at 2dp: rounding happens once on the summed numerator.
 const r=drvo.calculateTargetMinor(150000,[{startMinor:38462,rateBp:1000},{startMinor:115385,rateBp:2000}]);
 assert.equal(r.targetMinor,14615);
 assert.equal(r.breakdown[0].toMinor,115385);assert.equal(r.breakdown[1].toMinor,null);
 // sortTiers / validation parity: unordered, duplicate, >100% and <0% fail closed.
 assert.throws(()=>drvo.calculateTargetMinor(150000,[T(1000,20),T(500,10)]),TypeError);
 assert.equal(drvo.calculateTargetMinor(150000,[T(1000,20),T(500,10)],{sortTiers:true}).targetMinor,15000);
 assert.throws(()=>drvo.calculateTargetMinor(150000,[T(1000,10),T(1000,20)]),TypeError);
 assert.throws(()=>drvo.calculateTargetMinor(150000,[{startMinor:0,rateBp:10001}]),TypeError);
 assert.throws(()=>drvo.calculateTargetMinor(150000,[{startMinor:0,rateBp:-1}]),TypeError);
 assert.throws(()=>drvo.calculateTargetMinor(-1,[T(0,20)]),TypeError);
 assert.throws(()=>drvo.calculateTargetMinor(1.5,[T(0,20)]),TypeError);
 assert.throws(()=>drvo.calculateTargetMinor(100,[]),TypeError);
});

test('Nest local copy stays byte-identical to the package source body',()=>{
 const body=s=>s.slice(s.indexOf('*/')+2);
 const pkg=readFileSync(resolve(__dirname,'../packages/business-modules/hr/src/employee-ledger.ts'),'utf8');
 const api=readFileSync(resolve(__dirname,'../apps/api/src/hr/ledger-policy.ts'),'utf8');
 assert.equal(body(api).replace(/\r\n/g,'\n'),body(pkg).replace(/\r\n/g,'\n'));
});

test('ledger keeps HR ledger/advance/payroll rows honestly BLOCKED, no posting claimed',()=>{
 const byId=Object.fromEntries(ledger.workflows.map(w=>[w.ID,w]));
 for(const id of ['HR-03','HR-05','HR-07']){
  const row=byId[id];
  assert.equal(row.Status,'BLOCKED',id);
  assert.equal(row.PilotProof,'OPEN');assert.equal(row.BrowserProof,'OPEN');
  assert.equal(row.UIProof,'OPEN');assert.equal(row.DataProof,'OPEN');
  assert.ok(row.TargetPaths.some(p=>p.includes('hr.service.ts')||p.includes('employee-ledger.ts')),id);
  assert.match(row.DomainTest,/hr-employee-ledger-source\.test\.cjs/);
 }
 assert.equal(byId['HR-04'].Status,'BLOCKED');assert.match(byId['HR-04'].Blocker,/ADR-031/);
 for(const id of ['HR-06','HR-08','HR-11','HR-12'])assert.equal(byId[id].Status,'BLOCKED',id);
 for(const id of ['HR-05','HR-07'])assert.match(byId[id].Blocker,/no .*cash|no cash|cash/i);
});

test('DRVO preview module has no posting, payout, cash or payroll-close surface',()=>{
 const src=readFileSync(resolve(__dirname,'../packages/business-modules/hr/src/employee-ledger.ts'),'utf8');
 assert.match(src,/NON-POSTING/);
 assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g,''),
  /CashMove|post-to-cash|payroll\/daily|GL|process\.env|sql\.|fetch\(/);
});
