'use strict';
// Interactive, root-only K5D recovery. No remote API or public route.
// Revokes an unconsumed Owner approval, invalidates old token(s), audits
// the trusted operator and allows a separately reviewed fresh re-approval.
const readline=require('node:readline/promises');
const sql=require('../../apps/api/node_modules/mssql');
const {secrets}=require('./operator-approve-owner.cjs');
const {revokeOperatorApprovedOwner}=
  require('../../apps/api/dist/identity/operator-owner-approval.js');

const DB_ENV='/etc/drvo-erp-db-automation/staging-db-automation.env';
const K5D_ENV='/etc/drvo-erp/k5d-operator.env';
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASONS=new Set(['MAIL_FAILED','REISSUE','OPERATOR_REVOKE']);

async function main(){
  if(process.getuid?.()!==0 || !process.stdin.isTTY || !process.stdout.isTTY){
    throw new Error('Interactive root terminal is required');
  }
  const cfg=secrets(K5D_ENV,0o600);
  const db=secrets(DB_ENV,0o640);
  if(cfg.DRVO_K5_OPERATOR_APPROVAL_ENABLED!=='YES' ||
     !/^[a-f0-9]{64}$/i.test(cfg.DRVO_K5_VERIFICATION_HMAC_KEY||'') ||
     db.SQL_HOST!=='127.0.0.1' || db.SQL_PORT!=='1433' ||
     db.SQL_DATABASE!=='DRVO_ERP_STAGING' ||
     db.SQL_USER!=='drvo_erp_stage_migrator' ||
     !db.SQL_PASSWORD || db.SQL_PASSWORD.length<12){
    throw new Error('Staging operator configuration is unavailable');
  }
  let input;
  const terminal=readline.createInterface({input:process.stdin,output:process.stdout});
  try{
    console.log('DRVO ERP — revoke an unconsumed Owner approval (staging only)');
    input={
      operatorId:(await terminal.question('Your operator identifier: ')).trim(),
      approvalId:(await terminal.question('Approval UUID: ')).trim(),
      email:(await terminal.question('Approved email (must match): ')).trim(),
      reasonCode:(await terminal.question('Reason (MAIL_FAILED / REISSUE / OPERATOR_REVOKE): ')).trim(),
    };
    if(!GUID.test(input.approvalId) || !REASONS.has(input.reasonCode)){
      throw new Error('Invalid approval UUID or reason');
    }
    const confirmation=await terminal.question(
      'Type REVOKE '+input.approvalId+' to invalidate this approval: ');
    if(confirmation!=='REVOKE '+input.approvalId){
      throw new Error('Operator confirmation failed');
    }
  }finally{terminal.close();}
  let pool;
  try{
    pool=new sql.ConnectionPool({
      server:'127.0.0.1',port:1433,database:'DRVO_ERP_STAGING',
      user:db.SQL_USER,password:db.SQL_PASSWORD,
      options:{encrypt:true,trustServerCertificate:true},
      pool:{min:0,max:1},connectionTimeout:5000,requestTimeout:15000,
    });
    await pool.connect();
    const identity=await pool.request().query('SELECT DB_NAME() AS DatabaseName');
    if(identity.recordset[0]?.DatabaseName!=='DRVO_ERP_STAGING'){
      throw new Error('Wrong SQL database');
    }
    await revokeOperatorApprovedOwner(
      pool,input,cfg.DRVO_K5_VERIFICATION_HMAC_KEY);
    console.log('PASS: approval revoked and previously issued verification tokens invalidated.');
    console.log('Approval ID: '+input.approvalId);
    console.log('To reissue, use the separate root-only operator approval command.');
  }finally{
    await pool?.close().catch(()=>{});
  }
}
if(require.main===module){
  main().catch(()=>{
    console.error('Owner approval was NOT confirmed revoked. Inspect the protected audit and try again.');
    process.exitCode=1;
  });
}
