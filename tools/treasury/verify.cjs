'use strict';
// Treasury SQL021: isolated SQL Server 2022 + production Nest HTTP.
// Disposable database only; NEVER access primary DRVO dev/VPS or real customer data.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.TREASURY_SQL_DISPOSABLE,'YES');
assert.equal(process.env.TREASURY_TEST_PORT,'14345');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const database='DRVO_ERP_STAGING',principal='drvo_erp_stage_app';
const password='TreasuryTest!123456789abcdefghijklmno',origin='https://erp-stage.drvotech.com';
const base={server:'127.0.0.1',port:14345,user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},connectionTimeout:8000,requestTimeout:40000,
 pool:{min:0,max:5}};
const api='http://127.0.0.1:3421/api';
const id=()=>crypto.randomUUID();
const data={t:id(),foreignT:id(),b:id(),foreignB:id(),br:id(),otherBr:id(),
 foreignBr:id(),unassignedBr:id(),owner:id(),foreignOwner:id(),role:id(),foreignRole:id()};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS Treasury '+(++checks)+' '+label);}
async function connect(config){const pool=new sql.ConnectionPool(config);await pool.connect();return pool;}
async function query(pool,statement,ids={}){
 const request=pool.request();
 for(const [key,value]of Object.entries(ids))request.input(key,sql.UniqueIdentifier,value);
 return request.query(statement);
}
async function business(pool,t,b,br){
 await query(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
  "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",
  {t,b,br});
}
async function account(pool,t,accountId,username){
 const hash=await hashNewPassword(password);
 await pool.request().input('t',sql.UniqueIdentifier,t)
  .input('a',sql.UniqueIdentifier,accountId)
  .input('name',sql.NVarChar(80),username)
  .input('salt',sql.VarBinary(32),hash.salt)
  .input('hash',sql.VarBinary(64),hash.passwordHash)
  .query("INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@name);"+
   "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
   " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function role(pool,t,b,roleId){
 await query(pool,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
  " VALUES(@t,@b,@r,N'OWNER',N'Owner');"+
  "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
  " VALUES(@t,@b,@r,'treasury.count.read'),(@t,@b,@r,'treasury.count.manage')",
  {t,b,r:roleId});
}
async function membership(pool,t,b,br,a,r){
 await query(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId)"+
  " VALUES(@t,@b,@a);"+
  "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId)"+
  " VALUES(@t,@b,@br,@a);"+
  "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId)"+
  " VALUES(@t,@b,@br,@a,@r)",{t,b,br,a,r});
}
async function grants(pool){
 for(const name of ['Tenant','Business','Branch','Account','AccountCredential',
 'BusinessMembership','BranchAssignment','BranchRole','BusinessRole',
 'RolePermission','AuthSession','LoginThrottle','SchemaMigration'])
  await pool.query('GRANT SELECT ON OBJECT::core.'+name+' TO ['+principal+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+principal+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+principal+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+principal+']');
 await pool.query('GRANT UPDATE(FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO ['+principal+']');
}
const endpoint=(b,br)=>api+'/workspaces/'+b+'/branches/'+br+'/treasury/counts';
const get=(url,cookie)=>fetch(url,{headers:cookie?{Cookie:cookie}:{}});
const post=(url,cookie,key,body,requestOrigin=origin)=>fetch(url,{
 method:'POST',headers:{Cookie:cookie,Origin:requestOrigin,
  'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
async function login(username){
 const response=await fetch(api+'/auth/login',{method:'POST',
  headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username,password})});
 assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));
 return cookie;
}
async function wait(){
 for(let i=0;i<90;i++){
  try{if((await fetch(api+'/health')).ok)return;}catch{}
  await new Promise(done=>setTimeout(done,350));
 }
 throw Error('Treasury Nest API did not start');
}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){
  try{master=await connect({...base,database:'master'});break;}
  catch(e){await master?.close().catch(()=>{});
   if(i===44)throw e;await new Promise(done=>setTimeout(done,2500));}
 }
 try{
  await master.query('CREATE DATABASE ['+database+']');
  const appPass='TreasuryCi_'+crypto.randomBytes(22).toString('hex')+'!';
  await master.query("CREATE LOGIN ["+principal+"] WITH PASSWORD=N'"+appPass+
   "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database});
  await admin.query('CREATE USER ['+principal+'] FOR LOGIN ['+principal+'];'+
   'GRANT CONNECT TO ['+principal+']');
  await pass('21 forward-only migrations apply/replay and no cash-count seeds',async()=>{
   const first=await applyMigrations(admin,undefined,21);
   assert.equal(first.length,21);
   assert.ok(first.every(row=>row.status==='applied'));
   const replay=await applyMigrations(admin,undefined,21);
   assert.ok(replay.every(row=>row.status==='unchanged'));
   assert.equal((await admin.query(
    'SELECT COUNT(*) AS n FROM core.TreasuryCashCountDraft')).recordset[0].n,0);
  });
  await grants(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName)"+
   " VALUES(@t,N'CI'),(@foreignT,N'Foreign')",{t:data.t,foreignT:data.foreignT});
  await business(admin,data.t,data.b,data.br);
  await business(admin,data.foreignT,data.foreignB,data.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@otherBr,N'Other Branch'),(@t,@b,@unassignedBr,N'Unassigned')",
   {t:data.t,b:data.b,otherBr:data.otherBr,unassignedBr:data.unassignedBr});
  await account(admin,data.t,data.owner,'treasury.owner.ci');
  await account(admin,data.foreignT,data.foreignOwner,'treasury.foreign.ci');
  await role(admin,data.t,data.b,data.role);
  await role(admin,data.foreignT,data.foreignB,data.foreignRole);
  await membership(admin,data.t,data.b,data.br,data.owner,data.role);
  await membership(admin,data.foreignT,data.foreignB,data.foreignBr,
   data.foreignOwner,data.foreignRole);
  await pass('runtime has scoped EXECUTE only, no direct SELECT/DML/internal guard',async()=>{
   app=await connect({...base,database,user:principal,password:appPass});
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.TreasuryCashCountDraft','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.TreasuryCashCountDraft','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.ReadTreasuryCountDrafts','OBJECT','EXECUTE') AS x,"+
    "HAS_PERMS_BY_NAME('core.AssertTreasuryCountAction','OBJECT','EXECUTE') AS y");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,0]);
   await assert.rejects(()=>app.query('SELECT * FROM core.TreasuryCashCountDraft'),
    e=>e.number===229);
  });
  const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3421',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:database,DRVO_SQL_USER:principal,DRVO_SQL_PASSWORD:appPass,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_TREASURY_COUNTS_ENABLED:'YES',
   DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{
   env,stdio:['ignore','pipe','pipe']});
  let log='';
  server.stdout.on('data',d=>{log+=String(d)});
  server.stderr.on('data',d=>{log+=String(d)});
  try{await wait();}catch(e){throw Error('Treasury startup: '+log.slice(-400));}
  await pass('anonymous read 401 no-store, no public access',async()=>{
   const r=await get(endpoint(data.b,data.br));
   assert.equal(r.status,401);
   assert.equal(r.headers.get('cache-control'),'no-store');
  });
  const own=await login('treasury.owner.ci'),foreign=await login('treasury.foreign.ci');
  let countId;
  await pass('cash count saved, UUID idempotent replay and exact minor precision',async()=>{
   const path=endpoint(data.b,data.br),key=id();
   const payload={countedMinor:10025,currency:'EGP',note:'Till count'};
   const first=await post(path,own,key,payload);assert.equal(first.status,200);
   const result=await first.json();countId=result.id;
   assert.equal(result.created,true);
   assert.equal(result.balanceState,'NOT_COMPUTED');
   assert.equal(result.accountingState,'NOT_POSTED');
   const replay=await post(path,own,key,payload);assert.equal(replay.status,200);
   assert.equal((await replay.json()).created,false);
   assert.equal((await post(path,own,key,{...payload,countedMinor:10026})).status,409);
   for(const malformed of [
    {...payload,countedMinor:-1},{...payload,countedMinor:9.8},
    {...payload,countedMinor:'10025'},{...payload,currency:'BTC'},
    {...payload,paid:true},{...payload,businessId:data.foreignB},
   ])assert.equal((await post(path,own,id(),malformed)).status,400);
   assert.equal((await post(path,own,id(),payload,'https://evil.example')).status,401);
  });
  await pass('exact branch count read no fake balance or GL',async()=>{
   const response=await get(endpoint(data.b,data.br),own);
   assert.equal(response.status,200);
   const read=await response.json();
   assert.equal(read.state,'NONPOSTING_PHYSICAL_CASH_COUNTS_ONLY');
   assert.equal(read.balanceState,'NOT_COMPUTED');
   assert.equal(read.reconciliationState,'NOT_PERFORMED');
   assert.equal(read.settlementState,'NO_SETTLEMENT');
   assert.equal(read.accountingState,'NOT_POSTED');
   assert.equal(read.drafts.length,1);
   assert.equal(read.drafts[0].countedMinor,10025);
   assert.equal(read.drafts[0].status,'DRAFT');
   for(const k of ['paymentMethodId','cashMoveId','totalBalance','systemBalance'])
    assert.equal(JSON.stringify(read).includes(k),false,k);
  });
  await pass('foreign Tenant and unassigned Branch denied at SQL session and FK',async()=>{
   for(const [b,br]of [[data.foreignB,data.foreignBr],
      [data.b,data.unassignedBr],[data.b,data.otherBr]]){
    assert.equal((await get(endpoint(b,br),own)).status,404);
    assert.equal((await post(endpoint(b,br),own,id(),
     {countedMinor:100,currency:'EGP',note:''})).status,404);
   }
   assert.equal((await get(endpoint(data.foreignB,data.foreignBr),foreign)).status,200);
  });
  await pass('cash-count cancellation audited and idempotent without settlement',async()=>{
   const path=endpoint(data.b,data.br)+'/'+countId+'/cancel',key=id();
   const one=await post(path,own,key,{});assert.equal(one.status,200);
   assert.equal((await one.json()).changed,true);
   const replay=await post(path,own,key,{});assert.equal(replay.status,200);
   assert.equal((await replay.json()).changed,false);
   assert.equal((await post(path,own,id(),{})).status,409);
   assert.equal((await post(endpoint(data.b,data.br)+'/'+id()+'/cancel',own,id(),{})).status,404);
   assert.equal((await post(path,own,id(),{posted:true})).status,400);
   const read=await get(endpoint(data.b,data.br),own);
   assert.equal((await read.json()).drafts[0].status,'CANCELLED');
  });
  await pass('independent treasury permission revoked immediately',async()=>{
   await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='treasury.count.manage'",
    {t:data.t,b:data.b,role:data.role});
   assert.equal((await post(endpoint(data.b,data.br),own,id(),
    {countedMinor:0,currency:'EGP',note:''})).status,404);
   assert.equal((await get(endpoint(data.b,data.br),own)).status,200);
   await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='treasury.count.read'",
    {t:data.t,b:data.b,role:data.role});
   assert.equal((await get(endpoint(data.b,data.br),own)).status,404);
  });
  await pass('membership and live K5 session revocation block data',async()=>{
   await query(admin,"UPDATE core.BusinessMembership SET IsActive=0"+
    " WHERE TenantId=@t AND BusinessId=@b AND AccountId=@a",
    {t:data.t,b:data.b,a:data.owner});
   assert.equal((await get(endpoint(data.b,data.br),own)).status,404);
   await query(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
    " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",
    {t:data.t,a:data.owner});
   assert.equal((await get(endpoint(data.b,data.br),own)).status,401);
  });
  console.log('TREASURY SQL2022 + NEST HTTP PASS: '+checks+' independent groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('TREASURY DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,500):'unknown');process.exitCode=1;});
