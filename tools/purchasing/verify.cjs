'use strict';
// Purchasing SQL037 — disposable SQL2022 + Nest HTTP. Never primary/VPS.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.PURCHASING_SQL_DISPOSABLE,'YES');
assert.equal(process.env.PURCHASING_TEST_PORT,'14347');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',user='drvo_erp_stage_app',secret='PurchasingCi123!abcdefghijklmnopqrstuvwxyz';
const origin='https://erp-stage.drvotech.com',base={server:'127.0.0.1',port:14347,user:'sa',
 password:process.env.SQL_TEST_SA_PASSWORD,options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:7000,requestTimeout:30000,pool:{min:0,max:5}};
const url='http://127.0.0.1:3424/api',id=()=>crypto.randomUUID();
const x={t:id(),foreignT:id(),b:id(),foreignB:id(),br:id(),otherBr:id(),foreignBr:id(),
 owner:id(),foreignOwner:id(),role:id(),foreignRole:id(),offering:id()};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS Purchasing '+(++checks)+' '+label);}
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
  " (@t,@b,@r,'purchasing.read'),(@t,@b,@r,'purchasing.manage')",{t,b,r});
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
const endpoint=(b,br)=>url+'/workspaces/'+b+'/branches/'+br+'/purchasing';
const get=(path,cookie)=>fetch(path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,cookie,key,body,requestOrigin=origin)=>fetch(path,{
 method:'POST',headers:{Cookie:cookie,Origin:requestOrigin,'Content-Type':'application/json',
  'Idempotency-Key':key},body:JSON.stringify(body)});
