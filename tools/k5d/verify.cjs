'use strict';
// Real SQL Server 2022 throwaway DB only. No app/VPS credential reuse.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');
assert.equal(process.env.K5D_SQL_DISPOSABLE,'YES');
assert.equal(process.env.K5D_TEST_PORT,'14338');
assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
const uid=()=>crypto.randomUUID();
const hex=x=>crypto.createHash('sha256').update(x).digest('hex');
const sa=process.env.SQL_TEST_SA_PASSWORD;
const base={server:'127.0.0.1',port:14338,user:'sa',password:sa,
  options:{encrypt:true,trustServerCertificate:true},connectionTimeout:5000,
  requestTimeout:60000,pool:{min:0,max:3}};
async function open(db,user='sa',password=sa){
  const p=new sql.ConnectionPool({...base,database:db,user,password});
  await p.connect();return p;
}
async function insert(pool,statement,parameters){
  const req=pool.request();
  for(const [key,value] of Object.entries(parameters)){
    req.input(key,key==='t'||key==='a'||key==='b'||key==='br'||
      key==='role'||key==='issuer'||key==='id' ? sql.UniqueIdentifier :
      sql.NVarChar(160),value);
  }
  return req.query(statement);
}
async function blocked(run){await assert.rejects(run);}
async function run(){
  let master,db,app;
  for(let i=0;i<45;i++){
    try{master=await open('master');break;}
    catch(e){await master?.close().catch(()=>{});if(i===44)throw e;
      await new Promise(r=>setTimeout(r,2500));}
  }
  try {
    await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
    db=await open('DRVO_ERP_STAGING');
    assert.deepEqual((await applyMigrations(db,undefined,4)).map(x=>x.status),
      ['applied','applied','applied','applied']);
    assert.deepEqual((await applyMigrations(db,undefined,4)).map(x=>x.status),
      ['unchanged','unchanged','unchanged','unchanged']);
    console.log('PASS: forward-only 001-004 apply and checksum replay');

    const counts=await db.query(`SELECT
      (SELECT COUNT(*) FROM core.OwnerBootstrapApproval) AS Approval,
      (SELECT COUNT(*) FROM core.EmailVerificationChallenge) AS Challenge,
      (SELECT COUNT(*) FROM core.VerifiedAccountEmail) AS Verified,
      (SELECT COUNT(*) FROM core.AccountInvitation) AS Invite`);
    assert.deepEqual(Object.values(counts.recordset[0]).map(Number),[0,0,0,0]);
    console.log('PASS: four onboarding tables have no seeds or implicit owner');

    const email=hex('owner@example.test'),id=uid();
    const approval=`INSERT INTO core.OwnerBootstrapApproval
      (ApprovalId,ApprovedUsername,ApprovedEmailHash,
       TenantDisplayName,BusinessDisplayName,BranchDisplayName,ExpiresAtUtc)
      VALUES(@id,N'owner.ci',@email,N'Tenant',N'Business',N'Branch',
       DATEADD(DAY,1,SYSUTCDATETIME()))`;
    await insert(db,approval,{id,email});
    await blocked(()=>insert(db,approval,{id:uid(),email}));
    await blocked(()=>insert(db,approval.replace('DATEADD(DAY,1','DATEADD(DAY,-1'),
      {id:uid(),email:hex('expired@example.test')}));
    console.log('PASS: only one active approval per email; expired approvals rejected');

    const challenge=`INSERT INTO core.EmailVerificationChallenge
      (ChallengeId,EmailHash,TokenHash,Purpose,ExpiresAtUtc)
      VALUES(@id,@email,@token,'OWNER_BOOTSTRAP',
        DATEADD(MINUTE,10,SYSUTCDATETIME()))`;
    await insert(db,challenge,{id:uid(),email,token:hex('token-1')});
    await blocked(()=>insert(db,challenge,{id:uid(),email,token:hex('token-1')}));
    await blocked(()=>insert(db,challenge.replace("'OWNER_BOOTSTRAP'","'ANY_PURPOSE'"),
      {id:uid(),email,token:hex('token-2')}));
    console.log('PASS: verification tokens unique and purpose-bound');

    const t=uid(),a=uid(),otherT=uid(),otherA=uid(),b=uid(),br=uid(),role=uid();
    await insert(db,`INSERT INTO core.Tenant(TenantId,DisplayName) VALUES(@t,N'Tenant')`,{t});
    await insert(db,`INSERT INTO core.Tenant(TenantId,DisplayName) VALUES(@t,N'Other')`,{t:otherT});
    await insert(db,`INSERT INTO core.Account(TenantId,AccountId,Username)
      VALUES(@t,@a,N'k5d.issuer')`,{t,a});
    await insert(db,`INSERT INTO core.Account(TenantId,AccountId,Username)
      VALUES(@t,@a,N'k5d.other')`,{t:otherT,a:otherA});
    await insert(db,`
      INSERT INTO core.Business(TenantId,BusinessId,DisplayName) VALUES(@t,@b,N'Business');
      INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName)
        VALUES(@t,@b,@br,N'Branch');
      INSERT INTO core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)
        VALUES(@t,@b,@role,N'STAFF',N'Staff');
    `,{t,b,br,role});
    const invite=`INSERT INTO core.AccountInvitation
      (InvitationId,TenantId,BusinessId,BranchId,IssuerAccountId,
       InvitedEmailHash,TokenHash,IntendedRoleId,ExpiresAtUtc)
      VALUES(@id,@t,@b,@br,@issuer,@email,@token,@role,
        DATEADD(DAY,1,SYSUTCDATETIME()))`;
    const params={id:uid(),t,b,br,issuer:a,email:hex('invite@example.test'),
      token:hex('invite-token'),role};
    await insert(db,invite,params);
    await blocked(()=>insert(db,invite,{...params,id:uid()}));
    await blocked(()=>insert(db,invite,{...params,id:uid(),issuer:otherA,
      token:hex('foreign')}));
    console.log('PASS: invite tokens unique, cross-tenant issuer rejected');
    await insert(db,`INSERT INTO core.VerifiedAccountEmail(TenantId,AccountId,EmailHash)
      VALUES(@t,@a,@email)`,{t,a,email});
    await blocked(()=>insert(db,`INSERT INTO core.VerifiedAccountEmail
      (TenantId,AccountId,EmailHash) VALUES(@t,@a,@email)`,
      {t:otherT,a:otherA,email}));
    console.log('PASS: verified email unique across tenants');

    const login='k5d_ci_app',pass='K5DDb_'+crypto.randomBytes(24).toString('hex')+'!';
    await master.query(`CREATE LOGIN [k5d_ci_app] WITH PASSWORD=N'${pass}',
      CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    await db.query('CREATE USER [k5d_ci_app] FOR LOGIN [k5d_ci_app];GRANT CONNECT TO [k5d_ci_app]');
    app=await open('DRVO_ERP_STAGING',login,pass);
    for(const table of ['OwnerBootstrapApproval','EmailVerificationChallenge',
      'VerifiedAccountEmail','AccountInvitation']){
      await blocked(()=>app.query('SELECT TOP(1) * FROM core.'+table));
      await blocked(()=>app.query('DELETE FROM core.'+table+' WHERE 1=0'));
    }
    console.log('PASS: ordinary SQL app principal cannot read or mutate onboarding records');
    console.log('K5D VERIFIED ONBOARDING SQL FOUNDATION: PASS');
  }finally{
    await app?.close().catch(()=>{});
    await db?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
run().catch(e=>{console.error('K5D disposable SQL proof FAILED:',
  String(e?.message||'unknown').slice(0,330));process.exitCode=1});
