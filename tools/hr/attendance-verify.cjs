'use strict';
// HR Attendance SQL020: real disposable SQL2022 + production Nest HTTP.
// NEVER run against primary DRVO or VPS.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.ATTENDANCE_SQL_DISPOSABLE,'YES');
assert.equal(process.env.ATTENDANCE_TEST_PORT,'14346');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',user='drvo_erp_stage_app',secret='AttendanceTest!123456789abcdefghijklmnopqrstuvwxyz';
const origin='https://erp-stage.drvotech.com',base={server:'127.0.0.1',port:14346,
 user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:7000,requestTimeout:30000,pool:{min:0,max:5}};
const url='http://127.0.0.1:3420/api',id=()=>crypto.randomUUID();
const x={t:id(),otherT:id(),b:id(),foreignB:id(),br:id(),otherBr:id(),
 foreignBr:id(),owner:id(),foreignOwner:id(),role:id(),foreignRole:id(),employee:id(),
 employeeOther:id(),unassignedBr:id()};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS Attendance '+(++checks)+' '+label);}
async function connect(cfg){const pool=new sql.ConnectionPool(cfg);await pool.connect();return pool;}
async function query(pool,text,ids={}){const q=pool.request();
 for(const [k,v]of Object.entries(ids))q.input(k,sql.UniqueIdentifier,v);
 return q.query(text);}
async function branch(pool,t,b,br){
 await query(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
 "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",{t,b,br});
}
async function account(pool,t,a,name){
 const hash=await hashNewPassword(secret);
 await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
 .input('name',sql.NVarChar(80),name).input('salt',sql.VarBinary(32),hash.salt)
 .input('hash',sql.VarBinary(64),hash.passwordHash).query(
 "INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@name);"+
 "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
 " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function role(pool,t,b,r){
 await query(pool,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
 " VALUES(@t,@b,@r,N'OWNER',N'Owner');"+
 "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
 " VALUES(@t,@b,@r,'hr.read'),(@t,@b,@r,'hr.manage')",{t,b,r});
}
async function member(pool,t,b,br,a,r){
 await query(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
 "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
 "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
 {t,b,br,a,r});
}
async function grants(pool){
 for(const name of ['Tenant','Business','Branch','Account','AccountCredential',
 'BusinessMembership','BranchAssignment','BranchRole','BusinessRole','RolePermission',
 'AuthSession','LoginThrottle','SchemaMigration'])
  await pool.query('GRANT SELECT ON OBJECT::core.'+name+' TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+user+']');
 await pool.query('GRANT UPDATE(FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO ['+user+']');
}
async function employee(pool,t,b,br,emp,code){
 await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
 .input('br',sql.UniqueIdentifier,br).input('employee',sql.UniqueIdentifier,emp)
 .input('key',sql.UniqueIdentifier,id()).input('code',sql.VarChar(32),code)
 .query("INSERT core.HrEmployee(TenantId,BusinessId,EmployeeId,ClientRequestId,"+
 "EmployeeCode,DisplayName,EmploymentType,PayrollMethod)"+
 " VALUES(@t,@b,@employee,@key,@code,N'Synthetic Barber','full_time','daily');"+
 "INSERT core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId)"+
 " VALUES(@t,@b,@br,@employee)");
}
async function login(username){
 const response=await fetch(url+'/auth/login',{method:'POST',
  headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username,password:secret})});
 assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));return cookie;
}
const endpoint=(b,br)=>url+'/workspaces/'+b+'/branches/'+br+'/hr/attendance';
const get=(path,cookie)=>fetch(path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,cookie,key,body,source=origin)=>fetch(path,{
 method:'POST',headers:{Cookie:cookie,Origin:source,'Content-Type':'application/json',
 'Idempotency-Key':key},body:JSON.stringify(body)});