async function wait(){for(let i=0;i<90;i++){try{if((await fetch(url+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}throw Error('Purchasing Nest API not ready');}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
  catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
   await new Promise(done=>setTimeout(done,2500));}}
 try{
  await master.query('CREATE DATABASE ['+db+']');
  const passcode='PurchasingCi_'+crypto.randomBytes(22).toString('hex')+'!';
  await master.query("CREATE LOGIN ["+user+"] WITH PASSWORD=N'"+passcode+
    "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database:db});
  await admin.query('CREATE USER ['+user+'] FOR LOGIN ['+user+'];GRANT CONNECT TO ['+user+']');
  await pass('migrations through SQL037 purchasing (+ later tip SQL038 package snapshots)',async()=>{
   const a=await applyMigrations(admin);
   assert.ok(a.every(v=>v.status==='applied'));
   assert.ok(a.some(v=>v.filename==='035_catalog_product_barcode.sql'));
   assert.ok(a.some(v=>v.filename==='037_purchasing_suppliers_receive_ap_preview.sql'));
   assert.ok(a.some(v=>v.filename==='038_pos_draft_package_line_snapshots.sql'));
   assert.equal(a[a.length-1].filename,'042_booking_completed_pos_handoff.sql');
   const b=await applyMigrations(admin);
   assert.ok(b.every(v=>v.status==='unchanged'));
   for(const table of ['core.Supplier','core.PurchaseReceiveDocument','core.PurchaseReceiveLine']){
    assert.equal((await admin.query('SELECT COUNT(*) AS n FROM '+table)).recordset[0].n,0);
   }
  });
  await grantLogin(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI'),(@foreignT,N'Foreign')",
   {t:x.t,foreignT:x.foreignT});
  await branch(admin,x.t,x.b,x.br);await branch(admin,x.foreignT,x.foreignB,x.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@otherBr,N'Unassigned')",{t:x.t,b:x.b,otherBr:x.otherBr});
  await account(admin,x.t,x.owner,'owner.purchasing.ci');
  await account(admin,x.foreignT,x.foreignOwner,'foreign.purchasing.ci');
  await role(admin,x.t,x.b,x.role);await role(admin,x.foreignT,x.foreignB,x.foreignRole);
  await membership(admin,x.t,x.b,x.br,x.owner,x.role);
  await membership(admin,x.foreignT,x.foreignB,x.foreignBr,x.foreignOwner,x.foreignRole);
  await admin.request().input('t',sql.UniqueIdentifier,x.t).input('b',sql.UniqueIdentifier,x.b)
   .input('o',sql.UniqueIdentifier,x.offering).input('req',sql.UniqueIdentifier,id())
   .query("INSERT core.CatalogOffering(TenantId,BusinessId,OfferingId,ClientRequestId,"+
    "Kind,DisplayName,PriceMinor,Currency,DurationMinutes)"+
    " VALUES(@t,@b,@o,@req,'PRODUCT',N'Shampoo',2500,'EGP',NULL)");
  await pass('stage runtime EXECUTE-only; direct Supplier/PurchaseReceive DML denied',async()=>{
   app=await connect({...base,database:db,user,password:passcode});
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.Supplier','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.PurchaseReceiveDocument','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.ReadPurchasingWorkspace','OBJECT','EXECUTE') AS x,"+
    "HAS_PERMS_BY_NAME('core.AssertPurchasingBranchAction','OBJECT','EXECUTE') AS y");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,0]);
   await assert.rejects(()=>app.query('SELECT * FROM core.Supplier'),e=>e.number===229);
  });
  const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3424',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:user,DRVO_SQL_PASSWORD:passcode,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_PURCHASING_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=String(d)});server.stderr.on('data',d=>{log+=String(d)});
  try{await wait();}catch(e){throw Error('Purchasing startup: '+log.slice(-400));}
  await pass('anonymous GET denied with no-store cache',async()=>{
   const response=await get(endpoint(x.b,x.br));assert.equal(response.status,401);
   assert.equal(response.headers.get('cache-control'),'no-store');
  });
  const own=await login('owner.purchasing.ci'),foreign=await login('foreign.purchasing.ci');
  let supplierId,receiveId;
  await pass('supplier saved Business-scoped + idempotent replay + conflict',async()=>{
   const path=endpoint(x.b,x.br)+'/suppliers',key=id();
   const result=await post(path,own,key,{displayName:'Vendor A',phoneNote:'0100',notes:''});
   assert.equal(result.status,200);
   const row=await result.json();assert.equal(row.created,true);supplierId=row.id;
   const replay=await post(path,own,key,{displayName:'Vendor A',phoneNote:'0100',notes:''});
   assert.equal(replay.status,200);assert.equal((await replay.json()).created,false);
   assert.equal((await post(path,own,key,{displayName:'Vendor B',phoneNote:'',notes:''})).status,409);
   assert.equal((await post(path,own,id(),{displayName:'Vendor A',phoneNote:'',notes:''})).status,409);
   assert.equal((await post(path,own,id(),{displayName:'Vendor A',phoneNote:'',notes:'',paid:true})).status,400);
   assert.equal((await post(path,own,id(),{displayName:'X',phoneNote:'',notes:''},'https://evil.example')).status,401);
  });
  await pass('purchase receive raises stock + AP preview; replay; reject paid injection',async()=>{
   const path=endpoint(x.b,x.br)+'/receives',key=id();
   const payload={supplierId,supplierNote:'INV-9',currency:'EGP',
    lines:[{offeringId:x.offering,qtyMilli:2000,unitCostMinor:1250}]};
   const response=await post(path,own,key,payload);assert.equal(response.status,200);
   const result=await response.json();assert.equal(result.created,true);receiveId=result.id;
   assert.equal(result.apTotalMinor,2500);
   assert.equal(result.treasuryState,'NOT_PAID');assert.equal(result.accountingState,'NOT_POSTED');
   assert.equal(result.apPreviewState,'AP_PREVIEW_ONLY');assert.equal(result.adr031,'NOT_IN_SCOPE');
   const replay=await post(path,own,key,payload);assert.equal(replay.status,200);
   assert.equal((await replay.json()).created,false);
   assert.equal((await post(path,own,key,{...payload,supplierNote:'other'})).status,409);
   for(const malformed of [{...payload,paid:true},
    {...payload,lines:[{offeringId:x.offering,qtyMilli:0,unitCostMinor:1}]},
    {...payload,currency:'BTC'},{...payload,lines:payload.lines,apPosted:true}])
    assert.equal((await post(path,own,id(),malformed)).status,400);
   const bal=await admin.request().input('t',sql.UniqueIdentifier,x.t).input('b',sql.UniqueIdentifier,x.b)
    .input('br',sql.UniqueIdentifier,x.br).input('o',sql.UniqueIdentifier,x.offering)
    .query('SELECT QtyMilli AS q FROM core.BranchStockBalance WHERE TenantId=@t AND BusinessId=@b'+
     ' AND BranchId=@br AND OfferingId=@o');
   assert.equal(Number(bal.recordset[0].q),2000);
  });
  await pass('workspace returns AP preview totals and nonposting banners',async()=>{
   const response=await get(endpoint(x.b,x.br),own);assert.equal(response.status,200);
   const data=await response.json();
   assert.equal(data.state,'NONPOSTING_PURCHASE_RECEIVES_AP_PREVIEW');
   assert.equal(data.purchasingPosts,'RECEIVE_DRAFTS_ONLY');
   assert.equal(data.treasuryState,'NOT_PAID');assert.equal(data.accountingState,'NOT_POSTED');
   assert.equal(data.adr031,'NOT_IN_SCOPE');
   assert.equal(data.apPreview.state,'AP_PREVIEW_ONLY');
   assert.equal(data.apPreview.openApMinor,2500);
   assert.equal(data.apPreview.openReceiveCount,1);
   assert.equal(data.suppliers.length,1);assert.equal(data.receives.length,1);
   assert.equal(data.receives[0].apTotalMinor,2500);
   for(const field of ['paymentMethodId','cashMoveId','posted','journalId','tokenHash'])
    assert.equal(JSON.stringify(data).includes(field),false,'Forbidden field: '+field);
  });
  await pass('foreign Tenant / unassigned Branch denied; cancel reverses stock + AP',async()=>{
   for(const [b,br]of [[x.foreignB,x.foreignBr],[x.b,x.otherBr]]){
    assert.equal((await get(endpoint(b,br),own)).status,404);
    assert.equal((await post(endpoint(b,br)+'/receives',own,id(),
     {supplierId:null,supplierNote:'',currency:'EGP',
      lines:[{offeringId:x.offering,qtyMilli:1000,unitCostMinor:1}]})).status,404);
   }
   assert.equal((await get(endpoint(x.foreignB,x.foreignBr),foreign)).status,200);
   const path=endpoint(x.b,x.br)+'/receives/'+receiveId+'/cancel',key=id();
   const first=await post(path,own,key,{});assert.equal(first.status,200);
   const result=await first.json();assert.equal(result.changed,true);
   assert.equal(result.treasuryState,'NOT_PAID');
   const replay=await post(path,own,key,{});assert.equal(replay.status,200);
   assert.equal((await replay.json()).changed,false);
   assert.equal((await post(path,own,id(),{})).status,409);
   const read=await get(endpoint(x.b,x.br),own);const data=await read.json();
   assert.equal(data.receives[0].status,'CANCELLED');
   assert.equal(data.apPreview.openApMinor,0);
   const bal=await admin.request().input('t',sql.UniqueIdentifier,x.t).input('b',sql.UniqueIdentifier,x.b)
    .input('br',sql.UniqueIdentifier,x.br).input('o',sql.UniqueIdentifier,x.offering)
    .query('SELECT QtyMilli AS q FROM core.BranchStockBalance WHERE TenantId=@t AND BusinessId=@b'+
     ' AND BranchId=@br AND OfferingId=@o');
   assert.equal(Number(bal.recordset[0].q),0);
  });
  await pass('role revocation blocks writes then reads',async()=>{
   await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='purchasing.manage'",{t:x.t,b:x.b,role:x.role});
   assert.equal((await post(endpoint(x.b,x.br)+'/suppliers',own,id(),
    {displayName:'Denied',phoneNote:'',notes:''})).status,404);
   assert.equal((await get(endpoint(x.b,x.br),own)).status,200);
   await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@role AND ActionCode='purchasing.read'",{t:x.t,b:x.b,role:x.role});
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
  console.log('PURCHASING SQL2022 + NEST HTTP PASS: '+checks+' independent groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('PURCHASING DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,500):'unknown');process.exitCode=1;});
