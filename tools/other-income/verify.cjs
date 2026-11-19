'use strict';
// OtherIncome SQL028 — disposable SQL2022 + production Nest HTTP, never primary DRVO/VPS.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.OTHER_INCOME_SQL_DISPOSABLE,'YES');
assert.equal(process.env.OTHER_INCOME_TEST_PORT,'14347');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',user='drvo_erp_stage_app',secret='OtherIncomeCi123!abcdefghijklmnopqrstuvwxyz';
const origin='https://erp-stage.drvotech.com',base={server:'127.0.0.1',port:14347,user:'sa',
 password:process.env.SQL_TEST_SA_PASSWORD,options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:7000,requestTimeout:30000,pool:{min:0,max:5}};
const url='http://127.0.0.1:3422/api',id=()=>crypto.randomUUID();
const x={t:id(),foreignT:id(),b:id(),foreignB:id(),br:id(),otherBr:id(),foreignBr:id(),
 owner:id(),foreignOwner:id(),role:id(),foreignRole:id()};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS OtherIncome '+(++checks)+' '+label);}
async function connect(config){const pool=new sql.ConnectionPool(config);await pool.connect();return pool;}
async function query(pool,text,ids={}){const q=pool.request();
 for(const [k,v]of Object.entries(ids))q.input(k,sql.UniqueIdentifier,v);
 return q.query(text);
}
async function branch(pool,t,b,br){
 await query(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
  "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",{t,b,br});
}
async function account(pool,t,a,username){
 const hash=await hashNewPassword(secret);
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
  " VALUES(@t,@b,@r,'other_income.read'),(@t,@b,@r,'other_income.manage')",{t,b,r});
}
async function membership(pool,t,b,br,a,r){
 await query(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
  "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
  "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
  {t,b,br,a,r});
}
async function grantLogin(pool){
 for(const table of ['Tenant','Business','Branch','Account','AccountCredential',
  'BusinessMembership','BranchAssignment','BranchRole','BusinessRole',
  'RolePermission','AuthSession','LoginThrottle','SchemaMigration'])
  await pool.query('GRANT SELECT ON OBJECT::core.'+table+' TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+user+']');
 await pool.query('GRANT UPDATE(FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO ['+user+']');
}
async function login(username){
 const response=await fetch(url+'/auth/login',{method:'POST',
  headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username,password:secret})});
 assert.equal(response.status,200,'login status');
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));return cookie;
}
const endpoint=(b,br)=>url+'/workspaces/'+b+'/branches/'+br+'/other-income';
const get=(path,cookie)=>fetch(path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,cookie,key,body,requestOrigin=origin)=>fetch(path,{
 method:'POST',headers:{Cookie:cookie,Origin:requestOrigin,'Content-Type':'application/json',
  'Idempotency-Key':key},body:JSON.stringify(body)});
