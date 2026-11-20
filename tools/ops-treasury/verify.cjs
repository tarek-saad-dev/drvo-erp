'use strict';
// Operations SQL029 + Treasury ops SQL030 + OPS-03 SQL039 handoff disposable SQL2022 + Nest HTTP.
// Never primary/VPS. Applies full migration chain through SQL039.
// MERGE AFTER: Package PR must land real 038_pos_draft_package_line_snapshots.sql first
// (K4 consecutive numbering; this PR ships 039 only — no stub 038).
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
assert.equal(process.env.OPS_TREASURY_SQL_DISPOSABLE,'YES');
assert.equal(process.env.OPS_TREASURY_TEST_PORT,'14348');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING',user='drvo_erp_stage_app';
const secret='OpsTreasury!123456789abcdefghijklmnopqrst';
const origin='https://erp-stage.drvotech.com',base={server:'127.0.0.1',port:14348,
 user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
 options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:7000,requestTimeout:40000,pool:{min:0,max:5}};
const url='http://127.0.0.1:3422/api',id=()=>crypto.randomUUID();
const x={t:id(),otherT:id(),b:id(),foreignB:id(),br:id(),otherBr:id(),
 foreignBr:id(),owner:id(),foreignOwner:id(),role:id(),foreignRole:id()};
let checks=0;
async function pass(label,fn){await fn();console.log('PASS OpsTreasury '+(++checks)+' '+label);}
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
 " (@t,@b,@r,'operations.day.read'),(@t,@b,@r,'operations.day.manage'),"+
 " (@t,@b,@r,'operations.shift.read'),(@t,@b,@r,'operations.shift.manage'),"+
 " (@t,@b,@r,'treasury.movement.read'),(@t,@b,@r,'treasury.movement.manage'),"+
 " (@t,@b,@r,'treasury.recon.read'),(@t,@b,@r,'treasury.recon.manage')",{t,b,r});
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
async function login(username){
 const response=await fetch(url+'/auth/login',{method:'POST',
  headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({username,password:secret})});
 assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie?.startsWith('__Host-drvo-session='));return cookie;
}
const ops=(b,br)=>url+'/workspaces/'+b+'/branches/'+br+'/operations';
const tr=(b,br)=>url+'/workspaces/'+b+'/branches/'+br+'/treasury/ops';
const get=(path,cookie)=>fetch(path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,cookie,key,body,source=origin)=>fetch(path,{
 method:'POST',headers:{Cookie:cookie,Origin:source,'Content-Type':'application/json',
 'Idempotency-Key':key},body:JSON.stringify(body)});
