'use strict';
// K5B tests run against a disposable SQL Server instance on a GitHub runner.
// Live VPS credentials/SQL never enter this harness.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
const {hashNewPassword}=require('../../apps/api/dist/identity/password.js');
const {IdentityService}=require('../../apps/api/dist/identity/identity.service.js');
const {BranchAccessService}=require('../../apps/api/dist/identity/branch-access.service.js');

assert.equal(process.env.K5B_SQL_DISPOSABLE,'YES');
assert.equal(process.env.K5B_TEST_PORT,'14336');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const db='DRVO_ERP_STAGING';
const appLogin='drvo_k5b_ci_app';
const appPassword='DrvoK5B!'+crypto.randomBytes(24).toString('hex');
const base={server:'127.0.0.1',port:14336,
  user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
  options:{encrypt:true,trustServerCertificate:true},
  pool:{min:0,max:4},requestTimeout:30000,connectionTimeout:5000};
const id=()=>crypto.randomUUID();
const tuple={
  t:id(), t2:id(), b:id(), b2:id(), foreignB:id(),
  br:id(), br2:id(), foreignBr:id(), brOther:id(),
  owner:id(),manager:id(),staff:id(),target:id(),lead:id(), outsider:id(),
  ownerRole:id(), managerRole:id(), staffRole:id(), viewerRole:id(), leadRole:id(),
};
let tests=0;
async function check(desc,fn){
  await fn(); tests++;
  console.log('PASS K5B '+String(tests).padStart(2,'0')+' '+desc);
}
async function rejected(fn,status=404){
  await assert.rejects(fn, e=>typeof e?.getStatus==='function' && e.getStatus()===status);
}
async function open(config){const pool=new sql.ConnectionPool(config);await pool.connect();return pool;}
async function query(pool,text,values={}){
  const req=pool.request();
  for(const [key,value] of Object.entries(values)){
    req.input(key, sql.UniqueIdentifier, value);
  }
  return req.query(text);
}
async function tenant(pool,t,name){
  await pool.request().input('t',sql.UniqueIdentifier,t)
    .input('name',sql.NVarChar(160),name)
    .query('INSERT INTO core.Tenant(TenantId,DisplayName) VALUES(@t,@name)');
}
async function business(pool,t,b,br){
  await query(pool,`INSERT INTO core.Business(TenantId,BusinessId,DisplayName)
     VALUES(@t,@b,N'CI Business');
    INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName)
     VALUES(@t,@b,@br,N'CI Branch')`,{t,b,br});
}
async function extraBranch(pool,t,b,br){
  await query(pool,`INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName)
    VALUES(@t,@b,@br,N'Second Branch')`,{t,b,br});
}
async function account(pool,t,a,username){
  const pwd='CiSecurePass!12345';
  const hash=await hashNewPassword(pwd);
  await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
    .input('username',sql.NVarChar(80),username)
    .query('INSERT INTO core.Account(TenantId,AccountId,Username) VALUES(@t,@a,@username)');
  await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
    .input('salt',sql.VarBinary(32),hash.salt).input('h',sql.VarBinary(64),hash.passwordHash)
    .query(`INSERT INTO core.AccountCredential
      (TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)
      VALUES(@t,@a,@salt,@h,'scrypt-v1',0)`);
  return pwd;
}
async function member(pool,t,b,br,a){
  await query(pool,`INSERT INTO core.BusinessMembership(TenantId,BusinessId,AccountId)
    VALUES(@t,@b,@a);
    INSERT INTO core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId)
    VALUES(@t,@b,@br,@a)`,{t,b,br,a});
}
async function role(pool,t,b,roleId,code,perms){
  await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
    .input('role',sql.UniqueIdentifier,roleId)
    .input('code',sql.NVarChar(60),code)
    .query(`INSERT INTO core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)
      VALUES(@t,@b,@role,@code,@code)`);
  for(const action of perms){
    await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
      .input('role',sql.UniqueIdentifier,roleId)
      .input('action',sql.VarChar(90),action)
      .query(`INSERT INTO core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)
        VALUES(@t,@b,@role,@action)`);
  }
}
async function assign(pool,t,b,br,a,roleId){
  await query(pool,`INSERT INTO core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId)
     VALUES(@t,@b,@br,@a,@role)`,{t,b,br,a,role:roleId});
}
async function grantApp(pool){
  await pool.query(`CREATE USER [${appLogin}] FOR LOGIN [${appLogin}]; GRANT CONNECT TO [${appLogin}]`);
  const tables=[
    'core.Tenant','core.Business','core.Branch','core.Account','core.AccountCredential',
    'core.BusinessMembership','core.BranchAssignment','core.BranchRole','core.BusinessRole',
    'core.RolePermission','core.AuthSession','core.LoginThrottle','core.SchemaMigration',
    'core.BranchRoleChangeAudit',
  ];
  for(const table of tables) await pool.query(`GRANT SELECT ON OBJECT::${table} TO [${appLogin}]`);
  for(const table of ['core.AuthSession','core.LoginThrottle','core.SecurityAudit','core.BranchRole','core.BranchRoleChangeAudit']){
    await pool.query(`GRANT INSERT ON OBJECT::${table} TO [${appLogin}]`);
  }
  await pool.query(`GRANT UPDATE (RevokedAtUtc) ON OBJECT::core.AuthSession TO [${appLogin}]`);
  await pool.query(`GRANT UPDATE (FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO [${appLogin}]`);
  await pool.query(`GRANT UPDATE (SessionVersion) ON OBJECT::core.Account TO [${appLogin}]`);
  await pool.query(`GRANT UPDATE (RoleId, IsActive) ON OBJECT::core.BranchRole TO [${appLogin}]`);
}
async function waitHealth(baseUrl){
  for(let i=0;i<80;i++){
    try{const r=await fetch(baseUrl+'/health');if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('K5B HTTP API failed to start');
}
async function main(){
  let master, admin, app, server;
  for(let n=0;n<45;n++){
    try{master=await open({...base,database:'master'}); await master.query('SELECT 1');break;}
    catch(e){await master?.close().catch(()=>{});if(n===44)throw e;await new Promise(r=>setTimeout(r,3000));}
  }
  try{
    await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
    await master.query(`CREATE LOGIN [${appLogin}] WITH PASSWORD=N'${appPassword}',
      CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    admin=await open({...base,database:db});
    await check('forward-only 001/002/003 migrations and idempotent replay',async()=>{
      assert.deepEqual((await applyMigrations(admin,undefined,3)).map(x=>x.status),
        ['applied','applied','applied']);
      assert.deepEqual((await applyMigrations(admin,undefined,3)).map(x=>x.status),
        ['unchanged','unchanged','unchanged']);
    });
    await grantApp(admin);
    await tenant(admin,tuple.t,'CI Tenant 1');
    await tenant(admin,tuple.t2,'CI Tenant 2');
    await business(admin,tuple.t,tuple.b,tuple.br);
    await extraBranch(admin,tuple.t,tuple.b,tuple.brOther);
    await business(admin,tuple.t,tuple.b2,tuple.br2);
    await business(admin,tuple.t2,tuple.foreignB,tuple.foreignBr);
    const pwd=await account(admin,tuple.t,tuple.owner,'owner.k5b');
    await account(admin,tuple.t,tuple.manager,'manager.k5b');
    await account(admin,tuple.t,tuple.staff,'staff.k5b');
    await account(admin,tuple.t,tuple.target,'target.k5b');
    await account(admin,tuple.t,tuple.lead,'lead.k5b');
    await account(admin,tuple.t2,tuple.outsider,'outside.k5b');
    for(const who of [tuple.owner,tuple.manager,tuple.staff,tuple.target,tuple.lead]){
      await member(admin,tuple.t,tuple.b,tuple.br,who);
    }
    await member(admin,tuple.t2,tuple.foreignB,tuple.foreignBr,tuple.outsider);
    const ownerPerms=['users.read','users.assign_role','branch.read','finance.read'];
    const managerPerms=['users.read','users.assign_role','branch.read'];
    await role(admin,tuple.t,tuple.b,tuple.ownerRole,'OWNER',ownerPerms);
    await role(admin,tuple.t,tuple.b,tuple.managerRole,'MANAGER',managerPerms);
    await role(admin,tuple.t,tuple.b,tuple.staffRole,'STAFF',['branch.read']);
    await role(admin,tuple.t,tuple.b,tuple.viewerRole,'VIEWER',['branch.read']);
    await role(admin,tuple.t,tuple.b,tuple.leadRole,'LEAD',['users.assign_role']);
    for(const [a,r] of [
      [tuple.owner,tuple.ownerRole],[tuple.manager,tuple.managerRole],
      [tuple.staff,tuple.staffRole],[tuple.target,tuple.staffRole],
      [tuple.lead,tuple.leadRole],
    ])await assign(admin,tuple.t,tuple.b,tuple.br,a,r);
    // Tenant 2 roles are isolated even when a request guesses IDs.
    const foreignRole=id();
    await role(admin,tuple.t2,tuple.foreignB,foreignRole,'OWNER',ownerPerms);
    await assign(admin,tuple.t2,tuple.foreignB,tuple.foreignBr,tuple.outsider,foreignRole);
    app=await open({...base,database:db,user:appLogin,password:appPassword});
    const database={getInternalPool:()=>app};
    const identity=new IdentityService(database);
    const access=new BranchAccessService(identity,database);
    process.env.DRVO_K5_AUTH_ENABLED='YES';
    process.env.DRVO_K5_ROLE_ADMIN_ENABLED='YES';

    const owner=await identity.login('owner.k5b',pwd);
    const manager=await identity.login('manager.k5b',pwd);
    const staff=await identity.login('staff.k5b',pwd);
    const lead=await identity.login('lead.k5b',pwd);
    let targetSession=await identity.login('target.k5b',pwd);
    await check('read role catalogue and branch roster only when users.read is granted',async()=>{
      const roles=await access.listRoles(owner.actor,tuple.b,tuple.br);
      assert.equal(roles.length,5);
      const members=await access.listMembers(manager.actor,tuple.b,tuple.br);
      assert.equal(members.length,5);
      await rejected(()=>access.listRoles(staff.actor,tuple.b,tuple.br));
      await rejected(()=>access.listMembers(manager.actor,tuple.b2,tuple.br2));
      await rejected(()=>access.listMembers(manager.actor,tuple.b,tuple.brOther));
    });
    await check('workspace navigation derives only active Branch read permissions',async()=>{
      const ownerWorkspaces=await identity.listAuthorizedWorkspaces(owner.actor);
      assert.equal(ownerWorkspaces.length,1);
      assert.equal(ownerWorkspaces[0].businessId.toLowerCase(),tuple.b);
      assert.equal(ownerWorkspaces[0].branchId.toLowerCase(),tuple.br);
      assert.equal((await identity.listAuthorizedWorkspaces(manager.actor)).length,1);
      assert.equal((await identity.listAuthorizedWorkspaces(lead.actor)).length,0);
    });
    await check('prevent user from granting themselves a role',async()=>{
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.b,tuple.br,
        tuple.manager,tuple.ownerRole,manager.token));
    });
    await check('staff without users.assign_role cannot manage any roles',async()=>{
      await rejected(()=>access.assignExistingMemberRole(staff.actor,tuple.b,tuple.br,
        tuple.target,tuple.viewerRole,staff.token));
    });
    await check('deny Manager elevating target to OWNER',async()=>{
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.b,tuple.br,
        tuple.target,tuple.ownerRole,manager.token));
    });
    await check('deny replacing or demoting an existing OWNER',async()=>{
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.b,tuple.br,
        tuple.owner,tuple.staffRole,manager.token));
    });
    await check('deny delegating permissions actor does not hold',async()=>{
      await rejected(()=>access.assignExistingMemberRole(lead.actor,tuple.b,tuple.br,
        tuple.target,tuple.managerRole,lead.token));
      await rejected(()=>access.assignExistingMemberRole(lead.actor,tuple.b,tuple.br,
        tuple.target,tuple.staffRole,lead.token));
    });
    await check('deny forged target Tenant and foreign Business or Branch',async()=>{
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.foreignB,tuple.foreignBr,
        tuple.outsider,tuple.staffRole,manager.token));
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.b2,tuple.br2,
        tuple.target,tuple.staffRole,manager.token));
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.b,tuple.brOther,
        tuple.target,tuple.staffRole,manager.token));
    });
    await check('deny inactive membership without introducing role side effects',async()=>{
      await query(admin,`UPDATE core.BusinessMembership SET IsActive=0
        WHERE TenantId=@t AND BusinessId=@b AND AccountId=@target`,
        {t:tuple.t,b:tuple.b,target:tuple.target});
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.b,tuple.br,
        tuple.target,tuple.viewerRole,manager.token));
      await query(admin,`UPDATE core.BusinessMembership SET IsActive=1
        WHERE TenantId=@t AND BusinessId=@b AND AccountId=@target`,
        {t:tuple.t,b:tuple.b,target:tuple.target});
    });
    await check('delegated MANAGER can grant VIEWER with atomic audit and target revocation',async()=>{
      const result=await access.assignExistingMemberRole(manager.actor,tuple.b,tuple.br,
        tuple.target,tuple.viewerRole,manager.token);
      assert.equal(result.changed,true);
      assert.match(result.changeId,/^[0-9]+$/);
      const rows=await query(admin,`SELECT RoleId FROM core.BranchRole
        WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND AccountId=@a`,
        {t:tuple.t,b:tuple.b,br:tuple.br,a:tuple.target});
      assert.equal(String(rows.recordset[0].RoleId).toLowerCase(),tuple.viewerRole);
      await rejected(()=>identity.actorFromToken(targetSession.token),401);
      const audits=await query(admin,`SELECT ActorAccountId,TargetAccountId,OldRoleId,NewRoleId
        FROM core.BranchRoleChangeAudit WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br`,
        {t:tuple.t,b:tuple.b,br:tuple.br});
      assert.equal(audits.recordset.length,1);
      assert.equal(String(audits.recordset[0].ActorAccountId).toLowerCase(),tuple.manager);
      assert.equal(String(audits.recordset[0].TargetAccountId).toLowerCase(),tuple.target);
      assert.equal(String(audits.recordset[0].NewRoleId).toLowerCase(),tuple.viewerRole);
    });
    await check('no-op role update does not write a second audit or revoke session',async()=>{
      targetSession=await identity.login('target.k5b',pwd);
      const result=await access.assignExistingMemberRole(manager.actor,tuple.b,tuple.br,
        tuple.target,tuple.viewerRole,manager.token);
      assert.equal(result.changed,false);
      assert.equal(result.changeId,null);
      assert.equal((await identity.actorFromToken(targetSession.token)).username,'target.k5b');
      const count=await admin.query('SELECT COUNT(*) AS n FROM core.BranchRoleChangeAudit');
      assert.equal(count.recordset[0].n,1);
    });
    await check('role removal is effective immediately before next protected request',async()=>{
      await query(admin,`DELETE FROM core.RolePermission WHERE TenantId=@t AND BusinessId=@b
        AND RoleId=@role AND ActionCode='users.assign_role'`,
        {t:tuple.t,b:tuple.b,role:tuple.managerRole});
      await rejected(()=>access.assignExistingMemberRole(manager.actor,tuple.b,tuple.br,
        tuple.target,tuple.staffRole,manager.token));
    });
    await check('app principal cannot change role definitions or tenant accounts',async()=>{
      const permissions=await app.query(`SELECT
        HAS_PERMS_BY_NAME('core.BusinessRole','OBJECT','INSERT') AS createRole,
        HAS_PERMS_BY_NAME('core.RolePermission','OBJECT','INSERT') AS createPermission,
        HAS_PERMS_BY_NAME('core.Account','OBJECT','INSERT') AS createAccount,
        HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS ddl`);
      for(const p of Object.values(permissions.recordset[0])){
        assert.equal(Number(p),0);
      }
    });
    const url='http://127.0.0.1:3192/api';
    const env={
      ...process.env,DRVO_K5_AUTH_ENABLED:'YES',DRVO_K5_ROLE_ADMIN_ENABLED:'YES',
      DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com',DRVO_SQL_ENABLED:'YES',
      DRVO_SQL_HOST:'127.0.0.1',DRVO_SQL_PORT:'1433',DRVO_SQL_DATABASE:db,
      DRVO_SQL_USER:appLogin,DRVO_SQL_PASSWORD:appPassword,
      NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3192',
    };
    server=spawn(process.execPath,['apps/api/dist/main.js'],{env,stdio:['ignore','pipe','pipe']});
    let serverLogs='';server.stdout.on('data',d=>{serverLogs+=d.toString()});
    server.stderr.on('data',d=>{serverLogs+=d.toString()});
    try{await waitHealth(url);}catch(e){throw new Error('K5B Nest start failure: '+serverLogs.slice(-250),{cause:e});}
    const loginResponse=await fetch(url+'/auth/login',{
      method:'POST',
      headers:{Origin:'https://erp-stage.drvotech.com','Content-Type':'application/json'},
      body:JSON.stringify({username:'owner.k5b',password:pwd}),
    });
    assert.equal(loginResponse.status,200);
    const cookie=loginResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    await check('HTTP branch access refuses missing session, wrong Tenant/Branch and extra body fields',async()=>{
      const api=url+'/workspaces/'+tuple.b+'/branches/'+tuple.br+'/access';
      const available=await fetch(url+'/auth/workspaces',{headers:{Cookie:cookie}});
      assert.equal(available.status,200);
      const availableData=await available.json();
      assert.equal(availableData.workspaces.length,1);
      assert.equal(availableData.workspaces[0].businessId.toLowerCase(),tuple.b);
      const noCookie=await fetch(api+'/members');
      assert.equal(noCookie.status,401);
      const members=await fetch(api+'/members',{headers:{Cookie:cookie}});
      assert.equal(members.status,200);
      assert.equal((await members.json()).members.length,5);
      const other=await fetch(url+'/workspaces/'+tuple.b2+'/branches/'+tuple.br2+'/access/roles',
        {headers:{Cookie:cookie}});
      assert.equal(other.status,404);
      const invalid=await fetch(api+'/members/'+tuple.staff+'/role',{
        method:'POST',headers:{Cookie:cookie,Origin:'https://erp-stage.drvotech.com',
          'Content-Type':'application/json'},
        body:JSON.stringify({roleId:tuple.viewerRole,tenantId:tuple.t2}),
      });
      assert.equal(invalid.status,401);
      const badOrigin=await fetch(api+'/members/'+tuple.staff+'/role',{
        method:'POST',headers:{Cookie:cookie,Origin:'https://evil.example',
          'Content-Type':'application/json'},body:JSON.stringify({roleId:tuple.viewerRole}),
      });
      assert.equal(badOrigin.status,401);
    });
    await check('HTTP real authorized mutation then disabled-by-default feature',async()=>{
      const path=url+'/workspaces/'+tuple.b+'/branches/'+tuple.br+
        '/access/members/'+tuple.staff+'/role';
      const result=await fetch(path,{
        method:'POST',headers:{Cookie:cookie,Origin:'https://erp-stage.drvotech.com',
          'Content-Type':'application/json'},body:JSON.stringify({roleId:tuple.viewerRole}),
      });
      assert.equal(result.status,200);
      assert.equal((await result.json()).changed,true);
      // A fresh independent service is OFF unless BOTH feature flags are YES.
      delete process.env.DRVO_K5_ROLE_ADMIN_ENABLED;
      await rejected(()=>access.listRoles(owner.actor,tuple.b,tuple.br),503);
    });
    console.log('K5B DISPOSABLE SQL + HTTP RBAC E2E PASS: '+tests+' checks');
  } finally {
    server?.kill('SIGTERM');
    await app?.close().catch(()=>{});
    await admin?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
main().catch(err=>{
  console.error('K5B verification FAILED:',err instanceof Error?err.message.slice(0,550):'unknown');
  process.exitCode=1;
});
