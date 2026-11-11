'use strict';
// K6C disposable SQL 2022 and real NestJS HTTP isolation proof ONLY.
// Never accepts VPS credentials, connects to a remote host, or sends email.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const sql = require('../../apps/api/node_modules/mssql');
const {applyMigrations} = require('../k4-db/migrate.cjs');
const {hashNewPassword} = require('../../apps/api/dist/identity/password.js');

assert.equal(process.env.K6C_SQL_DISPOSABLE, 'YES');
assert.equal(process.env.K6C_TEST_PORT, '14339');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length >= 12);

const db = 'DRVO_ERP_STAGING';
const appUser = 'drvo_erp_stage_app';
const appPass = 'K6C_ci_' + crypto.randomBytes(24).toString('hex') + '!';
const base = {
  server: '127.0.0.1', port: 14339,
  user: 'sa', password: process.env.SQL_TEST_SA_PASSWORD,
  options: {encrypt:true, trustServerCertificate:true},
  pool: {min:0,max:4}, requestTimeout:30000, connectionTimeout:5000,
};
const id=()=>crypto.randomUUID();
const x = {
  t1:id(), t2:id(), b1:id(), b2:id(), b3:id(),
  br1:id(), br1other:id(), br2:id(), br3:id(),
  owner:id(), outsider:id(), r1:id(), r2:id(),
};
const password = 'CiStrongK6C123!abc';
const cookieName = '__Host-drvo-session';
const origin = 'https://erp-stage.drvotech.com';
const port = 3396;
const url = 'http://127.0.0.1:' + port + '/api';
let count=0;

