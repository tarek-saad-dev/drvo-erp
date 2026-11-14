'use strict';
/**
 * P4 post-017 migration evidence reconciliation: OFFLINE and NON-ATTESTING.
 * Never query/modify SQL, SSH, VPS or change K5F's separately approved 009 checker.
 */
const {readFileSync}=require('node:fs');
const {sourceManifest}=require('./manifest-plan.cjs');
const DATABASE='DRVO_ERP_STAGING';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const REF=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const PREFIX=9, TARGET=17;
function exact(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!==[...keys].sort().join(','))
   throw new TypeError('Untrusted migration evidence shape');
}
function template(reviewedSha='0000000000000000000000000000000000000000'){
 if(!SHA.test(reviewedSha))throw new TypeError('Invalid reviewed release SHA');
 return {
  database:DATABASE,reviewedSha,reportedDeployedSha:null,observedAtUtc:null,
  historyRows:[],operatorObservationId:null,independentReviewerId:null,
  verifiedRestoreWitnessId:null,approvedMigrationWindowId:null,
 };
}
function optionalRef(value){
 if(value!==null&&(typeof value!=='string'||!REF.test(value)))
   throw new TypeError('Invalid opaque evidence reference');
}
function time(value){
 if(value===null)return null;
 if(typeof value!=='string'||!ISO.test(value)||
   !Number.isFinite(Date.parse(value))||
   new Date(value).toISOString()!==value)
   throw new TypeError('Invalid observation timestamp');
 return Date.parse(value);
}
function reconcilePost017(input){
 exact(input,['database','reviewedSha','reportedDeployedSha','observedAtUtc',
  'historyRows','operatorObservationId','independentReviewerId',
  'verifiedRestoreWitnessId','approvedMigrationWindowId']);
 if(input.database!==DATABASE||typeof input.reviewedSha!=='string'||
   !SHA.test(input.reviewedSha)||
   (input.reportedDeployedSha!==null&&
    (typeof input.reportedDeployedSha!=='string'||
     !SHA.test(input.reportedDeployedSha))))
   throw new TypeError('Only exact DRVO staging source evidence is supported');
 time(input.observedAtUtc);
 for(const ref of ['operatorObservationId','independentReviewerId',
    'verifiedRestoreWitnessId','approvedMigrationWindowId'])
   optionalRef(input[ref]);
 const source=sourceManifest();
 if(source.length!==TARGET||!Array.isArray(input.historyRows)||
   input.historyRows.length>TARGET)
   throw new Error('Unexpected source/observed SQL history length');
 for(let i=0;i<input.historyRows.length;i++){
  const row=input.historyRows[i];
  exact(row,['name','checksum']);
  if(typeof row.name!=='string'||typeof row.checksum!=='string'||
    !HASH.test(row.checksum)||row.name!==source[i].name||
    row.checksum!==source[i].checksum)
   throw new Error('SQL history out of order or source checksum drift');
 }
 const observed=input.historyRows.length;
 const reportedTarget=observed===TARGET;
 const reportedK5fPrefix=observed>=PREFIX;
 const reportedSha=input.reportedDeployedSha===input.reviewedSha;
 const missing=[
  ...(!reportedK5fPrefix?['K5F_001_009_NOT_FULLY_REPORTED']:[]),
  ...(!reportedTarget?['POST_017_HISTORY_NOT_REPORTED']:[]),
  ...(!reportedSha?['DEPLOYED_SHA_UNVERIFIED']:[]),
  ...(!input.observedAtUtc?['OBSERVATION_TIME_MISSING']:[]),
  ...(!input.operatorObservationId?['OPERATOR_OBSERVATION_MISSING']:[]),
  ...(!input.independentReviewerId?['INDEPENDENT_REVIEWER_MISSING']:[]),
  ...(!input.verifiedRestoreWitnessId?['INDEPENDENT_RESTORE_WITNESS_MISSING']:[]),
  ...(!input.approvedMigrationWindowId?['APPROVED_WINDOW_REFERENCE_MISSING']:[]),
 ];
 return Object.freeze({
  status:missing.length?'BLOCKED_REPORTED_HISTORY_INCOMPLETE':
    'REPORTED_MATCH_NOT_ATTESTED',
  evidenceOrigin:'UNTRUSTED_LOCAL_OPERATOR_SUBMISSION',
  observedRows:observed,sourceTargetCount:TARGET,
  lastReportedMigration:observed?source[observed-1].name:null,
  pendingSourceMigrations:Object.freeze(source.slice(observed).map(x=>x.name)),
  reportedK5fPrefix,reportedTarget,reportedSha,
  missing:Object.freeze(missing),
  independentSqlInspectionPerformed:false,
  independentRestoreVerified:false,
  rootK5fPost017CheckerApproved:false,
  canApplySqlOnVps:false,canEnablePrivateAuth:false,
  canGrantPilotRights:false,canInviteSalon:false,
  reviewerAction:'REQUIRE_SEPARATE_DBA_SECURITY_FOUNDER_ATTESTATION',
 });
}
function runCli(args){
 try{
  if(args.length===1&&args[0]==='--template'){
   process.stdout.write(JSON.stringify(template(),null,2)+'\n');return;
  }
  if(args.length===2&&args[0]==='--input'&&
    typeof args[1]==='string'&&!args[1].startsWith('-')){
   const raw=readFileSync(args[1]);
   if(raw.length===0||raw.length>8192)throw new Error('Evidence size');
   process.stdout.write(JSON.stringify(
    reconcilePost017(JSON.parse(raw.toString('utf8'))),null,2)+'\n');
   return;
  }
  throw new TypeError('CLI syntax');
 }catch{
  process.stderr.write('P4 POST-MIGRATION REVIEW INVALID. NO SQL/AUTH ACTION AUTHORIZED.\n');
  process.exitCode=1;
 }
}
if(require.main===module)runCli(process.argv.slice(2));
module.exports={template,reconcilePost017,runCli};
