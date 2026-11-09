'use strict';
// K5E: READ-ONLY root console pre-activation audit of the NEW DRVO ERP staging.
// Never writes SQL, sends emails, opens signups, modifies systemd or changes flags.
// Does not claim DNS, Nginx, offsite backup or external security review are complete.
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {timingSafeEqual,createHash}=require('node:crypto');
const REPO='/srv/drvo-erp/repo';
// A root process must NEVER load executable dependencies from a mutable
// drvoerp/deploy-controlled release or checkout. Install a reviewed root-owned
// operator bundle as documented in K5F; CI runs non-root from the checkout.
const ROOT_BUNDLE='/usr/local/libexec/drvo-erp-k5f';
function rootBundleSafe() {
  try {
    const rootFile=ROOT_BUNDLE+'/check-staging-readiness.cjs';
    if(fs.realpathSync(__filename)!==rootFile)return false;
    for(const [name,type] of [
      ['/usr','directory'],
      ['/usr/local','directory'],
      ['/usr/local/libexec','directory'],
      [ROOT_BUNDLE,'directory'],
      [rootFile,'file'],
      [ROOT_BUNDLE+'/node_modules','directory'],
      [ROOT_BUNDLE+'/node_modules/mssql','directory'],
    ]) {
      const item=fs.lstatSync(name);
      if(item.uid!==0 || (item.mode&0o022)!==0 ||
        (type==='file'?!item.isFile():!item.isDirectory()))return false;
    }
    if(!fs.realpathSync(ROOT_BUNDLE+'/node_modules/mssql')
      .startsWith(ROOT_BUNDLE+'/node_modules/'))return false;
    const sha=content=>createHash('sha256').update(content).digest('hex');
    return sha(fs.readFileSync(rootFile))===
      sha(fs.readFileSync(REPO+'/tools/k5d/check-staging-readiness.cjs'));
  } catch { return false; }
}
if(process.getuid?.()===0 && !rootBundleSafe()) {
  throw Error('BLOCK: reviewed root-owned K5F operator bundle required');
}
const sql=require(process.getuid?.()===0
  ? ROOT_BUNDLE+'/node_modules/mssql'
  : '../../apps/api/node_modules/mssql');
const RELEASE='/srv/drvo-erp/deploy/current';
const OPERATOR='/etc/drvo-erp/k5d-operator.env';
const MIGRATOR='/etc/drvo-erp-db-automation/staging-db-automation.env';
const ORIGIN='https://erp-stage.drvotech.com';
const MIGRATIONS=[
  '001_platform_identity_foundation.sql',
  '002_identity_sessions_and_roles.sql',
  '003_branch_role_change_audit.sql',
  '004_verified_onboarding_foundation.sql',
  '005_owner_bootstrap_claim_permission.sql',
  '006_owner_operator_approval_audit.sql',
  '007_scoped_employee_invitation_procedures.sql',
  '008_invitation_management.sql',
  '009_operator_owner_approval_revocation.sql',
];
const PRIVATE_TABLES=[
  'core.OwnerBootstrapApproval','core.OwnerApprovalOperatorAudit',
  'core.OwnerApprovalRevocationAudit','core.EmailVerificationChallenge',
  'core.AccountInvitation','core.VerifiedAccountEmail',
];
const NO_DIRECT_TABLE_PERMISSIONS=[
  'SELECT','INSERT','UPDATE','DELETE','ALTER','CONTROL',
];
function noDirectTablePermissions(row) {
  return !!row && NO_DIRECT_TABLE_PERMISSIONS.every(permission =>
    row[permission] === 0);
}
const PUBLIC_PROCEDURES=[
  'core.ClaimApprovedOwner','core.IssueBranchInvitation',
  'core.AcceptBranchInvitation','core.ListBranchInvitations',
  'core.RevokeBranchInvitation',
];
const API_GATES=[
  'DRVO_K5_AUTH_ENABLED','DRVO_K5_OWNER_BOOTSTRAP_ENABLED',
  'DRVO_K5_VERIFY_API_ENABLED','DRVO_K5_INVITATIONS_ENABLED',
  'DRVO_K5_ROLE_ADMIN_ENABLED',
];
const WEB_GATES=['DRVO_K5_WEB_ENABLED','DRVO_K5_VERIFY_UI_ENABLED'];
const HEX_KEY=/^[a-f0-9]{64}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const API_KEY=/^re_[A-Za-z0-9_]{12,}$/;
const EMAIL=/^[^\s@]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/i;

