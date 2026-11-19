'use strict';
/**
 * Source-characterized Cashier attendance concepts vs DRVO HR UTC punch slice.
 * Pin: casher@046bf19 attendanceSessionPolicy.ts (+ ledger AttendancePanel / admin routes).
 * DRVO owns SQL020 Nest punches only; day-board/payroll remain deferred.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('crypto');
const ts=require('typescript');
const vm=require('node:vm');

const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const POLICY_BLOB='e3ad2f2cc3d744348a1e64f06cdab819de3ad08a';
const PANEL_BLOB='2c7fd8674a1f9353768f6b1db57f522f46143f6a';
const ROUTE_BLOB='f2afe35ec196398f81cb4651ca3138a67aebd958';
const BULK_BLOB='c5a98b67ef9cd44d0d483329dfff7a05c1c45001';

function pinnedSource(file,gitBlob){
 const s=readFileSync(resolve(__dirname,'fixtures/cashier',file),'utf8');
 assert.equal(
  createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'),
  gitBlob,
  'fixture blob drift for '+file,
 );
 const exports={};
 const code=ts.transpileModule(s,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
 }).outputText;
 vm.runInNewContext(code,{exports,module:{exports},require:()=>({})},{timeout:1000});
 return exports;
}

const policy=pinnedSource('attendanceSessionPolicy.ts',POLICY_BLOB);
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const hr02=ledger.workflows.find(w=>w.ID==='HR-02');
const pos14=ledger.workflows.find(w=>w.ID==='POS-14');
const hr03=ledger.workflows.find(w=>w.ID==='HR-03');
const hr04=ledger.workflows.find(w=>w.ID==='HR-04');

const apiSvc=readFileSync(resolve(__dirname,'../apps/api/src/hr/attendance.service.ts'),'utf8');
const apiCtrl=readFileSync(resolve(__dirname,'../apps/api/src/hr/attendance.controller.ts'),'utf8');
const sql020=readFileSync(resolve(__dirname,'../db/migrations/020_hr_attendance_sessions.sql'),'utf8');
const webClient=readFileSync(resolve(__dirname,
 '../apps/web/src/app/workspace/[businessId]/[branchId]/hr/attendance/attendance-client.tsx'),'utf8');
const webPage=readFileSync(resolve(__dirname,
 '../apps/web/src/app/workspace/[businessId]/[branchId]/hr/attendance/page.tsx'),'utf8');

test('ledger keeps Cashier attendance source pin + blob evidence for HR-02',()=>{
 assert.equal(ledger.sourceRevision,PIN);
 assert.ok(hr02);
 assert.equal(hr02.SourceSHA,PIN);
 assert.ok(hr02['SourcePaths+BlobSHA'].includes(
  'src/components/hr/AttendancePanel.tsx#'+PANEL_BLOB));
 assert.ok(hr02['SourcePaths+BlobSHA'].includes(
  'src/app/api/admin/attendance/route.ts#'+ROUTE_BLOB));
 assert.ok(hr02['SourcePaths+BlobSHA'].includes(
  'src/app/api/admin/attendance/bulk/route.ts#'+BULK_BLOB));
 assert.equal(hr02.Status,'PORTING');
 assert.notEqual(hr02.Status,'PILOT_VERIFIED');
 assert.ok(hr02.TargetPaths.some(p=>p.includes('attendance.service.ts')));
 assert.ok(hr02.TargetPaths.some(p=>p.includes('attendance-client.tsx')));
 assert.ok(hr02.TargetPaths.some(p=>p.includes('020_hr_attendance_sessions.sql')));
 assert.equal(hr02.PilotProof,'OPEN');
 assert.equal(hr02.BrowserProof,'OPEN');
});

test('Cashier ACTIVE_OPEN invariant characterizes one-open semantics DRVO adapts',()=>{
 const open={
  attendanceId:11,employeeId:7,branchId:1,workDate:'2026-11-19',checkInTime:'09:00',
 };
 const ok=policy.evaluateActiveOpenCreation({
  candidateWorkDate:'2026-11-19',openSessions:[],
 });
 assert.equal(ok.allowed,true);
 assert.equal(ok.kind,'NO_SESSION');
 const conflict=policy.evaluateActiveOpenCreation({
  candidateWorkDate:'2026-11-19',openSessions:[open],
 });
 assert.equal(conflict.allowed,false);
 assert.equal(conflict.kind,'CONFLICT');
 const stale=policy.evaluateActiveOpenCreation({
  candidateWorkDate:'2026-11-19',
  openSessions:[{...open,workDate:'2026-11-18'}],
 });
 assert.equal(stale.allowed,true);
 assert.equal(stale.kind,'STALE_OPEN');
 assert.equal(policy.willResultInOpenSession('09:00',null),true);
 assert.equal(policy.willResultInOpenSession('09:00','17:00'),false);
});

test('DRVO attendance ADAPT: UTC IN/OUT only; payroll/BusinessDay gated literals',()=>{
 for(const token of [
  'UTC_PUNCH_SESSIONS_ONLY','NOT_CALCULATED','NOT_LINKED',
  'core.ReadHrAttendance','core.RecordHrAttendance','Invalid Idempotency-Key',
 ]) assert.ok(apiSvc.includes(token),'missing service token '+token);
 assert.match(apiSvc,/\["IN","OUT"\]/);
 assert.match(apiCtrl,/workspaces\/:businessId\/branches\/:branchId\/hr\/attendance/);
 assert.match(apiCtrl,/idempotency-key/i);
 assert.match(sql020,/HrAttendanceSession/);
 assert.match(sql020,/UX_HrAttendance_OneOpen/);
 assert.match(sql020,/SYSUTCDATETIME\(\)/);
 assert.doesNotMatch(apiSvc,/DayOff|LateMinutes|post-to-cash|daily\/generate/);
 assert.doesNotMatch(apiCtrl,/payroll|day-off|bulk/i);
 assert.match(webClient,/payrollState!=="NOT_CALCULATED"/);
 assert.match(webClient,/businessDayState!=="NOT_LINKED"/);
 assert.match(webClient,/\{employeeId:id,action,attendanceId:sessionId\}/);
 assert.match(webClient,/ADR-031 OUT OF SCOPE/);
 assert.doesNotMatch(webClient,/localStorage|sessionStorage|\/api\/payroll|CashMove|DayOff/);
 assert.match(webPage,/DRVO_HR_ATTENDANCE_WEB_ENABLED/);
});

test('deferred Cashier day-board/payroll stay OPEN or BLOCKED — not claimed as ported',()=>{
 assert.ok(webClient.includes('Day-off')||webClient.includes('Work-on-day-off'));
 assert.match(webClient,/POS-14|درج حضور فريق/);
 assert.equal(pos14.Status,'SOURCE_IDENTIFIED');
 assert.ok(Array.isArray(pos14.TargetPaths));
 assert.equal(pos14.TargetPaths.length,0);
 assert.equal(hr03.Status,'BLOCKED');
 assert.equal(hr04.Status,'BLOCKED');
 assert.match(hr04.Blocker,/ADR-031/);
});
