'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {TreasuryOpsService}=require('../dist/treasury/treasury-ops.service');
const {TreasuryOpsController}=require('../dist/treasury/treasury-ops.controller');
const {OperationsService}=require('../dist/operations/operations.service');
const {OperationsController}=require('../dist/operations/operations.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'tr-ready',mustChangePassword:false};
const token='A'.repeat(43);
const BIZ=ID(3),BR=ID(4),DAY=ID(5),SHIFT=ID(6);
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
const active={DRVO_TREASURY_OPS_ENABLED:'YES',DRVO_OPERATIONS_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL touched')}};
const today=()=>new Date().toISOString().slice(0,10);
const move=(n,o={})=>({movementId:ID(100+n),dayId:DAY,shiftId:SHIFT,direction:'IN',amountMinor:100,
 currency:'EGP',fromRail:'OTHER',toRail:'CASH',note:'n',status:'RECORDED',glPostState:'GATED',
 createdAtUtc:new Date('2026-11-20T10:00:00Z'),cancelledAtUtc:null,...o});
function db(sets,calls=[]){
 const pool={request(){return {input(){return this},execute:async name=>{
  calls.push(name);
  if(!sets[name])throw Error('Unexpected SP '+name);
  return sets[name];
 }}}};
 return {getInternalPool(){return pool}};
}
const opsSet=(day,shifts)=>({recordsets:[day?[day]:[],shifts],recordset:day?[day]:[]});
const trSet=(moves,recons=[])=>({recordsets:[moves,recons],recordset:moves});
const openDay=(date)=>({dayId:DAY,businessDate:date,status:'OPEN',openedByAccountId:ID(2),
 openedAtUtc:new Date(),closedAtUtc:null});
const shiftRow=(id,status,extra={})=>({shiftId:id,dayId:DAY,actorAccountId:ID(2),status,
 openedAtUtc:new Date(),closedAtUtc:null,...extra});

test('movements-preview is OFF by default and validates the body before SQL',async()=>{
 await withEnv({...active,DRVO_TREASURY_OPS_ENABLED:null},async()=>{
  await assert.rejects(()=>new TreasuryOpsService(deadDb)
   .previewMovements(actor,token,BIZ,BR,{filters:{}}),e=>e.getStatus?.()===503);
 });
 await withEnv(active,async()=>{
  const svc=new TreasuryOpsService(deadDb);
  for(const bad of [null,{},{filters:{rail:'WALLET'}},{filters:{branchId:BR}},
   {filters:{},extra:1},{filters:[]},{filters:{dateFrom:'2026-02-30'}}])
   await assert.rejects(()=>svc.previewMovements(actor,token,BIZ,BR,bad),
    e=>e.getStatus?.()===400,JSON.stringify(bad));
 });
});

test('movements-preview filters the bounded read, totals live rows, writes nothing',async()=>{
 await withEnv(active,async()=>{
  const calls=[];
  const svc=new TreasuryOpsService(db({
   'core.ReadTreasuryCashMovements':trSet([
    move(1,{amountMinor:1000}),move(2,{status:'CANCELLED',amountMinor:5000,
     cancelledAtUtc:new Date()}),
    move(3,{direction:'OUT',fromRail:'CASH',toRail:'OTHER',amountMinor:250}),
    move(4,{direction:'TRANSFER',fromRail:'CASH',toRail:'BANK',amountMinor:100}),
   ])},calls));
  const all=await svc.previewMovements(actor,token,BIZ,BR,{filters:{}});
  assert.deepEqual(calls,['core.ReadTreasuryCashMovements']);
  assert.equal(all.state,'NONPOSTING_TREASURY_DAY_READINESS_PREVIEW');
  assert.equal(all.matchedCount,3);
  assert.equal(all.scannedCount,4);
  const cash=all.railTotals.find(r=>r.rail==='CASH');
  assert.equal(cash.netMinor,650);
  assert.equal(all.glPostState,'GATED');
  assert.equal(all.accountingState,'NOT_POSTED');
  assert.equal(all.settlementState,'NO_SETTLEMENT');
  assert.equal(all.persisted,false);
  const out=await svc.previewMovements(actor,token,BIZ,BR,{filters:{direction:'OUT'}});
  assert.equal(out.matchedCount,1);
  const withCancelled=await svc.previewMovements(actor,token,BIZ,BR,{filters:{status:'ALL'}});
  assert.equal(withCancelled.matchedCount,4);
  assert.equal(withCancelled.railTotals.find(r=>r.rail==='CASH').netMinor,650,
   'cancelled rows never count toward totals even when listed');
 });
});

test('movements-preview flags truncation at the TOP 200 bound',async()=>{
 await withEnv(active,async()=>{
  const rows=Array.from({length:200},(_,i)=>move(i+1,{movementId:ID(1000+i)}));
  const svc=new TreasuryOpsService(db({'core.ReadTreasuryCashMovements':trSet(rows)}));
  const r=await svc.previewMovements(actor,token,BIZ,BR,{filters:{}});
  assert.equal(r.mayBeTruncated,true);
  assert.equal(r.scannedCount,200);
 });
});

test('day-close readiness needs both Operations and Treasury ops flags and never touches SQL when off',async()=>{
 for(const off of ['DRVO_OPERATIONS_ENABLED','DRVO_TREASURY_OPS_ENABLED','DRVO_K5_AUTH_ENABLED'])
  await withEnv({...active,[off]:null},async()=>{
   await assert.rejects(()=>new TreasuryOpsService(deadDb).dayCloseReadiness(actor,token,BIZ,BR),
    e=>e.getStatus?.()===503,off);
  });
 await withEnv(active,async()=>{
  await assert.rejects(()=>new TreasuryOpsService(deadDb)
   .dayCloseReadiness({...actor,mustChangePassword:true},token,BIZ,BR),e=>e.getStatus?.()===404);
  await assert.rejects(()=>new TreasuryOpsService(deadDb)
   .dayCloseReadiness(actor,token,'bad',BR),e=>e.getStatus?.()===404);
 });
});

test('day-close readiness blocks on OPEN shift, warns on force-close, only reads',async()=>{
 await withEnv(active,async()=>{
  const calls=[];
  const svc=new TreasuryOpsService(db({
   'core.ReadOperationsDayShift':opsSet(openDay(today()),[shiftRow(SHIFT,'OPEN')]),
   'core.ReadTreasuryCashMovements':trSet([move(1,{amountMinor:700}),
    move(2,{dayId:ID(77),amountMinor:99999})]),
  },calls));
  const r=await svc.dayCloseReadiness(actor,token,BIZ,BR);
  assert.deepEqual(calls,['core.ReadOperationsDayShift','core.ReadTreasuryCashMovements']);
  assert.equal(r.readiness.state,'BLOCKED');
  assert.deepEqual(r.readiness.blockers,['OPEN_SHIFTS_PRESENT']);
  assert.ok(r.readiness.warnings.includes('FORCE_CLOSE_SKIPS_RECON'));
  assert.equal(r.readiness.closeMutation,'NOT_PERFORMED');
  assert.equal(r.readiness.financialPostingState,'NOT_AUTHORIZED');
  assert.equal(r.railTotals.find(t=>t.rail==='CASH').netMinor,700,'other-day movement excluded');
  assert.equal(r.dailySummaryScope,'SINGLE_BRANCH_OPEN_DAY_ONLY');
  assert.equal(r.dailySummary.branchCount,1);
  assert.equal(r.dailySummary.openDayCount,1);
  assert.equal(r.glPostState,'GATED');
  assert.equal(r.persisted,false);
  assert.equal(r.evidence.movementsMayBeTruncated,false);
 });
});

test('day-close readiness is READY with recon and flags stale day / variance',async()=>{
 await withEnv(active,async()=>{
  const recon={reconId:ID(300),dayId:DAY,shiftId:SHIFT,rail:'CASH',systemMinor:100,
   countedMinor:90,varianceMinor:-10,note:'x',glPostState:'GATED',createdAtUtc:new Date()};
  const svc=new TreasuryOpsService(db({
   'core.ReadOperationsDayShift':opsSet(openDay('2026-01-01'),[shiftRow(SHIFT,'CLOSED',
    {closedAtUtc:new Date()})]),
   'core.ReadTreasuryCashMovements':trSet([move(1)],[recon]),
  }));
  const r=await svc.dayCloseReadiness(actor,token,BIZ,BR);
  assert.equal(r.readiness.state,'READY_TO_CLOSE_PREVIEW');
  assert.deepEqual([...r.readiness.warnings].sort(),['RECON_VARIANCE_PRESENT','STALE_BUSINESS_DAY']);
  assert.equal(r.readiness.catchUpPlan,'ROLLED_OVER');
  assert.equal(r.readiness.varianceGlState,'GATED');
 });
});

test('day-close readiness without an OPEN day is blocked and missing in the daily summary',async()=>{
 await withEnv(active,async()=>{
  const svc=new TreasuryOpsService(db({
   'core.ReadOperationsDayShift':opsSet(null,[]),
   'core.ReadTreasuryCashMovements':trSet([move(1)]),
  }));
  const r=await svc.dayCloseReadiness(actor,token,BIZ,BR);
  assert.deepEqual(r.readiness.blockers,['NO_OPEN_DAY']);
  assert.equal(r.openDay,null);
  assert.deepEqual(r.railTotals,[]);
  assert.equal(r.dailySummary.missingDayCount,1);
 });
});

test('day-close readiness maps access-denied SQL errors to 404 and others to 503',async()=>{
 await withEnv(active,async()=>{
  const failing=number=>({getInternalPool(){return {request(){return {input(){return this},
   execute:async()=>{const e=new Error('x');e.number=number;throw e;}}}}}});
  await assert.rejects(()=>new TreasuryOpsService(failing(51491))
   .dayCloseReadiness(actor,token,BIZ,BR),e=>e.getStatus?.()===404);
  await assert.rejects(()=>new TreasuryOpsService(failing(51501))
   .dayCloseReadiness(actor,token,BIZ,BR),e=>e.getStatus?.()===404);
  await assert.rejects(()=>new TreasuryOpsService(failing(1))
   .dayCloseReadiness(actor,token,BIZ,BR),e=>e.getStatus?.()===503);
 });
});

test('treasury controller: preview POST checks Origin before identity; GET is no-store',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new TreasuryOpsController({actorFromToken(){throw Error('Auth')}},{});
  await assert.rejects(()=>ctrl.previewMovements('https://evil.example',{headers:{}},
   {setHeader(){}},BIZ,BR,{filters:{}}),e=>e.getStatus?.()===401);
  const headers=[];
  await assert.rejects(()=>ctrl.dayCloseReadiness({headers:{}},{setHeader:(k,v)=>headers.push([k,v])},BIZ,BR),
   e=>e.message==='Auth'||e.getStatus);
  assert.deepEqual(headers[0],['Cache-Control','no-store']);
 });
});

