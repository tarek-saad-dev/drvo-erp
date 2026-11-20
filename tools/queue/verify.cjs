'use strict';
// Salon Queue SQL026: disposable SQL2022 + Nest HTTP. Never primary/VPS.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.QUEUE_SQL_DISPOSABLE,'YES');
assert.equal(process.env.QUEUE_TEST_PORT,'14347');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',user='drvo_erp_stage_app';
const secret='QueueTest!123456789abcdefghijklmnopqrstuvwxyz';
const origin='https://erp-stage.drvotech.com',base={server:'127.0.0.1',port:14347,
 user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:7000,requestTimeout:30000,pool:{min:0,max:5}};
const url='http://127.0.0.1:3421/api',id=()=>crypto.randomUUID();
const x={t:id(),otherT:id(),b:id(),foreignB:id(),br:id(),otherBr:id(),
 foreignBr:id(),owner:id(),foreignOwner:id(),role:id(),foreignRole:id(),
 customer:id(),resource:id(),offering:id(),booking:id()};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS Queue '+(++checks)+' '+label);}
async function connect(cfg){const pool=new sql.ConnectionPool(cfg);await pool.connect();return pool;}
async function query(pool,text,ids={}){const q=pool.request();
 for(const [k,v]of Object.entries(ids))q.input(k,sql.UniqueIdentifier,v);
 return q.query(text);}
async function branch(pool,t,b,br){
 await query(pool,"INSERT core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
 "INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",{t,b,br});
}
async function account(pool,t,a,name){
 const hash=await hashNewPassword(secret);
 await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
 .input('name',sql.NVarChar(80),name).input('salt',sql.VarBinary(32),hash.salt)
 .input('hash',sql.VarBinary(64),hash.passwordHash).query(
 "INSERT core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@name);"+
 "INSERT core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
 " VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)");
}
async function role(pool,t,b,r){
 await query(pool,"INSERT core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
 " VALUES(@t,@b,@r,N'OWNER',N'Owner');"+
 "INSERT core.RolePermission(TenantId,BusinessId,RoleId,ActionCode) VALUES"+
 " (@t,@b,@r,'queue.read'),(@t,@b,@r,'queue.manage'),"+
 " (@t,@b,@r,'booking.read'),(@t,@b,@r,'booking.manage'),"+
 " (@t,@b,@r,'catalog.read'),(@t,@b,@r,'customers.read')",{t,b,r});
}
async function member(pool,t,b,br,a,r){
 await query(pool,"INSERT core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
 "INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
 "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
 {t,b,br,a,r});
}
async function grants(pool){
 for(const name of ['Tenant','Business','Branch','Account','AccountCredential',
 'BusinessMembership','BranchAssignment','BranchRole','BusinessRole','RolePermission',
 'AuthSession','LoginThrottle','SchemaMigration'])
  await pool.query('GRANT SELECT ON OBJECT::core.'+name+' TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+user+']');
 await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+user+']');
 await pool.query('GRANT UPDATE(FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO ['+user+']');
}
async function seedBookingGraph(pool){
 await query(pool,"INSERT core.Customer(TenantId,BusinessId,CustomerId,ClientRequestId,DisplayName)"+
  " VALUES(@t,@b,@c,@req,N'Queue Customer')",
  {t:x.t,b:x.b,c:x.customer,req:id()});
 await pool.request().input('t',sql.UniqueIdentifier,x.t).input('b',sql.UniqueIdentifier,x.b)
  .input('offering',sql.UniqueIdentifier,x.offering).input('req',sql.UniqueIdentifier,id())
  .query("INSERT core.CatalogOffering(TenantId,BusinessId,OfferingId,ClientRequestId,"+
   "Kind,DisplayName,PriceMinor,Currency,DurationMinutes)"+
   " VALUES(@t,@b,@offering,@req,'SERVICE',N'Cut',5000,'EGP',30)");
 await query(pool,"INSERT core.BookingResource(TenantId,BusinessId,BranchId,ResourceId,"+
  "ClientRequestId,DisplayName,Kind) VALUES(@t,@b,@br,@r,@req,N'Chair A','CHAIR')",
  {t:x.t,b:x.b,br:x.br,r:x.resource,req:id()});
 const start=new Date('2027-06-01T10:00:00.000Z'),end=new Date('2027-06-01T10:30:00.000Z');
 await pool.request().input('t',sql.UniqueIdentifier,x.t).input('b',sql.UniqueIdentifier,x.b)
  .input('br',sql.UniqueIdentifier,x.br).input('booking',sql.UniqueIdentifier,x.booking)
  .input('req',sql.UniqueIdentifier,id()).input('c',sql.UniqueIdentifier,x.customer)
  .input('o',sql.UniqueIdentifier,x.offering).input('r',sql.UniqueIdentifier,x.resource)
  .input('start',sql.DateTime2(0),start).input('end',sql.DateTime2(0),end)
  .query("INSERT core.BookingAppointment(TenantId,BusinessId,BranchId,BookingId,ClientRequestId,"+
   "CustomerId,OfferingId,ResourceId,StartsAtUtc,EndsAtUtc,Status) VALUES("+
   "@t,@b,@br,@booking,@req,@c,@o,@r,@start,@end,'BOOKED')");
}
async function login(username){
 const response=await fetch(url+'/auth/login',{method:'POST',
  headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username,password:secret})});
 assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));return cookie;
}
const endpoint=(b,br)=>url+'/workspaces/'+b+'/branches/'+br+'/queue';
const get=(path,cookie)=>fetch(path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,cookie,key,body,source=origin)=>fetch(path,{
 method:'POST',headers:{Cookie:cookie,Origin:source,'Content-Type':'application/json',
 'Idempotency-Key':key},body:JSON.stringify(body)});
