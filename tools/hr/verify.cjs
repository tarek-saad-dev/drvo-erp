'use strict';
// HR 018 disposable SQL2022 + production Nest HTTP, no access to real VPS/primary DB.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.HR_SQL_DISPOSABLE,'YES');
assert.equal(process.env.HR_TEST_PORT,'14349');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',appUser='drvo_erp_stage_app',password='HrTest!123456';
const origin='https://erp-stage.drvotech.com';
const base={server:'127.0.0.1',port:14349,user:'sa',
 password:process.env.SQL_TEST_SA_PASSWORD,options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:7000,requestTimeout:30000,pool:{min:0,max:5}};
const api='http://127.0.0.1:3418/api',id=()=>crypto.randomUUID();
const x={t:id(),otherT:id(),b:id(),otherB:id(),foreignB:id(),
 br:id(),otherBr:id(),foreignBr:id(),unassignedBr:id(),owner:id(),foreignOwner:id(),
 role:id(),foreignRole:id(),person:id(),personOther:id(),room:id(),foreignPerson:id()};
let check=0;
async function pass(label,fn){await fn();console.log('PASS HR '+(++check)+' '+label);}
async function connect(config){const p=new sql.ConnectionPool(config);await p.connect();return p;}
async function query(pool,text,ids={}){const q=pool.request();for(const [k,v]of Object.entries(ids))q.input(k,sql.UniqueIdentifier,v);return q.query(text);}
async function branch(pool,t,b,br){
 await query(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
  "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",{t,b,br});
}
async function account(pool,t,a,username){
 const hash=await hashNewPassword(password);
 await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
  .input('name',sql.NVarChar(80),username).input('salt',sql.VarBinary(32),hash.salt)
  .input('hash',sql.VarBinary(64),hash.passwordHash).query(
   "INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@name);"+
   "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
   " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function role(pool,t,b,r){
 await query(pool,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
  " VALUES(@t,@b,@r,N'OWNER',N'Owner');"+
  "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
  " VALUES(@t,@b,@r,'hr.read'),(@t,@b,@r,'hr.manage'),(@t,@b,@r,'salon.barber.manage')",{t,b,r});
}
async function membership(pool,t,b,br,a,r){
 await query(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
  "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
  "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
  {t,b,br,a,r});
}
async function resource(pool,t,b,br,res,kind,name){
 await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
  .input('br',sql.UniqueIdentifier,br).input('res',sql.UniqueIdentifier,res)
  .input('key',sql.UniqueIdentifier,id()).input('kind',sql.VarChar(9),kind)
  .input('name',sql.NVarChar(100),name).query(
   "INSERT core.BookingResource(TenantId,BusinessId,BranchId,ResourceId,ClientRequestId,Kind,DisplayName)"+
   " VALUES(@t,@b,@br,@res,@key,@kind,@name)");
}
async function appGrants(pool){
 for(const name of ['Tenant','Business','Branch','Account','AccountCredential',
  'BusinessMembership','BranchAssignment','BranchRole','BusinessRole',
  'RolePermission','AuthSession','LoginThrottle','SchemaMigration'])
   await pool.query('GRANT SELECT ON OBJECT::core.'+name+' TO ['+appUser+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+appUser+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+appUser+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+appUser+']');
 await pool.query('GRANT UPDATE(FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO ['+appUser+']');
}
const url=(b,br)=>api+'/workspaces/'+b+'/branches/'+br+'/hr/employees';
const get=(path,cookie)=>fetch(path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,cookie,key,body,requestOrigin=origin)=>fetch(path,{
 method:'POST',headers:{Cookie:cookie,Origin:requestOrigin,'Content-Type':'application/json',
  'Idempotency-Key':key},body:JSON.stringify(body)});
async function login(username){
 const resp=await fetch(api+'/auth/login',{method:'POST',
  headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username,password})});
 assert.equal(resp.status,200);
 const cookie=resp.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));return cookie;
}
async function wait(){
 for(let i=0;i<90;i++){try{if((await fetch(api+'/health')).ok)return;}catch{}
  await new Promise(done=>setTimeout(done,350));}
 throw Error('HR Nest app not healthy');
}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
  catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
   await new Promise(done=>setTimeout(done,2500));}}
 try{
  await master.query('CREATE DATABASE ['+db+']');
  const appPass='HrCi_'+crypto.randomBytes(22).toString('hex')+'!';
  await master.query("CREATE LOGIN ["+appUser+"] WITH PASSWORD=N'"+appPass+
   "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database:db});
  await admin.query('CREATE USER ['+appUser+'] FOR LOGIN ['+appUser+'];GRANT CONNECT TO ['+appUser+']');
  await pass('18 sequential migrations replay with no drift or HR seed',async()=>{
   const a=await applyMigrations(admin,undefined,18);
   assert.equal(a.length,18);assert.ok(a.every(z=>z.status==='applied'));
   const b=await applyMigrations(admin,undefined,18);
   assert.ok(b.every(z=>z.status==='unchanged'));
   assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.HrEmployee')).recordset[0].n,0);
  });
  await appGrants(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI'),(@otherT,N'Foreign')",
   {t:x.t,otherT:x.otherT});
  await branch(admin,x.t,x.b,x.br);await branch(admin,x.t,x.otherB,x.otherBr);
  await branch(admin,x.otherT,x.foreignB,x.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@br,N'Unassigned')",{t:x.t,b:x.b,br:x.unassignedBr});
  await account(admin,x.t,x.owner,'owner.hr.ci');
  await account(admin,x.otherT,x.foreignOwner,'foreign.hr.ci');
  await role(admin,x.t,x.b,x.role);await role(admin,x.otherT,x.foreignB,x.foreignRole);
  await membership(admin,x.t,x.b,x.br,x.owner,x.role);
  await membership(admin,x.otherT,x.foreignB,x.foreignBr,x.foreignOwner,x.foreignRole);
  await resource(admin,x.t,x.b,x.br,x.person,'PERSON','CI Barber Resource');
  await resource(admin,x.t,x.b,x.br,x.personOther,'PERSON','CI Barber B');
  await resource(admin,x.t,x.b,x.br,x.room,'ROOM','CI Room');
  await resource(admin,x.otherT,x.foreignB,x.foreignBr,x.foreignPerson,'PERSON','Foreign');
  await pass('application principal only permitted scoped EXECUTE, not direct SELECT/DML',async()=>{
   app=await connect({...base,database:db,user:appUser,password:appPass});
   const perm=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.HrEmployee','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.HrEmployee','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.ReadHrBranchRoster','OBJECT','EXECUTE') AS x,"+
    "HAS_PERMS_BY_NAME('core.AssertHrBranchAction','OBJECT','EXECUTE') AS y");
   assert.deepEqual(Object.values(perm.recordset[0]).map(Number),[0,0,1,0]);
   await assert.rejects(()=>app.query('SELECT * FROM core.HrEmployee'),e=>e.number===229);
  });
  await pass('foreign business employee rejected by SQL composite FK',async()=>{
   await assert.rejects(()=>query(admin,
    "INSERT core.HrEmployee(TenantId,BusinessId,EmployeeId,ClientRequestId,EmployeeCode,DisplayName,EmploymentType,PayrollMethod)"+
    " VALUES(@t,@b,@e,@key,'FOREIGN',N'X','full_time','daily')",
    {t:x.t,b:x.foreignB,e:id(),key:id()}),e=>e.number===547);
  });
  await pass('K5 SQL guard denies a forged session hash',async()=>{
   await assert.rejects(()=>app.request()
    .input('TenantId',sql.UniqueIdentifier,x.t).input('BusinessId',sql.UniqueIdentifier,x.b)
    .input('BranchId',sql.UniqueIdentifier,x.br).input('AccountId',sql.UniqueIdentifier,x.owner)
    .input('SessionVersion',sql.Int,1).input('TokenHash',sql.Char(64),'0'.repeat(64))
    .execute('core.ReadHrBranchRoster'),e=>e.number===51181);
  });
  const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3418',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:appUser,DRVO_SQL_PASSWORD:appPass,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_HR_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=String(d)});
  server.stderr.on('data',d=>{log+=String(d)});
  try{await wait();}catch(e){throw Error('HR API startup: '+log.slice(-300));}
  await pass('anonymous HR GET denied, cache-control no-store',async()=>{
   const resp=await get(url(x.b,x.br));assert.equal(resp.status,401);
   assert.equal(resp.headers.get('cache-control'),'no-store');
  });
  const own=await login('owner.hr.ci'),foreign=await login('foreign.hr.ci');
  const employee={employeeCode:'BARBER_01',displayName:'Synthetic Barber',
   employmentType:'full_time',payrollMethod:'daily'};
  let employeeId;
  await pass('employee persisted via actual HTTP, idempotent replay and conflicting payload',async()=>{
   const path=url(x.b,x.br),key=id();
   const a=await post(path,own,key,employee);assert.equal(a.status,200);
   const result=await a.json();employeeId=result.id;assert.equal(result.created,true);
   assert.ok(employeeId);
   const replay=await post(path,own,key,employee);assert.equal(replay.status,200);
   assert.equal((await replay.json()).created,false);
   assert.equal((await post(path,own,key,{...employee,employeeCode:'CHANGED'})).status,409);
   const list=await get(path,own);assert.equal(list.status,200);
   const body=await list.json();
   assert.equal(body.employees.length,1);assert.equal(body.employees[0].employeeId.toLowerCase(),employeeId.toLowerCase());
   assert.equal(body.employees[0].isBookable,false);
  });
  await pass('HR validates payroll/employee code/injected scope/Origin/duplicate code',async()=>{
   assert.equal((await post(url(x.b,x.br),own,id(),{
    ...employee,employeeCode:'FREE_01',employmentType:'freelance',payrollMethod:'monthly'})).status,400);
   assert.equal((await post(url(x.b,x.br),own,id(),{...employee,tenantId:x.otherT})).status,400);
   assert.equal((await post(url(x.b,x.br),own,id(),{...employee,employeeCode:'bad space'})).status,400);
   assert.equal((await post(url(x.b,x.br),own,id(),{...employee},'https://attacker.example')).status,401);
   assert.equal((await post(url(x.b,x.br),own,id(),employee)).status,409);
  });
  await pass('foreign Tenant/Business and unassigned Branch cannot read/create',async()=>{
   for(const [b,br] of [[x.otherB,x.otherBr],[x.foreignB,x.foreignBr],[x.b,x.unassignedBr]]){
    assert.equal((await get(url(b,br),own)).status,404);
    assert.equal((await post(url(b,br),own,id(),employee)).status,404);
   }
   const resp=await get(url(x.foreignB,x.foreignBr),foreign);
   assert.equal(resp.status,200);assert.equal((await resp.json()).employees.length,0);
  });
  const barberPath=url(x.b,x.br)+'/'+employeeId+'/barber';
  await pass('Salon barber bound only to authorized active PERSON Booking resource',async()=>{
   const data={resourceId:x.person,isBookable:true},key=id();
   assert.equal((await post(barberPath,own,key,data)).status,200);
   const replay=await post(barberPath,own,key,data);assert.equal(replay.status,200);
   assert.equal((await replay.json()).changed,false);
   assert.equal((await post(barberPath,own,key,{resourceId:x.personOther,isBookable:true})).status,409);
   const resp=await get(url(x.b,x.br),own);assert.equal(resp.status,200);
   const members=(await resp.json()).employees;
   assert.equal(members[0].isBookable,true);
   assert.equal(members[0].resourceId.toLowerCase(),x.person.toLowerCase());
  });
  await pass('foreign resource, room, outsider Employee and injected field denied',async()=>{
   for(const resourceId of [x.room,x.foreignPerson,id()]){
    assert.equal((await post(barberPath,own,id(),{resourceId,isBookable:true})).status,404);
   }
   assert.equal((await post(url(x.b,x.br)+'/'+id()+'/barber',own,id(),
    {resourceId:x.person,isBookable:true})).status,404);
   assert.equal((await post(barberPath,own,id(),{resourceId:x.person,isBookable:true,tenantId:x.t})).status,400);
  });
  await pass('same resource cannot be assigned twice; disable and restore via HTTP',async()=>{
   const second=await post(url(x.b,x.br),own,id(),{...employee,employeeCode:'BARBER_02'});
   assert.equal(second.status,200);const secondId=(await second.json()).id;
   const path=url(x.b,x.br)+'/'+secondId+'/barber';
   assert.equal((await post(path,own,id(),{resourceId:x.person,isBookable:true})).status,409);
   assert.equal((await post(barberPath,own,id(),{resourceId:null,isBookable:false})).status,200);
   assert.equal((await post(path,own,id(),{resourceId:x.person,isBookable:true})).status,200);
  });
  await pass('role permissions immediately revoke HR create and Barber mutation',async()=>{
   const revoke=async(action)=>admin.request().input('t',sql.UniqueIdentifier,x.t)
    .input('b',sql.UniqueIdentifier,x.b).input('role',sql.UniqueIdentifier,x.role)
    .input('action',sql.VarChar(90),action).query(
    'DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b AND RoleId=@role AND ActionCode=@action');
   await revoke('hr.manage');
   assert.equal((await post(url(x.b,x.br),own,id(),{...employee,employeeCode:'DENIED'})).status,404);
   await revoke('salon.barber.manage');
   assert.equal((await post(barberPath,own,id(),{resourceId:null,isBookable:false})).status,404);
   await revoke('hr.read');
   assert.equal((await get(url(x.b,x.br),own)).status,404);
  });
  await pass('membership + session revoked: no residual HR reads',async()=>{
   await query(admin,"UPDATE core.BusinessMembership SET IsActive=0 "+
    "WHERE TenantId=@t AND BusinessId=@b AND AccountId=@a",{t:x.t,b:x.b,a:x.owner});
   assert.equal((await get(url(x.b,x.br),own)).status,404);
   await query(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
    " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",{t:x.t,a:x.owner});
   assert.equal((await get(url(x.b,x.br),own)).status,401);
  });
  console.log('HR SQL2022 + NEST HTTP PASS: '+check+' independent groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('HR DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,300):'unknown');process.exitCode=1;});
