'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
const ts=require('typescript');
const vm=require('node:vm');
const day=require('../dist/packages/business-modules/operations/src/business-day');
const hr=require('../dist/packages/business-modules/hr/src/payroll-agreement');
const pos=require('../dist/packages/business-modules/pos/src/tip-preview');
const guid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const scope={tenantId:guid(1),businessId:guid(2),branchId:guid(3)};
function pinnedSource(file,gitBlob){
 const s=readFileSync(resolve(__dirname,'fixtures/cashier',file),'utf8');
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'),gitBlob);
 const exports={};
 const code=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports},{timeout:1000});
 return exports;
}
const cashierDay=pinnedSource('businessDayReconciliation.ts','e86e49fa7dea5f871c305d250622dea6f4d0fd0f');
const cashierPayroll=pinnedSource('payrollAgreementMath.ts','9cc11108ffcfc1dcbe80a3574c37c8d15279f9ec');

test('Operations: production DRVO day planner matches pinned Cashier valid scenarios',()=>{
 for(const [openDayDate,expectedDate,pastRolloverWindow] of [
  ['2026-11-15','2026-11-15',true],['2026-11-14','2026-11-15',false],
  ['2026-11-14','2026-11-15',true],['2026-11-20','2026-11-15',true],
  [null,'2026-11-15',true],['2026-01-01','2026-11-15',true],
 ]){
  const input={scope,openDayDate,expectedDate,pastRolloverWindow};
  const expected=cashierDay.planBusinessDayReconciliation({openDayDate,expectedDate,pastRolloverWindow});
  assert.equal(day.planBusinessDay(input),expected);
  assert.equal(day.needsBusinessDayMutation(expected),expected!=='NO_OP');
 }
});
test('Operations: malformed dates or missing/invalid scope denied before rollover',()=>{
 for(const change of [{expectedDate:'2026-02-30'},{expectedDate:'11/15/2026'},
   {scope:{...scope,branchId:'not-a-uuid'}},{scope:null},{pastRolloverWindow:1},
   {openDayDate:undefined}]){
  assert.throws(()=>day.planBusinessDay({...{
   scope,openDayDate:'2026-11-14',expectedDate:'2026-11-15',pastRolloverWindow:true,
  },...change}),TypeError);
 }
});
test('HR: salary prorate minor units matches Cashier for exact ordinary/leap cases',()=>{
 for(const [date,salary] of [['2026-11-16',30000],['2028-02-15',2900],
    ['2027-02-15',2800],['2026-11-01',10000]]){
  const legacy=cashierPayroll.prorateSalary(date,salary);
  const current=hr.prorateSalaryMinor(date,salary*100);
  assert.equal(current.days,legacy.days);assert.equal(current.monthDays,legacy.monthDays);
  assert.equal(current.amountMinor,Math.round(legacy.amount*100));
 }
 assert.deepEqual(hr.prorateSalaryMinor('2026-01-01',12345),
   {days:31,monthDays:31,amountMinor:12345});
});
test('HR: branch-scoped salary retro preview computes evidence difference without payout',()=>{
 const agreement={scope:{tenantId:guid(1),businessId:guid(2)},
  effectiveFrom:'2026-11-16',reason:'Effective salary change',
  branches:[{branchId:guid(3),enabled:true,monthlySalaryMinor:300000},
    {branchId:guid(4),enabled:false,monthlySalaryMinor:0}]};
 const response=hr.previewRetroSalaryAgreement(agreement,[
  {branchId:guid(3),amountMinor:20000,ledgerCreditMinor:30000},
  {branchId:guid(3).toUpperCase(),amountMinor:5000,ledgerCreditMinor:7000},
 ]);
 assert.equal(response.state,'UNPOSTED_HR_PREVIEW');
 assert.equal(response.impacts.length,1);
 assert.deepEqual(response.impacts[0],{
   branchId:guid(3),dailyCount:2,oldWagesMinor:25000,oldLedgerCreditsMinor:37000,
   monthlySalaryMinor:300000,newEntitlementMinor:150000,differenceMinor:113000,
 });
});
test('HR: foreign Branch, duplicate IDs, invalid amounts, dates, missing reason fail closed',()=>{
 const agreement={scope:{tenantId:guid(1),businessId:guid(2)},
  effectiveFrom:'2026-11-16',reason:'Effective salary change',
  branches:[{branchId:guid(3),enabled:true,monthlySalaryMinor:300000}]};
 for (const row of [
   {branchId:guid(99),amountMinor:100,ledgerCreditMinor:100},
   {branchId:guid(3),amountMinor:1.5,ledgerCreditMinor:100},
 ]) assert.throws(()=>hr.previewRetroSalaryAgreement(agreement,[row]),TypeError);
 for (const update of [{effectiveFrom:'2026-02-30'}, {reason:'short'},
   {branches:[...agreement.branches,{...agreement.branches[0],branchId:guid(3).toUpperCase()}]},
   {branches:[{branchId:guid(3),enabled:false,monthlySalaryMinor:0}]}]){
   assert.throws(()=>hr.previewRetroSalaryAgreement({...agreement,...update},[]),TypeError);
 }
});
test('POS: tentative tip preview matches Cashier positive difference, never says collected',()=>{
 assert.deepEqual(pos.previewTenderSurplus(9500,10000),{
  state:'NOT_COLLECTED',amountDifferenceMinor:500,possibleTipMinor:500,shortfallMinor:0});
 assert.deepEqual(pos.previewTenderSurplus(10500,10000),{
  state:'NOT_COLLECTED',amountDifferenceMinor:-500,possibleTipMinor:0,shortfallMinor:500});
 assert.throws(()=>pos.previewTenderSurplus(100,100.5),TypeError);
 assert.throws(()=>pos.previewTenderSurplus(0,Number.MAX_SAFE_INTEGER),TypeError);
});
test('POS: barber candidates grouped by employee ID, duplicate lines and unsafe IDs rejected',()=>{
 const candidates=pos.rankServiceExecutorTipCandidates([
  {employeeId:guid(5),lineSubtotalMinor:2000},
  {employeeId:guid(6),lineSubtotalMinor:4000},
  {employeeId:guid(5).toUpperCase(),lineSubtotalMinor:3000},
 ]);
 assert.deepEqual(candidates,[
  {employeeId:guid(5),serviceValueMinor:5000},
  {employeeId:guid(6),serviceValueMinor:4000},
 ]);
 assert.throws(()=>pos.rankServiceExecutorTipCandidates([{employeeId:guid(8),lineSubtotalMinor:-1}]),TypeError);
 assert.throws(()=>pos.rankServiceExecutorTipCandidates([{employeeId:'EMPID-8',lineSubtotalMinor:100}]),TypeError);
});
