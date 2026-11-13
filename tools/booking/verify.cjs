'use strict';
// Booking v0: disposable SQL 2022 + real Nest HTTP synthetic proof.
// NEVER point at VPS or use real users, calendars, phone numbers, or secrets.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');

assert.equal(process.env.BOOKING_SQL_DISPOSABLE,'YES');
assert.equal(process.env.BOOKING_TEST_PORT,'14342');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',user='drvo_erp_stage_app';
const appPass='CiBooking_'+crypto.randomBytes(20).toString('hex')+'!';
const base={server:'127.0.0.1',port:14342,user:'sa',
 password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:5000,requestTimeout:30000,pool:{min:0,max:4}};
const guid=()=>crypto.randomUUID();
const g={t:guid(),foreignTenant:guid(),business:guid(),otherBusiness:guid(),
 foreignBusiness:guid(),branch:guid(),otherBranch:guid(),
 foreignBranch:guid(),unassignedBranch:guid(),account:guid(),
 foreignAccount:guid(),role:guid(),foreignRole:guid(),customer:guid(),
 foreignCustomer:guid(),service:guid(),foreignService:guid(),
 product:guid(),sourceResource:guid(),foreignResource:guid()};
const pwd='BookingCiStrong!12345';
const origin='https://erp-stage.drvotech.com';
const url='http://127.0.0.1:3403/api';
let count=0;
const path=(business,branch)=>url+'/workspaces/'+business+'/branches/'+branch+'/booking';
async function pass(label,fn){await fn();count++;
 console.log('PASS BOOKING '+String(count).padStart(2,'0')+' '+label);}
