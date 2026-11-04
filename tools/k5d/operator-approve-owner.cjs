'use strict';
// Root-only, interactive, STAGING-ONLY first Owner approval + verification mail.
// No user passwords, raw email addresses, tokens or provider keys in argv/logs.
// This MUST NOT become an HTTP route, worker or GitHub Actions secret echo.
const fs=require('node:fs');
const readline=require('node:readline/promises');
const sql=require('../../apps/api/node_modules/mssql');
const {issueOperatorApprovedOwner}=
  require('../../apps/api/dist/identity/operator-owner-approval.js');
const {VerificationMailer}=
  require('../../apps/api/dist/identity/verification-mailer.js');

const DB_ENV='/etc/drvo-erp-db-automation/staging-db-automation.env';
const K5D_ENV='/etc/drvo-erp/k5d-operator.env';

function secrets(file,maxMode) {
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==0||
     (stat.mode&0o777&(~maxMode))!==0){
    throw Error('Operator configuration must be a protected root-owned regular file');
  }
  const data=fs.readFileSync(file,'utf8');
  const result=Object.create(null);
  for(const line of data.split(/\r?\n/)){
    if(!line || line.startsWith('#'))continue;
    const match=/^([A-Z][A-Z0-9_]{2,80})=([^\r\n]*)$/.exec(line);
    if(!match || Object.hasOwn(result,match[1])){
      throw Error('Operator configuration file format is invalid');
    }
    result[match[1]]=match[2];
  }
  return result;
}

async function main(){
  if(process.getuid?.()!==0 || !process.stdin.isTTY || !process.stdout.isTTY){
    throw Error('Interactive root console required; no automated invocation');
  }
  const cfg=secrets(K5D_ENV,0o600);
  if(cfg.DRVO_K5_OPERATOR_APPROVAL_ENABLED!=='YES' ||
     cfg.DRVO_K5_MAIL_ENABLED!=='YES' ||
     cfg.DRVO_K5_MAIL_PROVIDER!=='resend' ||
     cfg.DRVO_K5_ORIGIN!=='https://erp-stage.drvotech.com' ||
     !/^[0-9a-f]{64}$/i.test(cfg.DRVO_K5_VERIFICATION_HMAC_KEY||'') ||
     !cfg.DRVO_K5_RESEND_API_KEY || !cfg.DRVO_K5_FROM_EMAIL){
    throw Error('Operator verification and mail configuration are not fully enabled');
  }
  const db=secrets(DB_ENV,0o640);
  if(db.SQL_HOST!=='127.0.0.1'||db.SQL_PORT!=='1433'||
     db.SQL_DATABASE!=='DRVO_ERP_STAGING'||
     db.SQL_USER!=='drvo_erp_stage_migrator'||
     !db.SQL_PASSWORD||db.SQL_PASSWORD.length<12){
    throw Error('Strictly scoped staging SQL migrator credentials missing');
  }
  const input=readline.createInterface({input:process.stdin,output:process.stdout});
  let data,confirm;
  try{
    console.log('DRVO ERP — Staging Owner approval (one-time, audited)');
    console.log('No public registration will be enabled.');
    data={
      operatorId:(await input.question('Your operator identifier: ')).trim(),
      username:(await input.question('Approved Owner username: ')).trim(),
      email:(await input.question('Approved Owner email: ')).trim(),
      tenantName:(await input.question('Tenant name: ')).trim(),
      businessName:(await input.question('Business name: ')).trim(),
      branchName:(await input.question('First branch name: ')).trim(),
    };
    confirm=await input.question('Type APPROVE DRVO_ERP_STAGING to issue mail: ');
  }finally{input.close();}
  if(confirm!=='APPROVE DRVO_ERP_STAGING'){
    throw Error('Operator approval was not confirmed; no SQL writes');
  }
  let pool;
  try{
    pool=new sql.ConnectionPool({
      server:'127.0.0.1',port:1433,database:'DRVO_ERP_STAGING',
      user:db.SQL_USER,password:db.SQL_PASSWORD,
      options:{encrypt:true,trustServerCertificate:true},
      pool:{min:0,max:1},connectionTimeout:5000,requestTimeout:15000,
    });
    await pool.connect();
    const current=await pool.request().query('SELECT DB_NAME() AS Db');
    if(current.recordset[0]?.Db!=='DRVO_ERP_STAGING'){
      throw Error('Wrong SQL database: refusing Owner approval');
    }
    // Store no raw email, token or operator identifier in SQL.
    const notice=await issueOperatorApprovedOwner(
      pool,data,cfg.DRVO_K5_VERIFICATION_HMAC_KEY);
    // Only after durable approval do we contact the fixed transactional provider.
    // If delivery fails, approval remains pending, not auto-approved/consumed.
    for(const k of ['DRVO_K5_MAIL_ENABLED','DRVO_K5_MAIL_PROVIDER',
      'DRVO_K5_RESEND_API_KEY','DRVO_K5_FROM_EMAIL','DRVO_K5_ORIGIN']){
      process.env[k]=cfg[k];
    }
    try {
      await new VerificationMailer().send(notice);
      console.log('PASS: Owner approval saved and verification mail accepted by provider.');
      console.log('Approval ID: '+notice.approvalId);
      console.log('No Owner account created; verified redemption is still required.');
    }catch{
      console.error('ERROR: approval committed, but provider acceptance not confirmed.');
      console.error('Challenge remains pending; do not print/forward its raw token.');
      console.error('A separate operator-only reissue/revoke workflow is required.');
      process.exitCode=1;
    }
  } finally{
    await pool?.close().catch(()=>{});
  }
}

if(require.main===module){
  main().catch(()=>{console.error('Owner approval was not completed; check protected config and operator input.');process.exitCode=1});
}
module.exports={secrets};