const handoff=(body)=>[actor,token,BIZ,BR,body];
test('handoff preview: OFF by default, strict body, no SQL before validation',async()=>{
 await withEnv({...active,DRVO_OPERATIONS_ENABLED:null},async()=>{
  await assert.rejects(()=>new OperationsService(deadDb).previewHandoff(
   ...handoff({actorOpenShiftElsewhereBranchId:null})),e=>e.getStatus?.()===503);
 });
 await withEnv(active,async()=>{
  const svc=new OperationsService(deadDb);
  for(const bad of [null,{},{actorOpenShiftElsewhereBranchId:'bad'},
   {actorOpenShiftElsewhereBranchId:BR},{actorOpenShiftElsewhereBranchId:null,force:true},
   {actorOpenShiftElsewhereBranchId:undefined}])
   await assert.rejects(()=>svc.previewHandoff(...handoff(bad)),e=>e.getStatus?.()===400,
    JSON.stringify(bad));
 });
});

test('handoff preview plans from trusted day/shift evidence and never mutates',async()=>{
 await withEnv(active,async()=>{
  const calls=[];
  const make=(day,shifts)=>new OperationsService(db({
   'core.ReadOperationsDayShift':opsSet(day,shifts)},calls));
  const none=await make(openDay(today()),[]).previewHandoff(...handoff({actorOpenShiftElsewhereBranchId:null}));
  assert.equal(none.plan,'FIRST_OPEN_HERE');
  assert.equal(none.mutation,'NOT_PERFORMED');
  assert.equal(none.state,'NONPOSTING_OPERATIONS_HANDOFF_PREVIEW');
  const hand=await make(openDay(today()),[]).previewHandoff(
   ...handoff({actorOpenShiftElsewhereBranchId:ID(9)}));
  assert.equal(hand.plan,'CLOSE_ELSEWHERE_AND_OPEN_HERE');
  assert.equal(hand.gate,'handoff_required');
  assert.equal(hand.atomicHandoff,'AVAILABLE_VIA_SQL039');
  assert.equal(hand.evidence.openShiftElsewhere,'CALLER_SUPPLIED_UNVERIFIED');
  const here=await make(openDay(today()),[shiftRow(SHIFT,'OPEN')]).previewHandoff(
   ...handoff({actorOpenShiftElsewhereBranchId:ID(9)}));
  assert.equal(here.plan,'ALREADY_OPEN_HERE');
  assert.equal(here.evidence.openShiftElsewhere,'NOT_APPLICABLE');
  const otherActor=await make(openDay(today()),[shiftRow(SHIFT,'OPEN',{actorAccountId:ID(88)})])
   .previewHandoff(...handoff({actorOpenShiftElsewhereBranchId:null}));
  assert.equal(otherActor.plan,'FIRST_OPEN_HERE','another actor open shift is not mine');
  const noDay=await make(null,[]).previewHandoff(...handoff({actorOpenShiftElsewhereBranchId:null}));
  assert.equal(noDay.plan,'BLOCKED');
  assert.deepEqual(noDay.reasons,['NO_OPEN_DAY_ON_TARGET']);
  assert.ok(calls.every(c=>c==='core.ReadOperationsDayShift'),'only the read SP is ever executed');
  for(const r of [none,hand,here,noDay]){
   assert.equal(r.financialPostingState,'NOT_AUTHORIZED');
   assert.equal(r.glPostState,'GATED');
   assert.equal(r.persisted,false);
  }
 });
});

test('operations controller: handoff preview checks Origin before identity',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new OperationsController({actorFromToken(){throw Error('Auth')}},{});
  await assert.rejects(()=>ctrl.previewHandoff('https://evil.example',{headers:{}},
   {setHeader(){}},BIZ,BR,{actorOpenShiftElsewhereBranchId:null}),e=>e.getStatus?.()===401);
 });
});

test('no preview path can reach a mutating stored procedure',async()=>{
 await withEnv(active,async()=>{
  const calls=[];
  const sets={
   'core.ReadOperationsDayShift':opsSet(openDay(today()),[shiftRow(SHIFT,'OPEN')]),
   'core.ReadTreasuryCashMovements':trSet([move(1)]),
  };
  await new TreasuryOpsService(db(sets,calls)).dayCloseReadiness(actor,token,BIZ,BR);
  await new TreasuryOpsService(db(sets,calls)).previewMovements(actor,token,BIZ,BR,{filters:{}});
  await new OperationsService(db(sets,calls)).previewHandoff(...handoff({actorOpenShiftElsewhereBranchId:null}));
  assert.ok(calls.length>0);
  for(const c of calls)assert.match(c,/^core\.Read/,c);
 });
});
