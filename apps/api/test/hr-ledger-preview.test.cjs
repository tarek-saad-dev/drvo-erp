'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {HrService}=require('../dist/hr/hr.service');
const {HrController}=require('../dist/hr/hr.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'unit',mustChangePassword:false};
const token='A'.repeat(43);
const E1=ID(11),E2=ID(12),FOREIGN=ID(99);
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
const ENABLED={DRVO_HR_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
function rosterDb(ids,calls){
 return {getInternalPool(){return {request(){
  const req={input(){return req;},async execute(name){
   calls.push(name);
   return {recordset:ids.map(employeeId=>({employeeId}))};
  }};
  return req;
 }};}};
}
const sqlForbidden={getInternalPool(){throw Error('SQL accessed');}};
const row=(employeeId,entryDate,direction,reason,amountMinor)=>
 ({employeeId,entryDate,direction,reason,amountMinor});

test('ledger/target preview is disabled by default, before SQL, auth or body parsing',async()=>{
 await withEnv({DRVO_HR_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const svc=new HrService(sqlForbidden);
  await assert.rejects(()=>svc.previewLedger(actor,token,ID(3),ID(4),{}),e=>e.getStatus?.()===503);
  await assert.rejects(()=>svc.previewTarget(actor,token,ID(3),ID(4),{}),e=>e.getStatus?.()===503);
  const ctrl=new HrController({actorFromToken(){throw Error('auth touched');}},svc);
  await assert.rejects(()=>ctrl.ledgerPreview('https://x.example',{headers:{}},{setHeader(){}},
   ID(3),ID(4),{}),e=>e.getStatus?.()===503);
  await assert.rejects(()=>ctrl.targetPreview('https://x.example',{headers:{}},{setHeader(){}},
   ID(3),ID(4),{}),e=>e.getStatus?.()===503);
 });
});

test('cross-site preview POST is denied before session/SQL resolution',async()=>{
 await withEnv({...ENABLED,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new HrController({actorFromToken(){throw Error('auth touched');}},{});
  for(const method of ['ledgerPreview','targetPreview'])
   await assert.rejects(()=>ctrl[method]('https://evil.example',{headers:{}},{setHeader(){}},
    ID(3),ID(4),{}),e=>e.getStatus?.()===401);
 });
});

test('malformed ledger preview payloads fail 400 before any SQL access',async()=>{
 await withEnv(ENABLED,async()=>{
  const svc=new HrService(sqlForbidden);
  const good=row(E1,'2026-11-01','credit','monthly_salary',10000);
  const bad=[
   {entries:[good]},                                    // proposal key missing
   {entries:[good],proposal:null,tenantId:ID(1)},       // hidden tenant
   {entries:'x',proposal:null},
   {entries:[{...good,branchId:ID(4)}],proposal:null},  // hidden branch per row
   {entries:[{...good,amountMinor:1.5}],proposal:null},
   {entries:[{...good,amountMinor:0}],proposal:null},
   {entries:[{...good,entryDate:'2026-02-30'}],proposal:null},
   {entries:[{...good,employeeId:'EMP-1'}],proposal:null},
   {entries:[{...good,direction:'debit'}],proposal:null}, // salary cannot be a debit
   {entries:[row(E1,'2026-11-01','credit','adjustment',100)],proposal:null},
   {entries:[{...good,reason:'payroll_payment'}],proposal:null},
   {entries:Array(501).fill(good),proposal:null},
   {entries:[good],proposal:{employeeId:E1,kind:'payout',amountMinor:100}},
   {entries:[good],proposal:{employeeId:E1,kind:'advance',amountMinor:'100'}},
   {entries:[good],proposal:{employeeId:'x',kind:'advance',amountMinor:100}},
   null,[],'x',
  ];
  for(const body of bad)
   await assert.rejects(()=>svc.previewLedger(actor,token,ID(3),ID(4),body),
    e=>e.getStatus?.()===400,JSON.stringify(body)?.slice(0,80));
  await assert.rejects(()=>svc.previewLedger({...actor,mustChangePassword:true},token,ID(3),ID(4),
   {entries:[good],proposal:null}),e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.previewLedger(actor,token,'bad',ID(4),
   {entries:[good],proposal:null}),e=>e.getStatus?.()===404);
 });
});

test('ledger preview computes unposted summary, statements, liquidity and proposal',async()=>{
 await withEnv(ENABLED,async()=>{
  const calls=[];
  const svc=new HrService(rosterDb([E1,E2,ID(13)],calls));
  const result=await svc.previewLedger(actor,token,ID(3),ID(4),{
   entries:[
    row(E1,'2026-11-01','credit','monthly_salary',100000),
    row(E1,'2026-11-03','debit','advance',130000),
    row(E1,'2026-11-04','debit','deduction',5000),
    row(E2,'2026-11-02','credit','target',20000),
   ],
   proposal:{employeeId:E1.toUpperCase(),kind:'advance_repayment',amountMinor:35000},
  });
  assert.deepEqual(calls,['core.ReadHrBranchRoster']);
  assert.equal(result.state,'UNPOSTED_HR_LEDGER_PREVIEW');
  assert.equal(result.persisted,false);
  assert.equal(result.financialPostingState,'NOT_AUTHORIZED');
  const e1=result.employees.find(e=>e.employeeId===E1);
  assert.equal(e1.balanceMinor,-35000);assert.equal(e1.outstandingAdvanceMinor,35000);
  assert.equal(e1.advanceExcessMinor,130000);assert.equal(e1.deductionDebitsMinor,5000);
  assert.deepEqual(result.liquidity,{cashRequiredMinor:20000,employeeDebtMinor:35000,netMinor:-15000});
  const s1=result.statements.find(s=>s.employeeId===E1);
  assert.deepEqual(s1.entries.map(e=>e.runningBalanceMinor),[-35000,-30000,100000]);
  assert.deepEqual(result.proposal,{employeeId:E1,kind:'advance_repayment',
   state:'UNPOSTED_HR_LEDGER_PREVIEW',outstandingBeforeMinor:35000,repaymentMinor:35000,
   outstandingAfterMinor:0,balanceAfterMinor:0});
  assert.ok(!('tenantId' in result)&&!('cashMoveId' in result));
 });
});

test('ledger preview denies foreign employees and over-repayment (no leakage of roster)',async()=>{
 await withEnv(ENABLED,async()=>{
  const svc=new HrService(rosterDb([E1],[]));
  await assert.rejects(()=>svc.previewLedger(actor,token,ID(3),ID(4),
   {entries:[row(FOREIGN,'2026-11-01','credit','target',100)],proposal:null}),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.previewLedger(actor,token,ID(3),ID(4),
   {entries:[],proposal:{employeeId:FOREIGN,kind:'advance',amountMinor:100}}),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.previewLedger(actor,token,ID(3),ID(4),
   {entries:[row(E1,'2026-11-01','debit','advance',1000)],
    proposal:{employeeId:E1,kind:'advance_repayment',amountMinor:1001}}),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.previewLedger(actor,token,ID(3),ID(4),
   {entries:[],proposal:{employeeId:E1,kind:'advance_repayment',amountMinor:1}}),
   e=>e.getStatus?.()===400);
 });
});

test('SQL scope denial/unavailability maps to existing HR errors, not preview data',async()=>{
 await withEnv(ENABLED,async()=>{
  const denied={getInternalPool(){return {request(){const req={input(){return req;},
   async execute(){const e=new Error('denied');e.number=51181;throw e;}};return req;}};}};
  await assert.rejects(()=>new HrService(denied).previewLedger(actor,token,ID(3),ID(4),
   {entries:[],proposal:null}),e=>e.getStatus?.()===404);
  await assert.rejects(()=>new HrService(denied).previewTarget(actor,token,ID(3),ID(4),
   {mtdSalesMinor:0,priorMtdSalesMinor:0,tiers:[{startMinor:0,rateBp:1000}]}),
   e=>e.getStatus?.()===404);
 });
});

test('target preview validates strictly and returns Cashier MTD day delta unposted',async()=>{
 await withEnv(ENABLED,async()=>{
  const svc=new HrService(sqlForbidden);
  const tiers=[{startMinor:1000000,rateBp:1000},{startMinor:2000000,rateBp:2000}];
  for(const body of [
   {mtdSalesMinor:1,priorMtdSalesMinor:0},
   {mtdSalesMinor:1,priorMtdSalesMinor:0,tiers,tenantId:ID(1)},
   {mtdSalesMinor:1.5,priorMtdSalesMinor:0,tiers},
   {mtdSalesMinor:-1,priorMtdSalesMinor:0,tiers},
   {mtdSalesMinor:1,priorMtdSalesMinor:0,tiers:[]},
   {mtdSalesMinor:1,priorMtdSalesMinor:0,tiers:[{startMinor:0,rateBp:10001}]},
   {mtdSalesMinor:1,priorMtdSalesMinor:0,tiers:[{startMinor:0,rateBp:1,note:'x'}]},
   {mtdSalesMinor:1,priorMtdSalesMinor:0,tiers:[{startMinor:5,rateBp:1},{startMinor:5,rateBp:2}]},
   {mtdSalesMinor:1,priorMtdSalesMinor:0,tiers:[{startMinor:9,rateBp:1},{startMinor:5,rateBp:2}]},
  ]) await assert.rejects(()=>svc.previewTarget(actor,token,ID(3),ID(4),body),
   e=>e.getStatus?.()===400,JSON.stringify(body));
  const calls=[];
  const ok=await new HrService(rosterDb([],calls)).previewTarget(actor,token,ID(3),ID(4),
   {mtdSalesMinor:2500000,priorMtdSalesMinor:2000000,tiers});
  assert.deepEqual(calls,['core.ReadHrBranchRoster']);
  assert.equal(ok.state,'UNPOSTED_HR_LEDGER_PREVIEW');assert.equal(ok.persisted,false);
  assert.equal(ok.financialPostingState,'NOT_AUTHORIZED');
  assert.equal(ok.mtdTargetMinor,200000);assert.equal(ok.priorMtdTargetMinor,100000);
  assert.equal(ok.dayDeltaMinor,100000);
 });
});
