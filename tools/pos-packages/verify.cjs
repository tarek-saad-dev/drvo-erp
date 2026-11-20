'use strict';
// SQL038 POS package draft line snapshots — disposable SQL2022 + Nest HTTP.
// Never primary/VPS. ADR-031 posting stays gated (NOT_COLLECTED / NOT_POSTED).
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.POS_PACKAGES_SQL_DISPOSABLE,'YES');
assert.equal(process.env.POS_PACKAGES_TEST_PORT,'14348');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',principal='drvo_erp_stage_app';
const passcode='PosPkgCi123!abcdef123456789abcdef';
const origin='https://erp-stage.drvotech.com',host='http://127.0.0.1:3425/api';
const id=()=>crypto.randomUUID(),x={
 t:id(),b:id(),br:id(),actor:id(),role:id(),cust:id(),employee:id(),
 serviceA:id(),serviceB:id(),serviceC:id(),product:id(),pkg:id(),
};
const base={server:'127.0.0.1',port:14348,user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},connectionTimeout:7000,
 requestTimeout:45000,pool:{min:0,max:5}};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS POS Packages '+(++checks)+' '+label);}
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
 "(@t,@b,@r,'catalog.read'),(@t,@b,@r,'catalog.manage'),"+
 "(@t,@b,@r,'customers.read'),(@t,@b,@r,'hr.read')",
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
async function addPackage(pool,t,b,pkg,name,price,items){
 await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
  .input('pkg',sql.UniqueIdentifier,pkg).input('req',sql.UniqueIdentifier,id())
  .input('name',sql.NVarChar(160),name).input('price',sql.BigInt,price)
  .query("INSERT core.CatalogPackage(TenantId,BusinessId,PackageId,ClientRequestId,Kind,"+
   "DisplayName,PriceMinor,Currency,DurationMinutes,IsActive)"+
   " VALUES(@t,@b,@pkg,@req,'REGULAR',@name,@price,'EGP',60,1)");
 for(let i=0;i<items.length;i++){
  await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
   .input('pkg',sql.UniqueIdentifier,pkg).input('offer',sql.UniqueIdentifier,items[i])
   .input('sort',sql.Int,i)
   .query("INSERT core.CatalogPackageItem(TenantId,BusinessId,PackageId,OfferingId,SortOrder,IsRequired)"+
    " VALUES(@t,@b,@pkg,@offer,@sort,1)");
 }
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
 throw Error('POS Packages Nest start timeout');
}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
 catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
  await new Promise(done=>setTimeout(done,2500));}}
 try{
  await master.query('CREATE DATABASE ['+db+']');
  const appPwd='PosPkgCI_'+crypto.randomBytes(22).toString('hex')+'!';
  await master.query("CREATE LOGIN ["+principal+"] WITH PASSWORD=N'"+appPwd+
   "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await connect({...base,database:db});
  await admin.query('CREATE USER ['+principal+'] FOR LOGIN ['+principal+'];'+
   'GRANT CONNECT TO ['+principal+']');
  await pass('SQL001–038 apply once including package draft snapshots',async()=>{
   const a=await applyMigrations(admin,undefined,38);
   assert.equal(a.length,38);assert.ok(a.every(m=>m.status==='applied'));
   const replay=await applyMigrations(admin,undefined,38);
   assert.ok(replay.every(m=>m.status==='unchanged'));
   const cols=await admin.query(
    "SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'core.PosDraftLinePriceSnapshot')"+
    " AND name IN (N'PackageId',N'PackageGroupKey',N'PackageRole',N'CommercialPackagePriceMinor')");
   assert.equal(cols.recordset.length,4);
  });
  await grants(admin);
  await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'Primary')",{t:x.t});
  await business(admin,x.t,x.b,x.br);
  await account(admin,x.t,x.actor,'owner.pospkg.ci');
  await roles(admin,x.t,x.b,x.role);
  await assign(admin,x.t,x.b,x.br,x.actor,x.role);
  // Catalog prices: A=10000, B=8000, C=5000, product=7500. Package commercial=150000 (snapshot only).
  await catalog(admin,x.t,x.b,x.serviceA,'SERVICE','Cut A',10000);
  await catalog(admin,x.t,x.b,x.serviceB,'SERVICE','Cut B',8000);
  await catalog(admin,x.t,x.b,x.serviceC,'SERVICE','Cut C',5000);
  await catalog(admin,x.t,x.b,x.product,'PRODUCT','Wax',7500);
  await addPackage(admin,x.t,x.b,x.pkg,'Groom Pack',150000,[x.serviceA,x.serviceB]);
  await addCustomer(admin,x.t,x.b,x.cust);
  await employee(admin,x.t,x.b,x.br,x.employee);
  await pass('app principal EXECUTE-only; no direct snapshot table DML',async()=>{
   app=await connect({...base,database:db,user:principal,password:appPwd});
   const r=await app.query(
    "SELECT HAS_PERMS_BY_NAME('core.PosDraftLinePriceSnapshot','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.PosDraftLinePriceSnapshot','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.CreateBranchPosCashierDraft','OBJECT','EXECUTE') AS createPerm,"+
    "HAS_PERMS_BY_NAME('core.ReadBranchPosCashierDrafts','OBJECT','EXECUTE') AS readPerm");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1]);
   await assert.rejects(()=>app.query('SELECT PackageId FROM core.PosDraftLinePriceSnapshot'),
    e=>e.number===229);
  });
  const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3425',
   DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:principal,DRVO_SQL_PASSWORD:appPwd,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_CATALOG_ENABLED:'YES',
   DRVO_POS_DRAFTS_ENABLED:'YES',DRVO_POS_RICH_ENABLED:'YES',
   DRVO_CUSTOMERS_ENABLED:'YES',DRVO_HR_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
  server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',c=>{logs+=String(c)});server.stderr.on('data',c=>{logs+=String(c)});
  try{await wait();}catch(e){throw Error('Nest start: '+logs.slice(-450));}
  const own=await login('owner.pospkg.ci');
  const groupKey='pkg-'+x.pkg+'-verify';
  // Catalog expected: 10000+8000+7500=25500 (no discounts)
  const packageBody={
   lines:[
    {offeringId:x.serviceA,quantity:1,packageId:x.pkg,packageGroupKey:groupKey,
     packageRole:'anchor',commercialPackagePriceMinor:150000,
     executorEmployeeId:x.employee},
    {offeringId:x.serviceB,quantity:1,packageId:x.pkg,packageGroupKey:groupKey,
     packageRole:'included',commercialPackagePriceMinor:150000,
     executorEmployeeId:x.employee},
    {offeringId:x.product,quantity:1},
   ],
   customerId:x.cust,expectedTotalMinor:25500,
  };
  await pass('create package draft → reload snapshots present; finance gated',async()=>{
   const key=id();
   const created=await post(route(x.b,x.br),own,key,packageBody);
   if(created.status!==200){
    throw Error('create package draft HTTP '+created.status+': '+(await created.text().catch(()=>'')));
   }
   const saved=await created.json();
   assert.equal(saved.status,'DRAFT');
   assert.equal(saved.paymentState,'NOT_COLLECTED');
   assert.equal(saved.accountingState,'NOT_POSTED');
   assert.equal(saved.inventoryState,'NOT_DECREMENTED');
   assert.equal(saved.grandTotalMinor,25500);
   const listed=await (await get(route(x.b,x.br),own)).json();
   assert.equal(listed.state,'CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY');
   assert.equal(listed.paymentState,'NOT_COLLECTED');
   assert.equal(listed.accountingState,'NOT_POSTED');
   assert.equal(listed.inventoryState,'NOT_DECREMENTED');
   const d=listed.drafts[0];
   assert.equal(d.lines.length,3);
   const anchor=d.lines.find(l=>l.offeringId.toLowerCase()===x.serviceA.toLowerCase());
   const included=d.lines.find(l=>l.offeringId.toLowerCase()===x.serviceB.toLowerCase());
   const retail=d.lines.find(l=>l.offeringId.toLowerCase()===x.product.toLowerCase());
   assert.ok(anchor&&included&&retail);
   assert.equal(anchor.packageId.toLowerCase(),x.pkg.toLowerCase());
   assert.equal(anchor.packageGroupKey,groupKey);
   assert.equal(anchor.packageRole,'anchor');
   assert.equal(Number(anchor.commercialPackagePriceMinor),150000);
   assert.equal(included.packageRole,'included');
   assert.equal(Number(included.commercialPackagePriceMinor),150000);
   assert.equal(retail.packageId,null);
   assert.equal(retail.packageGroupKey,null);
   assert.equal(retail.packageRole,null);
   assert.equal(retail.commercialPackagePriceMinor,null);
  });
  await pass('non-package-only draft keeps null package columns',async()=>{
   const body={
    lines:[{offeringId:x.serviceC,quantity:1,executorEmployeeId:x.employee}],
    expectedTotalMinor:5000,
   };
   assert.equal((await post(route(x.b,x.br),own,id(),body)).status,200);
   const listed=await (await get(route(x.b,x.br),own)).json();
   const solo=listed.drafts.find(d=>d.lines.length===1&&
    d.lines[0].offeringId.toLowerCase()===x.serviceC.toLowerCase());
   assert.ok(solo);
   assert.equal(solo.lines[0].packageId,null);
   assert.equal(solo.lines[0].packageRole,null);
   assert.equal(solo.grandTotalMinor,5000);
  });
  await pass('broken package group / unknown package rejected; no finance side effects',async()=>{
   assert.equal((await post(route(x.b,x.br),own,id(),{
    ...packageBody,
    lines:[{...packageBody.lines[0],packageRole:'anchor'},
     {...packageBody.lines[1],packageRole:'anchor'},packageBody.lines[2]],
   })).status,400);
   assert.equal((await post(route(x.b,x.br),own,id(),{
    ...packageBody,
    lines:[{...packageBody.lines[0],packageId:id()},packageBody.lines[1],packageBody.lines[2]],
   })).status,400);
   const n=await admin.query('SELECT COUNT(*) AS n FROM core.PosDraft');
   assert.ok(Number(n.recordset[0].n)>=2);
  });
  console.log('POS PACKAGES SQL038 + NEST HTTP PASS: '+checks+' integration groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('POS PACKAGES CI FAILED:',
 e instanceof Error?e.message.slice(0,600):'unknown');process.exitCode=1;});
