'use strict';
// Disposable SQL Server + real NestJS API only; never connects to VPS.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');

assert.equal(process.env.CATALOG_SQL_DISPOSABLE,'YES');
assert.equal(process.env.CATALOG_TEST_PORT,'14340');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',appLogin='drvo_erp_stage_app';
const appPass='CiCatalog_'+crypto.randomBytes(22).toString('hex')+'!';
const base={server:'127.0.0.1',port:14340,
 user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:5000,requestTimeout:30000,pool:{min:0,max:4}};
const id=()=>crypto.randomUUID();
const s={t:id(),otherT:id(),b:id(),otherB:id(),foreignB:id(),
 br:id(),otherBr:id(),foreignBr:id(),strangerBr:id(),
 account:id(),foreignAccount:id(),role:id(),foreignRole:id()};
const origin='https://erp-stage.drvotech.com',pwd='CiCatalogPass1234!Abc';
const url='http://127.0.0.1:3401/api';
let tests=0;
const query=async(pool,source,params)=>{
 const request=pool.request();
 for(const [key,value] of Object.entries(params||{}))
  request.input(key,sql.UniqueIdentifier,value);
 return request.query(source);
};
async function pass(label,fn){await fn();tests++;console.log('PASS CATALOG '+String(tests).padStart(2,'0')+' '+label);}
async function connect(config){const p=new sql.ConnectionPool(config);await p.connect();return p;}
async function createAccount(pool,t,a,name){
 const h=await hashNewPassword(pwd);
 await pool.request()
 .input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
 .input('name',sql.NVarChar(80),name)
 .input('salt',sql.VarBinary(32),h.salt)
 .input('hash',sql.VarBinary(64),h.passwordHash)
 .query("INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@name);"+
   "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
   " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function addBusiness(pool,t,b,br){
 await query(pool,
  "INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
  "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",{t,b,br});
}
async function assign(pool,t,b,br,a,role){
 await query(pool,
  "INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
  "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
  "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@role)",
  {t,b,br,a,role});
}
async function makeRole(pool,t,b,r){
 await pool.request().input('t',sql.UniqueIdentifier,t)
 .input('b',sql.UniqueIdentifier,b).input('r',sql.UniqueIdentifier,r)
 .query("INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
   " VALUES(@t,@b,@r,N'OWNER',N'Owner');"+
   "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
   " VALUES(@t,@b,@r,'catalog.read'),(@t,@b,@r,'catalog.manage'),(@t,@b,@r,'branch.read')");
}
async function grantAuth(pool){
 const tables=[
 'core.Tenant','core.Business','core.Branch','core.Account','core.AccountCredential',
 'core.BusinessMembership','core.BranchAssignment','core.BranchRole',
 'core.BusinessRole','core.RolePermission','core.AuthSession','core.LoginThrottle',
 'core.SchemaMigration',
 ];
 for(const table of tables) await pool.query(
  'GRANT SELECT ON OBJECT::'+table+' TO ['+appLogin+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+appLogin+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+appLogin+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+appLogin+']');
 await pool.query('GRANT UPDATE (FailedCount,WindowStartedUtc) '+
  'ON OBJECT::core.LoginThrottle TO ['+appLogin+']');
}
async function waitHealth(){
 for(let i=0;i<90;i++){try{const r=await fetch(url+'/health');if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,350));}
 throw Error('Catalog CI API health failed');
}
async function login(username){
 const r=await fetch(url+'/auth/login',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username,password:pwd}),
 });
 assert.equal(r.status,200);
 const cookie=r.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));
 return cookie;
}
function root(b,br){return url+'/workspaces/'+b+'/branches/'+br+'/catalog';}
async function get(path,cookie){
 return fetch(path,{headers:cookie?{Cookie:cookie}:{}});
}
async function post(path,cookie,key,body,extra={}){
 return fetch(path,{method:'POST',headers:{
  Cookie:cookie,Origin:origin,'Content-Type':'application/json','Idempotency-Key':key,...extra
 },body:JSON.stringify(body)});
}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){
  try{master=await connect({...base,database:'master'});await master.query('SELECT 1');break;}
  catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
   await new Promise(r=>setTimeout(r,3000));}
 }
 try{
  await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
  await master.query("CREATE LOGIN ["+appLogin+"] WITH PASSWORD=N'"+
   appPass+"',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database:db});
  await admin.query('CREATE USER ['+appLogin+'] FOR LOGIN ['+appLogin+'];'+
   'GRANT CONNECT TO ['+appLogin+']');
  await pass('011 migration applies, replays and starts empty',async()=>{
   const first=await applyMigrations(admin,undefined,11);
   assert.equal(first.length,11);assert.ok(first.every(x=>x.status==='applied'));
   assert.ok((await applyMigrations(admin,undefined,11)).every(x=>x.status==='unchanged'));
   assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.CatalogOffering')).recordset[0].n,0);
  });
  await grantAuth(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'First')",{t:s.t});
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'Second')",{t:s.otherT});
  await addBusiness(admin,s.t,s.b,s.br);
  await addBusiness(admin,s.t,s.otherB,s.otherBr);
  await addBusiness(admin,s.otherT,s.foreignB,s.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@br,N'No role branch')",{t:s.t,b:s.b,br:s.strangerBr});
  await createAccount(admin,s.t,s.account,'owner.catalog.ci');
  await createAccount(admin,s.otherT,s.foreignAccount,'foreign.catalog.ci');
  await makeRole(admin,s.t,s.b,s.role);
  await makeRole(admin,s.otherT,s.foreignB,s.foreignRole);
  await assign(admin,s.t,s.b,s.br,s.account,s.role);
  await assign(admin,s.otherT,s.foreignB,s.foreignBr,s.foreignAccount,s.foreignRole);
  await pass('runtime can only execute catalog stored procedures; table DML denied',async()=>{
   app=await connect({...base,database:db,user:appLogin,password:appPass});
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.CatalogCategory','OBJECT','SELECT') AS r,"+
    " HAS_PERMS_BY_NAME('core.CatalogOffering','OBJECT','INSERT') AS w,"+
    " HAS_PERMS_BY_NAME('core.ReadCatalog','OBJECT','EXECUTE') AS execRead,"+
    " HAS_PERMS_BY_NAME('core.CreateCatalogOffering','OBJECT','EXECUTE') AS execWrite,"+
    " HAS_PERMS_BY_NAME('core.AssertCatalogBranchAction','OBJECT','EXECUTE') AS execGuard");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1,0]);
   await assert.rejects(()=>app.query('SELECT TOP(1) * FROM core.CatalogOffering'),
    e=>e.number===229);
  });
  await pass('foreign Business cannot point offering at category in another Business',async()=>{
   const category=id(),offer=id();
   await query(admin,"INSERT core.CatalogCategory(TenantId,BusinessId,CategoryId,ClientRequestId,DisplayName)"+
    " VALUES(@t,@b,@cat,@req,N'Private')",{t:s.t,b:s.b,cat:category,req:id()});
   await assert.rejects(()=>query(admin,
    "INSERT core.CatalogOffering(TenantId,BusinessId,OfferingId,ClientRequestId,CategoryId,"+
    "Kind,DisplayName,PriceMinor,Currency) VALUES(@t,@b,@offer,@req,@cat,"+
    "'PRODUCT',N'Wrong',100,'EGP')",
    {t:s.t,b:s.otherB,offer,req:id(),cat:category}),e=>e.number===547);
  });
  await pass('direct SQL read proc rejects forged token even with known IDs',async()=>{
   await assert.rejects(()=>app.request()
     .input('TenantId',sql.UniqueIdentifier,s.t)
     .input('BusinessId',sql.UniqueIdentifier,s.b)
     .input('BranchId',sql.UniqueIdentifier,s.br)
     .input('AccountId',sql.UniqueIdentifier,s.account)
     .input('SessionVersion',sql.Int,1)
     .input('TokenHash',sql.Char(64),'0'.repeat(64))
     .execute('core.ReadCatalog'),e=>e.number===51101);
  });
  const env={...process.env,
   NODE_ENV:'production',API_PORT:'3401',API_HOST:'127.0.0.1',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:appLogin,DRVO_SQL_PASSWORD:appPass,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_CATALOG_ENABLED:'YES',DRVO_K5_ORIGIN:origin,
  };
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=String(d);});
  server.stderr.on('data',d=>{log+=String(d);});
  try{await waitHealth();}
  catch(e){throw Error('API boot failure '+log.slice(-150));}
  await pass('HTTP catalog rejects missing cookie before read',async()=>{
   const r=await get(root(s.b,s.br));assert.equal(r.status,401);
   assert.equal(r.headers.get('cache-control'),'no-store');
  });
  const cookie=await login('owner.catalog.ci');
  const foreign=await login('foreign.catalog.ci');
  await pass('authorized category creation and idempotent exact replay',async()=>{
   const req=id(),path=root(s.b,s.br)+'/categories',body={displayName:'Hair'};
   const first=await post(path,cookie,req,body);
   assert.equal(first.status,200);assert.equal((await first.json()).created,true);
   const second=await post(path,cookie,req,body);
   assert.equal(second.status,200);assert.equal((await second.json()).created,false);
   const conflict=await post(path,cookie,req,{displayName:'Other'});
   assert.equal(conflict.status,409);
  });
  await pass('authorized product & service creation + real Business scoped read',async()=>{
   const r=await get(root(s.b,s.br),cookie);assert.equal(r.status,200);
   const category=(await r.json()).categories.find(x=>x.displayName==='Hair');
   assert.ok(category);
   for(const body of [
    {kind:'SERVICE',displayName:'Haircut',categoryId:category.categoryId,priceMinor:12000,currency:'EGP',durationMinutes:30},
    {kind:'PRODUCT',displayName:'Cream',categoryId:null,priceMinor:7500,currency:'EGP',durationMinutes:null},
   ]){
    const created=await post(root(s.b,s.br)+'/offerings',cookie,id(),body);
    assert.equal(created.status,200);assert.equal((await created.json()).created,true);
   }
   const listed=await get(root(s.b,s.br),cookie);
   const data=await listed.json();
   assert.equal(data.categories.filter(x=>x.displayName==='Hair').length,1);
   assert.deepEqual(data.offerings.map(x=>x.displayName),['Cream','Haircut']);
   assert.equal(data.offerings.find(x=>x.kind==='SERVICE').priceMinor,12000);
   assert.equal(data.offerings.find(x=>x.kind==='SERVICE').durationMinutes,30);
  });
  await pass('scope denial: same Tenant other Business, foreign Tenant, wrong Branch',async()=>{
   for(const [b,br] of [[s.otherB,s.otherBr],[s.foreignB,s.foreignBr],[s.b,s.strangerBr]]){
    const r=await get(root(b,br),cookie);
    assert.equal(r.status,404);
    const w=await post(root(b,br)+'/categories',cookie,id(),{displayName:'Attack'});
    assert.equal(w.status,404);
   }
   const foreignView=await get(root(s.foreignB,s.foreignBr),foreign);
   assert.equal(foreignView.status,200);
   assert.deepEqual((await foreignView.json()).offerings,[]);
  });
  await pass('POST requires exact allowed Origin; no client Tenant override',async()=>{
   const urlPath=root(s.b,s.br)+'/categories';
   const bad=await post(urlPath,cookie,id(),{displayName:'Unsafe'},{Origin:'https://attacker.invalid'});
   assert.equal(bad.status,401);
   const extra=await post(urlPath,cookie,id(),{displayName:'Unsafe',tenantId:s.otherT});
   assert.equal(extra.status,400);
  });
  await pass('role-action revocation denies subsequent HTTP reads and writes',async()=>{
   await query(admin,"DELETE FROM core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='catalog.read'",{t:s.t,b:s.b,role:s.role});
   assert.equal((await get(root(s.b,s.br),cookie)).status,404);
   await query(admin,"INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
    " VALUES(@t,@b,@role,'catalog.read')",{t:s.t,b:s.b,role:s.role});
   await query(admin,"DELETE FROM core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='catalog.manage'",{t:s.t,b:s.b,role:s.role});
   assert.equal((await post(root(s.b,s.br)+'/categories',cookie,id(),{displayName:'Wrong'})).status,404);
  });
  await pass('membership/session revocation blocks next request',async()=>{
   await query(admin,"UPDATE core.BusinessMembership SET IsActive=0"+
    " WHERE TenantId=@t AND BusinessId=@b AND AccountId=@a",
    {t:s.t,b:s.b,a:s.account});
   assert.equal((await get(root(s.b,s.br),cookie)).status,404);
   await query(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
    " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",
    {t:s.t,a:s.account});
   assert.equal((await get(root(s.b,s.br),cookie)).status,401);
  });
  console.log('SHARED CATALOG SQL + HTTP PASS: '+tests+' security/domain cases');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{
 console.error('CATALOG CI FAILED:',e instanceof Error?e.message.slice(0,240):'unknown');
 process.exitCode=1;
});
