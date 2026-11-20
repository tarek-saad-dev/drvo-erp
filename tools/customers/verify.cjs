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
const put=(p,cookie,data,headers={})=>fetch(p,{method:'PUT',
 headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json',...headers},
 body:JSON.stringify(data)});
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
  await pass('31 migrations (incl. SQL031 CRM profile) replay without drift and customer records start empty',async()=>{
   // Customers HTTP CI tip remains SQL031. SQL032 is inventory-owned; SQL033 booking
   // reschedule and SQL034 follow-up desk are covered by source/unit tests in this PR
   // and are not required for the Customers disposable SQL job tip yet.
   const a=await applyMigrations(admin,undefined,31);
   assert.equal(a.length,31);assert.ok(a.every(z=>z.status==='applied'));
   const b=await applyMigrations(admin,undefined,31);
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
    "HAS_PERMS_BY_NAME('core.SearchCustomers','OBJECT','EXECUTE') AS searchp,"+
    "HAS_PERMS_BY_NAME('core.AssertCustomersBranchAction','OBJECT','EXECUTE') AS guardp,"+
    "HAS_PERMS_BY_NAME('core.CustomerProfile','OBJECT','SELECT') AS profileRead,"+
    "HAS_PERMS_BY_NAME('core.CustomerProfile','OBJECT','UPDATE') AS profileWrite,"+
    "HAS_PERMS_BY_NAME('core.CustomerOffersConsentEvent','OBJECT','SELECT') AS consentRead,"+
    "HAS_PERMS_BY_NAME('core.ReadCustomerProfile','OBJECT','EXECUTE') AS profileReadExec,"+
    "HAS_PERMS_BY_NAME('core.UpsertCustomerProfile','OBJECT','EXECUTE') AS profileWriteExec");
   assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1,0,0,0,0,1,1]);
   await assert.rejects(()=>app.query('SELECT * FROM core.Customer'),e=>e.number===229);
   await assert.rejects(()=>app.query('SELECT * FROM core.CustomerProfile'),e=>e.number===229);
   await assert.rejects(()=>app.query('SELECT * FROM core.CustomerOffersConsentEvent'),e=>e.number===229);
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
  let firstCustomerId='';
  await pass('authorized create and idempotent exact replay; mismatch 409',async()=>{
   const key=id(),p=path(x.b,x.br),body={displayName:'Synthetic Customer',phoneE164:'+201012345678'};
   const a=await post(p,cookie,key,body);assert.equal(a.status,200);
   const created=await a.json();
   assert.equal(created.created,true);
   firstCustomerId=created.id;
   const r=await post(p,cookie,key,body);assert.equal(r.status,200);
   assert.equal((await r.json()).created,false);
   const clash=await post(p,cookie,key,{displayName:'Changed'});assert.equal(clash.status,409);
   const listing=await get(p,cookie);assert.equal(listing.status,200);
   const data=await listing.json();
   assert.equal(data.customers.length,1);
   assert.equal(data.customers[0].phoneE164,'+201012345678');
  });
  await pass('server Business search matches beyond browse-list assumptions',async()=>{
   const p=path(x.b,x.br);
   for(let i=0;i<5;i++){
    const phone='+2011'+String(10000000+i);
    assert.equal((await post(p,cookie,id(),
     {displayName:'Searchable '+i,phoneE164:phone})).status,200);
   }
   const byName=await get(p+'?q='+encodeURIComponent('Searchable'),cookie);
   assert.equal(byName.status,200);
   const nameData=await byName.json();
   assert.equal(nameData.searchScope,'BUSINESS');
   assert.equal(nameData.limit,20);
   assert.ok(nameData.customers.length>=5);
   const byPhone=await get(p+'?q='+encodeURIComponent('01012345678'),cookie);
   assert.equal(byPhone.status,200);
   const phoneData=await byPhone.json();
   assert.ok(phoneData.customers.some(c=>c.customerId===firstCustomerId));
   assert.equal((await get(p+'?q=',cookie)).status,200); // empty q falls back to list
   assert.equal((await get(path(x.b2,x.br2)+'?q=Searchable',cookie)).status,404);
   assert.equal((await get(path(x.foreignB,x.foreignBr)+'?q=Searchable',cookie)).status,404);
  });
  await pass('duplicate phone create refused with existing customer id',async()=>{
   const p=path(x.b,x.br);
   const dup=await post(p,cookie,id(),
    {displayName:'Another Person',phoneE164:'+201012345678'});
   assert.equal(dup.status,409);
   const body=await dup.json();
   const detail=typeof body.message==='object'&&body.message?body.message:body;
   assert.equal(detail.code,'CUSTOMER_PHONE_EXISTS');
   assert.equal(detail.existingCustomerId,firstCustomerId);
  });
  await pass('concurrent duplicate phone creates yield one customer and conflict for the rest',async()=>{
   const p=path(x.b,x.br);
   const phone='+201098765432';
   const attempts=Array.from({length:8},(_,i)=>({
    key:id(),body:{displayName:'Race '+i,phoneE164:phone},
   }));
   const results=await Promise.all(attempts.map(a=>post(p,cookie,a.key,a.body)));
   const statuses=results.map(r=>r.status);
   const ok=statuses.filter(s=>s===200);
   const conflict=statuses.filter(s=>s===409);
   assert.equal(ok.length,1,'exactly one create must succeed');
   assert.equal(conflict.length,7,'remaining concurrent creates must conflict');
   const winner=await results[statuses.indexOf(200)].json();
   assert.equal(winner.created,true);
   for(const r of results.filter((_,i)=>statuses[i]===409)){
    const body=await r.json();
    const detail=typeof body.message==='object'&&body.message?body.message:body;
    assert.equal(detail.code,'CUSTOMER_PHONE_EXISTS');
    assert.equal(detail.existingCustomerId,winner.id);
   }
   const search=await get(p+'?q='+encodeURIComponent('01098765432'),cookie);
   assert.equal(search.status,200);
   const found=(await search.json()).customers.filter(c=>c.phoneE164===phone);
   assert.equal(found.length,1);
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
  const profilePath=(b,br,c)=>path(b,br)+'/'+c+'/profile';
  const dbRow=async(sqlText,params)=>(await query(admin,sqlText,params)).recordset;
  await pass('SQL031 profile: absent profile reads empty/incomplete with NO consent',async()=>{
   const r=await get(profilePath(x.b,x.br,firstCustomerId),cookie);
   assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
   const view=await r.json();
   assert.equal(view.profileExists,false);assert.equal(view.incomplete,true);
   assert.equal(view.offersConsentActive,false);
   assert.equal(view.phoneE164,'+201012345678');
   assert.equal((await dbRow('SELECT COUNT(*) AS n FROM core.CustomerProfile')).at(0).n,0);
  });
  await pass('SQL031 profile: full CRM write persists source rules and does not imply consent from a stored phone',async()=>{
   const p=profilePath(x.b,x.br,firstCustomerId);
   const saved=await put(p,cookie,{birthDate:'1990-05-17',address:'  Nasr City ',
    notes:'prefers evenings',cameFrom:'word_of_mouth',cameFromDetails:' Ahmed ',
    referralCode:'STALE'});
   assert.equal(saved.status,200);
   const view=await saved.json();
   assert.equal(view.birthDate,'1990-05-17');assert.equal(view.address,'Nasr City');
   assert.equal(view.cameFrom,'word_of_mouth');assert.equal(view.cameFromDetails,'Ahmed');
   assert.equal(view.referralCode,null);assert.equal(view.incomplete,false);
   assert.equal(view.offersConsentActive,false,'phone alone is not WhatsApp consent');
   const again=await (await get(p,cookie)).json();
   assert.equal(again.cameFromDetails,'Ahmed');assert.equal(again.profileExists,true);
   const rows=await dbRow('SELECT OffersConsentedAtUtc,OffersConsentPhoneE164,CameFrom,ReferralCode'+
    ' FROM core.CustomerProfile');
   assert.equal(rows.length,1);assert.equal(rows[0].OffersConsentedAtUtc,null);
   assert.equal(rows[0].OffersConsentPhoneE164,null);assert.equal(rows[0].ReferralCode,null);
   assert.equal((await dbRow('SELECT COUNT(*) AS n FROM core.CustomerOffersConsentEvent')).at(0).n,0);
   // Repeating the identical PUT is idempotent: still one profile row.
   assert.equal((await put(p,cookie,{birthDate:'1990-05-17',address:'Nasr City',
    notes:'prefers evenings',cameFrom:'word_of_mouth',cameFromDetails:'Ahmed'})).status,200);
   assert.equal((await dbRow('SELECT COUNT(*) AS n FROM core.CustomerProfile')).at(0).n,1);
  });
  await pass('SQL031 profile: invalid source, DOB, keys, origin and ids are rejected',async()=>{
   const p=profilePath(x.b,x.br,firstCustomerId);
   for(const body of [
    {cameFrom:'word_of_mouth'},{cameFrom:'referral_code'},{cameFrom:'legacy_made_up'},
    {cameFromDetails:'orphan'},{birthDate:'2999-01-01'},{birthDate:'1990-02-30'},
    {offersConsentAction:'YES'},{tenantId:x.t2},{whatsappOffersConsentConfirmed:true},
   ])assert.equal((await put(p,cookie,body)).status,400,JSON.stringify(body));
   assert.equal((await put(p,cookie,{},{Origin:'https://attacker.invalid'})).status,401);
   assert.equal((await put(profilePath(x.b,x.br,'not-a-guid'),cookie,{})).status,404);
   assert.equal((await put(profilePath(x.b,x.br,id()),cookie,{})).status,404);
   assert.equal((await get(profilePath(x.b,x.br,id()),cookie)).status,404);
   assert.equal((await fetch(p,{headers:{}})).status,401);
  });
  await pass('SQL031 consent: explicit GRANT/REVOKE with append-only evidence; no phone, no GRANT',async()=>{
   const p=profilePath(x.b,x.br,firstCustomerId);
   const base={birthDate:'1990-05-17',address:'Nasr City',cameFrom:'instagram'};
   const granted=await (await put(p,cookie,{...base,offersConsentAction:'GRANT'})).json();
   assert.equal(granted.offersConsentActive,true);
   assert.equal(granted.offersConsentEvidence,'STAFF_CONFIRMED_CUSTOMER_WHATSAPP_OFFERS');
   const firstAt=granted.offersConsentedAtUtc;assert.ok(firstAt);
   const replay=await (await put(p,cookie,{...base,offersConsentAction:'GRANT'})).json();
   assert.equal(replay.offersConsentedAtUtc,firstAt,'replayed GRANT keeps original evidence');
   assert.equal((await dbRow('SELECT COUNT(*) AS n FROM core.CustomerOffersConsentEvent')).at(0).n,1);
   // A later PUT without an action must not change consent either way.
   const untouched=await (await put(p,cookie,{...base,notes:'edited'})).json();
   assert.equal(untouched.offersConsentActive,true);
   const revoked=await (await put(p,cookie,{...base,offersConsentAction:'REVOKE'})).json();
   assert.equal(revoked.offersConsentActive,false);assert.ok(revoked.offersConsentRevokedAtUtc);
   const regrant=await (await put(p,cookie,{...base,offersConsentAction:'GRANT'})).json();
   assert.equal(regrant.offersConsentActive,true);assert.equal(regrant.offersConsentRevokedAtUtc,null);
   const events=await dbRow('SELECT Action FROM core.CustomerOffersConsentEvent'+
    ' ORDER BY OccurredAtUtc,EventId');
   assert.equal(events.length,3);
   assert.deepEqual(events.map(e=>e.Action).sort(),['GRANT','GRANT','REVOKE']);
   // Customer without a phone can never be granted consent.
   const walkIn=await (await post(path(x.b,x.br),cookie,id(),{displayName:'No Phone CRM'})).json();
   assert.equal((await put(profilePath(x.b,x.br,walkIn.id),cookie,
    {offersConsentAction:'GRANT'})).status,400);
   assert.equal((await put(profilePath(x.b,x.br,walkIn.id),cookie,
    {address:'Giza'})).status,200);
   // Changing the stored phone voids the consent bound to the old number.
   await query(admin,"UPDATE core.Customer SET PhoneE164='+201055555555' WHERE TenantId=@t"+
    " AND BusinessId=@b AND CustomerId=@c",{t:x.t,b:x.b,c:firstCustomerId});
   assert.equal((await (await get(p,cookie)).json()).offersConsentActive,false);
  });
  await pass('SQL031 DB constraints: orphan source detail (NULL CameFrom) and wrong-Business FK are rejected',async()=>{
   const c=id();
   await query(admin,"INSERT core.Customer(TenantId,BusinessId,CustomerId,ClientRequestId,DisplayName)"+
    " VALUES(@t,@b,@c,@req,N'Constraint Probe')",{t:x.t,b:x.b,c,req:id()});
   await assert.rejects(()=>query(admin,
    "INSERT core.CustomerProfile(TenantId,BusinessId,CustomerId,CameFromDetails,UpdatedByAccountId)"+
    " VALUES(@t,@b,@c,N'orphan',@a)",{t:x.t,b:x.b,c,a:x.account}),e=>e.number===547);
   await assert.rejects(()=>query(admin,
    "INSERT core.CustomerProfile(TenantId,BusinessId,CustomerId,CameFrom,CameFromDetails,UpdatedByAccountId)"+
    " VALUES(@t,@b,@c,'instagram',N'detail on wrong source',@a)",
    {t:x.t,b:x.b,c,a:x.account}),e=>e.number===547);
   await assert.rejects(()=>query(admin,
    "INSERT core.CustomerProfile(TenantId,BusinessId,CustomerId,OffersConsentedAtUtc,UpdatedByAccountId)"+
    " VALUES(@t,@b,@c,SYSUTCDATETIME(),@a)",{t:x.t,b:x.b,c,a:x.account}),e=>e.number===547);
   await assert.rejects(()=>query(admin,
    "INSERT core.CustomerProfile(TenantId,BusinessId,CustomerId,UpdatedByAccountId)"+
    " VALUES(@t,@b,@c,@a)",{t:x.t,b:x.b2,c,a:x.account}),e=>e.number===547);
  });
  await pass('SQL031 profile reads/writes deny other Business, foreign Tenant and unassigned Branch',async()=>{
   for(const [b,br] of [[x.b2,x.br2],[x.foreignB,x.foreignBr],[x.b,x.unassignedBr]]){
    assert.equal((await get(profilePath(b,br,firstCustomerId),cookie)).status,404);
    assert.equal((await put(profilePath(b,br,firstCustomerId),cookie,{address:'x'})).status,404);
   }
   // A different Tenant's operator cannot reach this Business customer through their own scope.
   assert.equal((await get(profilePath(x.foreignB,x.foreignBr,firstCustomerId),foreign)).status,404);
   assert.equal((await put(profilePath(x.foreignB,x.foreignBr,firstCustomerId),foreign,
    {address:'hijack'})).status,404);
   assert.equal((await dbRow("SELECT COUNT(*) AS n FROM core.CustomerProfile WHERE Address=N'hijack'")).at(0).n,0);
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
