'use strict';
// Real SQL Server disposable K5 authentication/RBAC tests. No VPS connection.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
const {IdentityService}=require('../../apps/api/dist/identity/identity.service.js');

assert.equal(process.env.K5_SQL_DISPOSABLE,'YES');
assert.equal(process.env.K5_TEST_PORT,'14335');
const password=process.env.SQL_TEST_SA_PASSWORD;
assert.ok(password?.length>=12);
const db='DRVO_ERP_STAGING'; // disposable isolated CI SQL container, never VPS
const base={
  server:'127.0.0.1',port:14335,user:'sa',password,
  options:{encrypt:true,trustServerCertificate:true},
  pool:{min:0,max:3},requestTimeout:30000,connectionTimeout:5000,
};
const login='drvo_k5_ci_app';
const appPassword='DrvoK5Ci!'+crypto.randomBytes(24).toString('hex');
let count=0;
async function check(label,run){
  await run();count++; console.log('PASS '+String(count).padStart(2,'0')+' '+label);
}
async function open(config) {
  const pool=new sql.ConnectionPool(config); await pool.connect(); return pool;
}
async function ready(url){
  for(let attempt=0;attempt<60;attempt++){
    try{const r=await fetch(url);if(r.status===200)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('K5 test API did not reach readiness');
}
async function post(url,body,cookie,origin='https://erp-stage.drvotech.com'){
  const headers={'Content-Type':'application/json',Origin:origin};
  if(cookie)headers.Cookie=cookie;
  return fetch(url,{method:'POST',headers,body:JSON.stringify(body||{})});
}
function cookieValue(response){
  const header=response.headers.get('set-cookie');
  assert.match(header||'',/__Host-drvo-session=/);
  assert.match(header||'',/HttpOnly/);
  assert.match(header||'',/Secure/);
  assert.match(header||'',/SameSite=Strict/);
  return (header||'').split(';')[0];
}
async function createTenant(pool,tenantId,accountId,username,pass){
  const hashed=await hashNewPassword(pass);
  await pool.request().input('t',sql.UniqueIdentifier,tenantId)
    .input('name',sql.NVarChar(160),'Demo Tenant')
    .query('INSERT INTO core.Tenant(TenantId,DisplayName) VALUES (@t,@name)');
  await pool.request().input('t',sql.UniqueIdentifier,tenantId)
    .input('a',sql.UniqueIdentifier,accountId).input('name',sql.NVarChar(80),username)
    .query('INSERT INTO core.Account(TenantId,AccountId,Username) VALUES (@t,@a,@name)');
  await pool.request().input('t',sql.UniqueIdentifier,tenantId)
    .input('a',sql.UniqueIdentifier,accountId)
    .input('salt',sql.VarBinary(32),hashed.salt)
    .input('hash',sql.VarBinary(64),hashed.passwordHash)
    .query(`INSERT INTO core.AccountCredential(TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)
      VALUES(@t,@a,@salt,@hash,'scrypt-v1',0)`);
}
async function addBusiness(pool,tenantId,businessId,branchId,accountId,action){
  const role=crypto.randomUUID();
  await pool.request().input('t',sql.UniqueIdentifier,tenantId)
    .input('b',sql.UniqueIdentifier,businessId)
    .query('INSERT INTO core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N\'K5 Business\')');
  await pool.request().input('t',sql.UniqueIdentifier,tenantId)
    .input('b',sql.UniqueIdentifier,businessId).input('br',sql.UniqueIdentifier,branchId)
    .query('INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES(@t,@b,@br,N\'K5 Branch\')');
  await pool.request().input('t',sql.UniqueIdentifier,tenantId)
    .input('b',sql.UniqueIdentifier,businessId).input('a',sql.UniqueIdentifier,accountId)
    .query('INSERT INTO core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES(@t,@b,@a)');
  await pool.request().input('t',sql.UniqueIdentifier,tenantId)
    .input('b',sql.UniqueIdentifier,businessId).input('br',sql.UniqueIdentifier,branchId)
    .input('a',sql.UniqueIdentifier,accountId)
    .query('INSERT INTO core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES(@t,@b,@br,@a)');
  await pool.request().input('t',sql.UniqueIdentifier,tenantId).input('b',sql.UniqueIdentifier,businessId)
    .input('role',sql.UniqueIdentifier,role)
    .query('INSERT INTO core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName) VALUES(@t,@b,@role,N\'OPERATOR\',N\'Operator\')');
  if(action)await pool.request().input('t',sql.UniqueIdentifier,tenantId).input('b',sql.UniqueIdentifier,businessId)
    .input('role',sql.UniqueIdentifier,role).input('action',sql.VarChar(90),action)
    .query('INSERT INTO core.RolePermission(TenantId,BusinessId,RoleId,ActionCode) VALUES(@t,@b,@role,@action)');
  await pool.request().input('t',sql.UniqueIdentifier,tenantId).input('b',sql.UniqueIdentifier,businessId)
    .input('br',sql.UniqueIdentifier,branchId).input('a',sql.UniqueIdentifier,accountId)
    .input('role',sql.UniqueIdentifier,role)
    .query('INSERT INTO core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId) VALUES(@t,@b,@br,@a,@role)');
  return role;
}
async function grantRuntime(pool) {
  await pool.query(`CREATE USER [${login}] FOR LOGIN [${login}]; GRANT CONNECT TO [${login}]`);
  const tables=['core.Account','core.Tenant','core.Business','core.Branch',
    'core.BusinessMembership','core.BranchAssignment','core.SchemaMigration',
    'core.AccountCredential','core.AuthSession','core.BusinessRole',
    'core.RolePermission','core.BranchRole','core.LoginThrottle'];
  for(const table of tables)await pool.query(`GRANT SELECT ON OBJECT::${table} TO [${login}]`);
  for(const table of ['core.AuthSession','core.SecurityAudit','core.LoginThrottle']){
    await pool.query(`GRANT INSERT ON OBJECT::${table} TO [${login}]`);
  }
  await pool.query(`GRANT UPDATE (RevokedAtUtc) ON OBJECT::core.AuthSession TO [${login}]`);
  await pool.query(`GRANT UPDATE (FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO [${login}]`);
  await pool.query(`GRANT UPDATE (SessionVersion) ON OBJECT::core.Account TO [${login}]`);
  await pool.query(`GRANT UPDATE (Salt,PasswordHash,PasswordAlgorithm,MustChangePassword,PasswordChangedAtUtc)
    ON OBJECT::core.AccountCredential TO [${login}]`);
}
async function run(){
  let master;
  for(let i=0;i<45;i++){
    try {master=await open({...base,database:'master'});await master.query('SELECT 1');break;}
    catch(err){await master?.close().catch(()=>{});if(i===44)throw err;await new Promise(r=>setTimeout(r,3000));}
  }
  let setup,client,proc;
  const t1=crypto.randomUUID(),t2=crypto.randomUUID();
  const a1=crypto.randomUUID(),a2=crypto.randomUUID();
  const b1=crypto.randomUUID(),b2=crypto.randomUUID(),b3=crypto.randomUUID();
  const br1=crypto.randomUUID(),br2=crypto.randomUUID(),br3=crypto.randomUUID();
  const pass1='CorrectPassword#1234';
  try{
    await master.query(`IF DB_ID(N'${db}') IS NULL CREATE DATABASE [${db}]`);
    await master.query(`CREATE LOGIN [${login}] WITH PASSWORD=N'${appPassword}',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    setup=await open({...base,database:db});
    await check('applies K4 and K5 forward migrations',async()=>{
      assert.deepEqual((await applyMigrations(setup)).map(x=>x.status),['applied','applied']);
      assert.deepEqual((await applyMigrations(setup)).map(x=>x.status),['unchanged','unchanged']);
    });
    await grantRuntime(setup);
    await createTenant(setup,t1,a1,'owner.alpha',pass1);
    await createTenant(setup,t2,a2,'owner.beta','AnotherCorrectPassword#123');
    const role=await addBusiness(setup,t1,b1,br1,a1,'branch.read');
    await addBusiness(setup,t1,b3,br3,a1,null);
    await addBusiness(setup,t2,b2,br2,a2,'branch.read');
    client=await open({...base,database:db,user:login,password:appPassword});
    const identity=new IdentityService({getInternalPool:()=>client});
    process.env.DRVO_K5_AUTH_ENABLED='YES';

    let session;
    await check('correct password returns opaque random session token',async()=>{
      session=await identity.login('owner.alpha',pass1);
      assert.match(session.token,/^[a-zA-Z0-9_-]{43}$/);
      assert.equal(session.actor.tenantId.toLowerCase(),t1.toLowerCase());
      assert.notEqual(session.token,pass1);
      const stored=await setup.query('SELECT TOP 1 TokenHash FROM core.AuthSession');
      assert.notEqual(stored.recordset[0].TokenHash,session.token);
      assert.equal((await identity.actorFromToken(session.token)).username,'owner.alpha');
    });
    await check('absent token and forged session are denied',async()=>{
      await assert.rejects(()=>identity.actorFromToken(null),/Unauthorized/);
      await assert.rejects(()=>identity.actorFromToken('A'.repeat(43)),/Unauthorized/);
    });
    await check('branch access requires tenant and membership and branch action',async()=>{
      const allowed=await identity.readAuthorizedBranch(session.actor,b1,br1,'branch.read');
      assert.equal(allowed.branchId.toLowerCase(),br1.toLowerCase());
      await assert.rejects(()=>identity.readAuthorizedBranch(session.actor,b2,br2,'branch.read'),/Not Found/);
      await assert.rejects(()=>identity.readAuthorizedBranch(session.actor,b3,br3,'branch.read'),/Not Found/);
      await assert.rejects(()=>identity.readAuthorizedBranch(session.actor,b1,br1,'profit.read'),/Not Found/);
    });
    await check('revoked role or permission immediately denies subsequent read',async()=>{
      await setup.request().input('role',sql.UniqueIdentifier,role)
        .query('UPDATE core.BusinessRole SET IsActive=0 WHERE RoleId=@role');
      await assert.rejects(()=>identity.readAuthorizedBranch(session.actor,b1,br1,'branch.read'),/Not Found/);
      await setup.request().input('role',sql.UniqueIdentifier,role)
        .query('UPDATE core.BusinessRole SET IsActive=1 WHERE RoleId=@role');
      await setup.request().input('role',sql.UniqueIdentifier,role)
        .query('DELETE FROM core.RolePermission WHERE RoleId=@role');
      await assert.rejects(()=>identity.readAuthorizedBranch(session.actor,b1,br1,'branch.read'),/Not Found/);
      await setup.request().input('role',sql.UniqueIdentifier,role)
        .query(`INSERT INTO core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)
          SELECT TenantId,BusinessId,RoleId,'branch.read' FROM core.BusinessRole WHERE RoleId=@role`);
    });
    await check('revoked membership prevents privilege even with valid session',async()=>{
      await setup.request().input('b',sql.UniqueIdentifier,b1)
        .query('UPDATE core.BusinessMembership SET IsActive=0 WHERE BusinessId=@b');
      await assert.rejects(()=>identity.readAuthorizedBranch(session.actor,b1,br1,'branch.read'),/Not Found/);
      await setup.request().input('b',sql.UniqueIdentifier,b1)
        .query('UPDATE core.BusinessMembership SET IsActive=1 WHERE BusinessId=@b');
    });
    await check('session logout invalidates immediately',async()=>{
      await identity.logout(session.token);
      await assert.rejects(()=>identity.actorFromToken(session.token),/Unauthorized/);
    });
    await check('invalid passwords fail and throttle by username',async()=>{
      for(let j=0;j<8;j++)await assert.rejects(()=>identity.login('nobody.k5','WrongPassword#234'),/Unauthorized/);
      await assert.rejects(()=>identity.login('nobody.k5','WrongPassword#234'),/429|Too Many Requests/);
    });
    await check('runtime SQL has no DDL, broad write or other DB access',async()=>{
      const p=await client.query(`SELECT
        HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS ddl,
        HAS_PERMS_BY_NAME('core.Business','OBJECT','UPDATE') AS businessWrite`);
      assert.equal(Number(p.recordset[0].ddl),0);
      assert.equal(Number(p.recordset[0].businessWrite),0);
      await assert.rejects(()=>client.query('SELECT TOP 1 AuditId FROM core.SecurityAudit'),/SELECT permission|permission was denied|229/i);
    });
    await check('password change revokes all sessions and invalidates old password',async()=>{
      const before=await identity.login('owner.alpha',pass1);
      await identity.changePassword(before.token,pass1,'NewReallyStrong#5678');
      await assert.rejects(()=>identity.actorFromToken(before.token),/Unauthorized/);
      await assert.rejects(()=>identity.login('owner.alpha',pass1),/Unauthorized/);
      const fresh=await identity.login('owner.alpha','NewReallyStrong#5678');
      assert.equal((await identity.actorFromToken(fresh.token)).username,'owner.alpha');
    });

    const env={...process.env,DRVO_K5_AUTH_ENABLED:'YES',
      DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',
      DRVO_SQL_DATABASE:db,DRVO_SQL_USER:login,DRVO_SQL_PASSWORD:appPassword,
      DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com',
      API_HOST:'127.0.0.1',API_PORT:'3191',NODE_ENV:'production',
      DRVO_K3_PROOF_ONLY:'NO',
    };
    proc=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
    let output='';proc.stdout.on('data',d=>{output+=d.toString();});
    proc.stderr.on('data',d=>{output+=d.toString();});
    const url='http://127.0.0.1:3191/api';
    try{await ready(url+'/health');}catch(err){throw new Error('API did not start: '+output.slice(-900),{cause:err});}
    await check('HTTP login requires the exact allowed HTTPS Origin',async()=>{
      const r=await post(url+'/auth/login',{username:'owner.alpha',password:'NewReallyStrong#5678'},null,'https://untrusted.example');
      assert.equal(r.status,401);
    });
    let cookie;
    await check('HTTP login issues secure HttpOnly cookie without returning raw token',async()=>{
      const r=await post(url+'/auth/login',{username:'owner.alpha',password:'NewReallyStrong#5678'});
      assert.equal(r.status,200,await r.text());
      cookie=cookieValue(r);
      const me=await fetch(url+'/auth/me',{headers:{Cookie:cookie}});
      assert.equal(me.status,200);
      const json=await me.json();
      assert.equal(json.username,'owner.alpha');
      assert.equal(JSON.stringify(json).includes('passwordHash'),false);
    });
    await check('HTTP workspace enforces Branch role + action',async()=>{
      const own=await fetch(url+'/workspaces/'+b1+'/branches/'+br1,{headers:{Cookie:cookie}});
      assert.equal(own.status,200,await own.text());
      const foreign=await fetch(url+'/workspaces/'+b2+'/branches/'+br2,{headers:{Cookie:cookie}});
      assert.equal(foreign.status,404);
      const noGrant=await fetch(url+'/workspaces/'+b3+'/branches/'+br3,{headers:{Cookie:cookie}});
      assert.equal(noGrant.status,404);
    });
    await check('HTTP logout revokes session and clears cookie',async()=>{
      const r=await post(url+'/auth/logout',{},cookie);
      assert.equal(r.status,200);
      assert.match(r.headers.get('set-cookie')||'',/Max-Age=0/);
      const me=await fetch(url+'/auth/me',{headers:{Cookie:cookie}});
      assert.equal(me.status,401);
    });
    await check('HTTP K3 proof route is not exposed in production',async()=>{
      const r=await fetch(url+'/k3/businesses/'+b1+'/branches/'+br1);
      assert.equal(r.status,401);
    });
    console.log('K5A SQL+HTTP integration PASSED '+count+' checks');
  }finally{
    if(proc){proc.kill('SIGTERM');}
    await client?.close().catch(()=>{});
    await setup?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
run().catch(err=>{
  console.error('K5A disposable SQL/HTTP test FAILED:',err instanceof Error?err.message.slice(0,600):'unknown');
  process.exitCode=1;
});