async function open(config){const pool=new sql.ConnectionPool(config);await pool.connect();return pool;}
async function q(pool,command,params={}){
 const request=pool.request();
 for(const [key,value] of Object.entries(params))
  request.input(key,sql.UniqueIdentifier,value);
 return request.query(command);
}
async function addBusiness(pool,tenant,business,branch){
 await q(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
  "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",
  {t:tenant,b:business,br:branch});
}
async function addAccount(pool,tenant,account,username){
 const h=await hashNewPassword(pwd);
 await pool.request().input('t',sql.UniqueIdentifier,tenant)
  .input('a',sql.UniqueIdentifier,account)
  .input('name',sql.NVarChar(80),username)
  .input('salt',sql.VarBinary(32),h.salt)
  .input('hash',sql.VarBinary(64),h.passwordHash)
  .query("INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@name);"+
   "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
   " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function addRole(pool,tenant,business,role){
 await q(pool,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
 " VALUES(@t,@b,@r,N'SCHEDULER',N'Scheduler');"+
 "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
 " VALUES(@t,@b,@r,'booking.read'),(@t,@b,@r,'booking.manage'),"+
 " (@t,@b,@r,'catalog.read'),(@t,@b,@r,'catalog.manage'),"+
 " (@t,@b,@r,'customers.read'),(@t,@b,@r,'customers.manage'),"+
 " (@t,@b,@r,'pos.draft.read'),(@t,@b,@r,'pos.draft.manage')",
 {t:tenant,b:business,r:role});
}
async function assign(pool,tenant,business,branch,account,role){
 await q(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
 "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
 "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId)"+
 " VALUES(@t,@b,@br,@a,@r)",
 {t:tenant,b:business,br:branch,a:account,r:role});
}
async function seedCustomer(pool,tenant,business,customer,label){
 await q(pool,"INSERT core.Customer(TenantId,BusinessId,CustomerId,ClientRequestId,DisplayName)"+
  " VALUES(@t,@b,@c,@req,N'"+label+"')",
 {t:tenant,b:business,c:customer,req:guid()});
}
async function seedOffering(pool,tenant,business,offering,kind,duration){
 await pool.request().input('t',sql.UniqueIdentifier,tenant)
 .input('b',sql.UniqueIdentifier,business)
 .input('offering',sql.UniqueIdentifier,offering)
 .input('req',sql.UniqueIdentifier,guid())
 .input('kind',sql.VarChar(7),kind)
 .input('duration',sql.Int,duration)
 .query("INSERT core.CatalogOffering(TenantId,BusinessId,OfferingId,ClientRequestId,"+
  "Kind,DisplayName,PriceMinor,Currency,DurationMinutes) VALUES("+
  "@t,@b,@offering,@req,@kind,N'CI Service',1000,'EGP',@duration)");
}
async function grantAuth(pool){
 const tables=['core.Tenant','core.Business','core.Branch','core.Account',
 'core.AccountCredential','core.BusinessMembership','core.BranchAssignment',
 'core.BranchRole','core.BusinessRole','core.RolePermission','core.AuthSession',
 'core.LoginThrottle','core.SchemaMigration'];
 for(const table of tables)
  await pool.query('GRANT SELECT ON OBJECT::'+table+' TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+user+']');
 await pool.query('GRANT UPDATE (FailedCount,WindowStartedUtc)'+
  ' ON OBJECT::core.LoginThrottle TO ['+user+']');
}
async function wait(){
 for(let i=0;i<90;i++){
  try{if((await fetch(url+'/health')).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,350));
 }
 throw Error('Booking CI API health failed');
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
const get=(p,cookie)=>fetch(p,{headers:cookie?{Cookie:cookie}:{}});
const post=(p,cookie,key,body,extra={})=>fetch(p,{
 method:'POST',
 headers:{Cookie:cookie,Origin:origin,'Idempotency-Key':key,
  'Content-Type':'application/json',...extra},
 body:JSON.stringify(body),
});
const future=minutes=>new Date(Math.ceil((Date.now()+minutes*60000)/60000)*60000).toISOString();
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){
  try{master=await open({...base,database:'master'});await master.query('SELECT 1');break;}
  catch(e){await master?.close().catch(()=>{});master=undefined;
   if(i===44)throw e;await new Promise(r=>setTimeout(r,3000));}
 }
 try{
  await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
  await master.query("CREATE LOGIN ["+user+"] WITH PASSWORD=N'"+appPass+
   "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
  admin=await open({...base,database:db});
  await admin.query("CREATE USER ["+user+"] FOR LOGIN ["+user+"];GRANT CONNECT TO ["+user+"]");
  await pass('16 forward-only migrations apply and replay, no synthetic appointment or draft seed',async()=>{
   const applied=await applyMigrations(admin,undefined,16);
   assert.equal(applied.length,16);
   assert.ok(applied.every(x=>x.status==='applied'));
   const replay=await applyMigrations(admin,undefined,16);
   assert.ok(replay.every(x=>x.status==='unchanged'));
   const r=await admin.query("SELECT COUNT(*) AS n FROM core.BookingAppointment");
   assert.equal(r.recordset[0].n,0);
   assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.PosDraft')).recordset[0].n,0);
  });
  await grantAuth(admin);
  await q(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI')",{t:g.t});
  await q(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'Other')",{t:g.foreignTenant});
  await addBusiness(admin,g.t,g.business,g.branch);
  await addBusiness(admin,g.t,g.otherBusiness,g.otherBranch);
  await addBusiness(admin,g.foreignTenant,g.foreignBusiness,g.foreignBranch);
  await q(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
   " VALUES(@t,@b,@br,N'Unassigned')",
   {t:g.t,b:g.business,br:g.unassignedBranch});
  await addAccount(admin,g.t,g.account,'scheduler.booking.ci');
  await addAccount(admin,g.foreignTenant,g.foreignAccount,'foreign.booking.ci');
  await addRole(admin,g.t,g.business,g.role);
  await addRole(admin,g.foreignTenant,g.foreignBusiness,g.foreignRole);
  await assign(admin,g.t,g.business,g.branch,g.account,g.role);
  await assign(admin,g.foreignTenant,g.foreignBusiness,g.foreignBranch,
   g.foreignAccount,g.foreignRole);
  await seedCustomer(admin,g.t,g.business,g.customer,'CI Customer');
  await seedCustomer(admin,g.foreignTenant,g.foreignBusiness,g.foreignCustomer,'Foreign');
  await seedOffering(admin,g.t,g.business,g.service,'SERVICE',30);
  await seedOffering(admin,g.t,g.business,g.product,'PRODUCT',null);
  await seedOffering(admin,g.foreignTenant,g.foreignBusiness,g.foreignService,'SERVICE',30);

  await pass('runtime SQL principal has EXECUTE-only, not direct read/write grants',async()=>{
   app=await open({...base,database:db,user,password:appPass});
   const r=await app.query("SELECT "+
    "HAS_PERMS_BY_NAME('core.BookingResource','OBJECT','SELECT') AS r,"+
    "HAS_PERMS_BY_NAME('core.BookingAppointment','OBJECT','INSERT') AS w,"+
    "HAS_PERMS_BY_NAME('core.ReadBranchBooking','OBJECT','EXECUTE') AS re,"+
    "HAS_PERMS_BY_NAME('core.CreateBookingAppointment','OBJECT','EXECUTE') AS we,"+
    "HAS_PERMS_BY_NAME('core.AssertBookingBranchAction','OBJECT','EXECUTE') AS guard");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1,0]);
   await assert.rejects(()=>app.query("SELECT TOP(0) * FROM core.BookingAppointment"),
    e=>e.number===229);
  });
  await pass('composite Branch/Customer/Service FKs reject cross-business/branch data',async()=>{
   await assert.rejects(()=>q(admin,"INSERT core.BookingResource"+
    "(TenantId,BusinessId,BranchId,ResourceId,ClientRequestId,DisplayName,Kind)"+
    " VALUES(@t,@b,@br,@res,@req,N'Invalid', 'CHAIR')",{
     t:g.t,b:g.otherBusiness,br:g.branch,res:guid(),req:guid()}),e=>e.number===547);
   const t=future(120);
   await assert.rejects(()=>admin.request()
    .input('t',sql.UniqueIdentifier,g.t).input('b',sql.UniqueIdentifier,g.business)
    .input('br',sql.UniqueIdentifier,g.branch)
    .input('booking',sql.UniqueIdentifier,guid())
    .input('req',sql.UniqueIdentifier,guid())
    .input('customer',sql.UniqueIdentifier,g.foreignCustomer)
    .input('offering',sql.UniqueIdentifier,g.service)
    .input('resource',sql.UniqueIdentifier,guid())
    .input('start',sql.DateTime2(0),new Date(t))
    .input('end',sql.DateTime2(0),new Date(new Date(t).getTime()+30*60000))
    .query("INSERT core.BookingAppointment("+
     "TenantId,BusinessId,BranchId,BookingId,ClientRequestId,"+
     "CustomerId,OfferingId,ResourceId,StartsAtUtc,EndsAtUtc,Status)"+
     " VALUES(@t,@b,@br,@booking,@req,@customer,@offering,@resource,@start,@end,'BOOKED')"),
     e=>e.number===547);
  });
  await pass('stored procedure denies forged direct SQL session',async()=>{
   await assert.rejects(()=>app.request()
    .input('TenantId',sql.UniqueIdentifier,g.t)
    .input('BusinessId',sql.UniqueIdentifier,g.business)
    .input('BranchId',sql.UniqueIdentifier,g.branch)
    .input('AccountId',sql.UniqueIdentifier,g.account)
    .input('SessionVersion',sql.Int,1)
    .input('TokenHash',sql.Char(64),'0'.repeat(64))
    .execute('core.ReadBranchBooking'),e=>e.number===51151);
  });

  const env={...process.env,NODE_ENV:'production',API_PORT:'3403',
   API_HOST:'127.0.0.1',DRVO_SQL_ENABLED:'YES',
   DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
   DRVO_SQL_DATABASE:db,DRVO_SQL_USER:user,DRVO_SQL_PASSWORD:appPass,
   DRVO_K5_AUTH_ENABLED:'YES',DRVO_BOOKING_ENABLED:'YES',
   DRVO_CUSTOMERS_ENABLED:'YES',DRVO_CATALOG_ENABLED:'YES',
   DRVO_POS_DRAFTS_ENABLED:'YES',
   DRVO_K5_ORIGIN:origin,
  };
  server=spawn(process.execPath,['apps/api/dist/main.js'],{
   env,stdio:['ignore','pipe','pipe'],
  });
  let logs='';server.stdout.on('data',d=>{logs+=String(d)});
  server.stderr.on('data',d=>{logs+=String(d)});
  try{await wait();}catch(e){throw Error('API boot failure '+logs.slice(-140));}
  await pass('HTTP no-cookie is 401 and cache remains private',async()=>{
   const r=await get(path(g.business,g.branch));
   assert.equal(r.status,401);
   assert.equal(r.headers.get('cache-control'),'no-store');
  });
  const cookie=await login('scheduler.booking.ci');
  const otherCookie=await login('foreign.booking.ci');
  // Salon Pilot CI: prove the real, independent domain APIs work together
  // using one scoped K5 cookie. We reuse the already deployed domain owners;
  // there is no fake public demo, customer PII, or new SQL migration.
  const scopePath=url+'/workspaces/'+g.business+'/branches/'+g.branch;
  const customerPath=scopePath+'/customers';
  const catalogPath=scopePath+'/catalog';
  const draftPath=scopePath+'/pos-drafts';
  let pilotCustomer,pilotService;
  await pass('Salon E2E: create synthetic Customer and Catalog service via authenticated HTTP',async()=>{
   const noCookie=await get(customerPath);
   assert.equal(noCookie.status,401);
   assert.equal((await get(catalogPath)).status,401);
   const customerResponse=await post(customerPath,cookie,guid(),
     {displayName:'Salon CI Customer',phoneE164:null});
   assert.equal(customerResponse.status,200);
   const c=await customerResponse.json();
   assert.equal(c.created,true);pilotCustomer=c.id;
   const serviceResponse=await post(catalogPath+'/offerings',cookie,guid(),{
    kind:'SERVICE',displayName:'Salon CI Haircut',categoryId:null,
    priceMinor:18000,currency:'EGP',durationMinutes:30,
   });
   assert.equal(serviceResponse.status,200);
   const offering=await serviceResponse.json();
   assert.equal(offering.created,true);pilotService=offering.id;
   assert.ok((await (await get(customerPath,cookie)).json()).customers.some(
    x=>x.customerId===pilotCustomer&&x.displayName==='Salon CI Customer'));
   assert.ok((await (await get(catalogPath,cookie)).json()).offerings.some(
    x=>x.offeringId===pilotService&&x.priceMinor===18000));
  });
  let resourceId,secondResource;
  await pass('resource creation idempotent; payload change gives 409',async()=>{
   const key=guid(),p=path(g.business,g.branch)+'/resources';
   const body={displayName:'Chair 1',kind:'CHAIR'};
   const a=await post(p,cookie,key,body);
   assert.equal(a.status,200);
   const first=await a.json();
   assert.equal(first.created,true);
   resourceId=first.id;
   const b=await post(p,cookie,key,body);
   assert.equal(b.status,200);
   assert.deepEqual(await b.json(),{id:resourceId,created:false});
   assert.equal((await post(p,cookie,key,{displayName:'Chair X',kind:'CHAIR'})).status,409);
   const c=await post(p,cookie,guid(),{displayName:'Chair 2',kind:'CHAIR'});
   assert.equal(c.status,200);secondResource=(await c.json()).id;
  });
  let start;
  await pass('Book Customer + Catalog SERVICE + Branch resource and expose joined read',async()=>{
   start=future(180);
   const body={customerId:g.customer,offeringId:g.service,resourceId,startsAtUtc:start};
   const key=guid(),p=path(g.business,g.branch)+'/appointments';
   const a=await post(p,cookie,key,body);
   assert.equal(a.status,200);
   const one=await a.json();assert.equal(one.created,true);
   const b=await post(p,cookie,key,body);
   assert.deepEqual(await b.json(),{id:one.id,created:false});
   assert.equal((await post(p,cookie,key,{...body,resourceId:secondResource})).status,409);
   const list=await get(path(g.business,g.branch),cookie);
   assert.equal(list.status,200);
   assert.equal(list.headers.get('cache-control'),'no-store');
   const data=await list.json();
   assert.equal(data.resources.length,2);
   assert.equal(data.appointments.length,1);
   assert.equal(data.appointments[0].customerName,'CI Customer');
   assert.equal(data.appointments[0].startsAtUtc,start);
   assert.equal(new Date(data.appointments[0].endsAtUtc)-new Date(start),30*60000);
  });
  await pass('Salon E2E: real Booking persists Customer/Catalog references after repeat GET',async()=>{
   const at=future(240);
   const payload={customerId:pilotCustomer,offeringId:pilotService,
     resourceId:secondResource,startsAtUtc:at};
   const p=path(g.business,g.branch)+'/appointments';
   const created=await post(p,cookie,guid(),payload);
   assert.equal(created.status,200);
   const record=await created.json();assert.equal(record.created,true);
   // Same authenticated HTTP query after another request, not in-memory React state.
   const refreshed=await get(path(g.business,g.branch),cookie);
   assert.equal(refreshed.status,200);
   const row=(await refreshed.json()).appointments.find(x=>x.bookingId===record.id);
   assert.ok(row);
   assert.equal(row.customerId,pilotCustomer);
   assert.equal(row.offeringId,pilotService);
   assert.equal(row.customerName,'Salon CI Customer');
   assert.equal(row.offeringName,'Salon CI Haircut');
   assert.equal(row.startsAtUtc,at);
   assert.equal((await post(p,cookie,guid(),payload)).status,409);
  });
  await pass('Salon E2E: POS saves same Catalog service as DRAFT only, survives HTTP GET',async()=>{
   assert.equal((await get(draftPath)).status,401);
   const payload={lines:[{offeringId:pilotService,quantity:2}]};
   const requestKey=guid();
   const saved=await post(draftPath,cookie,requestKey,payload);
   assert.equal(saved.status,200);
   const d=await saved.json();
   assert.equal(d.created,true);assert.equal(d.status,'DRAFT');
   assert.equal(d.posted,false);assert.equal(d.version,1);
   const replay=await post(draftPath,cookie,requestKey,payload);
   assert.equal(replay.status,200);
   assert.equal((await replay.json()).id,d.id);
   assert.equal((await post(draftPath,cookie,requestKey,{
    lines:[{offeringId:pilotService,quantity:1}],
   })).status,409);
   const resumed=await get(draftPath,cookie);
   assert.equal(resumed.status,200);
   const row=(await resumed.json()).drafts.find(x=>x.draftId===d.id);
   assert.ok(row);assert.equal(row.subtotalMinor,36000);
   assert.equal(row.currency,'EGP');assert.equal(row.status,'DRAFT');
   assert.equal(row.lines.length,1);
   assert.equal(row.lines[0].unitPriceMinor,18000);
   const stored=await admin.query(
    "SELECT COUNT(*) AS n FROM core.PosDraft WHERE Status='DRAFT'");
   assert.equal(stored.recordset[0].n,1);
   assert.equal((await get(url+'/workspaces/'+g.foreignBusiness+
     '/branches/'+g.foreignBranch+'/pos-drafts',cookie)).status,404);
  });
  await pass('Salon E2E: no Customer/Booking/Draft cross-scope reads or writes',async()=>{
   for(const suffix of ['/customers','/catalog','/booking','/pos-drafts']){
    const forged=url+'/workspaces/'+g.foreignBusiness+'/branches/'+g.foreignBranch+suffix;
    assert.equal((await get(forged,cookie)).status,404,suffix);
   }
   assert.equal((await post(draftPath,cookie,guid(),{
    lines:[{offeringId:g.foreignService,quantity:1}],
   })).status,400);
   assert.equal((await post(draftPath,cookie,guid(),{
    lines:[{offeringId:pilotService,quantity:1}],tenantId:g.t,
   })).status,400);
   assert.equal((await post(draftPath,cookie,guid(),{
    lines:[{offeringId:pilotService,quantity:1}],
   },{Origin:'https://attacker.invalid'})).status,401);
  });
  await pass('Salon E2E: individual POS permission revoked while Booking remains readable',async()=>{
   await q(admin,"DELETE core.RolePermission WHERE TenantId=@t AND"+
    " BusinessId=@b AND RoleId=@r AND ActionCode='pos.draft.read'",
    {t:g.t,b:g.business,r:g.role});
   assert.equal((await get(draftPath,cookie)).status,404);
   assert.equal((await get(path(g.business,g.branch),cookie)).status,200);
   await q(admin,"INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
    " VALUES(@t,@b,@r,'pos.draft.read')",{t:g.t,b:g.business,r:g.role});
  });
  await pass('Overlapping resource slot blocked; adjacent and parallel resource allowed',async()=>{
   const p=path(g.business,g.branch)+'/appointments';
   const before=new Date(new Date(start).getTime()+10*60000).toISOString();
   assert.equal((await post(p,cookie,guid(),{
    customerId:g.customer,offeringId:g.service,resourceId,startsAtUtc:before,
   })).status,409);
   const adjacent=new Date(new Date(start).getTime()+30*60000).toISOString();
   assert.equal((await post(p,cookie,guid(),{
    customerId:g.customer,offeringId:g.service,resourceId,startsAtUtc:adjacent,
   })).status,200);
   assert.equal((await post(p,cookie,guid(),{
    customerId:g.customer,offeringId:g.service,resourceId:secondResource,startsAtUtc:start,
   })).status,200);
  });
  await pass('Concurrent same-resource overlapping creates never both succeed',async()=>{
   const p=path(g.business,g.branch)+'/appointments';
   const at=future(300);
   const body={customerId:g.customer,offeringId:g.service,resourceId,startsAtUtc:at};
   const results=await Promise.all([
    post(p,cookie,guid(),body),post(p,cookie,guid(),body),
   ]);
   const statuses=results.map(x=>x.status).sort((a,b)=>a-b);
   assert.deepEqual(statuses,[200,409]);
   const all=await (await get(path(g.business,g.branch),cookie)).json();
   assert.equal(all.appointments.filter(b=>b.startsAtUtc===at&&b.resourceId===resourceId).length,1);
  });
  await pass('Client cannot use foreign Customer, PRODUCT offering or other-Branch Resource',async()=>{
   const p=path(g.business,g.branch)+'/appointments';
   const at=future(420);
   for(const body of [
    {customerId:g.foreignCustomer,offeringId:g.service,resourceId,startsAtUtc:at},
    {customerId:g.customer,offeringId:g.product,resourceId,startsAtUtc:at},
    {customerId:g.customer,offeringId:g.foreignService,resourceId,startsAtUtc:at},
    {customerId:g.customer,offeringId:g.service,resourceId:guid(),startsAtUtc:at},
   ])assert.equal((await post(p,cookie,guid(),body)).status,400);
   assert.equal((await post(p,cookie,guid(),{
    customerId:g.customer,offeringId:g.service,resourceId,startsAtUtc:'bad-date',
   })).status,400);
  });
  await pass('Cross-Tenant, other Business, unassigned Branch reads/writes fail closed',async()=>{
   for(const [business,branch] of [
    [g.otherBusiness,g.otherBranch],
    [g.foreignBusiness,g.foreignBranch],
    [g.business,g.unassignedBranch],
   ]){
    assert.equal((await get(path(business,branch),cookie)).status,404);
    assert.equal((await post(path(business,branch)+'/resources',cookie,guid(),
      {displayName:'Foreign',kind:'PERSON'})).status,404);
   }
   const r=await get(path(g.foreignBusiness,g.foreignBranch),otherCookie);
   assert.equal(r.status,200);
   assert.deepEqual((await r.json()).appointments,[]);
  });
  await pass('Mutations require matching HTTPS Origin and strict request fields',async()=>{
   const p=path(g.business,g.branch)+'/resources';
   assert.equal((await post(p,cookie,guid(),{displayName:'Bad',kind:'CHAIR'},
    {Origin:'https://attacker.invalid'})).status,401);
   assert.equal((await post(p,cookie,guid(),
    {displayName:'Bad',kind:'CHAIR',tenantId:g.foreignTenant})).status,400);
  });
  const changePath=(b,br,id)=>path(b,br)+'/appointments/'+id+'/status';
  await pass('Lifecycle: terminal cancel is persisted; slot is released for a new booking',async()=>{
   const at=future(720),req={customerId:g.customer,offeringId:g.service,
    resourceId,startsAtUtc:at};
   const postPath=path(g.business,g.branch)+'/appointments';
   const create=await post(postPath,cookie,guid(),req);
   assert.equal(create.status,200);
   const bookingId=(await create.json()).id;
   const k=guid();
   const cancel=await post(changePath(g.business,g.branch,bookingId),cookie,k,{status:'CANCELLED'});
   assert.equal(cancel.status,200);assert.deepEqual(await cancel.json(),{
    id:bookingId,status:'CANCELLED',changed:true,
   });
   const again=await post(changePath(g.business,g.branch,bookingId),cookie,k,{status:'CANCELLED'});
   assert.equal(again.status,200);assert.deepEqual(await again.json(),{
    id:bookingId,status:'CANCELLED',changed:false,
   });
   const listed=(await (await get(path(g.business,g.branch),cookie)).json()).appointments;
   assert.equal(listed.find(b=>b.bookingId===bookingId)?.status,'CANCELLED');
   const replacement=await post(postPath,cookie,guid(),req);
   assert.equal(replacement.status,200);
   assert.notEqual((await replacement.json()).id,bookingId);
   assert.equal((await post(changePath(g.business,g.branch,bookingId),cookie,guid(),
    {status:'COMPLETED'})).status,409);
  });
  await pass('Lifecycle: completion requires booking already started, preserves history',async()=>{
   const at=future(780),req={customerId:g.customer,offeringId:g.service,
    resourceId:secondResource,startsAtUtc:at};
   const create=await post(path(g.business,g.branch)+'/appointments',cookie,guid(),req);
   assert.equal(create.status,200);
   const bookingId=(await create.json()).id;
   const urlChange=changePath(g.business,g.branch,bookingId);
   assert.equal((await post(urlChange,cookie,guid(),{status:'COMPLETED'})).status,409);
   await admin.request().input('t',sql.UniqueIdentifier,g.t)
    .input('b',sql.UniqueIdentifier,g.business)
    .input('br',sql.UniqueIdentifier,g.branch)
    .input('id',sql.UniqueIdentifier,bookingId)
    .query("UPDATE core.BookingAppointment SET StartsAtUtc=DATEADD(MINUTE,-40,SYSUTCDATETIME()),"+
      " EndsAtUtc=DATEADD(MINUTE,-10,SYSUTCDATETIME())"+
      " WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND BookingId=@id");
   const complete=await post(urlChange,cookie,guid(),{status:'COMPLETED'});
   assert.equal(complete.status,200);
   assert.equal((await complete.json()).status,'COMPLETED');
   const listed=(await (await get(path(g.business,g.branch),cookie)).json()).appointments;
   assert.equal(listed.find(x=>x.bookingId===bookingId)?.status,'COMPLETED');
   assert.equal((await post(urlChange,cookie,guid(),{status:'CANCELLED'})).status,409);
  });
  await pass('Lifecycle: denied Origin and invalid state fail before SQL state mutation',async()=>{
   const at=future(840);
   const create=await post(path(g.business,g.branch)+'/appointments',cookie,guid(),
    {customerId:g.customer,offeringId:g.service,resourceId,startsAtUtc:at});
   assert.equal(create.status,200);
   const bookingId=(await create.json()).id;
   const urlChange=changePath(g.business,g.branch,bookingId);
   const k=guid();
   assert.equal((await post(urlChange,cookie,k,{status:'CANCELLED',tenantId:g.t})).status,400);
   assert.equal((await post(urlChange,cookie,k,{status:'INVOICED'})).status,400);
   assert.equal((await post(urlChange,cookie,k,{status:'CANCELLED'},
    {Origin:'https://attacker.invalid'})).status,401);
   assert.equal((await post(urlChange,cookie,k,{status:'CANCELLED'})).status,200);
   assert.equal((await post(urlChange,cookie,k,{status:'COMPLETED'})).status,409);
   const changed=(await admin.request()
    .input('t',sql.UniqueIdentifier,g.t).input('b',sql.UniqueIdentifier,g.business)
    .input('br',sql.UniqueIdentifier,g.branch).input('id',sql.UniqueIdentifier,bookingId)
    .query("SELECT COUNT(*) AS n FROM core.BookingStatusChange"+
      " WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND BookingId=@id")).recordset[0].n;
   assert.equal(changed,1);
  });
  await pass('Lifecycle: foreign Tenant and unauthorized Branch cannot mutate Booking',async()=>{
   const existing=(await (await get(path(g.business,g.branch),cookie)).json()).appointments[0];
   assert.ok(existing);
   for(const [business,branch] of [[g.otherBusiness,g.otherBranch],
    [g.foreignBusiness,g.foreignBranch],[g.business,g.unassignedBranch]]){
    assert.equal((await post(changePath(business,branch,existing.bookingId),cookie,guid(),
     {status:'CANCELLED'})).status,404);
   }
   assert.equal((await post(changePath(g.business,g.branch,guid()),cookie,guid(),
    {status:'CANCELLED'})).status,404);
  });
  await pass('Lifecycle: runtime SQL cannot change status/audit directly',async()=>{
   const r=await app.query("SELECT "+
    "HAS_PERMS_BY_NAME('core.BookingStatusChange','OBJECT','INSERT') AS i,"+
    "HAS_PERMS_BY_NAME('core.BookingAppointment','OBJECT','UPDATE') AS u,"+
    "HAS_PERMS_BY_NAME('core.ChangeBookingAppointmentStatus','OBJECT','EXECUTE') AS e");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1]);
  });
  const shift=(iso,minutes)=>new Date(Date.parse(iso)+minutes*60000).toISOString();
  const windowPayload=(resourceId,start,end)=>({
   resourceId,startsAtUtc:start,endsAtUtc:end,
  });
  let hoursResource,hoursStart;
  await pass('Windows: create scoped UTC working interval, replay safely and read',async()=>{
   const endpoint=path(g.business,g.branch);
   const resource=await post(endpoint+'/resources',cookie,guid(),
    {displayName:'CI Dated Availability',kind:'PERSON'});
   assert.equal(resource.status,200);hoursResource=(await resource.json()).id;
   hoursStart=future(2400);
   const end=shift(hoursStart,60),key=guid();
   assert.equal((await get(endpoint+'/windows')).status,401);
   assert.equal((await post(endpoint+'/windows',cookie,key,windowPayload(
    hoursResource,hoursStart,end))).status,200);
   const replay=await post(endpoint+'/windows',cookie,key,windowPayload(
    hoursResource,hoursStart,end));
   assert.equal(replay.status,200);assert.equal((await replay.json()).created,false);
   assert.equal((await post(endpoint+'/windows',cookie,key,windowPayload(
    hoursResource,hoursStart,shift(end,5)))).status,409);
   const windows=(await (await get(endpoint+'/windows',cookie)).json()).windows;
   assert.ok(windows.some(x=>x.resourceId===hoursResource&&
    x.startsAtUtc===hoursStart&&x.endsAtUtc===end));
  });
  await pass('Windows: SQL enforces inside-only bookings; overlaps, scope and Origin denied',async()=>{
   const endpoint=path(g.business,g.branch);
   const payload=(m)=>({
    resourceId:hoursResource,customerId:g.customer,offeringId:g.service,
    startsAtUtc:shift(hoursStart,m),
   });
   assert.equal((await post(endpoint+'/appointments',cookie,guid(),payload(-45))).status,409);
   assert.equal((await post(endpoint+'/appointments',cookie,guid(),payload(75))).status,409);
   assert.equal((await post(endpoint+'/appointments',cookie,guid(),payload(15))).status,200);
   assert.equal((await post(endpoint+'/appointments',cookie,guid(),payload(20))).status,409);
   assert.equal((await post(endpoint+'/windows',cookie,guid(),windowPayload(
    hoursResource,shift(hoursStart,20),shift(hoursStart,45)))).status,409);
   assert.equal((await post(endpoint+'/windows',cookie,guid(),{
    ...windowPayload(hoursResource,hoursStart,shift(hoursStart,60)),tenantId:g.t,
   })).status,400);
   assert.equal((await post(endpoint+'/windows',cookie,guid(),windowPayload(
    hoursResource,hoursStart,shift(hoursStart,60)),{
     Origin:'https://attacker.invalid',
   })).status,401);
   const foreign=path(g.foreignBusiness,g.foreignBranch)+'/windows';
   assert.equal((await get(foreign,cookie)).status,404);
   assert.equal((await post(foreign,cookie,guid(),windowPayload(
    hoursResource,hoursStart,shift(hoursStart,60)))).status,404);
  });
  await pass('Windows: first published schedule cannot strand existing future bookings',async()=>{
   const endpoint=path(g.business,g.branch);
   const resource=await post(endpoint+'/resources',cookie,guid(),
    {displayName:'CI Existing Booking Resource',kind:'CHAIR'});
   assert.equal(resource.status,200);const id=(await resource.json()).id;
   const oldStart=future(2650);
   const booked=await post(endpoint+'/appointments',cookie,guid(),{
    customerId:g.customer,offeringId:g.service,resourceId:id,startsAtUtc:oldStart,
   });
   assert.equal(booked.status,200);const bookingId=(await booked.json()).id;
   const first=windowPayload(id,future(2700),future(2760));
   assert.equal((await post(endpoint+'/windows',cookie,guid(),first)).status,409);
   assert.equal((await post(changePath(g.business,g.branch,bookingId),cookie,
    guid(),{status:'CANCELLED'})).status,200);
   assert.equal((await post(endpoint+'/windows',cookie,guid(),first)).status,200);
   assert.equal((await post(endpoint+'/appointments',cookie,guid(),{
    customerId:g.customer,offeringId:g.service,resourceId:id,startsAtUtc:oldStart,
   })).status,409);
  });
  await pass('Windows: restricted runtime SQL principal only executes procedures',async()=>{
   const x=await app.query("SELECT "+
    "HAS_PERMS_BY_NAME('core.BookingResourceWindow','OBJECT','SELECT') AS s,"+
    "HAS_PERMS_BY_NAME('core.BookingResourceWindow','OBJECT','INSERT') AS i,"+
    "HAS_PERMS_BY_NAME('core.ReadBookingResourceWindows','OBJECT','EXECUTE') AS r,"+
    "HAS_PERMS_BY_NAME('core.CreateBookingResourceWindow','OBJECT','EXECUTE') AS w");
   assert.deepEqual(Object.values(x.recordset[0]).map(Number),[0,0,1,1]);
   await assert.rejects(()=>app.query("SELECT TOP(1) * FROM core.BookingResourceWindow"),
    e=>e.number===229);
  });
  await pass('Revoked booking read/write role and Business membership deny next request',async()=>{
   await q(admin,"DELETE core.RolePermission WHERE TenantId=@t"+
    " AND BusinessId=@b AND RoleId=@r AND ActionCode='booking.read'",
    {t:g.t,b:g.business,r:g.role});
   assert.equal((await get(path(g.business,g.branch),cookie)).status,404);
   await q(admin,"INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
    " VALUES(@t,@b,@r,'booking.read')",{t:g.t,b:g.business,r:g.role});
   await q(admin,"DELETE core.RolePermission WHERE TenantId=@t AND"+
    " BusinessId=@b AND RoleId=@r AND ActionCode='booking.manage'",
    {t:g.t,b:g.business,r:g.role});
   assert.equal((await post(path(g.business,g.branch)+'/resources',cookie,
    guid(),{displayName:'Denied',kind:'CHAIR'})).status,404);
   await q(admin,"UPDATE core.BusinessMembership SET IsActive=0"+
    " WHERE TenantId=@t AND BusinessId=@b AND AccountId=@a",
    {t:g.t,b:g.business,a:g.account});
   assert.equal((await get(path(g.business,g.branch),cookie)).status,404);
  });
  await pass('Revoked session returns HTTP 401',async()=>{
   await q(admin,"UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
    " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",
    {t:g.t,a:g.account});
   assert.equal((await get(path(g.business,g.branch),cookie)).status,401);
  });
  console.log('SHARED BOOKING SQL + HTTP PASS: '+count+' checks');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{
 console.error('BOOKING CI FAILED:',e instanceof Error?e.message.slice(0,240):'unknown');
 process.exitCode=1;
});
