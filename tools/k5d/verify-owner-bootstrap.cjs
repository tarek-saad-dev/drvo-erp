'use strict';
// Disposable SQL Server integration: never touches an actual VPS/database.
// Tests one complete transaction for approved Owner, including replay/rollback.
const assert = require('node:assert/strict');
const {randomBytes,randomUUID} = require('node:crypto');
const sql = require('../../apps/api/node_modules/mssql');
const {applyMigrations} = require('../k4-db/migrate.cjs');
const {claimApprovedOwner} = require('../../apps/api/dist/identity/owner-bootstrap.js');
const {IdentityService} = require('../../apps/api/dist/identity/identity.service.js');
const {
  generateOpaqueVerificationToken,verificationEmailDigest,verificationTokenDigest,
} = require('../../apps/api/dist/identity/verification-crypto.js');

assert.equal(process.env.K5D_SQL_DISPOSABLE,'YES');
assert.equal(process.env.K5D_TEST_PORT,'14338');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);

const key = Buffer.from('93'.repeat(32),'hex');
const env = {
  ...process.env,
  DRVO_K5_OWNER_BOOTSTRAP_ENABLED:'YES',
  DRVO_K5_AUTH_ENABLED:'YES',
  DRVO_K5_VERIFICATION_HMAC_KEY:key.toString('hex'),
};
const DB = 'DrvoK5DOwnerCi';
const base={server:'127.0.0.1',port:14338,user:'sa',
  password:process.env.SQL_TEST_SA_PASSWORD,
  options:{encrypt:true,trustServerCertificate:true},connectionTimeout:5000,
  requestTimeout:60000,pool:{min:0,max:5}};
const open=async(database,user='sa',password=base.password)=>{
  const p=new sql.ConnectionPool({...base,database,user,password});
  await p.connect(); return p;
};
const bad=async(f)=>assert.rejects(f);
const username=i=>'owner.'+i;
const email=i=>'owner.'+i+'@example.test';
const samplePassword='Long Unique Password 2026!!';

async function issue(pool, label, opts={}) {
  const address=email(label);
  const token=generateOpaqueVerificationToken();
  const purpose=opts.purpose??'OWNER_BOOTSTRAP';
  const hash=verificationEmailDigest(address,key);
  const tokenHash=verificationTokenDigest(token,purpose,key);
  const approvalId=randomUUID(),challengeId=randomUUID();
  await pool.request()
    .input('approval',sql.UniqueIdentifier,approvalId)
    .input('name',sql.NVarChar(80),opts.username||username(label))
    .input('hash',sql.Char(64),hash)
    .input('revoked',sql.Bit,opts.revoked?1:0)
    .input('pre',sql.Bit,opts.preApproval?1:0)
    .query(`
      INSERT INTO core.OwnerBootstrapApproval
       (ApprovalId,ApprovedUsername,ApprovedEmailHash,TenantDisplayName,
        BusinessDisplayName,BranchDisplayName,ApprovedAtUtc,ExpiresAtUtc,RevokedAtUtc)
      VALUES(@approval,@name,@hash,N'Test Tenant',N'Test Business',N'Gleem',
        CASE WHEN @pre=1 THEN DATEADD(MINUTE,1,SYSUTCDATETIME())
          ELSE DATEADD(MINUTE,-10,SYSUTCDATETIME()) END,
        DATEADD(DAY,1,SYSUTCDATETIME()),
        CASE WHEN @revoked=1 THEN SYSUTCDATETIME() ELSE NULL END)
    `);
  await pool.request()
    .input('challenge',sql.UniqueIdentifier,challengeId)
    .input('hash',sql.Char(64),hash)
    .input('tokenHash',sql.Char(64),tokenHash)
    .input('purpose',sql.VarChar(24),purpose)
    .input('expired',sql.Bit,opts.expired?1:0)
    .query(`
      INSERT INTO core.EmailVerificationChallenge
       (ChallengeId,EmailHash,TokenHash,Purpose,CreatedAtUtc,ExpiresAtUtc)
      VALUES(@challenge,@hash,@tokenHash,@purpose,
        CASE WHEN @expired=1 THEN DATEADD(HOUR,-2,SYSUTCDATETIME())
          ELSE SYSUTCDATETIME() END,
        CASE WHEN @expired=1 THEN DATEADD(HOUR,-1,SYSUTCDATETIME())
          ELSE DATEADD(HOUR,1,SYSUTCDATETIME()) END)
    `);
  return { email:address, token, newPassword:samplePassword,hash,approvalId,challengeId };
}