async function wait(){for(let i=0;i<90;i++){try{if((await fetch(url+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}throw Error('OtherIncome Nest API not ready');}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
  catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
   await new Promise(done=>setTimeout(done,2500));}}
 try{
  await master.query('CREATE DATABASE ['+db+']');
  const passcode='OtherIncomeCi_'+crypto.randomBytes(22).toString('hex')+'!';
  await master.query("CREATE LOGIN ["+user+"] WITH PASSWORD=N'"+passcode+
    "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database:db});
  await admin.query('CREATE USER ['+user+'] FOR LOGIN ['+user+'];GRANT CONNECT TO ['+user+']');
  await pass('28 forward-only migrations and SQL028 replay with no synthetic seed',async()=>{
   const a=await applyMigrations(admin,undefined,28);
   assert.equal(a.length,28);assert.ok(a.every(v=>v.status==='applied'));
   const b=await applyMigrations(admin,undefined,28);
   assert.ok(b.every(v=>v.status==='unchanged'));
   for(const table of ['core.OtherIncomeCategory','core.OtherIncomeDraft']){
    assert.equal((await admin.query('SELECT COUNT(*) AS n FROM '+table)).recordset[0].n,0);
   }
  });
  await grantLogin(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI'),(@foreignT,N'Foreign')",
   {t:x.t,foreignT:x.foreignT});
  await branch(admin,x.t,x.b,x.br);await branch(admin,x.foreignT,x.foreignB,x.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@otherBr,N'Unassigned')",{t:x.t,b:x.b,otherBr:x.otherBr});
  await account(admin,x.t,x.owner,'owner.other-income.ci');
  await account(admin,x.foreignT,x.foreignOwner,'foreign.other-income.ci');
  await role(admin,x.t,x.b,x.role);await role(admin,x.foreignT,x.foreignB,x.foreignRole);
  await membership(admin,x.t,x.b,x.br,x.owner,x.role);
  await membership(admin,x.foreignT,x.foreignB,x.foreignBr,x.foreignOwner,x.foreignRole);
  await pass('stage runtime EXECUTE-only; direct OtherIncome SELECT/DML and internal guard denied',async()=>{
   app=await connect({...base,database:db,user,password:passcode});
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.OtherIncomeDraft','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.OtherIncomeDraft','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.ReadOtherIncomeWorkspace','OBJECT','EXECUTE') AS x,"+
    "HAS_PERMS_BY_NAME('core.AssertOtherIncomeBranchAction','OBJECT','EXECUTE') AS y");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,0]);
   await assert.rejects(()=>app.query('SELECT * FROM core.OtherIncomeDraft'),e=>e.number===229);
  });
  const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3422',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:user,DRVO_SQL_PASSWORD:passcode,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_OTHER_INCOME_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=String(d)});server.stderr.on('data',d=>{log+=String(d)});
  try{await wait();}catch(e){throw Error('OtherIncome startup: '+log.slice(-400));}
  await pass('anonymous GET denied with no-store cache',async()=>{
   const response=await get(endpoint(x.b,x.br));assert.equal(response.status,401);
   assert.equal(response.headers.get('cache-control'),'no-store');
  });
  const own=await login('owner.other-income.ci'),foreign=await login('foreign.other-income.ci');
  let categoryId,draftId;
  await pass('category saved in SQL + idempotent exact replay + conflict and injection rejection',async()=>{
   const path=endpoint(x.b,x.br)+'/categories',key=id();
   const result=await post(path,own,key,{displayName:'Rent'});assert.equal(result.status,200);
   const row=await result.json();assert.equal(row.created,true);categoryId=row.id;
   const replay=await post(path,own,key,{displayName:'Rent'});assert.equal(replay.status,200);
   assert.equal((await replay.json()).created,false);
   assert.equal((await post(path,own,key,{displayName:'Supplies'})).status,409);
   assert.equal((await post(path,own,id(),{displayName:'Rent'})).status,409);
   assert.equal((await post(path,own,id(),{displayName:'Rent',tenantId:x.foreignT})).status,400);
   assert.equal((await post(path,own,id(),{displayName:'Rent'},'https://evil.example')).status,401);
  });
  await pass('OtherIncome Draft SQL persisted with exact minor units / replay / no paid state',async()=>{
   const path=endpoint(x.b,x.br)+'/drafts',key=id();
   const payload={categoryId,amountMinor:10525,currency:'EGP',note:'November rent'};
   const response=await post(path,own,key,payload);assert.equal(response.status,200);
   const result=await response.json();assert.equal(result.created,true);draftId=result.id;
   assert.equal(result.treasuryState,'NOT_PAID');assert.equal(result.accountingState,'NOT_POSTED');
   const replay=await post(path,own,key,payload);assert.equal(replay.status,200);
   assert.equal((await replay.json()).created,false);
   assert.equal((await post(path,own,key,{...payload,amountMinor:10526})).status,409);
   for(const malformed of [{...payload,amountMinor:3.4},{...payload,amountMinor:0},
    {...payload,amountMinor:'10525'},{...payload,amountMinor:9000000000001},
    {...payload,paid:true},{...payload,currency:'BTC'}])
    assert.equal((await post(path,own,id(),malformed)).status,400);
  });
  await pass('Business categories and Branch documents are read through separately scoped SQL',async()=>{
   const response=await get(endpoint(x.b,x.br),own);assert.equal(response.status,200);
   const data=await response.json();
   assert.equal(data.state,'NONPOSTING_OTHER_INCOME_DRAFTS_ONLY');
   assert.equal(data.treasuryState,'NOT_PAID');assert.equal(data.accountingState,'NOT_POSTED');
   assert.equal(data.notSalesRevenue,true);
   assert.equal(data.categories.length,1);assert.equal(data.drafts.length,1);
   assert.equal(data.drafts[0].amountMinor,10525);assert.equal(data.drafts[0].status,'DRAFT');
   for(const field of ['paymentMethodId','cashMoveId','posted','customerName','tokenHash'])
    assert.equal(JSON.stringify(data).includes(field),false,'Forbidden finance/PII field: '+field);
  });
  await pass('foreign Tenant, unassigned Branch and unauthorized currency/category are denied',async()=>{
   for(const [b,br]of [[x.foreignB,x.foreignBr],[x.b,x.otherBr]]){
    assert.equal((await get(endpoint(b,br),own)).status,404);
    assert.equal((await post(endpoint(b,br)+'/drafts',own,id(),
     {categoryId,amountMinor:200,currency:'EGP',note:''})).status,404);
   }
   assert.equal((await get(endpoint(x.foreignB,x.foreignBr),foreign)).status,200);
   const otherCategory=await post(endpoint(x.foreignB,x.foreignBr)+'/categories',foreign,id(),
    {displayName:'Foreign OtherIncome'});assert.equal(otherCategory.status,200);
   const foreignId=(await otherCategory.json()).id;
   assert.equal((await post(endpoint(x.b,x.br)+'/drafts',own,id(),
    {categoryId:foreignId,amountMinor:200,currency:'EGP',note:''})).status,404);
  });
  await pass('OtherIncome cancellation is immutable, audited and idempotent; never pays',async()=>{
   const path=endpoint(x.b,x.br)+'/drafts/'+draftId+'/cancel',key=id();
   const first=await post(path,own,key,{});assert.equal(first.status,200);
   const result=await first.json();assert.equal(result.changed,true);
   assert.equal(result.treasuryState,'NOT_PAID');
   const replay=await post(path,own,key,{});assert.equal(replay.status,200);
   assert.equal((await replay.json()).changed,false);
   assert.equal((await post(path,own,id(),{})).status,409);
   assert.equal((await post(endpoint(x.b,x.br)+'/drafts/'+id()+'/cancel',own,id(),{})).status,404);
   assert.equal((await post(path,own,id(),{accountingPosted:true})).status,400);
   const read=await get(endpoint(x.b,x.br),own);assert.equal((await read.json()).drafts[0].status,'CANCELLED');
  });
  await pass('role revocation immediately blocks writes and reads',async()=>{
   await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='other_income.manage'",{t:x.t,b:x.b,role:x.role});
   assert.equal((await post(endpoint(x.b,x.br)+'/categories',own,id(),
    {displayName:'Denied'})).status,404);
   assert.equal((await get(endpoint(x.b,x.br),own)).status,200);
   await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='other_income.read'",{t:x.t,b:x.b,role:x.role});
   assert.equal((await get(endpoint(x.b,x.br),own)).status,404);
  });
  await pass('membership and session revocation kill authorization',async()=>{
   await query(admin,"UPDATE core.BusinessMembership SET IsActive=0"+
    " WHERE TenantId=@t AND BusinessId=@b AND AccountId=@a",
    {t:x.t,b:x.b,a:x.owner});
   assert.equal((await get(endpoint(x.b,x.br),own)).status,404);
   await query(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
    " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",
    {t:x.t,a:x.owner});
   assert.equal((await get(endpoint(x.b,x.br),own)).status,401);
  });
  console.log('OTHER_INCOME SQL2022 + NEST HTTP PASS: '+checks+' independent groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('OTHER_INCOME DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,500):'unknown');process.exitCode=1;});