// Reject duplicate variables and unusual whitespace: never source .env files
// as shell scripts and never print their actual values.
function parseEnv(content,separator='\n') {
  if(typeof content!=='string'||content.length>65536)throw Error('invalid env');
  const result=Object.create(null);
  const lines=content.split(separator);
  for(let row of lines){
    if(separator==='\n')row=row.replace(/\r$/,'');
    if(!row || (separator==='\n' && row.startsWith('#')))continue;
    const at=row.indexOf('=');
    const key=at>=0?row.slice(0,at):'';
    if(!/^[A-Z][A-Z0-9_]{2,80}$/.test(key)||Object.hasOwn(result,key)){
      throw Error('invalid env');
    }
    result[key]=row.slice(at+1);
  }
  return result;
}
function protectedEnv(path,allowedMode) {
  const info=fs.lstatSync(path);
  if(!info.isFile()||info.isSymbolicLink()||info.uid!==0||
     (info.mode&0o777&(~allowedMode))!==0)throw Error('protected env unsafe');
  return parseEnv(fs.readFileSync(path,'utf8'));
}
function processEnvFor(unit) {
  if(!['drvoerp-api.service','drvoerp-web.service'].includes(unit)){
    throw Error('unsafe unit');
  }
  const raw=execFileSync('/usr/bin/systemctl',
    ['show','-p','MainPID','--value',unit],{
      encoding:'utf8',timeout:4000,stdio:['ignore','pipe','ignore'],
    }).trim();
  if(!/^[1-9][0-9]{0,7}$/.test(raw)||Number(raw)<=1)throw Error('inactive service');
  const proc=fs.readFileSync('/proc/'+raw+'/environ');
  if(proc.length>65536)throw Error('too large');
  return parseEnv(proc.toString('utf8').replace(/\0$/,''),'\0');
}
function sameSecret(a,b) {
  if(!HEX_KEY.test(a||'')||!HEX_KEY.test(b||''))return false;
  const left=Buffer.from(a,'hex'),right=Buffer.from(b,'hex');
  if(left.length!==32||right.length!==32||left.every(x=>x===0))return false;
  return timingSafeEqual(left,right);
}
function readinessChecks(operator,api,web,migrator) {
  return [
    ['operator secret and mail configuration',
      operator.DRVO_K5_OPERATOR_APPROVAL_ENABLED==='YES' &&
      operator.DRVO_K5_MAIL_ENABLED==='YES' &&
      operator.DRVO_K5_MAIL_PROVIDER==='resend' &&
      operator.DRVO_K5_ORIGIN===ORIGIN &&
      HEX_KEY.test(operator.DRVO_K5_VERIFICATION_HMAC_KEY||'') &&
      API_KEY.test(operator.DRVO_K5_RESEND_API_KEY||'') &&
      EMAIL.test(operator.DRVO_K5_FROM_EMAIL||'')],
    ['API verification secret matches operator (constant-time)',
      sameSecret(operator.DRVO_K5_VERIFICATION_HMAC_KEY,
        api.DRVO_K5_VERIFICATION_HMAC_KEY)],
    ['API mail configuration and sender identity',
      api.DRVO_K5_MAIL_ENABLED==='YES' &&
      api.DRVO_K5_MAIL_PROVIDER==='resend' &&
      api.DRVO_K5_ORIGIN===ORIGIN &&
      API_KEY.test(api.DRVO_K5_RESEND_API_KEY||'') &&
      (api.DRVO_K5_FROM_EMAIL||'').toLowerCase()===
        (operator.DRVO_K5_FROM_EMAIL||'').toLowerCase() &&
      EMAIL.test(api.DRVO_K5_FROM_EMAIL||'')],
    ['API local production binding and trusted-IP mode',
      api.NODE_ENV==='production'&&api.API_HOST==='127.0.0.1'&&
      api.API_PORT==='3311'&&api.DRVO_K5_TRUST_NGINX_REAL_IP==='YES'],
    ['Web local production binding',
      web.NODE_ENV==='production'&&web.PORT==='3310'],
    ['all public API and Web K5 flags remain OFF pending explicit approval',
      API_GATES.every(k=>api[k]!=='YES') &&
      WEB_GATES.every(k=>web[k]!=='YES')],
    ['runtime SQL limited to DRVO staging app principal',
      api.DRVO_SQL_ENABLED==='YES'&&
      api.DRVO_SQL_HOST==='127.0.0.1'&&
      api.DRVO_SQL_PORT==='1433'&&
      api.DRVO_SQL_DATABASE==='DRVO_ERP_STAGING'&&
      api.DRVO_SQL_USER==='drvo_erp_stage_app'&&
      typeof api.DRVO_SQL_PASSWORD==='string'&&
      api.DRVO_SQL_PASSWORD.length>=12],
    ['operator SQL limited to DRVO staging migrator',
      migrator.SQL_HOST==='127.0.0.1'&&
      migrator.SQL_PORT==='1433'&&
      migrator.SQL_DATABASE==='DRVO_ERP_STAGING'&&
      migrator.SQL_USER==='drvo_erp_stage_migrator'&&
      typeof migrator.SQL_PASSWORD==='string'&&
      migrator.SQL_PASSWORD.length>=12],
  ];
}
function dbConfig(user,password) {
  return {server:'127.0.0.1',port:1433,database:'DRVO_ERP_STAGING',
    user,password,options:{encrypt:true,trustServerCertificate:true},
    pool:{min:0,max:1},connectionTimeout:5000,requestTimeout:10000};
}
async function auditDatabase(migrator,api) {
  let admin,app;
  try{
    admin=await new sql.ConnectionPool(dbConfig(
      migrator.SQL_USER,migrator.SQL_PASSWORD)).connect();
    const migrations=await admin.request().query(
      'SELECT DB_NAME() AS databaseName, MigrationId FROM core.SchemaMigration');
    if(migrations.recordset.some(x=>x.databaseName!=='DRVO_ERP_STAGING')){
      throw Error('wrong database');
    }
    const actual=new Set(migrations.recordset.map(x=>x.MigrationId));
    if(actual.size!==MIGRATIONS.length ||
       migrations.recordset.length!==MIGRATIONS.length ||
       !MIGRATIONS.every(x=>actual.has(x)))throw Error('migration drift');
    app=await new sql.ConnectionPool(dbConfig(
      api.DRVO_SQL_USER,api.DRVO_SQL_PASSWORD)).connect();
    const principal=await app.request().query(
      'SELECT DB_NAME() AS databaseName, USER_NAME() AS username');
    if(principal.recordset[0]?.databaseName!=='DRVO_ERP_STAGING'||
       principal.recordset[0]?.username!=='drvo_erp_stage_app'){
      throw Error('wrong runtime account');
    }
    for(const name of PRIVATE_TABLES){
      // A denied SELECT does not prove INSERT/UPDATE/DELETE are also denied.
      // This metadata probe is strictly read-only; reject NULL / unexpected
      // permission results rather than treating them as a safe denial.
      const access=await app.request()
        .input('object',sql.NVarChar(256),name)
        .query(`SELECT ${NO_DIRECT_TABLE_PERMISSIONS.map(permission =>
          `HAS_PERMS_BY_NAME(@object,'OBJECT','${permission}') AS [${permission}]`
        ).join(', ')}`);
      if(!noDirectTablePermissions(access.recordset[0])){
        throw Error('direct onboarding table privileges detected');
      }
      try{
        await app.request().query('SELECT TOP (0) * FROM '+name);
      }catch(error){
        if(Number(error?.number)===229)continue;
        throw Error('private table unavailable or invalid SQL permission');
      }
      throw Error('private table readable');
    }
    for(const name of PUBLIC_PROCEDURES){
      const result=await app.request()
        .input('object',sql.NVarChar(256),name)
        .query("SELECT HAS_PERMS_BY_NAME(@object,'OBJECT','EXECUTE') AS permitted");
      if(Number(result.recordset[0]?.permitted)!==1){
        throw Error('procedure not executable');
      }
    }
    return true;
  }finally{
    await app?.close().catch(()=>{});
    await admin?.close().catch(()=>{});
  }
}
async function localHttpStatus(port,path) {
  const reply=await fetch('http://127.0.0.1:'+port+path,{
    redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(4000),
  });
  await reply.body?.cancel();
  return reply.status;
}