async function snapshot(db) {
  const r=await db.query(`SELECT
    (SELECT COUNT(*) FROM core.Tenant) t,
    (SELECT COUNT(*) FROM core.Business) b,
    (SELECT COUNT(*) FROM core.Branch) br,
    (SELECT COUNT(*) FROM core.Account) a,
    (SELECT COUNT(*) FROM core.AccountCredential) cr,
    (SELECT COUNT(*) FROM core.BusinessMembership) bm,
    (SELECT COUNT(*) FROM core.BranchAssignment) ba,
    (SELECT COUNT(*) FROM core.BranchRole) ar,
    (SELECT COUNT(*) FROM core.VerifiedAccountEmail) ve,
    (SELECT COUNT(*) FROM core.SecurityAudit WHERE EventCode='owner.bootstrap') audit`);
  return r.recordset[0];
}

async function run() {
  let master,db,restricted;
  for(let i=0;i<45;i++) {
    try { master=await open('master'); break; }
    catch(err){await master?.close().catch(()=>{});
      if(i===44)throw err;
      await new Promise(r=>setTimeout(r,2500));}
  }
  try {
    await master.query('CREATE DATABASE ['+DB+']');
    db=await open(DB);
    assert.deepEqual((await applyMigrations(db)).map(x=>x.status),
      ['applied','applied','applied','applied']);
    assert.deepEqual((await applyMigrations(db)).map(x=>x.status),
      ['unchanged','unchanged','unchanged','unchanged']);

    const noDb={ getInternalPool(){throw Error('unreachable')} };
    await bad(()=>claimApprovedOwner(db,{email:'none@example.test',token:'A'.repeat(43),
      newPassword:samplePassword},{...env,DRVO_K5_OWNER_BOOTSTRAP_ENABLED:'NO'}));
    await bad(()=>claimApprovedOwner(db,{email:'none@example.test',token:'A'.repeat(43),
      newPassword:samplePassword},{...env,DRVO_K5_VERIFICATION_HMAC_KEY:''}));
    await bad(()=>claimApprovedOwner(db,{email:'none@example.test',token:'invalid',
      newPassword:samplePassword},env));
    await bad(()=>claimApprovedOwner(db,{email:'none@example.test',token:'A'.repeat(43),
      newPassword:'short'},env));
    assert.equal((await snapshot(db)).t,0);
    console.log('PASS: no anonymous/invalid Owner provision when gates or secrets fail');

    const primary=await issue(db,'main');
    const record=await claimApprovedOwner(db,primary,env);
    for(const field of ['tenantId','businessId','branchId','accountId'])
      assert.match(record[field],/^[0-9a-f-]{36}$/i);
    let counts=await snapshot(db);
    for(const field of ['t','b','br','a','cr','bm','ba','ar','ve','audit']) {
      assert.equal(counts[field],1,field+' must be atomic');
    }
    const roleCheck=await db.request()
      .input('t',sql.UniqueIdentifier,record.tenantId)
      .input('b',sql.UniqueIdentifier,record.businessId)
      .input('br',sql.UniqueIdentifier,record.branchId)
      .input('a',sql.UniqueIdentifier,record.accountId)
      .input('challenge',sql.UniqueIdentifier,primary.challengeId)
      .input('approval',sql.UniqueIdentifier,primary.approvalId)
      .query(`
        SELECT (SELECT COUNT(*) FROM core.BusinessRole
          WHERE TenantId=@t AND BusinessId=@b) roles,
         (SELECT COUNT(*) FROM core.RolePermission
          WHERE TenantId=@t AND BusinessId=@b) permissions,
         (SELECT r.RoleCode FROM core.BranchRole ar
            JOIN core.BusinessRole r ON r.TenantId=ar.TenantId
              AND r.BusinessId=ar.BusinessId AND r.RoleId=ar.RoleId
            WHERE ar.TenantId=@t AND ar.BusinessId=@b
              AND ar.BranchId=@br AND ar.AccountId=@a) assigned,
         (SELECT COUNT(*) FROM core.EmailVerificationChallenge
           WHERE ChallengeId=@challenge AND ConsumedAtUtc IS NOT NULL) used,
         (SELECT COUNT(*) FROM core.OwnerBootstrapApproval
           WHERE ApprovalId=@approval AND ConsumedAtUtc IS NOT NULL
             AND ConsumedAccountId=@a AND ConsumedTenantId=@t) approved
      `);
    assert.equal(roleCheck.recordset[0].roles,4);
    assert.equal(roleCheck.recordset[0].permissions,7);
    assert.equal(roleCheck.recordset[0].assigned,'OWNER');
    assert.equal(roleCheck.recordset[0].used,1);
    assert.equal(roleCheck.recordset[0].approved,1);
    const identity=new IdentityService({getInternalPool:()=>db});
    const prevAuth=process.env.DRVO_K5_AUTH_ENABLED;
    process.env.DRVO_K5_AUTH_ENABLED='YES';
    try {
      const login=await identity.login(username('main'),samplePassword);
      const scopes=await identity.listAuthorizedWorkspaces(login.actor);
      assert.equal(scopes.length,1);
      assert.equal(scopes[0].branchId.toLowerCase(),record.branchId.toLowerCase());
      assert.equal(login.actor.mustChangePassword,false);
    }finally{
      if(prevAuth===undefined)delete process.env.DRVO_K5_AUTH_ENABLED;
      else process.env.DRVO_K5_AUTH_ENABLED=prevAuth;
    }
    console.log('PASS: approved Owner, four scoped roles, audit and working identity login');

    await bad(()=>claimApprovedOwner(db,primary,env));
    assert.deepEqual(await snapshot(db),counts);
    console.log('PASS: replayed one-time token cannot create a second Owner');

    for(const [label,opts] of [
      ['expired',{expired:true}],['revoked',{revoked:true}],
      ['preapproval',{preApproval:true}],['purpose',{purpose:'ACCOUNT_INVITE'}],
    ]){
      const input=await issue(db,label,opts);
      const before=await snapshot(db);
      await bad(()=>claimApprovedOwner(db,input,env));
      assert.deepEqual(await snapshot(db),before,label+' did not roll back');
    }
    const mismatch=await issue(db,'mismatch');
    const beforeMismatch=await snapshot(db);
    await bad(()=>claimApprovedOwner(db,{...mismatch,email:'different@example.test'},env));
    assert.deepEqual(await snapshot(db),beforeMismatch);
    console.log('PASS: revoked, expired, old, wrong-purpose and wrong-email proofs denied');

    const collision=await issue(db,'collision',{username:username('main')});
    const preCollision=await snapshot(db);
    await bad(()=>claimApprovedOwner(db,collision,env));
    assert.deepEqual(await snapshot(db),preCollision);
    const untouched=await db.request()
      .input('challenge',sql.UniqueIdentifier,collision.challengeId)
      .input('approval',sql.UniqueIdentifier,collision.approvalId)
      .query(`SELECT
        (SELECT COUNT(*) FROM core.EmailVerificationChallenge
           WHERE ChallengeId=@challenge AND ConsumedAtUtc IS NULL) challenge,
        (SELECT COUNT(*) FROM core.OwnerBootstrapApproval
           WHERE ApprovalId=@approval AND ConsumedAtUtc IS NULL) approval`);
    assert.equal(untouched.recordset[0].challenge,1);
    assert.equal(untouched.recordset[0].approval,1);
    console.log('PASS: SQL username collision rolls back all rows, token and approval');

    const concurrent=await issue(db,'concurrent');
    const both=await Promise.allSettled([
      claimApprovedOwner(db,concurrent,env),claimApprovedOwner(db,concurrent,env),
    ]);
    assert.equal(both.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(both.filter(x=>x.status==='rejected').length,1);
    assert.equal((await snapshot(db)).a,2);
    console.log('PASS: competing redemption creates one and only one Owner');

    const login='k5d_claim_ci_app';
    const pass='K5Dci_'+randomBytes(24).toString('hex')+'!';
    await master.query(`CREATE LOGIN [k5d_claim_ci_app]
      WITH PASSWORD=N'${pass}',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    await db.query(`CREATE USER [k5d_claim_ci_app]
      FOR LOGIN [k5d_claim_ci_app];GRANT CONNECT TO [k5d_claim_ci_app]`);
    restricted=await open(DB,login,pass);
    const locked=await issue(db,'restricted');
    const beforeRestricted=await snapshot(db);
    await bad(()=>claimApprovedOwner(restricted,locked,env));
    assert.deepEqual(await snapshot(db),beforeRestricted);
    console.log('PASS: normal application SQL principal cannot bypass approval grants');

    console.log('K5D ATOMIC OWNER CLAIM DISPOSABLE SQL: PASS');
  }finally {
    await restricted?.close().catch(()=>{});
    await db?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
run().catch(e=>{console.error('K5D Owner claim disposable test FAILED:',
  String(e?.message||'unknown').slice(0,320));process.exitCode=1});
