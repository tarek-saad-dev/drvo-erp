'use strict';
// Contract between the private HR admin UI (apps/web .../hr) and the existing HR API.
// No new endpoint/SQL was added for HR-01 UX; this pins what the UI depends on.
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const ts=require('typescript');
const {HrService}=require('../dist/hr/hr.service');
const modelPath=join(__dirname,'../../web/src/app/workspace/[businessId]/[branchId]/hr/hr-admin-model.ts');
const model=(()=>{
 const out=ts.transpileModule(readFileSync(modelPath,'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
 const m={exports:{}};new Function('module','exports',out.outputText)(m,m.exports);return m.exports;
})();
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'unit',mustChangePassword:false};
const token='A'.repeat(43);
const ENV={DRVO_HR_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
function withEnv(fn){
 const old=Object.fromEntries(Object.keys(ENV).map(k=>[k,process.env[k]]));
 Object.assign(process.env,ENV);
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;}});
}
const rosterRows=[
 {employeeId:ID(11),employeeCode:'BARBER_01',displayName:'Ahmed',employmentType:'full_time',
  payrollMethod:'daily',isActive:true,branchActive:true,isBookable:true,resourceId:ID(50),resourceName:'Chair'},
 {employeeId:ID(12),employeeCode:'OLD_02',displayName:'Old',employmentType:'part_time',
  payrollMethod:'hourly',isActive:true,branchActive:false,isBookable:false,resourceId:null,resourceName:null},
 {employeeId:ID(13),employeeCode:'GONE_03',displayName:'Gone',employmentType:'freelance',
  payrollMethod:'daily',isActive:false,branchActive:true,isBookable:false,resourceId:null,resourceName:null},
];
const db=calls=>({getInternalPool(){return {request(){
 const req={input(){return req;},async execute(name){calls.push(name);return {recordset:rosterRows};}};
 return req;
}};}});

test('roster list returns inactive rows unfiltered so the UI can offer archived/inactive tabs',async()=>{
 await withEnv(async()=>{
  const calls=[];
  const {employees}=await new HrService(db(calls)).list(actor,token,ID(3),ID(4));
  assert.deepEqual(calls,['core.ReadHrBranchRoster']);
  assert.equal(employees.length,3);
  const f=model.filterEmployees(employees,{...model.DEFAULT_HR_FILTERS,status:'inactive'});
  assert.deepEqual(f.map(e=>e.employeeCode),['OLD_02','GONE_03']);
  assert.deepEqual(model.summarizeRoster(employees),{total:3,active:1,inactive:2,barbers:1,freelance:1});
  for(const e of employees)assert.deepEqual(Object.keys(e).sort(),[
   'branchActive','displayName','employeeCode','employeeId','employmentType','isActive',
   'isBookable','payrollMethod','resourceId','resourceName']);
 });
});

test('bodies built by the UI model are accepted by ledger-preview and target-preview',async()=>{
 await withEnv(async()=>{
  const svc=new HrService(db([]));
  const rows=[
   {key:'a',employeeId:ID(11),entryDate:'2026-11-01',direction:'credit',reason:'monthly_salary',amountText:'1000'},
   {key:'b',employeeId:ID(11),entryDate:'2026-11-05',direction:'debit',reason:'advance',amountText:'1300.50'},
  ];
  const built=model.buildLedgerPreviewBody(rows,
   {employeeId:ID(11),kind:'advance_repayment',amountText:'300.50'});
  assert.equal(built.ok,true);
  const r=await svc.previewLedger(actor,token,ID(3),ID(4),built.body);
  assert.equal(model.isSafePreview(r),true);
  assert.equal(r.employees[0].balanceMinor,-30050);
  assert.equal(r.proposal.repaymentMinor,30050);
  assert.equal(r.proposal.balanceAfterMinor,0);
  // Every reason the UI offers is accepted with the directions the UI allows.
  for(const o of model.LEDGER_REASON_OPTIONS)for(const direction of o.directions){
   const b=model.buildLedgerPreviewBody([{key:'x',employeeId:ID(11),entryDate:'2026-11-01',
    direction,reason:o.reason,amountText:'10'}],null);
   assert.equal(b.ok,true,o.reason);
   const res=await svc.previewLedger(actor,token,ID(3),ID(4),b.body);
   assert.equal(res.persisted,false,o.reason);
  }
  const t=model.buildTargetPreviewBody('25000','20000',
   [{key:'1',startText:'10000',ratePercentText:'10'},{key:'2',startText:'20000',ratePercentText:'20'}]);
  assert.equal(t.ok,true);
  const tr=await svc.previewTarget(actor,token,ID(3),ID(4),t.body);
  assert.equal(model.isSafePreview(tr),true);
  assert.equal(tr.dayDeltaMinor,100000);
  assert.deepEqual(tr.breakdown.map(b=>b.rateBp),[1000,2000]);
 });
});

test('there is still no archive/payroll/payout HR route (archive stays a documented gap)',()=>{
 const src=readFileSync(join(__dirname,'../src/hr/hr.controller.ts'),'utf8');
 const routes=[...src.matchAll(/@(Get|Post|Put|Patch|Delete)\("([^"]+)"\)/g)].map(m=>m[1]+' '+m[2]);
 assert.deepEqual(routes.sort(),['Get employees','Post employees','Post employees/:employeeId/barber',
  'Post ledger-preview','Post target-preview'].sort());
});