async function wait(){
 for(let i=0;i<90;i++){try{if((await fetch(url+'/health')).ok)return;}catch{}
 await new Promise(done=>setTimeout(done,350));}throw Error('OpsTreasury Nest API not ready');
}
async function main(){
 let master,admin,app,server;
 for(let i=0;i<45;i++){try{master=await connect({...base,database:'master'});break;}
 catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
 await new Promise(done=>setTimeout(done,2500));}}
 try{
 await master.query('CREATE DATABASE ['+db+']');
 const appPass='OpsTrCi_'+crypto.randomBytes(22).toString('hex')+'!';
 await master.query("CREATE LOGIN ["+user+"] WITH PASSWORD=N'"+appPass+
  "',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
 admin=await connect({...base,database:db});
 await admin.query('CREATE USER ['+user+'] FOR LOGIN ['+user+'];GRANT CONNECT TO ['+user+']');
 await pass('migrations apply through SQL039 ops handoff (requires real 038 first)',async()=>{
  const a=await applyMigrations(admin);
  assert.ok(a.length>=39);assert.ok(a.every(v=>v.status==='applied'));
  const b=await applyMigrations(admin);
  assert.ok(b.every(v=>v.status==='unchanged'));
  assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.BusinessDay')).recordset[0].n,0);
  assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.TreasuryCashMovement')).recordset[0].n,0);
  assert.ok((await admin.query(
   "SELECT OBJECT_ID(N'core.HandoffOperationalShift',N'P') AS p")).recordset[0].p);
 });
 await grants(admin);
 await query(admin,"INSERT core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI'),(@otherT,N'Other')",
  {t:x.t,otherT:x.otherT});
 await branch(admin,x.t,x.b,x.br);await branch(admin,x.otherT,x.foreignB,x.foreignBr);
 await query(admin,"INSERT core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
  " VALUES(@t,@b,@otherBr,N'Other Branch')",{t:x.t,b:x.b,otherBr:x.otherBr});
 await account(admin,x.t,x.owner,'owner.ops.tr.ci');
 await account(admin,x.otherT,x.foreignOwner,'foreign.ops.tr.ci');
 await role(admin,x.t,x.b,x.role);await role(admin,x.otherT,x.foreignB,x.foreignRole);
 await member(admin,x.t,x.b,x.br,x.owner,x.role);
 await query(admin,"INSERT core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId)"+
  " VALUES(@t,@b,@otherBr,@a);"+
  "INSERT core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId)"+
  " VALUES(@t,@b,@otherBr,@a,@r)",{t:x.t,b:x.b,otherBr:x.otherBr,a:x.owner,r:x.role});
 await member(admin,x.otherT,x.foreignB,x.foreignBr,x.foreignOwner,x.foreignRole);
 await pass('EXECUTE-only on ops/treasury procs; direct DML denied',async()=>{
  app=await connect({...base,database:db,user,password:appPass});
  const r=await app.query(
   "SELECT HAS_PERMS_BY_NAME('core.BusinessDay','OBJECT','SELECT') AS r,"+
   "HAS_PERMS_BY_NAME('core.TreasuryCashMovement','OBJECT','INSERT') AS w,"+
   "HAS_PERMS_BY_NAME('core.ReadOperationsDayShift','OBJECT','EXECUTE') AS x,"+
   "HAS_PERMS_BY_NAME('core.CreateTreasuryCashMovement','OBJECT','EXECUTE') AS y,"+
   "HAS_PERMS_BY_NAME('core.HandoffOperationalShift','OBJECT','EXECUTE') AS h");
  assert.deepEqual(Object.values(r.recordset[0]).map(Number),[0,0,1,1,1]);
  await assert.rejects(()=>app.query('SELECT * FROM core.BusinessDay'),e=>e.number===229);
 });
 const env={...process.env,NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3422',
  DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
  DRVO_SQL_DATABASE:db,DRVO_SQL_USER:user,DRVO_SQL_PASSWORD:appPass,
  DRVO_K5_AUTH_ENABLED:'YES',DRVO_OPERATIONS_ENABLED:'YES',
  DRVO_TREASURY_OPS_ENABLED:'YES',DRVO_K5_ORIGIN:origin};
 server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
 let log='';server.stdout.on('data',d=>{log+=String(d)});server.stderr.on('data',d=>{log+=String(d)});
 try{await wait();}catch(e){throw Error('OpsTreasury startup: '+log.slice(-400));}
 const own=await login('owner.ops.tr.ci');
 const today=new Date().toISOString().slice(0,10);
 let dayId,shiftId,movementId;
 await pass('open business day + shift for trusted UTC date',async()=>{
  const dayKey=id();
  const day=await post(ops(x.b,x.br)+'/days',own,dayKey,{businessDate:today});
  assert.equal(day.status,200);
  const dayBody=await day.json();
  assert.equal(dayBody.created,true);assert.equal(dayBody.glPostState,'GATED');
  dayId=dayBody.id;
  assert.equal((await post(ops(x.b,x.br)+'/days',own,dayKey,{businessDate:today})
   .then(r=>r.json())).created,false);
  const shiftKey=id();
  const shift=await post(ops(x.b,x.br)+'/shifts',own,shiftKey,{dayId});
  assert.equal(shift.status,200);
  const shiftBody=await shift.json();
  assert.equal(shiftBody.created,true);shiftId=shiftBody.id;
  const read=await get(ops(x.b,x.br),own);assert.equal(read.status,200);
  const board=await read.json();
  assert.equal(board.state,'NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY');
  assert.equal(board.glPostState,'GATED');
  assert.equal(board.readiness.financialPostingState,'NOT_AUTHORIZED');
  assert.equal(board.openDay.dayId,dayId);
 });
 await pass('cash movement IN recorded with GL gated; cancel requires open shift',async()=>{
  const key=id();
  const created=await post(tr(x.b,x.br)+'/movements',own,key,{
   dayId,shiftId,direction:'IN',amountMinor:5000,currency:'EGP',
   fromRail:'OTHER',toRail:'CASH',note:'opening float'});
  assert.equal(created.status,200);
  const body=await created.json();
  assert.equal(body.created,true);assert.equal(body.glPostState,'GATED');
  movementId=body.id;
  assert.equal((await post(tr(x.b,x.br)+'/movements',own,key,{
   dayId,shiftId,direction:'IN',amountMinor:5000,currency:'EGP',
   fromRail:'OTHER',toRail:'CASH',note:'opening float'})).status,200);
  assert.equal((await post(tr(x.b,x.br)+'/movements',own,id(),{
   dayId,shiftId,direction:'IN',amountMinor:5000,currency:'EGP',
   fromRail:'OTHER',toRail:'CASH',note:'opening float',posted:true})).status,400);
  const list=await get(tr(x.b,x.br),own);assert.equal(list.status,200);
  const payload=await list.json();
  assert.equal(payload.state,'NONPOSTING_TREASURY_MOVEMENTS_AND_RECON_ONLY');
  assert.equal(payload.glPostState,'GATED');
  assert.equal(payload.settlementState,'NO_SETTLEMENT');
  assert.equal(payload.movements[0].amountMinor,5000);
 });
 await pass('shift recon closes shift, variance GL remains GATED',async()=>{
  const key=id();
  const recon=await post(tr(x.b,x.br)+'/recon',own,key,{
   shiftId,rail:'CASH',countedMinor:4500,note:'drawer count'});
  assert.equal(recon.status,200);
  const body=await recon.json();
  assert.equal(body.created,true);assert.equal(body.shiftClosed,true);
  assert.equal(body.glPostState,'GATED');assert.equal(body.varianceGlState,'GATED');
  assert.equal(body.systemMinor,5000);assert.equal(body.varianceMinor,-500);
  const board=await (await get(ops(x.b,x.br),own)).json();
  assert.equal(board.shifts.find(s=>s.shiftId===shiftId).status,'CLOSED');
  assert.equal((await post(tr(x.b,x.br)+'/movements/'+movementId+'/cancel',own,id(),{})).status,409);
 });
 await pass('OPS-03 handoff A→B: only B open; idempotent replay; stale/concurrent fail; no GL',async()=>{
  const movBefore=(await admin.query('SELECT COUNT(*) AS n FROM core.TreasuryCashMovement')).recordset[0].n;
  const dayB=await post(ops(x.b,x.otherBr)+'/days',own,id(),{businessDate:today});
  assert.equal(dayB.status,200);
  const dayBId=(await dayB.json()).id;
  const openA=await post(ops(x.b,x.br)+'/shifts',own,id(),{dayId});
  assert.equal(openA.status,200);
  const shiftA=(await openA.json()).id;
  const handKey=id();
  const hand=await post(ops(x.b,x.otherBr)+'/shift-handoff',own,handKey,
   {dayId:dayBId,expectedSourceShiftId:shiftA});
  assert.equal(hand.status,200);
  const handBody=await hand.json();
  assert.equal(handBody.created,true);
  assert.equal(handBody.outcome,'HANDED_OFF');
  assert.equal(handBody.glPostState,'GATED');
  assert.equal(handBody.financialPostingState,'NOT_AUTHORIZED');
  assert.equal(String(handBody.closedShiftId).toLowerCase(),String(shiftA).toLowerCase());
  assert.equal(String(handBody.closedBranchId).toLowerCase(),String(x.br).toLowerCase());
  const shiftB=handBody.id;
  const replay=await post(ops(x.b,x.otherBr)+'/shift-handoff',own,handKey,
   {dayId:dayBId,expectedSourceShiftId:shiftA});
  assert.equal(replay.status,200);
  const replayBody=await replay.json();
  assert.equal(replayBody.created,false);
  assert.equal(replayBody.outcome,'IDEMPOTENT_REPLAY');
  assert.equal(String(replayBody.id).toLowerCase(),String(shiftB).toLowerCase());
  assert.equal(replayBody.glPostState,'GATED');
  const boardA=await (await get(ops(x.b,x.br),own)).json();
  const boardB=await (await get(ops(x.b,x.otherBr),own)).json();
  assert.equal(boardA.shifts.filter(s=>s.status==='OPEN').length,0);
  assert.equal(boardB.shifts.filter(s=>s.status==='OPEN').length,1);
  assert.equal(String(boardB.shifts.find(s=>s.status==='OPEN').shiftId).toLowerCase(),
   String(shiftB).toLowerCase());
  assert.equal((await post(ops(x.b,x.otherBr)+'/shift-handoff',own,id(),
   {dayId:dayBId,expectedSourceShiftId:shiftA})).status,409);
  assert.equal((await post(ops(x.b,x.otherBr)+'/shift-handoff',own,id(),
   {dayId:dayBId,expectedSourceShiftId:id()})).status,409);
  assert.equal((await post(ops(x.foreignB,x.foreignBr)+'/shift-handoff',own,id(),
   {dayId:dayBId,expectedSourceShiftId:null})).status,404);
  assert.equal((await admin.query('SELECT COUNT(*) AS n FROM core.TreasuryCashMovement'))
   .recordset[0].n,movBefore);
  assert.equal((await admin.query(
   "SELECT COUNT(*) AS n FROM core.TreasuryCashMovement WHERE GlPostState='POSTED'"))
   .recordset[0].n|0,0);
 });
 await pass('foreign tenant/branch denied',async()=>{
  assert.equal((await get(ops(x.foreignB,x.foreignBr),own)).status,404);
  assert.equal((await get(tr(x.b,x.otherBr),own)).status,200);
 });
 console.log('OPS+TREASURY SQL2022 + NEST HTTP PASS: '+checks+' independent groups');
 }finally{
  server?.kill('SIGTERM');
  await app?.close().catch(()=>{});
  await admin?.close().catch(()=>{});
  await master?.close().catch(()=>{});
 }
}
main().catch(e=>{console.error('OPS+TREASURY DISPOSABLE CI FAILED:',
 e instanceof Error?e.message.slice(0,500):'unknown');process.exitCode=1;});