async function wait(){
 for(let i=0;i<90;i++){try{if((await fetch(url+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}throw Error('Attendance Nest API not ready');
}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
 catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
 await new Promise(done=>setTimeout(done,2500));}}
 try{
 await master.query('CREATE DATABASE ['+db+']');
 const appPass='AttendanceCi_'+crypto.randomBytes(22).toString('hex')+'!';
 await master.query("CREATE LOGIN ["+user+"] WITH PASSWORD=N'"+appPass+
  "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
 admin=await connect({...base,database:db});
 await admin.query('CREATE USER ['+user+'] FOR LOGIN ['+user+'];GRANT CONNECT TO ['+user+']');
 await pass('20 migration history applies and replays safely, with no employee attendance seed',async()=>{
  const a=await applyMigrations(admin,undefined,20);
  assert.equal(a.length,20);assert.ok(a.every(v=>v.status==='applied'));
  const b=await applyMigrations(admin,undefined,20);
  assert.ok(b.every(v=>v.status==='unchanged'));
  assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.HrAttendanceSession')).recordset[0].n,0);
 });
 await grants(admin);
 await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI'),(@otherT,N'Other')",
  {t:x.t,otherT:x.otherT});
 await branch(admin,x.t,x.b,x.br);await branch(admin,x.otherT,x.foreignB,x.foreignBr);
 await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
 " VALUES(@t,@b,@otherBr,N'Other Branch'),(@t,@b,@unassignedBr,N'Unassigned')",
 {t:x.t,b:x.b,otherBr:x.otherBr,unassignedBr:x.unassignedBr});
 await account(admin,x.t,x.owner,'owner.attendance.ci');
 await account(admin,x.otherT,x.foreignOwner,'foreign.attendance.ci');
 await role(admin,x.t,x.b,x.role);await role(admin,x.otherT,x.foreignB,x.foreignRole);
 await member(admin,x.t,x.b,x.br,x.owner,x.role);
 await member(admin,x.otherT,x.foreignB,x.foreignBr,x.foreignOwner,x.foreignRole);
 await employee(admin,x.t,x.b,x.br,x.employee,'BARBER_A');
 await employee(admin,x.t,x.b,x.otherBr,x.employeeOther,'BARBER_B');
 await pass('app principal only scoped EXECUTE; direct SELECT/DML forbidden',async()=>{
  app=await connect({...base,database:db,user,password:appPass});
  const r=await app.query(
   "SELECT HAS_PERMS_BY_NAME('core.HrAttendanceSession','OBJECT','SELECT') AS r,"+
   "HAS_PERMS_BY_NAME('core.HrAttendanceSession','OBJECT','INSERT') AS w,"+
   "HAS_PERMS_BY_NAME('core.ReadHrAttendance','OBJECT','EXECUTE') AS x,"+
   "HAS_PERMS_BY_NAME('core.RecordHrAttendance','OBJECT','EXECUTE') AS y");
  assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1]);
  await assert.rejects(()=>app.query('SELECT * FROM core.HrAttendanceSession'),e=>e.number===229);
 });
 const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3420',
  DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
  DRVO_SQL_DATABASE:db,DRVO_SQL_USER:user,DRVO_SQL_PASSWORD:appPass,
  DRVO_K5_AUTH_ENABLED:'YES',DRVO_HR_ENABLED:'YES',DRVO_HR_ATTENDANCE_ENABLED:'YES',
  DRVO_K5_ORIGIN:origin};
 server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
 let log='';server.stdout.on('data',d=>{log+=String(d)});server.stderr.on('data',d=>{log+=String(d)});
 try{await wait();}catch(e){throw Error('Attendance startup: '+log.slice(-350));}
 await pass('no session anonymous GET denied, no-store cache',async()=>{
  const r=await get(endpoint(x.b,x.br));assert.equal(r.status,401);
  assert.equal(r.headers.get('cache-control'),'no-store');
 });
 const own=await login('owner.attendance.ci'),foreign=await login('foreign.attendance.ci');
 let sessionId;
 await pass('server UTC check-in persisted and exact replay',async()=>{
  const path=endpoint(x.b,x.br),key=id();
  const payload={employeeId:x.employee,action:'IN',attendanceId:null};
  const r=await post(path,own,key,payload);assert.equal(r.status,200);
  const created=await r.json();assert.equal(created.changed,true);sessionId=created.id;
  assert.equal(created.payrollState,'NOT_CALCULATED');
  assert.equal(created.businessDayState,'NOT_LINKED');
  const replay=await post(path,own,key,payload);
  assert.equal(replay.status,200);assert.equal((await replay.json()).changed,false);
  assert.equal((await post(path,own,key,{...payload,action:'OUT',attendanceId:sessionId})).status,409);
  const result=await get(path,own);assert.equal(result.status,200);
  const model=await result.json();assert.equal(model.state,'UTC_PUNCH_SESSIONS_ONLY');
  assert.equal(model.sessions.length,1);assert.equal(model.sessions[0].status,'OPEN');
  assert.equal(model.sessions[0].employeeId.toLowerCase(),x.employee.toLowerCase());
  assert.ok(model.sessions[0].checkedInAtUtc);
 });
 await pass('one OPEN globally even across employee branch assignment',async()=>{
  await query(admin,"INSERT core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId)"+
   " VALUES(@t,@b,@otherBr,@employee)",{t:x.t,b:x.b,otherBr:x.otherBr,employee:x.employee});
  const payload={employeeId:x.employee,action:'IN',attendanceId:null};
  assert.equal((await post(endpoint(x.b,x.br),own,id(),payload)).status,409);
  // Authorization can be assigned to alternate branch, but one open remains global.
  await memberOtherBranch(admin);
  assert.equal((await post(endpoint(x.b,x.otherBr),own,id(),payload)).status,409);
 });
 async function memberOtherBranch(pool){
  await query(pool,"INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId)"+
   " VALUES(@t,@b,@br,@account);"+
   "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId)"+
   " VALUES(@t,@b,@br,@account,@role)",
   {t:x.t,b:x.b,br:x.otherBr,account:x.owner,role:x.role});
 }
 await pass('missing/foreign employee and forged client time are denied',async()=>{
  const path=endpoint(x.b,x.br);
  for(const body of [
   {employeeId:id(),action:'IN',attendanceId:null},
   {employeeId:x.employee,action:'IN',attendanceId:null,workDate:'2020-01-01'},
   {employeeId:x.employee,action:'IN',attendanceId:null,checkedInAtUtc:'2020-01-01'},
  ])assert.equal((await post(path,own,id(),body)).status,body.employeeId===x.employee?400:404);
  assert.equal((await post(path,own,id(),{employeeId:x.employee,action:'IN',attendanceId:null},
   'https://attacker.example')).status,401);
 });
 await pass('cross-Tenant, inactive Branch and unassigned scoped access blocked',async()=>{
  for(const [b,br]of [[x.foreignB,x.foreignBr],[x.b,x.unassignedBr]]){
   assert.equal((await get(endpoint(b,br),own)).status,404);
   assert.equal((await post(endpoint(b,br),own,id(),
    {employeeId:x.employee,action:'IN',attendanceId:null})).status,404);
  }
  assert.equal((await get(endpoint(x.foreignB,x.foreignBr),foreign)).status,200);
 });
 await pass('server checkout persisted once, replay safe, double-checkout denied',async()=>{
  const path=endpoint(x.b,x.br),key=id(),payload={employeeId:x.employee,action:'OUT',
   attendanceId:sessionId};
  const a=await post(path,own,key,payload);assert.equal(a.status,200);
  assert.equal((await a.json()).changed,true);
  const b=await post(path,own,key,payload);assert.equal(b.status,200);
  assert.equal((await b.json()).changed,false);
  assert.equal((await post(path,own,id(),payload)).status,409);
  const result=await get(path,own);const row=(await result.json()).sessions[0];
  assert.equal(row.status,'CLOSED');assert.ok(row.checkedOutAtUtc);
  assert.ok(new Date(row.checkedOutAtUtc)>=new Date(row.checkedInAtUtc));
 });
 await pass('new check-in after checkout works, foreign Branch read remains scoped',async()=>{
  const path=endpoint(x.b,x.br),payload={employeeId:x.employee,action:'IN',attendanceId:null};
  const r=await post(path,own,id(),payload);assert.equal(r.status,200);
  const list=await get(path,own);assert.equal((await list.json()).sessions.length,2);
  const branchList=await get(endpoint(x.b,x.otherBr),own);assert.equal(branchList.status,200);
  assert.equal((await branchList.json()).sessions.length,0);
 });
 await pass('roles revoke write and read immediately',async()=>{
  await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='hr.manage'",{t:x.t,b:x.b,role:x.role});
  assert.equal((await post(endpoint(x.b,x.br),own,id(),
   {employeeId:x.employee,action:'IN',attendanceId:null})).status,404);
  assert.equal((await get(endpoint(x.b,x.br),own)).status,200);
  await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='hr.read'",{t:x.t,b:x.b,role:x.role});
  assert.equal((await get(endpoint(x.b,x.br),own)).status,404);
 });
 await pass('Business membership and K5 session revocation denies residual access',async()=>{
  await query(admin,"UPDATE core.BusinessMembership SET IsActive=0"+
   " WHERE TenantId=@t AND BusinessId=@b AND AccountId=@account",
   {t:x.t,b:x.b,account:x.owner});
  assert.equal((await get(endpoint(x.b,x.br),own)).status,404);
  await query(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
   " WHERE TenantId=@t AND AccountId=@account AND RevokedAtUtc IS NULL",
   {t:x.t,account:x.owner});
  assert.equal((await get(endpoint(x.b,x.br),own)).status,401);
 });
 console.log('ATTENDANCE SQL2022 + NEST HTTP PASS: '+checks+' independent groups');
 }finally{
  server?.kill('SIGTERM');await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('ATTENDANCE DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,550):'unknown');process.exitCode=1;});
