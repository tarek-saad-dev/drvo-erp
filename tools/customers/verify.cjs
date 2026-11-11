'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');

assert.equal(process.env.CUSTOMERS_SQL_DISPOSABLE,'YES');
assert.equal(process.env.CUSTOMERS_TEST_PORT,'14341');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',appUser='drvo_erp_stage_app';
const appPass='CiCustomers_'+crypto.randomBytes(24).toString('hex')+'!';
const base={server:'127.0.0.1',port:14341,user:'sa',
 password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:5000,requestTimeout:30000,pool:{min:0,max:4}};
const id=()=>crypto.randomUUID();
const x={t:id(),t2:id(),b:id(),b2:id(),foreignB:id(),
 br:id(),br2:id(),foreignBr:id(),unassignedBr:id(),
 account:id(),otherAccount:id(),role:id(),otherRole:id()};
const password='CustomersTest!123456',origin='https://erp-stage.drvotech.com';
const api='http://127.0.0.1:3402/api';
let count=0;
async function pass(title,fn){await fn();count++;console.log('PASS CUSTOMERS '+String(count).padStart(2,'0')+' '+title);}
async function open(c){const pool=new sql.ConnectionPool(c);await pool.connect();return pool;}
async function query(pool,source,params={}){
 const r=pool.request();
 for(const [k,v] of Object.entries(params))r.input(k,sql.UniqueIdentifier,v);
 return r.query(source);
}
async function business(pool,t,b,br){
 await query(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI');"+
 "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'Branch')",{t,b,br});
}
async function account(pool,t,a,username){
 const h=await hashNewPassword(password);
 await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
 .input('username',sql.NVarChar(80),username)
 .input('salt',sql.VarBinary(32),h.salt).input('hash',sql.VarBinary(64),h.passwordHash)
 .query("INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@username);"+
  "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
  " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function role(pool,t,b,r){
 await query(pool,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
 " VALUES(@t,@b,@r,N'OWNER',N'Owner');"+
 "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
 " VALUES(@t,@b,@r,'customers.read'),(@t,@b,@r,'customers.manage')",{t,b,r});
}
async function membership(pool,t,b,br,a,r){
 await query(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
  "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
  "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
 {t,b,br,a,r});
}
async function appGrants(pool){
 const tables=[
 'core.Tenant','core.Business','core.Branch','core.Account',
 'core.AccountCredential','core.BusinessMembership','core.BranchAssignment',
 'core.BranchRole','core.BusinessRole','core.RolePermission','core.AuthSession',
 'core.LoginThrottle','core.SchemaMigration',
 ];
 for(const table of tables)await pool.query('GRANT SELECT ON OBJECT::'+table+' TO ['+appUser+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+appUser+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+appUser+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+appUser+']');
 await pool.query('GRANT UPDATE (FailedCount,WindowStartedUtc) '+
 'ON OBJECT::core.LoginThrottle TO ['+appUser+']');
}
async function wait(){
 for(let i=0;i<90;i++){try{if((await fetch(api+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}
 throw Error('Customers API not healthy');
}
const path=(b,br)=>api+'/workspaces/'+b+'/branches/'+br+'/customers';
const get=(p,cookie)=>fetch(p,{headers:cookie?{Cookie:cookie}:{}});
const post=(p,cookie,key,data,headers={})=>fetch(p,{method:'POST',
 headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json',
 'Idempotency-Key':key,...headers},body:JSON.stringify(data)});
async function login(username){
 const response=await fetch(api+'/auth/login',{method:'POST',
 headers:{Origin:origin,'Content-Type':'application/json'},
 body:JSON.stringify({username,password})});
 assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));
 return cookie;
}
async function main(){
 let master,admin,app,server;
 for(let attempt=0;attempt<45;attempt++){
  try{master=await open({...base,database:'master'});await master.query('SELECT 1');break;}
  catch(e){await master?.close().catch(()=>{});if(attempt===44)throw e;
   await new Promise(done=>setTimeout(done,3000));}
 }
 try{
  await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
  await master.query("CREATE LOGIN ["+appUser+"] WITH PASSWORD=N'"+appPass+
   "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await open({...base,database:db});
  await admin.query('CREATE USER ['+appUser+'] FOR LOGIN ['+appUser+'];'+
   'GRANT CONNECT TO ['+appUser+']');
  await pass('12 migrations replay without drift and customer records start empty',async()=>{
   const a=await applyMigrations(admin,undefined,12);
   assert.equal(a.length,12);assert.ok(a.every(z=>z.status==='applied'));
   const b=await applyMigrations(admin,undefined,12);
   assert.ok(b.every(z=>z.status==='unchanged'));
   assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.Customer')).recordset[0].n,0);
  });
  await appGrants(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'Test')",{t:x.t});
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'Foreign')",{t:x.t2});
  await business(admin,x.t,x.b,x.br);
  await business(admin,x.t,x.b2,x.br2);
  await business(admin,x.t2,x.foreignB,x.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@br,N'Unassigned')",{t:x.t,b:x.b,br:x.unassignedBr});
  await account(admin,x.t,x.account,'owner.customers.ci');
  await account(admin,x.t2,x.otherAccount,'other.customers.ci');
  await role(admin,x.t,x.b,x.role);
  await role(admin,x.t2,x.foreignB,x.otherRole);
  await membership(admin,x.t,x.b,x.br,x.account,x.role);
  await membership(admin,x.t2,x.foreignB,x.foreignBr,x.otherAccount,x.otherRole);
  await pass('direct SQL read/update denied while scoped procedures execute',async()=>{
   app=await open({...base,database:db,user:appUser,password:appPass});
   const r=await app.query("SELECT "+
    "HAS_PERMS_BY_NAME('core.Customer','OBJECT','SELECT') AS readp,"+
    "HAS_PERMS_BY_NAME('core.Customer','OBJECT','UPDATE') AS writep,"+
    "HAS_PERMS_BY_NAME('core.ReadCustomers','OBJECT','EXECUTE') AS execp,"+
    "HAS_PERMS_BY_NAME('core.AssertCustomersBranchAction','OBJECT','EXECUTE') AS guardp");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,0]);
   await assert.rejects(()=>app.query('SELECT * FROM core.Customer'),e=>e.number===229);
  });
  await pass('composite Business FK rejects Customer in wrong Tenant',async()=>{
   await assert.rejects(()=>query(admin,
    "INSERT core.Customer(TenantId,BusinessId,CustomerId,ClientRequestId,DisplayName)"+
    " VALUES(@t,@b,@c,@req,N'Wrong')",
    {t:x.t,b:x.foreignB,c:id(),req:id()}),e=>e.number===547);
  });
  await pass('stored procedure requires live AuthSession token',async()=>{
   await assert.rejects(()=>app.request()
    .input('TenantId',sql.UniqueIdentifier,x.t)
    .input('BusinessId',sql.UniqueIdentifier,x.b)
    .input('BranchId',sql.UniqueIdentifier,x.br)
    .input('AccountId',sql.UniqueIdentifier,x.account)
    .input('SessionVersion',sql.Int,1)
    .input('TokenHash',sql.Char(64),'0'.repeat(64))
    .execute('core.ReadCustomers'),e=>e.number===51131);
  });
  const env={...process.env,NODE_ENV:'production',
   API_HOST:'127.0.0.1',API_PORT:'3402',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:appUser,DRVO_SQL_PASSWORD:appPass,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_CUSTOMERS_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=String(d);});
  server.stderr.on('data',d=>{log+=String(d);});
  try{await wait();}catch(e){throw Error('API startup '+log.slice(-160));}
  await pass('HTTP without cookie denies confidential Customer list',async()=>{
   const r=await get(path(x.b,x.br));assert.equal(r.status,401);
   assert.equal(r.headers.get('cache-control'),'no-store');
  });
  const cookie=await login('owner.customers.ci');
  const foreign=await login('other.customers.ci');
  await pass('authorized create and idempotent exact replay; mismatch 409',async()=>{
   const key=id(),p=path(x.b,x.br),body={displayName:'Synthetic Customer',phoneE164:'+201012345678'};
   const a=await post(p,cookie,key,body);assert.equal(a.status,200);
   assert.equal((await a.json()).created,true);
   const r=await post(p,cookie,key,body);assert.equal(r.status,200);
   assert.equal((await r.json()).created,false);
   const clash=await post(p,cookie,key,{displayName:'Changed'});assert.equal(clash.status,409);
   const listing=await get(p,cookie);assert.equal(listing.status,200);
   const data=await listing.json();
   assert.equal(data.customers.length,1);
   assert.equal(data.customers[0].phoneE164,'+201012345678');
  });
  await pass('valid contact without phone, invalid PII or forged Tenant denied',async()=>{
   assert.equal((await post(path(x.b,x.br),cookie,id(),
    {displayName:'Walk In',phoneE164:null})).status,200);
   assert.equal((await post(path(x.b,x.br),cookie,id(),
    {displayName:'Invalid',phoneE164:'010123'})).status,400);
   assert.equal((await post(path(x.b,x.br),cookie,id(),
    {displayName:'Forge',tenantId:x.t2})).status,400);
   assert.equal((await post(path(x.b,x.br),cookie,id(),
    {displayName:'Bad'}, {Origin:'https://attacker.invalid'})).status,401);
  });
  await pass('same Tenant other Business, foreign Tenant, unassigned Branch deny reads and writes',async()=>{
   for(const [b,br] of [[x.b2,x.br2],[x.foreignB,x.foreignBr],[x.b,x.unassignedBr]]){
    assert.equal((await get(path(b,br),cookie)).status,404);
    assert.equal((await post(path(b,br),cookie,id(),{displayName:'Attack'})).status,404);
   }
   const own=await get(path(x.foreignB,x.foreignBr),foreign);
   assert.equal(own.status,200);assert.deepEqual((await own.json()).customers,[]);
  });
  await pass('permission revocation forbids immediate next request',async()=>{
   await query(admin,"DELETE FROM core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@r AND ActionCode='customers.read'",{t:x.t,b:x.b,r:x.role});
   assert.equal((await get(path(x.b,x.br),cookie)).status,404);
   await query(admin,"INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
    " VALUES(@t,@b,@r,'customers.read')",{t:x.t,b:x.b,r:x.role});
   await query(admin,"DELETE FROM core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@r AND ActionCode='customers.manage'",{t:x.t,b:x.b,r:x.role});
   assert.equal((await post(path(x.b,x.br),cookie,id(),{displayName:'Denied'})).status,404);
  });
  await pass('membership and Session revocation deny next read',async()=>{
   await query(admin,"UPDATE core.BusinessMembership SET IsActive=0 WHERE TenantId=@t"+
    " AND BusinessId=@b AND AccountId=@a",{t:x.t,b:x.b,a:x.account});
   assert.equal((await get(path(x.b,x.br),cookie)).status,404);
   await query(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
    " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",
    {t:x.t,a:x.account});
   assert.equal((await get(path(x.b,x.br),cookie)).status,401);
  });
  console.log('SHARED CUSTOMERS SQL + HTTP PASS: '+count+' checks');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{
 console.error('CUSTOMERS CI FAILED:',e instanceof Error?e.message.slice(0,240):'unknown');
 process.exitCode=1;
});
