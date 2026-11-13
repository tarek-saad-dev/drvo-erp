'use strict';
/**
 * READ-ONLY, SOURCE/CI-ONLY. This plans a reviewed SQL migration window by
 * comparing an untrusted exported record list with immutable LOCAL Git files.
 * It NEVER connects to a database, invokes migrations, creates a backup,
 * executes shell commands, or authorizes a VPS activation.
 */
const {readFileSync,readdirSync}=require('node:fs');
const {resolve,join}=require('node:path');
const {createHash}=require('node:crypto');

const CURRENT_K5F_PREFIX=Object.freeze([
 '001_platform_identity_foundation.sql',
 '002_identity_sessions_and_roles.sql',
 '003_branch_role_change_audit.sql',
 '004_verified_onboarding_foundation.sql',
 '005_owner_bootstrap_claim_permission.sql',
 '006_owner_operator_approval_audit.sql',
 '007_scoped_employee_invitation_procedures.sql',
 '008_invitation_management.sql',
 '009_operator_owner_approval_revocation.sql',
]);
const SOURCE_TARGET_COUNT=16;
const FILE=/^([0-9]{3})_[a-z][a-z0-9_]*\.sql$/;
const HASH=/^[a-f0-9]{64}$/;
const DATABASE='DRVO_ERP_STAGING';

function sourceManifest(directory=resolve(__dirname,'../../db/migrations')){
 const entries=readdirSync(directory).filter(n=>n.endsWith('.sql')).sort();
 if(entries.length!==SOURCE_TARGET_COUNT)throw new Error('Unexpected source manifest size');
 return Object.freeze(entries.map((filename,index)=>{
  const parsed=FILE.exec(filename);
  if(!parsed||Number(parsed[1])!==index+1)
   throw new Error('Non-consecutive or unknown migration filename');
  const body=readFileSync(join(directory,filename));
  if(body.length===0||body.length>200000||/^\s*GO\s*$/im.test(body.toString('utf8')))
   throw new Error('Unreviewed migration SQL content');
  return Object.freeze({
   name:filename,
   checksum:createHash('sha256').update(body).digest('hex'),
  });
 }));
}
function compareHistoryToSource(input,manifest=sourceManifest()){
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).sort().join(',')!=='database,rows')
   throw new TypeError('Expected exact database/rows evidence shape');
 if(input.database!==DATABASE||!Array.isArray(input.rows)||
    input.rows.length>CURRENT_K5F_PREFIX.length)
   throw new Error('Database or history outside approved K5F-only observation window');
 if(manifest.length!==SOURCE_TARGET_COUNT||
    CURRENT_K5F_PREFIX.some((n,i)=>manifest[i]?.name!==n))
   throw new Error('Unexpected K5F source baseline');
 for(let i=0;i<input.rows.length;i++){
  const row=input.rows[i];
  if(!row||typeof row!=='object'||Array.isArray(row)||
     Object.keys(row).sort().join(',')!=='checksum,name'||
     typeof row.name!=='string'||typeof row.checksum!=='string'||
     !HASH.test(row.checksum)||row.name!==manifest[i].name||
     row.checksum!==manifest[i].checksum)
   throw new Error('Migration history drift or unexpected row at '+(i+1));
 }
 // This report does NOT confirm the provenance or integrity of submitted
 // evidence. It cannot prove offsite restore, K5F, SQL permissions, or approval.
 return Object.freeze({
  status:'REVIEW_ONLY_NOT_AUTHORIZED',
  database:DATABASE,
  observedRows:input.rows.length,
  unobservedSourceMigrations:manifest.slice(input.rows.length).map(x=>x.name),
  expectedCurrentK5fCount:CURRENT_K5F_PREFIX.length,
  sourceTargetCount:SOURCE_TARGET_COUNT,
  canApplyToVps:false,
  canEnableModules:false,
 });
}
module.exports={CURRENT_K5F_PREFIX,SOURCE_TARGET_COUNT,sourceManifest,compareHistoryToSource};
