'use strict';
// K3 test harness: boot real NestJS API against disposable SQL Server.
// Only local ephemeral CI, never authorizes production/retains customer data.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const sql = require('../../apps/api/node_modules/mssql');
const jwt = require('../../apps/api/node_modules/jsonwebtoken');

const baseUrl = 'http://127.0.0.1:3111';
const ids = {
  t1: crypto.randomUUID(), t2: crypto.randomUUID(),
  b1: crypto.randomUUID(), b2: crypto.randomUUID(), b3: crypto.randomUUID(),
  br1: crypto.randomUUID(), br2: crypto.randomUUID(), br3: crypto.randomUUID(), br4: crypto.randomUUID(),
  a1: crypto.randomUUID(), a2: crypto.randomUUID(), a3: crypto.randomUUID(),
};
const secret = process.env.K3_TEST_SECRET;
const sqlPassword = process.env.SQL_TEST_SA_PASSWORD;
assert.equal(process.env.DRVO_SQL_SPIKE_DISPOSABLE, 'YES', 'K3 requires explicit disposable mode');
assert.ok(secret && Buffer.byteLength(secret) >= 48, 'Generated ephemeral JWT secret missing');
assert.ok(sqlPassword && sqlPassword.length >= 12, 'Generated disposable SA password missing');

const config = {
  server: '127.0.0.1',
  port: 14333,
  user: 'sa',
  password: sqlPassword,
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 3000,
  requestTimeout: 30000,
  pool: { min: 0, max: 4 },
};

