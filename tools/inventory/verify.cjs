'use strict';
// Inventory SQL027 — disposable SQL2022 + Nest HTTP. Never primary/VPS.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.INVENTORY_SQL_DISPOSABLE,'YES');
assert.equal(process.env.INVENTORY_TEST_PORT,'14347');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',user='drvo_erp_stage_app',secret='InventoryCi123!abcdefghijklmnopqrstuvwxyz';
const origin='https://erp-stage.drvotech.com',base={server:'127.0.0.1',port:14347,user:'sa',
 password:process.env.SQL_TEST_SA_PASSWORD,options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:7000,requestTimeout:30000,pool:{min:0,max:5}};
const url='http://127.0.0.1:3423/api',id=()=>crypto.randomUUID();
const x={t:id(),foreignT:id(),b:id(),foreignB:id(),br:id(),otherBr:id(),foreignBr:id(),
 owner:id(),foreignOwner:id(),role:id(),foreignRole:id(),offering:id()};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS Inventory '+(++checks)+' '+label);}
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
  "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode) VALUES"+
  " (@t,@b,@r,'inventory.read'),(@t,@b,@r,'inventory.manage'),(@t,@b,@r,'purchasing.manage')",{t,b,r});
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
const endpoint=(b,br)=>url+'/workspaces/'+b+'/branches/'+br+'/inventory';
const get=(path,cookie)=>fetch(path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,cookie,key,body,requestOrigin=origin)=>fetch(path,{
 method:'POST',headers:{Cookie:cookie,Origin:requestOrigin,'Content-Type':'application/json',
  'Idempotency-Key':key},body:JSON.stringify(body)});
async function wait(){for(let i=0;i<90;i++){try{if((await fetch(url+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}throw Error('Inventory Nest API not ready');}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
  catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
   await new Promise(done=>setTimeout(done,2500));}}
 try{
  await master.query('CREATE DATABASE ['+db+']');
  const passcode='InventoryCi_'+crypto.randomBytes(22).toString('hex')+'!';
  await master.query("CREATE LOGIN ["+user+"] WITH PASSWORD=N'"+passcode+
    "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database:db});
  await admin.query('CREATE USER ['+user+'] FOR LOGIN ['+user+'];GRANT CONNECT TO ['+user+']');
  await pass('27 migrations incl SQL027 inventory',async()=>{
   const a=await applyMigrations(admin,undefined,27);
   assert.equal(a.length,27);assert.ok(a.every(v=>v.status==='applied'));
   const b=await applyMigrations(admin,undefined,27);
   assert.ok(b.every(v=>v.status==='unchanged'));
  });
  await grantLogin(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI'),(@foreignT,N'Foreign')",
   {t:x.t,foreignT:x.foreignT});
  await branch(admin,x.t,x.b,x.br);await branch(admin,x.foreignT,x.foreignB,x.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@otherBr,N'Unassigned')",{t:x.t,b:x.b,otherBr:x.otherBr});
  await account(admin,x.t,x.owner,'owner.inventory.ci');
  await account(admin,x.foreignT,x.foreignOwner,'foreign.inventory.ci');
  await role(admin,x.t,x.b,x.role);await role(admin,x.foreignT,x.foreignB,x.foreignRole);
  await membership(admin,x.t,x.b,x.br,x.owner,x.role);
  await membership(admin,x.foreignT,x.foreignB,x.foreignBr,x.foreignOwner,x.foreignRole);
  await admin.request().input('t',sql.UniqueIdentifier,x.t).input('b',sql.UniqueIdentifier,x.b)
   .input('o',sql.UniqueIdentifier,x.offering).input('req',sql.UniqueIdentifier,id())
   .query("INSERT core.CatalogOffering(TenantId,BusinessId,OfferingId,ClientRequestId,"+
    "Kind,DisplayName,PriceMinor,Currency,DurationMinutes)"+
    " VALUES(@t,@b,@o,@req,'PRODUCT',N'Wax',1500,'EGP',NULL)");
  await pass('EXECUTE-only runtime; BranchStockBalance DML denied',async()=>{
   app=await connect({...base,database:db,user,password:passcode});
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.BranchStockBalance','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.BranchStockBalance','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.ReadInventoryWorkspace','OBJECT','EXECUTE') AS x,"+
    "HAS_PERMS_BY_NAME('core.AssertInventoryBranchAction','OBJECT','EXECUTE') AS y");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,0]);
  });
  const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3423',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:user,DRVO_SQL_PASSWORD:passcode,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_INVENTORY_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=String(d)});server.stderr.on('data',d=>{log+=String(d)});
  try{await wait();}catch(e){throw Error('Inventory startup: '+log.slice(-400));}
  const own=await login('owner.inventory.ci');
  await pass('anonymous GET denied',async()=>{
   assert.equal((await get(endpoint(x.b,x.br))).status,401);
  });
  await pass('purchase receive increases on-hand without GL/AP',async()=>{
   const key=id();
   const body={sourceType:'PURCHASE',supplierNote:'CI vendor',lines:[
    {lineNo:1,offeringId:x.offering,qtyMilli:5000,unitCostMinor:1200}]};
   const res=await post(endpoint(x.b,x.br)+'/receives',own,key,body);
   assert.equal(res.status,200);
   const created=await res.json();
   assert.equal(created.created,true);
   assert.equal(created.accountingState,'NOT_POSTED');
   assert.equal(created.adr031,'NOT_IN_SCOPE');
   const replay=await post(endpoint(x.b,x.br)+'/receives',own,key,body);
   assert.equal((await replay.json()).created,false);
   const read=await get(endpoint(x.b,x.br),own);assert.equal(read.status,200);
   const data=await read.json();
   assert.equal(data.state,'NONPOSTING_BRANCH_STOCK_BALANCES');
   assert.equal(data.posting,'NOT_POSTED');
   assert.equal(data.items[0].qtyMilli,5000);
   assert.equal(data.receives.length,1);
  });
  await pass('adjust + cancel reverse qty; foreign scope denied',async()=>{
   const key=id();
   const res=await post(endpoint(x.b,x.br)+'/adjusts',own,key,
    {offeringId:x.offering,deltaMilli:-1000,reason:'Breakage'});
   assert.equal(res.status,200);
   const adjustId=(await res.json()).id;
   let data=await (await get(endpoint(x.b,x.br),own)).json();
   assert.equal(data.items[0].qtyMilli,4000);
   const cancel=await post(endpoint(x.b,x.br)+'/adjusts/'+adjustId+'/cancel',own,id(),{});
   assert.equal(cancel.status,200);
   data=await (await get(endpoint(x.b,x.br),own)).json();
   assert.equal(data.items[0].qtyMilli,5000);
   assert.equal((await get(endpoint(x.foreignB,x.foreignBr),own)).status,404);
   assert.equal((await post(endpoint(x.b,x.br)+'/receives',own,id(),
    {sourceType:'PURCHASE',supplierNote:'x',lines:[{lineNo:1,offeringId:x.offering,qtyMilli:1,unitCostMinor:0}],
     paid:true})).status,400);
  });
  console.log('INVENTORY SQL2022 + NEST HTTP PASS: '+checks+' independent groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('INVENTORY DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,500):'unknown');process.exitCode=1;});
