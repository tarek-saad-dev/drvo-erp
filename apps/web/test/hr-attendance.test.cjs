'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('new Attendance page is private and independently triple-gated',()=>{
 const page=read('hr/attendance/page.tsx');
 for(const flag of ['DRVO_K5_WEB_ENABLED','DRVO_HR_WEB_ENABLED','DRVO_HR_ATTENDANCE_WEB_ENABLED'])
  assert.match(page,new RegExp(flag));
 assert.match(page,/notFound\(\)/);
});
test('Attendance UI never accepts client workdate/payroll or browser-persisted session',()=>{
 const client=read('hr/attendance/attendance-client.tsx');
 assert.match(client,/UTC_PUNCH_SESSIONS_ONLY/);
 assert.match(client,/payrollState!=="NOT_CALCULATED"/);
 assert.match(client,/businessDayState!=="NOT_LINKED"/);
 assert.match(client,/Intl\.DateTimeFormat\("ar-EG"/);
 assert.match(client,/timeZone:"Africa\/Cairo"/);
 assert.match(client,/Idempotency-Key/);
 assert.match(client,/\{employeeId:id,action,attendanceId:sessionId\}/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB|PayrollPaid|CashMove|\/api\/payroll/);
});
test('HR roster link is shown only behind server-side attendance flag',()=>{
 const page=read('hr/page.tsx'),hr=read('hr/hr-client.tsx');
 assert.match(page,/attendanceWebEnabled=\{process\.env\.DRVO_HR_ATTENDANCE_WEB_ENABLED==="YES"\}/);
 assert.match(hr,/attendanceWebEnabled&&<Link/);
 assert.match(hr,/href=\{home\+"\/hr\/attendance"\}/);
});
