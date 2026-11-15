'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {AttendanceService}=require('../dist/hr/attendance.service');
const {AttendanceController}=require('../dist/hr/attendance.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'hr-ci',mustChangePassword:false};
const token='A'.repeat(43);
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
const active={DRVO_HR_ENABLED:'YES',DRVO_HR_ATTENDANCE_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
const deadDb={getInternalPool(){throw Error('SQL touched')}};
test('Attendance OFF by default and does not touch session/DB',async()=>{
 await withEnv({...active,DRVO_HR_ATTENDANCE_ENABLED:null},async()=>{
  const svc=new AttendanceService(deadDb);
  await assert.rejects(()=>svc.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
  const ctrl=new AttendanceController({actorFromToken(){throw Error('Auth touched')}},svc);
  await assert.rejects(()=>ctrl.list({headers:{}},{setHeader(){}},ID(3),ID(4)),
   e=>e.getStatus?.()===503);
 });
});
test('Punch rejects malformed UUIDs and all field/clock/tenant injection before DB',async()=>{
 await withEnv(active,async()=>{
  const svc=new AttendanceService(deadDb);
  const normal={employeeId:ID(5),action:'IN',attendanceId:null};
  for(const bad of [
   {...normal,employeeId:'not-an-uuid'},{...normal,action:'OPEN'},
   {...normal,attendanceId:ID(7)},{...normal,tenantId:ID(8)},
   {...normal,checkedInAtUtc:'2020-01-01'}, {...normal,workDate:'2020-01-01'},
   {...normal,action:'OUT'},{...normal,action:'OUT',attendanceId:'invalid'},null,
  ])await assert.rejects(()=>svc.punch(actor,token,ID(3),ID(4),ID(9),bad),
     e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.punch(actor,token,ID(3),ID(4),'bad',normal),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.punch(actor,token,'bad',ID(4),ID(9),normal),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.punch({...actor,mustChangePassword:true},
   token,ID(3),ID(4),ID(9),normal),e=>e.getStatus?.()===404);
 });
});
test('Attendance POST requires exact HTTPS Origin checked before K5 identity',async()=>{
 await withEnv({...active,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new AttendanceController({actorFromToken(){throw Error('Auth touched')}},{});
  for(const origin of [undefined,'http://erp-stage.drvotech.com','https://attacker.example']){
   await assert.rejects(()=>ctrl.punch(origin,ID(9),{headers:{}},{setHeader(){}},
    ID(3),ID(4),{}),e=>e.getStatus?.()===401);
  }
 });
});
test('Scoped SQL read returns only explicitly unposted session punches',async()=>{
 await withEnv(active,async()=>{
  const calls=[];
  const pool={request(){return {input(){return this},
   execute:async name=>{calls.push(name);return {recordset:[
    {attendanceId:ID(9),employeeId:ID(8),employeeName:'CI Barber',
     checkedInAtUtc:new Date('2026-11-15T03:00:00Z'),checkedOutAtUtc:null,status:'OPEN'},
   ]};}}}};
  const svc=new AttendanceService({getInternalPool(){return pool}});
  const result=await svc.list(actor,token,ID(3),ID(4));
  assert.deepEqual(calls,['core.ReadHrAttendance']);
  assert.equal(result.sessions.length,1);
  assert.equal(result.sessions[0].status,'OPEN');
  assert.equal(result.sessions[0].checkedInAtUtc,'2026-11-15T03:00:00.000Z');
  assert.equal(result.payrollState,'NOT_CALCULATED');
  assert.equal(result.businessDayState,'NOT_LINKED');
 });
});