async function connect(db) {
  const pool = new sql.ConnectionPool({ ...config, database: db });
  await pool.connect();
  return pool;
}
async function waitForSql() {
  for (let i = 0; i < 50; i++) {
    try { return await connect('master'); }
    catch (e) {
      if (i === 49) throw e;
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
  throw new Error('SQL readiness timeout');
}
async function insert(pool, table, record) {
  // Only trusted hard-coded table and field names supplied below.
  const columns = Object.keys(record);
  const req = pool.request();
  for (const [index, column] of columns.entries()) {
    const value = record[column];
    const type = column.endsWith('Id') ? sql.UniqueIdentifier
      : column === 'IsActive' ? sql.Bit
      : column === 'SessionVersion' ? sql.Int
      : sql.NVarChar(80);
    req.input('p'+index, type, value);
  }
  const fields = columns.map(k => '['+k+']').join(',');
  const placeholders = columns.map((_,i) => '@p'+i).join(',');
  await req.query('INSERT INTO dbo.['+table+']('+fields+') VALUES ('+placeholders+')');
}
async function seed(pool) {
  for (const [t, name] of [[ids.t1,'Tenant A'],[ids.t2,'Tenant B']])
    await insert(pool,'K3_Tenants',{TenantId:t,DisplayName:name});
  for (const [t,b,name] of [[ids.t1,ids.b1,'Salon A'],[ids.t1,ids.b3,'Retail A'],[ids.t2,ids.b2,'Salon B']])
    await insert(pool,'K3_Businesses',{TenantId:t,BusinessId:b,DisplayName:name});
  for (const [t,b,br,name] of [
    [ids.t1,ids.b1,ids.br1,'A One'],[ids.t1,ids.b1,ids.br2,'A Two'],
    [ids.t1,ids.b3,ids.br3,'Other Business'],[ids.t2,ids.b2,ids.br4,'Other Tenant']
  ]) await insert(pool,'K3_Branches',{TenantId:t,BusinessId:b,BranchId:br,DisplayName:name});
  for (const [t,a,name] of [[ids.t1,ids.a1,'test_a1'],[ids.t1,ids.a2,'test_a2'],[ids.t2,ids.a3,'test_b1']])
    await insert(pool,'K3_Accounts',{TenantId:t,AccountId:a,Username:name,IsActive:true,SessionVersion:1});
  for (const [t,b,a] of [[ids.t1,ids.b1,ids.a1],[ids.t1,ids.b3,ids.a2],[ids.t2,ids.b2,ids.a3]])
    await insert(pool,'K3_BusinessMemberships',{TenantId:t,BusinessId:b,AccountId:a,IsActive:true});
  await insert(pool,'K3_RolePermissions',{RoleCode:'CASHIER',ActionCode:'branch.read'});
  for (const [t,b,br,a] of [
    [ids.t1,ids.b1,ids.br1,ids.a1],
    [ids.t1,ids.b3,ids.br3,ids.a2],
    [ids.t2,ids.b2,ids.br4,ids.a3],
  ]) await insert(pool,'K3_BranchRoles',{TenantId:t,BusinessId:b,BranchId:br,AccountId:a,RoleCode:'CASHIER',IsActive:true});
}
function token(subject, extra={}) {
  return jwt.sign(extra, secret, {algorithm:'HS256', issuer:'drvo-k3-test-only',
    audience:'drvo-kernel-proof',subject,expiresIn:'3m'});
}
async function request(branchBusiness, branch, bearer, headers={}) {
  const url = baseUrl+'/api/k3/businesses/'+branchBusiness+'/branches/'+branch;
  const response = await fetch(url, {headers:{
    ...(bearer ? { Authorization:'Bearer '+bearer } : {}), ...headers
  }});
  return {status:response.status, body:await response.json()};
}
async function set(pool, table, assignment, accountId) {
  await pool.request().input('account',sql.UniqueIdentifier,accountId).query(
    'UPDATE dbo.'+table+' SET '+assignment+' WHERE AccountId=@account'
  );
}
function report(condition, label) {
  assert.ok(condition, label);
  console.log('PASS K3 '+label);
}
async function waitForHttp(child) {
  for (let i=0;i<50;i++) {
    if(child.exitCode !== null) throw new Error('API exited before starting: '+child.exitCode);
    try {
      const resp=await fetch(baseUrl+'/api/health');
      if(resp.status===200) return;
    } catch {}
    await new Promise(resolve=>setTimeout(resolve,350));
  }
  throw new Error('K3 NestJS API startup timeout');
}
async function run() {
  const admin=await waitForSql();
  let pool, child;
  try {
    await admin.query("IF DB_ID(N'DrvoK3Proof') IS NULL CREATE DATABASE [DrvoK3Proof]");
    pool=await connect('DrvoK3Proof');
    const schema=fs.readFileSync(path.join(__dirname,'001-authorization-proof.sql'),'utf8');
    await pool.request().batch(schema);
    await seed(pool);

    child=spawn(process.execPath,['dist/main.js'],{
      cwd:path.resolve(__dirname,'../../apps/api'),
      env:{
        ...process.env, NODE_ENV:'test', DRVO_K3_PROOF_ONLY:'YES',
        K3_DEV_JWT_SECRET:secret, API_PORT:'3111', API_HOST:'127.0.0.1',
        DRVO_K3_SQL_HOST:'127.0.0.1',DRVO_K3_SQL_PORT:'14333',
        DRVO_K3_SQL_DATABASE:'DrvoK3Proof',DRVO_K3_SQL_USER:'sa',
        DRVO_K3_SQL_PASSWORD:sqlPassword,
      },
      stdio:['ignore','pipe','pipe'],
    });
    let apiOutput='';
    child.stdout.on('data',b=>{apiOutput+=String(b).slice(0,6000)});
    child.stderr.on('data',b=>{apiOutput+=String(b).slice(0,6000)});
    try {
      await waitForHttp(child);
      const valid=token(ids.a1,{sv:1});
      const own=await request(ids.b1,ids.br1,valid);
      report(own.status===200 && own.body.branchName==='A One' && own.body.tenantId.toLowerCase()===ids.t1.toLowerCase(),
        '01 signed actor plus live membership/role allows own Branch');
      report((await request(ids.b1,ids.br1)).status===401,'02 no bearer token rejected');
      report((await request(ids.b1,ids.br1,valid+'X')).status===401,'03 tampered token rejected');
      report((await request(ids.b2,ids.br4,valid)).status===404,'04 cross-Tenant branch inaccessible');
      report((await request(ids.b3,ids.br3,valid)).status===404,'05 same Tenant other Business without membership inaccessible');
      report((await request(ids.b1,ids.br2,valid)).status===404,'06 same Business but unassigned Branch inaccessible');
      report((await request(ids.b1,ids.br1,token(ids.a3,{sv:1}))).status===404,'07 other Tenant user cannot read Branch A');
      const forged=await request(ids.b1,ids.br1,token(ids.a1,{sv:1,tenantId:ids.t2,businessId:ids.b2}),{'x-tenant-id':ids.t2});
      report(forged.status===200 && forged.body.tenantId.toLowerCase()===ids.t1.toLowerCase(),
        '08 spoofed client/token Tenant and Business IDs do not expand or change DB-derived scope');
      await set(pool,'K3_BusinessMemberships','IsActive=0',ids.a1);
      report((await request(ids.b1,ids.br1,valid)).status===404,'09 Business membership revoked on next HTTP request');
      await set(pool,'K3_BusinessMemberships','IsActive=1',ids.a1);
      await set(pool,'K3_BranchRoles','IsActive=0',ids.a1);
      report((await request(ids.b1,ids.br1,valid)).status===404,'10 Branch Role revoked on next HTTP request');
      await set(pool,'K3_BranchRoles','IsActive=1',ids.a1);
      await set(pool,'K3_Accounts','IsActive=0',ids.a1);
      report((await request(ids.b1,ids.br1,valid)).status===404,'11 Disabled account denied');
      await set(pool,'K3_Accounts','IsActive=1, SessionVersion=SessionVersion+1',ids.a1);
      report((await request(ids.b1,ids.br1,valid)).status===404,'12 Old session revision is denied');
      report((await request(ids.b1,ids.br1,token(ids.a1,{sv:2}))).status===200,'13 Current session revision restores properly authorized scope');

      const invalid=await request(ids.b1,'bad-branch-id',token(ids.a1,{sv:2}));
      report(invalid.status===404,'14 malformed resource identifier fails closed');
      await assert.rejects(
        insert(pool,'K3_BusinessMemberships',{TenantId:ids.t1,BusinessId:ids.b1,AccountId:ids.a3,IsActive:true}),
        e=>/547|FOREIGN KEY|conflicted/i.test(String(e.message||'')),
      );
      report(true,'15 composite SQL FK rejects cross-Tenant account membership');
    } catch(e) {
      console.error('NestJS output:',apiOutput.slice(-3000));
      throw e;
    }
  } finally {
    if (child) {
      child.kill('SIGTERM');
      await new Promise(resolve => {if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,3000)});
      if(child.exitCode===null)child.kill('SIGKILL');
    }
    if(pool)await pool.close();
    await admin.close();
  }
  console.log('K3 SQL + authenticated-request PROOF PASSED; NOT production-ready authentication');
}
run().catch(err=>{console.error('K3 PROOF FAILED:',err.stack||err.message);process.exitCode=1});