async function pass(description,fn){
  await fn();
  count++;
  console.log('PASS K6C ' + String(count).padStart(2,'0') + ' ' + description);
}
async function open(conf) {
  const p=new sql.ConnectionPool(conf);
  await p.connect();
  return p;
}
async function executeGuid(pool,source,bindings) {
  const req=pool.request();
  for(const [name,value] of Object.entries(bindings)){
    req.input(name,sql.UniqueIdentifier,value);
  }
  return req.query(source);
}
async function makeTenant(pool,t) {
  await executeGuid(pool,
    "INSERT INTO core.Tenant(TenantId,DisplayName) VALUES(@t,N'CI Tenant')",{t});
}
async function makeBusiness(pool,t,b,br) {
  await executeGuid(pool,
    "INSERT INTO core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'CI Business');"+
    "INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N'CI Branch')",
    {t,b,br});
}
async function makeAccount(pool,t,a,user) {
  const hash=await hashNewPassword(password);
  await pool.request()
    .input('t',sql.UniqueIdentifier,t)
    .input('a',sql.UniqueIdentifier,a)
    .input('user',sql.NVarChar(80),user)
    .input('salt',sql.VarBinary(32),hash.salt)
    .input('pwd',sql.VarBinary(64),hash.passwordHash)
    .query("INSERT INTO core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@user);"+
      "INSERT INTO core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)"+
      " VALUES(@t,@a,@salt,@pwd,'scrypt-v1',0)");
}
async function assign(pool,t,b,br,a,r){
  await executeGuid(pool,
    "INSERT INTO core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a);"+
    "INSERT INTO core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a);"+
    "INSERT INTO core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@r)",
    {t,b,br,a,r});
}
async function makeRole(pool,t,b,r) {
  await executeGuid(pool,
    "INSERT INTO core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)"+
    " VALUES(@t,@b,@r,N'VIEWER',N'Viewer');"+
    "INSERT INTO core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
    " VALUES(@t,@b,@r,'branch.read')",
    {t,b,r});
}
async function makeCandidate(pool,t,b,key,displayName) {
  await pool.request()
    .input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
    .input('key',sql.VarChar(64),key)
    .input('name',sql.NVarChar(120),displayName)
    .query("INSERT INTO core.BusinessModuleCandidate"+
      "(TenantId,BusinessId,ModuleKey,CandidateVersion,DisplayName)"+
      " VALUES(@t,@b,@key,'1.0.0',@name)");
}
async function grantApp(pool) {
  const tables=[
    'core.Tenant','core.Business','core.Branch','core.Account',
    'core.AccountCredential','core.BusinessMembership',
    'core.BranchAssignment','core.BranchRole','core.BusinessRole',
    'core.RolePermission','core.AuthSession','core.LoginThrottle',
    'core.SchemaMigration',
  ];
  for (const table of tables) {
    await pool.query('GRANT SELECT ON OBJECT::'+table+' TO ['+appUser+']');
  }
  await pool.query('GRANT INSERT ON OBJECT::core.AuthSession TO ['+appUser+']');
  await pool.query('GRANT INSERT ON OBJECT::core.SecurityAudit TO ['+appUser+']');
  await pool.query('GRANT INSERT ON OBJECT::core.LoginThrottle TO ['+appUser+']');
  await pool.query('GRANT UPDATE (FailedCount,WindowStartedUtc) '+
    'ON OBJECT::core.LoginThrottle TO ['+appUser+']');
}
async function waitHealth() {
  for(let i=0;i<90;i++){
    try{const r=await fetch(url+'/health');if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,350));
  }
  throw new Error('K6C API did not become healthy');
}
async function login(username) {
  const r=await fetch(url+'/auth/login',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({username,password}),
  });
  assert.equal(r.status,200);
  const cookie=r.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie?.startsWith(cookieName+'='));
  return cookie;
}
function candidates(b,br) {
  return url+'/workspaces/'+b+'/branches/'+br+'/modules/candidates';
}
async function get(path,cookie){
  return fetch(path, {headers:cookie?{Cookie:cookie}:{}});
}
async function hasSqlError(fn,num) {
  await assert.rejects(fn,e => e && Number(e.number)===num);
}
async function main(){
  let master,admin,app,server;
  for(let n=0;n<45;n++){
    try {
      master=await open({...base,database:'master'});
      await master.query('SELECT 1');
      break;
    }catch(err){
      await master?.close().catch(()=>{});
      master=undefined;
      if(n===44)throw err;
      await new Promise(r=>setTimeout(r,3000));
    }
  }
  try{
    await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
    await master.query("CREATE LOGIN ["+appUser+"] WITH PASSWORD=N'"+
      appPass+"',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF");
    admin=await open({...base,database:db});
    await admin.query('CREATE USER ['+appUser+'] FOR LOGIN ['+appUser+'];'+
      'GRANT CONNECT TO ['+appUser+']');
    await pass('10 forward-only migrations apply; replay is no-op',async()=>{
      const first=await applyMigrations(admin,undefined,10);
      assert.equal(first.length,10);
      assert.ok(first.every(v=>v.status==='applied'));
      const again=await applyMigrations(admin,undefined,10);
      assert.ok(again.every(v=>v.status==='unchanged'));
    });
    await pass('candidate table starts empty; no actual released modules',async()=>{
      const r=await admin.query('SELECT COUNT(*) AS n FROM core.BusinessModuleCandidate');
      assert.equal(r.recordset[0].n,0);
    });
    await grantApp(admin);
    await makeTenant(admin,x.t1);
    await makeTenant(admin,x.t2);
    await makeBusiness(admin,x.t1,x.b1,x.br1);
    await executeGuid(admin,
      "INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName)"+
      " VALUES(@t,@b,@br,N'Unauthorized Branch')",
      {t:x.t1,b:x.b1,br:x.br1other});
    await makeBusiness(admin,x.t1,x.b2,x.br2);
    await makeBusiness(admin,x.t2,x.b3,x.br3);
    await makeAccount(admin,x.t1,x.owner,'owner.k6c');
    await makeAccount(admin,x.t2,x.outsider,'other.k6c');
    await makeRole(admin,x.t1,x.b1,x.r1);
    await makeRole(admin,x.t2,x.b3,x.r2);
    await assign(admin,x.t1,x.b1,x.br1,x.owner,x.r1);
    await assign(admin,x.t2,x.b3,x.br3,x.outsider,x.r2);
    await makeCandidate(admin,x.t1,x.b1,'Catalog','Catalog Preview A');
    await makeCandidate(admin,x.t1,x.b1,'Booking','Booking Preview A');
    await makeCandidate(admin,x.t1,x.b2,'Inventory','Unowned B2');
    await makeCandidate(admin,x.t2,x.b3,'Customers','Foreign T2');

    await pass('composite FK rejects candidate from another Tenant/Business',async()=>{
      await hasSqlError(()=>makeCandidate(admin,x.t1,x.b3,'Wrong','Wrong'),547);
    });
    await pass('runtime principal has EXECUTE but no direct table access',async()=>{
      const procedure=await admin.query(
        "SELECT execute_as_principal_id AS impersonates FROM sys.sql_modules "+
        "WHERE object_id=OBJECT_ID(N'core.ReadBusinessModuleCandidates')");
      assert.equal(procedure.recordset.length,1);
      assert.equal(procedure.recordset[0].impersonates,null,
        'procedure must not impersonate dbo or elevated principal');
      app=await open({...base,database:db,user:appUser,password:appPass});
      const perms=await app.query(
        "SELECT HAS_PERMS_BY_NAME('core.BusinessModuleCandidate','OBJECT','SELECT') AS sel,"+
        "HAS_PERMS_BY_NAME('core.BusinessModuleCandidate','OBJECT','UPDATE') AS upd,"+
        "HAS_PERMS_BY_NAME('core.ReadBusinessModuleCandidates','OBJECT','EXECUTE') AS exe");
      assert.equal(perms.recordset[0].sel,0);
      assert.equal(perms.recordset[0].upd,0);
      assert.equal(perms.recordset[0].exe,1);
      await hasSqlError(()=>app.query(
        'SELECT TOP(0) ModuleKey FROM core.BusinessModuleCandidate'),229);
      await hasSqlError(()=>app.query(
        "UPDATE core.BusinessModuleCandidate SET DisplayName=N'Wrong' WHERE 1=0"),229);
    });
    await pass('stored procedure rejects missing/forged session even with valid IDs',async()=>{
      await hasSqlError(()=>app.request()
        .input('TenantId',sql.UniqueIdentifier,x.t1)
        .input('BusinessId',sql.UniqueIdentifier,x.b1)
        .input('BranchId',sql.UniqueIdentifier,x.br1)
        .input('AccountId',sql.UniqueIdentifier,x.owner)
        .input('SessionVersion',sql.Int,1)
        .input('TokenHash',sql.Char(64),'f'.repeat(64))
        .execute('core.ReadBusinessModuleCandidates'),51091);
    });

    const env={
      ...process.env, API_PORT:String(port), API_HOST:'127.0.0.1',
      NODE_ENV:'production', DRVO_SQL_ENABLED:'YES',
      DRVO_SQL_HOST:'127.0.0.1', DRVO_SQL_PORT:'1433',
      DRVO_SQL_DATABASE:db,DRVO_SQL_USER:appUser,DRVO_SQL_PASSWORD:appPass,
      DRVO_K5_AUTH_ENABLED:'YES',DRVO_K6C_CATALOG_READ_ENABLED:'YES',
      DRVO_K5_ORIGIN:origin,
    };
    server=spawn(process.execPath,['apps/api/dist/main.js'],{
      cwd:process.cwd(),env,stdio:['ignore','pipe','pipe'],
    });
    let logs='';
    server.stdout.on('data',d=>{logs+=String(d);});
    server.stderr.on('data',d=>{logs+=String(d);});
    try {await waitHealth();}
    catch(e){throw new Error('K6C API startup failed '+logs.slice(-220),{cause:e});}

    await pass('HTTP without trusted auth cookie is 401 (no public catalog)',async()=>{
      const r=await get(candidates(x.b1,x.br1));
      assert.equal(r.status,401);
      assert.equal(r.headers.get('cache-control'),'no-store');
    });
    const ownerCookie=await login('owner.k6c');
    const outsiderCookie=await login('other.k6c');
    await pass('authorized HTTP list has ONLY own Business candidates',async()=>{
      const r=await get(candidates(x.b1,x.br1),ownerCookie);
      assert.equal(r.status,200);
      assert.equal(r.headers.get('cache-control'),'no-store');
      const data=await r.json();
      assert.deepEqual(data.candidates.map(y=>y.moduleKey),['Booking','Catalog']);
      assert.ok(data.candidates.every(y=>y.version==='1.0.0'));
      assert.ok(!JSON.stringify(data).includes('Unowned B2'));
      assert.ok(!JSON.stringify(data).includes('Foreign T2'));
    });
    await pass('other Tenant sees ONLY its own authorized Business',async()=>{
      const r=await get(candidates(x.b3,x.br3),outsiderCookie);
      assert.equal(r.status,200);
      const data=await r.json();
      assert.deepEqual(data.candidates.map(y=>y.moduleKey),['Customers']);
    });
    await pass('same-Tenant other Business, foreign Tenant and other Branch deny',async()=>{
      for(const [b,br] of [[x.b2,x.br2],[x.b3,x.br3],[x.b1,x.br1other]]){
        const r=await get(candidates(b,br),ownerCookie);
        assert.equal(r.status,404);
        assert.equal(r.headers.get('cache-control'),'no-store');
        assert.ok(!JSON.stringify(await r.json()).includes('Customers'));
      }
    });
    await pass('invalid scope/URL is 404; POST is not an activation API',async()=>{
      assert.equal((await get(candidates('spoofed',x.br1),ownerCookie)).status,404);
      const r=await fetch(candidates(x.b1,x.br1),{
        method:'POST',headers:{Cookie:ownerCookie,'Content-Type':'application/json'},
        body:JSON.stringify({moduleKey:'Catalog',activate:true}),
      });
      assert.equal(r.status,404);
    });
    await pass('role permission revocation blocks next read',async()=>{
      await executeGuid(admin,
        "DELETE FROM core.RolePermission WHERE TenantId=@t AND BusinessId=@b"+
        " AND RoleId=@r AND ActionCode='branch.read'",
        {t:x.t1,b:x.b1,r:x.r1});
      assert.equal((await get(candidates(x.b1,x.br1),ownerCookie)).status,404);
      await executeGuid(admin,
        "INSERT INTO core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)"+
        " VALUES(@t,@b,@r,'branch.read')",
        {t:x.t1,b:x.b1,r:x.r1});
      assert.equal((await get(candidates(x.b1,x.br1),ownerCookie)).status,200);
    });
    await pass('membership revocation blocks next read',async()=>{
      await executeGuid(admin,
        "UPDATE core.BusinessMembership SET IsActive=0 WHERE TenantId=@t"+
        " AND BusinessId=@b AND AccountId=@a",
        {t:x.t1,b:x.b1,a:x.owner});
      assert.equal((await get(candidates(x.b1,x.br1),ownerCookie)).status,404);
      await executeGuid(admin,
        "UPDATE core.BusinessMembership SET IsActive=1 WHERE TenantId=@t"+
        " AND BusinessId=@b AND AccountId=@a",
        {t:x.t1,b:x.b1,a:x.owner});
    });
    await pass('revoked Session is rejected as 401',async()=>{
      await executeGuid(admin,
        "UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()"+
        " WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL",
        {t:x.t1,a:x.owner});
      assert.equal((await get(candidates(x.b1,x.br1),ownerCookie)).status,401);
    });
    console.log('K6C DISPOSABLE SQL + HTTP ISOLATION PASS: '+count+' checks');
  } finally {
    server?.kill('SIGTERM');
    await app?.close().catch(()=>{});
    await admin?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}

main().catch(e=>{
  // Do not leak credentials, raw tokens, connection strings or SQL resultsets.
  console.error('K6C verification FAILED:',e instanceof Error ? e.message.slice(0,240) : 'unknown');
  process.exitCode=1;
});
