'use strict';
/**
 * Cashier Booking/Queue characterization vs DRVO Nest/SQL026/SQL036/private Light.
 * Pin: casher@046bf19 queueLifecycleEngine + settle-expired + booking/queue ledger rows.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('crypto');
const ts=require('typescript');
const vm=require('node:vm');

const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const LIFE_BLOB='1aaa037e7b31da6df214bb736b1ae17363bf14fc';
const SETTLE_BLOB='6104edeb8111e2b69710782c92f390ce6338dd72';

function pinnedSource(file,gitBlob){
 const s=readFileSync(resolve(__dirname,'fixtures/cashier',file),'utf8');
 assert.equal(
  createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'),
  gitBlob,'fixture blob drift for '+file);
 const exports={};
 const code=ts.transpileModule(s,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
 }).outputText;
 vm.runInNewContext(code,{exports,module:{exports},require:()=>({})},{timeout:1000});
 return exports;
}

const life=pinnedSource('queueLifecycleEngine.ts',LIFE_BLOB);
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const bk01=ledger.workflows.find(w=>w.ID==='BK-01');
const bk02=ledger.workflows.find(w=>w.ID==='BK-02');
const bk03=ledger.workflows.find(w=>w.ID==='BK-03');
const bk04=ledger.workflows.find(w=>w.ID==='BK-04');
const bk05=ledger.workflows.find(w=>w.ID==='BK-05');
const q01=ledger.workflows.find(w=>w.ID==='Q-01');
const q02=ledger.workflows.find(w=>w.ID==='Q-02');
const q03=ledger.workflows.find(w=>w.ID==='Q-03');
const q04=ledger.workflows.find(w=>w.ID==='Q-04');
const q05=ledger.workflows.find(w=>w.ID==='Q-05');
const q06=ledger.workflows.find(w=>w.ID==='Q-06');

const sql026=readFileSync(resolve(__dirname,'../db/migrations/026_salon_queue_tickets.sql'),'utf8');
const sql036=readFileSync(resolve(__dirname,'../db/migrations/036_salon_queue_settle_expired.sql'),'utf8');
const apiSvc=readFileSync(resolve(__dirname,'../apps/api/src/queue/queue.service.ts'),'utf8');
const apiCtrl=readFileSync(resolve(__dirname,'../apps/api/src/queue/queue.controller.ts'),'utf8');
const lifePkg=readFileSync(resolve(__dirname,
 '../packages/business-modules/queue/src/queue-lifecycle-rules.ts'));
const lifeNest=readFileSync(resolve(__dirname,'../apps/api/src/queue/queue-lifecycle-rules.ts'));
const bookingClient=readFileSync(resolve(__dirname,
 '../apps/web/src/app/workspace/[businessId]/[branchId]/booking/booking-client.tsx'),'utf8');
const queueClient=readFileSync(resolve(__dirname,
 '../apps/web/src/app/workspace/[businessId]/[branchId]/queue/queue-client.tsx'),'utf8');
const cashierCopy=readFileSync(resolve(__dirname,
 '../_cashier_source/queue/queueLifecycleEngine.ts'));
const settleCopy=readFileSync(resolve(__dirname,
 '../_cashier_source/queue/settle-expired-route.ts'));

test('ledger source pin + blob evidence remain for Booking/Queue rows',()=>{
 assert.equal(ledger.sourceRevision,PIN);
 for(const row of [bk01,bk02,bk03,bk04,bk05,q01,q02,q03,q05]){
  assert.ok(row,row?.ID);
  assert.equal(row.SourceSHA,PIN);
 }
 assert.ok(bk01['SourcePaths+BlobSHA'].some(p=>p.includes('src/app/bookings/page.tsx#')));
 assert.ok(q01['SourcePaths+BlobSHA'].some(p=>p.includes('queueLifecycleEngine.ts#')||
  p.includes('src/app/api/queue/route.ts#')));
 assert.ok(q05['SourcePaths+BlobSHA'].some(p=>p.includes('settle-expired/route.ts#'+SETTLE_BLOB)));
});

test('Cashier lifecycle contract: expired waiting stops blocking availability',()=>{
 const now=new Date('2026-11-19T12:00:00Z');
 const active=life.computeEffectiveTicket({
  QueueTicketID:1,TicketCode:'A1',TicketNumber:1,Status:'waiting',EmpID:7,ClientID:1,
  QueueDate:'2026-11-19',CreatedTime:now,CalledAt:null,ArrivedAt:null,
  ServiceStartedAt:null,ServiceEndedAt:null,ExpectedStartAt:new Date('2026-11-19T11:40:00Z'),
  ExpectedEndAt:new Date('2026-11-19T12:10:00Z'),DurationMinutes:30,
 },now);
 assert.equal(active.isBlockingAvailability,true);
 assert.equal(active.isCountingAhead,true);
 const expired=life.computeEffectiveTicket({
  QueueTicketID:2,TicketCode:'A2',TicketNumber:2,Status:'waiting',EmpID:7,ClientID:2,
  QueueDate:'2026-11-19',CreatedTime:now,CalledAt:null,ArrivedAt:null,
  ServiceStartedAt:null,ServiceEndedAt:null,ExpectedStartAt:new Date('2026-11-19T10:00:00Z'),
  ExpectedEndAt:new Date('2026-11-19T10:30:00Z'),DurationMinutes:30,
 },now,{graceMinutes:15,defaultDurationMinutes:30});
 assert.equal(expired.effectiveStatus,'no_show_candidate');
 assert.equal(expired.isBlockingAvailability,false);
 assert.equal(expired.needsOperatorAction,true);
});

test('_cashier_source mirrors pinned lifecycle + settle-expired blobs exactly',()=>{
 assert.equal(
  createHash('sha1').update('blob '+cashierCopy.length+'\0').update(cashierCopy).digest('hex'),
  LIFE_BLOB);
 assert.equal(
  createHash('sha1').update('blob '+settleCopy.length+'\0').update(settleCopy).digest('hex'),
  SETTLE_BLOB);
});

test('Nest lifecycle rules stay byte-identical to package source',()=>{
 assert.equal(lifeNest.equals(lifePkg),true);
});

test('DRVO Queue ADAPT: SQL026/036 Nest Light nonposting; ADR-031 gated',()=>{
 for(const token of [
  'QueueTicket','CreateQueueTicketFromBooking','NONPOSTING_QUEUE_TICKETS_ONLY',
  'NOT_PAID','NOT_POSTED','BOOKING_HANDOFF','WALK_IN','SettleExpiredQueueTickets',
  'NONPOSTING_QUEUE_LIFECYCLE',
 ])assert.ok((sql026+sql036+apiSvc+queueClient).includes(token),'missing '+token);
 assert.match(apiCtrl,/workspaces\/:businessId\/branches\/:branchId\/queue/);
 assert.match(apiCtrl,/settle-expired/);
 assert.match(sql026,/UX_QueueTicket_ActiveBooking/);
 assert.match(sql036,/SQL036/);
 assert.match(sql036,/SETTLED_BY_OPERATOR/);
 assert.doesNotMatch(sql036,/SQL035/);
 assert.doesNotMatch(apiSvc,/CashMove|Tblinv|settlePayment|accountingPosted/);
 assert.match(apiSvc,/NOT_POSTED/);
 assert.doesNotMatch(queueClient,/localStorage|paid invoice|GL post/i);
 assert.match(queueClient,/drvo-queue-board/);
 assert.match(queueClient,/\/queue\/settle-expired/);
 assert.match(bookingClient,/\/queue\/from-booking/);
 assert.match(bookingClient,/drvo-booking-calendar/);
});

test('honest ledger Status + TargetPaths for operational Booking/Queue rows',()=>{
 assert.equal(bk01.Status,'PORTING');
 assert.equal(bk02.Status,'PORTING');
 assert.equal(bk03.Status,'PORTING');
 assert.equal(bk04.Status,'PORTING');
 assert.equal(bk05.Status,'BLOCKED');
 assert.equal(q01.Status,'PORTING');
 assert.equal(q02.Status,'PORTING');
 assert.equal(q03.Status,'PORTING');
 assert.equal(q04.Status,'SOURCE_IDENTIFIED');
 assert.equal(q05.Status,'PORTING');
 assert.equal(q06.Status,'SOURCE_IDENTIFIED');
 for(const row of [bk01,bk02,bk03,bk04,q01,q02,q03,q05]){
  assert.ok(Array.isArray(row.TargetPaths)&&row.TargetPaths.length>0,row.ID+' TargetPaths');
  assert.equal(row.PilotProof,'OPEN');
  assert.equal(row.BrowserProof,'OPEN');
 }
 assert.ok(bk01.TargetPaths.some(p=>p.includes('booking.service.ts')));
 assert.ok(bk03.TargetPaths.some(p=>p.includes('booking-client.tsx')));
 assert.ok(bk04.TargetPaths.some(p=>p.includes('026_salon_queue_tickets.sql')));
 assert.ok(q01.TargetPaths.some(p=>p.includes('queue-client.tsx')));
 assert.ok(q02.TargetPaths.some(p=>p.includes('queue.service.ts')));
 assert.ok(q03.TargetPaths.some(p=>p.includes('036_salon_queue_settle_expired.sql')));
 assert.ok(q05.TargetPaths.some(p=>p.includes('036_salon_queue_settle_expired.sql')));
 assert.equal(bk05.TargetPaths.length,0);
 assert.match(bk05.Blocker,/ADR-031/);
 assert.match(q05.Blocker,/SQL036|operator settle/i);
 assert.doesNotMatch(q05.Blocker,/SQL035/);
});
