'use strict';
/**
 * TR-01/02/06/07 + OPS-03/05 Treasury/Operations readiness characterization. Pin: casher@046bf19.
 * DRVO owns NON-POSTING movement filters, rail totals, day-close readiness, shift handoff plan and
 * single-branch daily aggregation only. No day/shift close, no cash movement, no GL, no settlement.
 * Source-level tests: no SQL, no browser, no Cashier database was touched.
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
const readBuf=p=>fs.readFileSync(path.join(root,p));
const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const EXCERPTS={
 'operations/shiftOwnership.ts':['src/modules/operations/domain/shiftOwnership.ts','42b64d1559b92b8d7d7b0b313d66f4f4594ded3e'],
 'operations/shiftOperationalGate.ts':['src/lib/operations/shiftOperationalGate.ts','ab056c07a4becb8208beaa6b0a573d87adc7e6ce'],
 'operations/viewOperationalState.ts':['src/lib/operations/viewOperationalState.ts','9b6f06bce4978f55e4df445e172c45e33f2b054b'],
 'operations/handoffShiftSession.ts':['src/modules/operations/application/handoffShiftSession.ts','55b380f42c97d02caa852d9f5eaf312e8bcf9c02'],
 'operations/closeBusinessDay.ts':['src/modules/operations/application/closeBusinessDay.ts','0f6a7fb372c82a05c9901ea593b909f239ce4512'],
 'operations/businessDayReconciliation.ts':['src/modules/operations/domain/businessDayReconciliation.ts','e86e49fa7dea5f871c305d250622dea6f4d0fd0f'],
 'operations/invariants.ts':['src/modules/operations/domain/invariants.ts','971a74e05ab714d677a77d21e80074cd0f5cdbe6'],
 'treasury/liveCashMoveSql.ts':['src/lib/treasury/liveCashMoveSql.ts','dc5184f77dac72360a9c3a6e34f0d650280074ec'],
 'treasury/treasuryGroupDailyTypes.ts':['src/lib/types/treasury-group-daily.ts','3a5ff62b0dd914b9905a66718862f016eded2604'],
 'treasury/treasuryGroupDailyService.ts':['src/lib/services/treasuryGroupDailyService.ts','884c37652831178e8957404f1ac30d4bb84b2966'],
 'treasury/treasuryCashMoveFilters.ts':['src/lib/services/treasuryCashMoveFilters.ts','63eb2c9c05f275b8bf9cfdcbeb1e94381bc162a5'],
};
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const rules=require('../dist/packages/business-modules/treasury/src/treasury-readiness-rules');

function gitBlob(buf){
 const bytes=Buffer.from(buf.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function load(file,stubs={}){
 const exports={};
 const code=ts.transpileModule(read('_cashier_source/'+file),{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,module:{exports},require:id=>stubs[id]||{},Date},{timeout:1000});
 return exports;
}
const cashierView=load('operations/viewOperationalState.ts');
const cashierGate=load('operations/shiftOperationalGate.ts',
 {'@/lib/operations/viewOperationalState':cashierView});
const cashierRecon=load('operations/businessDayReconciliation.ts');
const cashierFilters=load('treasury/treasuryCashMoveFilters.ts',
 {'@/lib/treasury/liveCashMoveSql':{liveCashMovePredicate:a=>'LIVE('+a+')'}});

const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const mv=(n,o={})=>({movementId:ID(n),dayId:ID(100),shiftId:ID(200),direction:'IN',amountMinor:100,
 currency:'EGP',fromRail:'OTHER',toRail:'CASH',status:'RECORDED',
 createdAtUtc:'2026-11-20T10:00:00.000Z',...o});
const noTrunc={movementsMayBeTruncated:false,shiftsMayBeTruncated:false,reconsMayBeTruncated:false};

test('Cashier excerpts are byte-locked to the pinned git blobs and baseline manifest',()=>{
 const runtime=new Map(baseline.files.map(f=>[f.path,f.blob]));
 assert.equal(baseline.sourceRevision,PIN);
 for(const [file,[src,blob]] of Object.entries(EXCERPTS)){
  assert.equal(gitBlob(readBuf('_cashier_source/'+file)),blob,file+' drifted from pin');
  assert.equal(runtime.get(src),blob,file+' blob not in baseline manifest');
 }
});

test('DRVO rules: package source and Nest copy are byte-identical',()=>{
 assert.equal(
  read('packages/business-modules/treasury/src/treasury-readiness-rules.ts'),
  read('apps/api/src/treasury/treasury-readiness-rules.ts'));
});

test('shift write gate matches pinned Cashier classifyShiftWriteGate on the full matrix',()=>{
 const bools=[false,true];
 const branches=[[null,null],[1,1],[1,2],[undefined,1]];
 for(const loading of bools)for(const isAuthenticated of bools)
 for(const hasActiveDay of bools)for(const hasOpenShift of bools)
 for(const [v,o] of branches){
  const num={loading,isAuthenticated,hasActiveDay,hasOpenShift,viewBranchId:v,operationalBranchId:o};
  const uuid={...num,
   viewBranchId:v==null?v:ID(v),operationalBranchId:o==null?o:ID(o)};
  assert.equal(rules.classifyShiftWriteGate(uuid),cashierGate.classifyShiftWriteGate(num),
   JSON.stringify(num));
 }
});

test('catch-up plan matches pinned Cashier planBusinessDayReconciliation',()=>{
 for(const open of [null,'2026-11-19','2026-11-20','2026-11-21'])
  for(const past of [false,true])
   assert.equal(rules.planCatchUp(open,'2026-11-20',past),
    cashierRecon.planBusinessDayReconciliation(
     {openDayDate:open,expectedDate:'2026-11-20',pastRolloverWindow:past}));
});

test('movement filter vocabulary maps onto pinned appendTreasuryCashMoveFilters',()=>{
 const where=[],params={};
 cashierFilters.appendTreasuryCashMoveFilters(where,params,
  {newDay:'2026-11-20',dateFrom:'2026-11-01',dateTo:'2026-11-30',shiftMoveId:7,userId:3},
  {branchScoped:true});
 assert.ok(where[0].startsWith('LIVE('),'live predicate first (cancelled/reversed excluded)');
 assert.deepEqual(Object.keys(params).sort(),['dateFrom','dateTo','newDay','shiftMoveId','userId']);
 assert.ok(where.some(w=>w.includes('sm.BranchID = @branchId')),'branch scope never a client filter');
 // DRVO keeps newDay->dayId, shiftMoveId->shiftId, dateFrom/dateTo; userId has no movement column.
 const f=rules.normalizeMovementFilters({dayId:ID(100),shiftId:ID(200),
  dateFrom:'2026-11-01',dateTo:'2026-11-30'});
 assert.equal(f.status,'LIVE');
 assert.throws(()=>rules.normalizeMovementFilters({userId:3}),TypeError);
 assert.throws(()=>rules.normalizeMovementFilters({branchId:ID(1)}),TypeError);
});

test('filters are strict and reject bad values',()=>{
 for(const bad of [null,[],'x',{direction:'POST'},{rail:'WALLET'},{currency:'EUR'},
  {dayId:'bad'},{shiftId:1},{status:'REVERSED'},{dateFrom:'2026-02-30'},
  {dateFrom:'2026-11-30',dateTo:'2026-11-01'}])
  assert.throws(()=>rules.normalizeMovementFilters(bad),TypeError,JSON.stringify(bad));
 const f=rules.normalizeMovementFilters({});
 assert.deepEqual({...f},{dayId:null,shiftId:null,direction:null,rail:null,currency:null,
  status:'LIVE',dateFrom:null,dateTo:null});
});

test('filterMovements: live by default, rail matches from or to, date on UTC day',()=>{
 const rows=[mv(1),mv(2,{status:'CANCELLED'}),
  mv(3,{direction:'TRANSFER',fromRail:'CASH',toRail:'BANK'}),
  mv(4,{direction:'OUT',fromRail:'CARD',toRail:'OTHER',createdAtUtc:'2026-11-18T23:59:59.000Z'}),
  mv(5,{currency:'USD',shiftId:ID(201)})];
 const f=o=>rules.filterMovements(rows,rules.normalizeMovementFilters(o)).map(m=>m.movementId);
 assert.deepEqual(f({}),[ID(1),ID(3),ID(4),ID(5)]);
 assert.deepEqual(f({status:'ALL'}),[ID(1),ID(2),ID(3),ID(4),ID(5)]);
 assert.deepEqual(f({rail:'CASH'}),[ID(1),ID(3),ID(5)]);
 assert.deepEqual(f({rail:'BANK'}),[ID(3)]);
 assert.deepEqual(f({direction:'OUT'}),[ID(4)]);
 assert.deepEqual(f({currency:'USD'}),[ID(5)]);
 assert.deepEqual(f({shiftId:ID(201)}),[ID(5)]);
 assert.deepEqual(f({dateFrom:'2026-11-19'}),[ID(1),ID(3),ID(5)]);
 assert.deepEqual(f({dateTo:'2026-11-18'}),[ID(4)]);
});

test('rail totals use the SQL030 sign convention and ignore cancelled rows',()=>{
 const rows=[mv(1,{amountMinor:1000}),                                   // IN  -> CASH +1000
  mv(2,{direction:'OUT',fromRail:'CASH',toRail:'OTHER',amountMinor:300}),// OUT -> CASH -300
  mv(3,{direction:'TRANSFER',fromRail:'CASH',toRail:'BANK',amountMinor:200}),
  mv(4,{amountMinor:9999,status:'CANCELLED'}),
  mv(5,{currency:'USD',amountMinor:50,toRail:'CARD'})];
 const t=rules.computeRailTotals(rows);
 const row=(c,r)=>t.find(x=>x.currency===c&&x.rail===r);
 assert.deepEqual({...row('EGP','CASH')},{currency:'EGP',rail:'CASH',inMinor:1000,outMinor:300,
  transferInMinor:0,transferOutMinor:200,netMinor:500,movementCount:3});
 assert.equal(row('EGP','BANK').netMinor,200);
 assert.equal(row('USD','CARD').netMinor,50);
 assert.equal(t.length,3,'currencies are never merged');
 assert.throws(()=>rules.computeRailTotals([mv(6,{amountMinor:0})]),TypeError);
 assert.throws(()=>rules.computeRailTotals([mv(7,{amountMinor:Number.MAX_SAFE_INTEGER}),
  mv(8,{amountMinor:1})]),TypeError);
});

test('SQL030 system-minor formula matches shift summary (currency-blind) and is flagged',()=>{
 const sql=read('db/migrations/030_treasury_cash_movements_recon.sql');
 assert.match(sql,/WHEN Direction=''IN'' AND ToRail=@Rail THEN AmountMinor/);
 assert.match(sql,/WHEN Direction=''OUT'' AND FromRail=@Rail THEN -AmountMinor/);
 assert.doesNotMatch(sql.slice(sql.indexOf('DECLARE @System')),/Currency=/,
  'SQL recon is currency-blind; readiness must warn on mixed currency');
 const shifts=[{shiftId:ID(200),dayId:ID(100),actorAccountId:ID(2),status:'CLOSED'}];
 const [s]=rules.summarizeShifts(shifts,[mv(1,{amountMinor:70}),mv(2,{amountMinor:30,currency:'USD'})],[]);
 assert.equal(s.systemMinorByRail.CASH,100);
 assert.deepEqual(s.currencies,['EGP','USD']);
});

const day={dayId:ID(100),businessDate:'2026-11-20',status:'OPEN'};
const sh=(n,status,extra={})=>({shiftId:ID(n),dayId:ID(100),actorAccountId:ID(2),status,...extra});
const recon=(n,shift,variance=0)=>({reconId:ID(n),dayId:ID(100),shiftId:ID(shift),rail:'CASH',
 systemMinor:100,countedMinor:100+variance,varianceMinor:variance});

test('day-close readiness blocks without an OPEN day or with OPEN shifts, never closes',()=>{
 const none=rules.evaluateDayCloseReadiness({day:null,shifts:[],movements:[],recons:[],
  expectedDate:'2026-11-20',evidence:noTrunc}).readiness;
 assert.equal(none.state,'BLOCKED');
 assert.deepEqual(none.blockers,['NO_OPEN_DAY']);
 assert.equal(none.catchUpPlan,'OPENED_MISSING_DAY');
 const open=rules.evaluateDayCloseReadiness({day,shifts:[sh(200,'OPEN')],movements:[mv(1)],
  recons:[],expectedDate:'2026-11-20',evidence:noTrunc}).readiness;
 assert.equal(open.state,'BLOCKED');
 assert.deepEqual(open.blockers,['OPEN_SHIFTS_PRESENT']);
 assert.deepEqual(open.forceClose,{wouldCloseShiftIds:[ID(200)],skipsReconciliation:true});
 assert.ok(open.warnings.includes('FORCE_CLOSE_SKIPS_RECON'));
 for(const r of [none,open]){
  assert.equal(r.closeMutation,'NOT_PERFORMED');
  assert.equal(r.financialPostingState,'NOT_AUTHORIZED');
  assert.equal(r.varianceGlState,'GATED');
 }
});

test('day-close readiness warnings: stale day, unreconciled shift, variance, mixed currency, truncation',()=>{
 const base={day,expectedDate:'2026-11-20',evidence:noTrunc};
 const ok=rules.evaluateDayCloseReadiness({...base,shifts:[sh(200,'CLOSED')],
  movements:[mv(1)],recons:[recon(300,200)]}).readiness;
 assert.equal(ok.state,'READY_TO_CLOSE_PREVIEW');
 assert.deepEqual(ok.warnings,[]);
 const warn=rules.evaluateDayCloseReadiness({...base,expectedDate:'2026-11-21',
  shifts:[sh(200,'CLOSED'),sh(201,'CLOSED')],
  movements:[mv(1),mv(2,{shiftId:ID(201)}),mv(3,{shiftId:ID(201),currency:'USD'})],
  recons:[recon(300,200,-25)],
  evidence:{...noTrunc,movementsMayBeTruncated:true}}).readiness;
 assert.equal(warn.state,'READY_TO_CLOSE_PREVIEW');
 assert.deepEqual(warn.unreconciledShiftIds,[ID(201)]);
 assert.deepEqual([...warn.warnings].sort(),['CLOSED_SHIFT_WITHOUT_RECON',
  'EVIDENCE_TRUNCATED','MIXED_CURRENCY_RECON_AMBIGUOUS','RECON_VARIANCE_PRESENT',
  'STALE_BUSINESS_DAY']);
 assert.equal(warn.catchUpPlan,'ROLLED_OVER');
 assert.throws(()=>rules.evaluateDayCloseReadiness({...base,expectedDate:'bad',shifts:[],
  movements:[],recons:[]}),TypeError);
 assert.throws(()=>rules.evaluateDayCloseReadiness({...base,day:{...day,dayId:'x'},shifts:[],
  movements:[],recons:[]}),TypeError);
});

test('other-day evidence never leaks into the open-day readiness',()=>{
 const r=rules.evaluateDayCloseReadiness({day,expectedDate:'2026-11-20',evidence:noTrunc,
  shifts:[sh(250,'OPEN',{dayId:ID(999)})],movements:[mv(9,{dayId:ID(999)})],recons:[]});
 assert.equal(r.readiness.state,'READY_TO_CLOSE_PREVIEW');
 assert.deepEqual(r.shiftSummaries,[]);
});

test('handoff preview mirrors Cashier one-OPEN-shift handoff and stays non-mutating',()=>{
 const t=ID(7),other=ID(8);
 const p=o=>rules.previewShiftHandoff({targetBranchId:t,targetDayOpen:true,
  actorHasOpenShiftHere:false,actorOpenShiftElsewhereBranchId:null,...o});
 assert.equal(p({}).plan,'FIRST_OPEN_HERE');
 assert.equal(p({}).gate,'no_shift');
 assert.equal(p({actorHasOpenShiftHere:true}).plan,'ALREADY_OPEN_HERE');
 assert.equal(p({actorHasOpenShiftHere:true}).gate,'ready');
 const hand=p({actorOpenShiftElsewhereBranchId:other});
 assert.equal(hand.plan,'CLOSE_ELSEWHERE_AND_OPEN_HERE');
 assert.equal(hand.gate,'handoff_required');
 assert.equal(hand.requiresAtomicClose,true);
 assert.equal(hand.atomicHandoff,'AVAILABLE_VIA_SQL039');
 assert.deepEqual(hand.reasons,['ACTOR_HAS_OPEN_SHIFT_ELSEWHERE','SOURCE_SHIFT_CLOSES_WITHOUT_RECON']);
 assert.equal(hand.evidence.openShiftElsewhere,'CALLER_SUPPLIED_UNVERIFIED');
 const blocked=p({targetDayOpen:false});
 assert.equal(blocked.plan,'BLOCKED');
 assert.deepEqual(blocked.reasons,['NO_OPEN_DAY_ON_TARGET']);
 // trusted local evidence wins over a contradicting caller claim
 const trusted=p({actorHasOpenShiftHere:true,actorOpenShiftElsewhereBranchId:other});
 assert.equal(trusted.plan,'ALREADY_OPEN_HERE');
 assert.equal(trusted.evidence.openShiftElsewhere,'NOT_APPLICABLE');
 for(const x of [p({}),hand,blocked,trusted]){
  assert.equal(x.mutation,'NOT_PERFORMED');
  assert.equal(x.financialPostingState,'NOT_AUTHORIZED');
 }
 assert.throws(()=>p({targetBranchId:'bad'}),TypeError);
 assert.throws(()=>p({actorOpenShiftElsewhereBranchId:t}),TypeError);
 assert.match(read('_cashier_source/operations/handoffShiftSession.ts'),/executeOpenOrHandoffShift/);
 assert.match(read('db/migrations/029_operations_business_day_shift.sql'),
  /UX_OperationalShift_OneOpenPerAccount/);
});

test('daily aggregation follows Cashier group-daily semantics on rails/minor units',()=>{
 const src=read('_cashier_source/treasury/treasuryGroupDailyService.ts');
 assert.match(src,/percentageOfTotal: net !== 0 \? round2\(\(pm\.net \/ net\) \* 100\) : 0/);
 assert.match(src,/\.sort\(\(a, b\) => b\.net - a\.net\)/);
 assert.match(src,/paymentMethods\.length > 0 \? paymentMethods\[0\]\.paymentMethodName : null/);
 const cash=rules.computeRailTotals([mv(1,{amountMinor:600}),
  mv(2,{direction:'OUT',fromRail:'CASH',toRail:'OTHER',amountMinor:100})]);
 const card=rules.computeRailTotals([mv(3,{toRail:'CARD',amountMinor:500})]);
 const g=rules.aggregateDaily([
  {branchId:ID(1),dayStatus:'open',rails:[...cash,...card]},
  {branchId:ID(2),dayStatus:'closed',rails:[]},
  {branchId:ID(3),dayStatus:'missing',rails:[]}]);
 assert.equal(g.branchCount,3);
 assert.equal(g.openDayCount,1);assert.equal(g.closedDayCount,1);assert.equal(g.missingDayCount,1);
 assert.equal(g.branchesWithActivity,1);
 assert.equal(g.rails[0].rail,'CASH');
 assert.equal(g.rails[0].netMinor,500);
 assert.equal(g.rails[0].percentageOfNet,50);
 assert.equal(g.rails[1].percentageOfNet,50);
 assert.equal(g.topRail,'EGP:CASH');
 const empty=rules.aggregateDaily([]);
 assert.equal(empty.topRail,null);
 assert.deepEqual(empty.rails,[]);
});

test('ledger: TREASURY/OPS rows advance honestly, gated rows stay gated',()=>{
 const by=Object.fromEntries(ledger.workflows.map(w=>[w.ID,w]));
 for(const id of ['OPS-03','OPS-05','TR-06','TR-07','TR-01','TR-02']){
  assert.equal(by[id].Status,'PORTING',id);
  assert.equal(by[id].BrowserProof,'OPEN',id);
  assert.equal(by[id].PilotProof,'OPEN',id);
 }
 for(const id of ['OPS-03','OPS-05','TR-06','TR-07'])
  assert.ok(by[id].TargetPaths.some(p=>p.includes('treasury-readiness')||p.includes('operations.')||p.includes('treasury-ops')),id);
 for(const id of ['OPS-02','OPS-04'])assert.equal(by[id].Status,'SOURCE_IDENTIFIED',id);
 for(const id of ['POS-17','TR-08','TR-09','TR-10','HR-04','HR-05','HR-07','HR-11'])
  assert.equal(by[id].Status,'BLOCKED',id);
});

test('no migration, no GL, no posting in the readiness slice',()=>{
 const migrations=fs.readdirSync(path.join(root,'db/migrations')).filter(f=>/^\d{3}_/.test(f)).sort();
 assert.equal(migrations[migrations.length-1].slice(0,3)>='031',true);
 assert.equal(migrations.some(f=>f.startsWith('032_')&&/treasury|operations/i.test(f)),false);
 const src=read('packages/business-modules/treasury/src/treasury-readiness-rules.ts')
  .replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
 assert.doesNotMatch(src,/\b(INSERT|UPDATE|EXEC)\b|mssql|fetch\(|Date\.now|new Date\(\)|import /);
 assert.match(src,/closeMutation: "NOT_PERFORMED"/);
});