async function main(args=process.argv.slice(2)) {
  // A successful check is NEVER permission to enable public authentication.
  // It reports local technical prerequisites only; human review remains.
  if(process.getuid?.()!==0 || args.length!==1 ||
     !/^--expected-sha=[a-f0-9]{40}$/i.test(args[0])){
    console.error('BLOCK: interactive root operator must supply --expected-sha=<main commit>');
    process.exitCode=1;return;
  }
  const expected=args[0].slice('--expected-sha='.length).toLowerCase();
  let failed=false;
  async function check(label,action) {
    try {
      if(await action()===false)throw Error('check failed');
      console.log('PASS: '+label);
    } catch {
      failed=true;
      console.error('BLOCK: '+label);
    }
  }
  let operator,api,web,migrator;
  await check('protected configuration and current service environments',()=>{
    operator=protectedEnv(OPERATOR,0o600);
    migrator=protectedEnv(MIGRATOR,0o640);
    api=processEnvFor('drvoerp-api.service');
    web=processEnvFor('drvoerp-web.service');
    return true;
  });
  if(operator&&api&&web&&migrator){
    for(const [label,good] of readinessChecks(operator,api,web,migrator)){
      await check(label,()=>good);
    }
  } else failed=true;
  await check('reviewed checkout and managed deployed commit match requested SHA',()=>{
    // This root-owned checker only performs a read-only rev-parse on one
    // fixed repo. Scope Git's safe.directory exception to THIS command rather
    // than modifying root or system git configuration.
    const head=execFileSync('/usr/bin/git',
      ['-c','safe.directory='+REPO,'-C',REPO,'rev-parse','HEAD'],{
      encoding:'utf8',timeout:4000,stdio:['ignore','pipe','ignore'],
    }).trim().toLowerCase();
    const resolved=fs.realpathSync(RELEASE);
    if(!resolved.startsWith('/srv/drvo-erp/deploy/releases/'))return false;
    const shipped=fs.readFileSync(RELEASE+'/release.sha','utf8').trim().toLowerCase();
    return head===expected&&shipped===expected&&SHA.test(shipped);
  });
  if(operator&&api&&web&&migrator){
    const checks=readinessChecks(operator,api,web,migrator);
    if(checks.every(x=>x[1])){
      await check('exact SQL migrations and zero direct onboarding DML privileges',
        ()=>auditDatabase(migrator,api));
    }else{
      failed=true;
      console.error('BLOCK: SQL proof skipped until protected runtime configuration passes');
    }
  }
  await check('loopback API and Web health (no customer operations)',
    async()=>await localHttpStatus(3311,'/api/health')===200 &&
      await localHttpStatus(3310,'/health')===200);
  if(api&&web && API_GATES.every(k=>api[k]!=='YES') &&
     WEB_GATES.every(k=>web[k]!=='YES')){
    await check('private Web auth and verification pages unavailable by default',
      async()=>await localHttpStatus(3310,'/sign-in')===404 &&
        await localHttpStatus(3310,'/verify-email')===404);
  }
  console.log('REVIEW REQUIRED: independently verify Nginx overwrites X-Real-IP,');
  console.log('Resend sender-domain verification, offsite backup restore, staging');
  console.log('access restrictions, and multi-tenant/branch real E2E security signoff.');
  console.log('No flags changed. No SQL writes, email sends or account creation performed.');
  if(failed) {
    console.error('K5E STAGING TECHNICAL READINESS: BLOCKED');
    process.exitCode=1;
  }else{
    console.log('K5E LOCAL TECHNICAL PREFLIGHT: PASS (manual gates remain OPEN)');
  }
}
if(require.main===module) {
  main().catch(()=>{
    console.error('K5E STAGING TECHNICAL READINESS: BLOCKED');
    process.exitCode=1;
  });
}
module.exports={
  MIGRATIONS,PRIVATE_TABLES,NO_DIRECT_TABLE_PERMISSIONS,PUBLIC_PROCEDURES,parseEnv,
  noDirectTablePermissions,rootBundleSafe,
  sameSecret,readinessChecks,dbConfig,protectedEnv,processEnvFor,
  auditDatabase,main,
};