async function wait(){
 for(let i=0;i<90;i++){try{if((await fetch(url+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}throw Error('Queue Nest API not ready');
}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
 catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
 await new Promise(done=>setTimeout(done,2500));}}
 try{
 await master.query('CREATE DATABASE ['+db+']');
 const appPass='QueueCi_'+crypto.randomBytes(22).toString('hex')+'!';
 await master.query("CREATE LOGIN ["+user+"] WITH PASSWORD=N'"+appPass+
  "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
 admin=await connect({...base,database:db});
 await admin.query('CREATE USER ['+user+'] FOR LOGIN ['+user+'];GRANT CONNECT TO ['+user+']');
 await pass('36 migrations apply including SQL026 queue + SQL036 settle',async()=>{
  const a=await applyMigrations(admin,undefined,36);
  assert.equal(a.length,36);assert.ok(a.every(v=>v.status==='applied'));
  const b=await applyMigrations(admin,undefined,36);
  assert.ok(b.every(v=>v.status==='unchanged'));
  assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.QueueTicket')).recordset[0].n,0);
  assert.equal((await admin.query(
   "SELECT COL_LENGTH('core.QueueTicket','AutoClosedAtUtc') AS c")).recordset[0].c,7);
 });
 await grants(admin);
 await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI'),(@otherT,N'Other')",
  {t:x.t,otherT:x.otherT});
 await branch(admin,x.t,x.b,x.br);await branch(admin,x.otherT,x.foreignB,x.foreignBr);
 await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
  " VALUES(@t,@b,@otherBr,N'Other Branch')",{t:x.t,b:x.b,otherBr:x.otherBr});
 await account(admin,x.t,x.owner,'owner.queue.ci');
 await account(admin,x.otherT,x.foreignOwner,'foreign.queue.ci');
 await role(admin,x.t,x.b,x.role);await role(admin,x.otherT,x.foreignB,x.foreignRole);
 await member(admin,x.t,x.b,x.br,x.owner,x.role);
 await member(admin,x.otherT,x.foreignB,x.foreignBr,x.foreignOwner,x.foreignRole);
 await seedBookingGraph(admin);
 await pass('app EXECUTE-only on queue procedures; direct DML denied',async()=>{
  app=await connect({...base,database:db,user,password:appPass});
  const r=await app.query(
   "SELECT HAS_PERMS_BY_NAME('core.QueueTicket','OBJECT','SELECT') AS r,"+
   "HAS_PERMS_BY_NAME('core.QueueTicket','OBJECT','INSERT') AS w,"+
   "HAS_PERMS_BY_NAME('core.ReadBranchQueue','OBJECT','EXECUTE') AS x,"+
   "HAS_PERMS_BY_NAME('core.CreateQueueTicket','OBJECT','EXECUTE') AS y,"+
   "HAS_PERMS_BY_NAME('core.SettleExpiredQueueTickets','OBJECT','EXECUTE') AS z");
  assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1,1]);
  await assert.rejects(()=>app.query('SELECT * FROM core.QueueTicket'),e=>e.number===229);
 });
 const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3421',
  DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
  DRVO_SQL_DATABASE:db,DRVO_SQL_USER:user,DRVO_SQL_PASSWORD:appPass,
  DRVO_K5_AUTH_ENABLED:'YES',DRVO_QUEUE_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
 server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
 let log='';server.stdout.on('data',d=>{log+=String(d)});server.stderr.on('data',d=>{log+=String(d)});
 try{await wait();}catch(e){throw Error('Queue startup: '+log.slice(-400));}
 await pass('anonymous GET denied with no-store',async()=>{
  const r=await get(endpoint(x.b,x.br));assert.equal(r.status,401);
  assert.equal(r.headers.get('cache-control'),'no-store');
 });
 const own=await login('owner.queue.ci'),foreign=await login('foreign.queue.ci');
 let ticketId;
 await pass('walk-in ticket create + idempotent replay + conflict Origin',async()=>{
  const path=endpoint(x.b,x.br)+'/tickets',key=id();
  const payload={customerId:x.customer,resourceId:x.resource,offeringId:x.offering,
   durationMinutes:30,expectedStartAtUtc:'2027-06-01T12:00:00.000Z'};
  const first=await post(path,own,key,payload);assert.equal(first.status,200);
  const created=await first.json();assert.equal(created.created,true);ticketId=created.id;
  const replay=await post(path,own,key,payload);assert.equal(replay.status,200);
  assert.equal((await replay.json()).created,false);
  assert.equal((await post(path,own,key,{...payload,durationMinutes:45})).status,409);
  assert.equal((await post(path,own,id(),payload,'https://evil.example')).status,401);
 });
 await pass('booking handoff creates linked nonposting ticket once',async()=>{
  const path=endpoint(x.b,x.br)+'/from-booking',key=id();
  const payload={bookingId:x.booking};
  const first=await post(path,own,key,payload);assert.equal(first.status,200);
  assert.equal((await first.json()).created,true);
  const replay=await post(path,own,key,payload);assert.equal(replay.status,200);
  assert.equal((await replay.json()).created,false);
  assert.equal((await post(path,own,id(),payload)).status,409);
 });
 await pass('list exposes NONPOSTING queue board without paid/posted claims',async()=>{
  const r=await get(endpoint(x.b,x.br),own);assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.state,'NONPOSTING_QUEUE_TICKETS_ONLY');
  assert.equal(body.lifecycleState,'NONPOSTING_QUEUE_LIFECYCLE');
  assert.equal(body.treasuryState,'NOT_PAID');
  assert.equal(body.accountingState,'NOT_POSTED');
  assert.equal(body.graceMinutes,15);
  assert.ok(body.tickets.length>=2);
  assert.ok(body.tickets.every(t=>typeof t.effectiveStatus==='string'&&
   typeof t.needsOperatorAction==='boolean'&&typeof t.settleEligible==='boolean'));
  assert.ok(body.tickets.some(t=>t.source==='WALK_IN'));
  assert.ok(body.tickets.some(t=>t.source==='BOOKING_HANDOFF'&&
   String(t.bookingId).toLowerCase()===x.booking.toLowerCase()));
 });
 await pass('lifecycle CALL→IN_SERVICE→DONE is idempotent; cancel finalizes',async()=>{
  const basePath=endpoint(x.b,x.br)+'/tickets/'+ticketId+'/status';
  const callKey=id();
  assert.equal((await post(basePath,own,callKey,{status:'CALLED'})).status,200);
  assert.equal((await (await post(basePath,own,callKey,{status:'CALLED'})).json()).changed,false);
  const startKey=id();
  assert.equal((await post(basePath,own,startKey,{status:'IN_SERVICE'})).status,200);
  const doneKey=id();
  assert.equal((await post(basePath,own,doneKey,{status:'DONE'})).status,200);
  assert.equal((await post(basePath,own,id(),{status:'CANCELLED'})).status,409);
 });
 let expiredTicketId;
 await pass('operator settle-expired marks WAITING past grace as NO_SHOW',async()=>{
  const path=endpoint(x.b,x.br)+'/tickets';
  const payload={customerId:null,resourceId:x.resource,offeringId:null,durationMinutes:30,
   expectedStartAtUtc:'2020-01-01T10:00:00.000Z'};
  const created=await post(path,own,id(),payload);assert.equal(created.status,200);
  expiredTicketId=(await created.json()).id;
  const settlePath=endpoint(x.b,x.br)+'/settle-expired';
  const first=await post(settlePath,own,id(),{graceMinutes:15});
  assert.equal(first.status,200);
  const body=await first.json();
  assert.equal(body.treasuryState,'NOT_PAID');
  assert.equal(body.accountingState,'NOT_POSTED');
  assert.ok(body.settledCount>=1);
  assert.ok(body.ticketIds.some(t=>String(t).toLowerCase()===expiredTicketId.toLowerCase()));
  const replay=await post(settlePath,own,id(),{graceMinutes:15});
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).settledCount,0);
  assert.equal((await post(settlePath,own,id(),{graceMinutes:15},
   'https://evil.example')).status,401);
  const board=await (await get(endpoint(x.b,x.br),own)).json();
  const settled=board.tickets.find(t=>String(t.ticketId).toLowerCase()===
   expiredTicketId.toLowerCase());
  assert.equal(settled?.status,'NO_SHOW');
  assert.equal(settled?.settleEligible,false);
 });
 await pass('cross-tenant and unassigned branch denied',async()=>{
  assert.equal((await get(endpoint(x.foreignB,x.foreignBr),own)).status,404);
  assert.equal((await get(endpoint(x.b,x.otherBr),own)).status,404);
  assert.equal((await get(endpoint(x.foreignB,x.foreignBr),foreign)).status,200);
 });
 await pass('permission revoke blocks manage then read',async()=>{
  await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
   " AND RoleId=@role AND ActionCode='queue.manage'",{t:x.t,b:x.b,role:x.role});
  assert.equal((await post(endpoint(x.b,x.br)+'/tickets',own,id(),{
   customerId:null,resourceId:x.resource,offeringId:null,durationMinutes:30,
   expectedStartAtUtc:'2027-06-02T12:00:00.000Z'})).status,404);
  assert.equal((await get(endpoint(x.b,x.br),own)).status,200);
  await query(admin,"DELETE core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
   " AND RoleId=@role AND ActionCode='queue.read'",{t:x.t,b:x.b,role:x.role});
  assert.equal((await get(endpoint(x.b,x.br),own)).status,404);
 });
 console.log('QUEUE SQL2022 + NEST HTTP PASS: '+checks+' independent groups');
 }finally{
  server?.kill('SIGTERM');await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('QUEUE DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,550):'unknown');process.exitCode=1;});
