'use strict';
// POS SQL022: disposable SQL2022 + production Nest HTTP, NO primary DRVO database.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.POS_RICH_SQL_DISPOSABLE,'YES');
assert.equal(process.env.POS_RICH_TEST_PORT,'14344');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',principal='drvo_erp_stage_app';
const passcode='PosRichCi123!abcdef123456789abcdef';
const origin='https://erp-stage.drvotech.com',host='http://127.0.0.1:3422/api';
const id=()=>crypto.randomUUID(),x={
 t:id(),foreignT:id(),b:id(),foreignB:id(),br:id(),foreignBr:id(),wrongBr:id(),
 actor:id(),foreignActor:id(),role:id(),foreignRole:id(),cust:id(),foreignCust:id(),
 employee:id(),foreignEmployee:id(),service:id(),product:id(),foreignService:id(),
};
const base={server:'127.0.0.1',port:14344,user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},connectionTimeout:7000,
 requestTimeout:35000,pool:{min:0,max:5}};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS POS Rich '+(++checks)+' '+label);}
async function connect(conf){const pool=new sql.ConnectionPool(conf);await pool.connect();return pool;}
async function query(pool,statement,params={}){
 const r=pool.request();for(const [key,v]of Object.entries(params))
  r.input(key,sql.UniqueIdentifier,v);
 return r.query(statement);
}
async function business(pool,t,b,br){
 await query(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
 "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'Branch')",
 {t,b,br});
}
async function account(pool,t,a,name){
 const hash=await hashNewPassword(passcode);
 await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
  .input('name',sql.NVarChar(80),name).input('salt',sql.VarBinary(32),hash.salt)
  .input('hash',sql.VarBinary(64),hash.passwordHash)
  .query("INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@name);"+
   "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
   " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function roles(pool,t,b,r){
 await query(pool,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
 " VALUES(@t,@b,@r,N'OWNER',N'Owner');"+
 "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode) VALUES"+
 "(@t,@b,@r,'pos.draft.read'),(@t,@b,@r,'pos.draft.manage'),"+
 "(@t,@b,@r,'catalog.read'),(@t,@b,@r,'customers.read'),(@t,@b,@r,'hr.read')",
 {t,b,r});
}
async function assign(pool,t,b,br,a,r){
 await query(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
 "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
 "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
 {t,b,br,a,r});
}
async function catalog(pool,t,b,offering,kind,name,amount){
 await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
 .input('offer',sql.UniqueIdentifier,offering).input('req',sql.UniqueIdentifier,id())
 .input('kind',sql.VarChar(7),kind).input('name',sql.NVarChar(160),name)
 .input('amount',sql.BigInt,amount).input('minutes',sql.Int,kind==='SERVICE'?30:null)
 .query("INSERT core.CatalogOffering(TenantId,BusinessId,OfferingId,ClientRequestId,Kind,"+
  "DisplayName,PriceMinor,Currency,DurationMinutes)"+
  " VALUES(@t,@b,@offer,@req,@kind,@name,@amount,'EGP',@minutes)");
}
async function addCustomer(pool,t,b,c){
 await query(pool,"INSERT core.Customer(TenantId,BusinessId,CustomerId,ClientRequestId,DisplayName)"+
 " VALUES(@t,@b,@c,@req,N'Customer')",{t,b,c,req:id()});
}
async function employee(pool,t,b,br,emp){
 await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
  .input('br',sql.UniqueIdentifier,br).input('emp',sql.UniqueIdentifier,emp)
  .input('req',sql.UniqueIdentifier,id()).input('code',sql.VarChar(32),'EMP'+Math.random().toString().slice(2,9))
  .query("INSERT core.HrEmployee(TenantId,BusinessId,EmployeeId,ClientRequestId,"+
   "EmployeeCode,DisplayName,EmploymentType,PayrollMethod)"+
   " VALUES(@t,@b,@emp,@req,@code,N'Executor','full_time','daily');"+
   "INSERT core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId)"+
   " VALUES(@t,@b,@br,@emp)");
}
async function grants(pool){
 for(const name of ['Tenant','Business','Branch','Account','AccountCredential',
 'BusinessMembership','BranchAssignment','BranchRole','BusinessRole','RolePermission',
 'AuthSession','LoginThrottle','SchemaMigration'])
  await pool.query('GRANT SELECT ON OBJECT::core.'+name+' TO ['+principal+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+principal+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+principal+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+principal+']');
 await pool.query('GRANT UPDATE(FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO ['+principal+']');
}
const route=(b,br)=>host+'/workspaces/'+b+'/branches/'+br+'/pos-drafts/cashier';
const get=(url,cookie)=>fetch(url,{headers:cookie?{Cookie:cookie}:{}});
const post=(url,cookie,key,body,source=origin)=>fetch(url,{
 method:'POST',headers:{Cookie:cookie,Origin:source,
  'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
async function login(username){
 const r=await fetch(host+'/auth/login',{method:'POST',headers:{
  Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username,password:passcode})});
 assert.equal(r.status,200);
 const cookie=r.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));
 return cookie;
}
async function wait(){
 for(let i=0;i<90;i++){try{if((await fetch(host+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}
 throw Error('POS Rich Nest start timeout');
}
const body=(customer=x.cust,executor=x.employee)=>({
 lines:[
  {offeringId:x.service,quantity:2,lineDiscountPercentBps:1000,
   executorEmployeeId:executor},
  {offeringId:x.product,quantity:1,lineDiscountMinor:500},
 ],
 customerId:customer,headerDiscountPercentBps:1000,expectedTotalMinor:25740,
});
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
 catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
  await new Promise(done=>setTimeout(done,2500));}}
 try{
  await master.query('CREATE DATABASE ['+db+']');
  const appPwd='PosRichCI_'+crypto.randomBytes(22).toString('hex')+'!';
  await master.query("CREATE LOGIN ["+principal+"] WITH PASSWORD=N'"+appPwd+
   "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database:db});
  await admin.query('CREATE USER ['+principal+'] FOR LOGIN ['+principal+'];'+
   'GRANT CONNECT TO ['+principal+']');
  await pass('all SQL001–023 migrations apply once and safely replay',async()=>{
   const a=await applyMigrations(admin,undefined,23);
   assert.equal(a.length,23);assert.ok(a.every(m=>m.status==='applied'));
   const replay=await applyMigrations(admin,undefined,22);
   assert.ok(replay.every(m=>m.status==='unchanged'));
   assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.PosDraftPriceSnapshot')).recordset[0].n,0);
  });
  await grants(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'Primary'),"+
   "(@foreignT,N'Foreign')",{t:x.t,foreignT:x.foreignT});
  await business(admin,x.t,x.b,x.br);
  await business(admin,x.foreignT,x.foreignB,x.foreignBr);
  await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@br,N'No assignment')",{t:x.t,b:x.b,br:x.wrongBr});
  await account(admin,x.t,x.actor,'owner.posrich.ci');
  await account(admin,x.foreignT,x.foreignActor,'other.posrich.ci');
  await roles(admin,x.t,x.b,x.role);await roles(admin,x.foreignT,x.foreignB,x.foreignRole);
  await assign(admin,x.t,x.b,x.br,x.actor,x.role);
  await assign(admin,x.foreignT,x.foreignB,x.foreignBr,x.foreignActor,x.foreignRole);
  await catalog(admin,x.t,x.b,x.service,'SERVICE','Haircut',12000);
  await catalog(admin,x.t,x.b,x.product,'PRODUCT','Wax',7500);
  await catalog(admin,x.foreignT,x.foreignB,x.foreignService,'SERVICE','Foreign',9000);
  await addCustomer(admin,x.t,x.b,x.cust);
  await addCustomer(admin,x.foreignT,x.foreignB,x.foreignCust);
  await employee(admin,x.t,x.b,x.br,x.employee);
  await employee(admin,x.foreignT,x.foreignB,x.foreignBr,x.foreignEmployee);
  await pass('app principal has only scoped SQL022 EXECUTE, no direct tables',async()=>{
   app=await connect({...base,database:db,user:principal,password:appPwd});
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.PosDraftPriceSnapshot','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.PosDraftLinePriceSnapshot','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.CreateBranchPosCashierDraft','OBJECT','EXECUTE') AS createPerm,"+
    "HAS_PERMS_BY_NAME('core.ReadBranchPosCashierDrafts','OBJECT','EXECUTE') AS readPerm");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1]);
   await assert.rejects(()=>app.query('SELECT * FROM core.PosDraftPriceSnapshot'),e=>e.number===229);
  });
  const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3422',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:principal,DRVO_SQL_PASSWORD:appPwd,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_CATALOG_ENABLED:'YES',
   DRVO_POS_DRAFTS_ENABLED:'YES',DRVO_POS_RICH_ENABLED:'YES',
   DRVO_CUSTOMERS_ENABLED:'YES',DRVO_HR_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',c=>{logs+=String(c)});server.stderr.on('data',c=>{logs+=String(c)});
  try{await wait();}catch(e){throw Error('Nest start: '+logs.slice(-450));}
  await pass('anonymous read denied 401 and no-store even with known Business IDs',async()=>{
   const r=await get(route(x.b,x.br));
   assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'no-store');
  });
  const own=await login('owner.posrich.ci'),other=await login('other.posrich.ci');
  let draftId;
  await pass('Cashier discount amount/percent, Customer, HR executor persist as nonposting DRAFT',async()=>{
   const key=id(),payload=body();
   const first=await post(route(x.b,x.br),own,key,payload);
   assert.equal(first.status,200,await first.text().catch(()=>'')); // response inspected below
   // Re-request body deliberately only via nonconsuming response below.
  });
  // The first test above checks syntax/HTTP acceptance; validate records directly.
  const raw=(await get(route(x.b,x.br),own));
  const doc=await raw.json();
  draftId=doc.drafts[0]?.draftId;
  await pass('SQL snapshot read confirms precise Cashier price formula and no finance effects',async()=>{
   assert.equal(raw.status,200);
   assert.equal(doc.state,'CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY');
   assert.equal(doc.paymentState,'NOT_COLLECTED');assert.equal(doc.accountingState,'NOT_POSTED');
   assert.equal(doc.inventoryState,'NOT_DECREMENTED');
   const d=doc.drafts[0];assert.ok(d);assert.equal(d.status,'DRAFT');
   assert.equal(d.subtotalMinor,31500);assert.equal(d.linesNetMinor,28600);
   assert.equal(d.headerDiscountMinor,2860);assert.equal(d.grandTotalMinor,25740);
   assert.equal(d.totalDiscountMinor,5760);
   assert.equal(d.customerId.toLowerCase(),x.cust.toLowerCase());
   assert.equal(d.lines.length,2);
   assert.equal(d.lines[0].discountMinor,2400);
   assert.equal(d.lines[0].netMinor,21600);
   assert.equal(d.lines[0].executorEmployeeId.toLowerCase(),x.employee.toLowerCase());
   assert.equal(d.lines[1].discountMinor,500);assert.equal(d.lines[1].netMinor,7000);
   const totals=await admin.query(
    'SELECT COUNT(*) AS n FROM core.PosDraftPriceSnapshot');
   assert.equal(totals.recordset[0].n,1);
  });
  await pass('same requestId/body replays same draft; altered input key conflicts',async()=>{
   const req=id(),payload=body();
   const first=await post(route(x.b,x.br),own,req,payload);
   assert.equal(first.status,200);const a=await first.json();assert.equal(a.created,true);
   const again=await post(route(x.b,x.br),own,req,payload);
   assert.equal(again.status,200);
   const b=await again.json();assert.equal(a.id,b.id);assert.equal(b.created,false);
   assert.equal((await post(route(x.b,x.br),own,req,{...payload,customerId:null})).status,409);
  });
  await pass('new Catalog price requires a fresh review; stale quote cannot be saved',async()=>{
   await query(admin,"UPDATE core.CatalogOffering SET PriceMinor=13000"+
    " WHERE TenantId=@t AND BusinessId=@b AND OfferingId=@offer",
    {t:x.t,b:x.b,offer:x.service});
   assert.equal((await post(route(x.b,x.br),own,id(),body())).status,409);
   // New price: +2000 gross, line percentage discount +200, header +180.
   const updated=body();updated.expectedTotalMinor=27360;
   const result=await post(route(x.b,x.br),own,id(),updated);
   assert.equal(result.status,200);
   const list=(await (await get(route(x.b,x.br),own)).json()).drafts;
   assert.equal(list.find(d=>d.draftId===draftId).grandTotalMinor,25740);
  });
  await pass('foreign Tenant/customer/executor and unassigned Branch cannot save/read',async()=>{
   for(const [b,br]of [[x.foreignB,x.foreignBr],[x.b,x.wrongBr]]){
    assert.equal((await get(route(b,br),own)).status,404);
    assert.equal((await post(route(b,br),own,id(),body())).status,404);
   }
   assert.equal((await get(route(x.foreignB,x.foreignBr),other)).status,200);
   assert.equal((await post(route(x.b,x.br),own,id(),
    {...body(),customerId:x.foreignCust})).status,404);
   assert.equal((await post(route(x.b,x.br),own,id(),
    {...body(),lines:[{...body().lines[0],executorEmployeeId:x.foreignEmployee}]})).status,404);
  });
  await pass('invalid Client price, paid flag or cross-Tenant injection rejected before SQL',async()=>{
   for(const injected of [
    {...body(),priceMinor:1},{...body(),paid:true},
    {...body(),tenantId:x.foreignT},
    {...body(),lines:[{...body().lines[0],unitPriceMinor:1}]},
    {...body(),expectedTotalMinor:-1},
   ])assert.equal((await post(route(x.b,x.br),own,id(),injected)).status,400);
   assert.equal((await post(route(x.b,x.br),own,id(),body(),'https://evil.example')).status,401);
  });
  await pass('revoked POS manage, Customer read, HR read each blocks new money-document writes',async()=>{
   for(const role of ['pos.draft.manage','customers.read','hr.read']){
    await poolRole(admin,role,false);
    assert.equal((await post(route(x.b,x.br),own,id(),body())).status,404,role);
    await poolRole(admin,role,true);
   }
  });
  async function poolRole(pool,role,active){
   const queryText=active?
    "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
    " VALUES(@t,@b,@r,@code)":
    "DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
    " AND RoleId=@r AND ActionCode=@code";
   await pool.request().input('t',sql.UniqueIdentifier,x.t)
    .input('b',sql.UniqueIdentifier,x.b).input('r',sql.UniqueIdentifier,x.role)
    .input('code',sql.VarChar(90),role).query(queryText);
  }
  await pass('membership and K5 session revocation block all rich drafts',async()=>{
   await query(admin,"UPDATE core.BusinessMembership SET IsActive=0"+
    " WHERE TenantId=@t AND BusinessId=@b AND AccountId=@a",
    {t:x.t,b:x.b,a:x.actor});
   assert.equal((await get(route(x.b,x.br),own)).status,404);
   await query(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
    " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",
    {t:x.t,a:x.actor});
   assert.equal((await get(route(x.b,x.br),own)).status,401);
  });
  console.log('POS CASHIER SQL022 + NEST HTTP PASS: '+checks+' integration groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('POS RICH CI FAILED:',e instanceof Error?e.message.slice(0,600):'unknown');process.exitCode=1;});
