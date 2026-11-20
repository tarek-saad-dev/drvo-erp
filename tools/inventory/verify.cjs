'use strict';
// Inventory SQL027 balances + SQL032 branch transfers — disposable SQL2022 + Nest HTTP. Never primary/VPS.
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
const x={t:id(),foreignT:id(),b:id(),foreignB:id(),br:id(),br2:id(),otherBr:id(),foreignBr:id(),
 owner:id(),foreignOwner:id(),reader:id(),role:id(),readerRole:id(),foreignRole:id(),offering:id()};
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
  await pass('32 migrations incl SQL027 inventory + SQL032 transfers',async()=>{
   const a=await applyMigrations(admin,undefined,32);
   assert.equal(a.length,32);assert.ok(a.every(v=>v.status==='applied'));
   assert.equal(a[31].filename,'032_inventory_branch_transfers.sql');
   const b=await applyMigrations(admin,undefined,32);
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
  // Second branch of the same Business: owner is assigned with the same manage role.
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@br2,N'CI Branch Two');"+
   "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br2,@a);"+
   "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br2,@a,@r)",
   {t:x.t,b:x.b,br2:x.br2,a:x.owner,r:x.role});
  // Read-only account on the first branch: inventory.read without inventory.manage.
  await account(admin,x.t,x.reader,'reader.inventory.ci');
  await query(admin,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
   " VALUES(@t,@b,@r,N'VIEWER',N'Viewer');"+
   "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode) VALUES(@t,@b,@r,'inventory.read');"+
   "INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
   "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
   "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
   {t:x.t,b:x.b,br:x.br,a:x.reader,r:x.readerRole});
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
  // ---- INV-03 branch transfers (SQL032) ----
  const tr=(b,br)=>endpoint(b,br)+'/transfers';
  const qtyAt=async(br)=>{
   const data=await (await get(endpoint(x.b,br),own)).json();
   return data.items.find(i=>i.offeringId.toLowerCase()===x.offering).qtyMilli;
  };
  const line=(qtyMilli,offeringId=x.offering)=>({lineNo:1,offeringId,qtyMilli});
  let transferId;
  await pass('SQL032 runtime is EXECUTE-only on transfer tables',async()=>{
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.StockTransferDocument','OBJECT','SELECT') AS a,"+
    "HAS_PERMS_BY_NAME('core.StockTransferDocument','OBJECT','INSERT') AS b,"+
    "HAS_PERMS_BY_NAME('core.StockTransferLine','OBJECT','SELECT') AS c,"+
    "HAS_PERMS_BY_NAME('core.StockTransferLine','OBJECT','UPDATE') AS d,"+
    "HAS_PERMS_BY_NAME('core.ReadStockTransfers','OBJECT','EXECUTE') AS e,"+
    "HAS_PERMS_BY_NAME('core.CreateStockTransfer','OBJECT','EXECUTE') AS f,"+
    "HAS_PERMS_BY_NAME('core.CancelStockTransfer','OBJECT','EXECUTE') AS g");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,0,0,1,1,1]);
  });
  await pass('transfer moves stock source->destination atomically; replay idempotent',async()=>{
   const key=id(),body={toBranchId:x.br2,note:'CI restock',lines:[line(2000)]};
   const res=await post(tr(x.b,x.br),own,key,body);
   assert.equal(res.status,200);
   const created=await res.json();
   assert.equal(created.created,true);
   assert.equal(created.posting,'NOT_POSTED');
   assert.equal(created.accountingState,'NOT_POSTED');
   assert.equal(created.adr031,'NOT_IN_SCOPE');
   transferId=created.id;
   const replay=await (await post(tr(x.b,x.br),own,key,body)).json();
   assert.equal(replay.created,false);assert.equal(replay.id,transferId);
   assert.equal((await post(tr(x.b,x.br),own,key,{...body,lines:[line(2001)]})).status,409);
   assert.equal(await qtyAt(x.br),3000);
   assert.equal(await qtyAt(x.br2),2000);
   const src=await (await get(tr(x.b,x.br),own)).json();
   assert.equal(src.state,'NONPOSTING_BRANCH_TRANSFERS');
   assert.equal(src.posting,'NOT_POSTED');
   assert.equal(src.transfers.length,1);
   assert.equal(src.transfers[0].direction,'OUT');
   assert.equal(src.transfers[0].status,'APPLIED');
   assert.equal(src.transfers[0].lines[0].qtyMilli,2000);
   assert.equal(src.destinations.length,1);assert.equal(src.destinations[0].branchId.toLowerCase(),x.br2);
   const dst=await (await get(tr(x.b,x.br2),own)).json();
   assert.equal(dst.transfers[0].direction,'IN');
   assert.equal(dst.transfers[0].transferId,transferId);
  });
  await pass('over-transfer blocked despite negative-stock policy; invalid destinations denied',async()=>{
   const before=await qtyAt(x.br);
   assert.equal(before,3000);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br2,note:'',lines:[line(3001)]})).status,409);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br2,note:'',lines:[line(1000,id())]})).status,404);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br,note:'',lines:[line(1)]})).status,400);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.otherBr,note:'',lines:[line(1)]})).status,404);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.foreignBr,note:'',lines:[line(1)]})).status,404);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br2,note:'',lines:[line(0)]})).status,400);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br2,note:'',lines:[line(1)],paid:true})).status,400);
   assert.equal((await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br2,note:'',lines:[line(1)]},'https://evil.example')).status,401);
   assert.equal(await qtyAt(x.br),3000);
   assert.equal(await qtyAt(x.br2),2000);
  });
  await pass('cancel reverses both deltas; replay safe; only source branch cancels',async()=>{
   assert.equal((await post(tr(x.b,x.br2)+'/'+transferId+'/cancel',own,id(),{})).status,404);
   const key=id();
   const cancel=await post(tr(x.b,x.br)+'/'+transferId+'/cancel',own,key,{});
   assert.equal(cancel.status,200);
   const done=await cancel.json();
   assert.equal(done.changed,true);assert.equal(done.accountingState,'NOT_POSTED');
   assert.equal(await qtyAt(x.br),5000);
   assert.equal(await qtyAt(x.br2),0);
   const replay=await (await post(tr(x.b,x.br)+'/'+transferId+'/cancel',own,key,{})).json();
   assert.equal(replay.changed,false);
   assert.equal((await post(tr(x.b,x.br)+'/'+transferId+'/cancel',own,id(),{})).status,409);
   assert.equal((await post(tr(x.b,x.br)+'/'+transferId+'/cancel',own,id(),{x:1})).status,400);
   const list=await (await get(tr(x.b,x.br),own)).json();
   assert.equal(list.transfers[0].status,'CANCELLED');
   assert.equal(await qtyAt(x.br),5000);
  });
  await pass('cancel blocked once destination stock was consumed',async()=>{
   const created=await (await post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br2,note:'',lines:[line(1000)]})).json();
   assert.equal(created.created,true);
   const adj=await post(endpoint(x.b,x.br2)+'/adjusts',own,id(),
    {offeringId:x.offering,deltaMilli:-600,reason:'Sold at branch two'});
   assert.equal(adj.status,200);
   assert.equal((await post(tr(x.b,x.br)+'/'+created.id+'/cancel',own,id(),{})).status,409);
   assert.equal(await qtyAt(x.br),4000);assert.equal(await qtyAt(x.br2),400);
   assert.equal((await post(endpoint(x.b,x.br2)+'/adjusts',own,id(),
    {offeringId:x.offering,deltaMilli:600,reason:'Restored'})).status,200);
   assert.equal((await post(tr(x.b,x.br)+'/'+created.id+'/cancel',own,id(),{})).status,200);
   assert.equal(await qtyAt(x.br),5000);assert.equal(await qtyAt(x.br2),0);
  });
  await pass('concurrent over-transfer: exactly one wins, on-hand never goes below zero',async()=>{
   const results=await Promise.all([1,2].map(()=>post(tr(x.b,x.br),own,id(),
    {toBranchId:x.br2,note:'race',lines:[line(3000)]})));
   assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
   assert.equal(await qtyAt(x.br),2000);assert.equal(await qtyAt(x.br2),3000);
  });
  await pass('read-only role and foreign tenant cannot transfer or read transfers',async()=>{
   const reader=await login('reader.inventory.ci');
   assert.equal((await get(tr(x.b,x.br),reader)).status,200);
   assert.equal((await post(tr(x.b,x.br),reader,id(),
    {toBranchId:x.br2,note:'',lines:[line(1)]})).status,404);
   assert.equal((await get(tr(x.b,x.br2),reader)).status,404);
   const foreign=await login('foreign.inventory.ci');
   assert.equal((await get(tr(x.b,x.br),foreign)).status,404);
   assert.equal((await post(tr(x.b,x.br),foreign,id(),
    {toBranchId:x.br2,note:'',lines:[line(1)]})).status,404);
   assert.equal((await post(tr(x.foreignB,x.foreignBr),own,id(),
    {toBranchId:x.br2,note:'',lines:[line(1)]})).status,404);
   assert.equal((await get(tr(x.b,x.br))).status,401);
   assert.equal(await qtyAt(x.br),2000);assert.equal(await qtyAt(x.br2),3000);
  });
  await pass('transfers write no financial rows (ADR-031)',async()=>{
   const deps=await admin.query(
    "SELECT DISTINCT d.referenced_entity_name AS name FROM sys.sql_expression_dependencies d"+
    " WHERE d.referencing_id IN (OBJECT_ID('core.ReadStockTransfers'),"+
    "OBJECT_ID('core.CreateStockTransfer'),OBJECT_ID('core.CancelStockTransfer'))");
   assert.ok(deps.recordset.length>=5,'procedure dependencies are recorded');
   for(const row of deps.recordset)
    assert.doesNotMatch(row.name,/Journal|Ledger|Payable|Cogs|Cash|Treasury|Sale|Invoice|Payment/i);
   const docs=await admin.query("SELECT COUNT(*) AS n FROM core.StockTransferDocument");
   assert.equal(Number(docs.recordset[0].n),4);
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
