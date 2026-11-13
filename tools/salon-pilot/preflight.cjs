'use strict';
/**
 * Salon Pilot S3 pre-activation report (local and source/CI only).
 *
 * It consumes only a tightly schema-limited NON-SECRET operator summary.
 * No VPS, SQL, SSH, HTTP or shell connections; never changes flags.
 * A successful report is still NOT permission to migrate or activate.
 */
const {readFileSync}=require('node:fs');
const {sourceManifest,compareHistoryToSource,CURRENT_K5F_PREFIX}=
  require('../staging-readiness/manifest-plan.cjs');

const SHA=/^[0-9a-f]{40}$/;
const STATES=Object.freeze(['MISSING','OPERATOR_REPORTED']);
const CONTROLS=Object.freeze([
 'rootOwnedCheckerAndHash',
 'k5fReadOnlyAudit',
 'trustedProxyOriginAndAccess',
 'encryptedOffHostBackup',
 'isolatedRestoreAndChecksum',
 'ownerStaffAndForeignScopeNegativeTests',
 'migrationWindowOperatorApproval',
 'moduleEntitlementDecisionADR032',
]);

function exactObject(obj,keys,label){
 if(obj===null||typeof obj!=='object'||Array.isArray(obj)||
   Object.keys(obj).sort().join(',')!==[...keys].sort().join(','))
   throw new TypeError('Unexpected '+label+' evidence shape; NEVER submit credentials');
}
function candidateTemplate(reviewedSha='0000000000000000000000000000000000000000'){
 if(!SHA.test(reviewedSha))throw new TypeError('Invalid reviewed commit SHA');
 return {
  reviewedSha,reportedDeployedSha:null,
  migrationHistory:{database:'DRVO_ERP_STAGING',rows:[]},
  controls:Object.fromEntries(CONTROLS.map(k=>[k,'MISSING'])),
 };
}
function assessPilotEvidence(evidence){
 exactObject(evidence,[
  'reviewedSha','reportedDeployedSha','migrationHistory','controls',
 ],'Salon pilot');
 if(typeof evidence.reviewedSha!=='string'||!SHA.test(evidence.reviewedSha)||
  (evidence.reportedDeployedSha!==null&&
   (typeof evidence.reportedDeployedSha!=='string'||
    !SHA.test(evidence.reportedDeployedSha))))
   throw new TypeError('Invalid reviewed/deployed release SHA');
 exactObject(evidence.controls,CONTROLS,'control');
 for(const key of CONTROLS){
  if(!STATES.includes(evidence.controls[key]))
   throw new TypeError('Invalid reported control: '+key);
 }
 // Compare only audited pre-migration prefix 001–009.
 // This does not query VPS or attest the origin of operator-provided records.
 const plan=compareHistoryToSource(evidence.migrationHistory,sourceManifest());
 const historyExact=plan.observedRows===CURRENT_K5F_PREFIX.length;
 const sameDeployment=evidence.reportedDeployedSha===evidence.reviewedSha;
 const missing=[
  ...(!sameDeployment?['RELEASE_SHA_NOT_MATCHED']:[]),
  ...(!historyExact?['STAGING_HISTORY_NOT_OBSERVED_AS_001_009']:[]),
  ...CONTROLS.filter(k=>evidence.controls[k]==='MISSING')
   .map(k=>'EVIDENCE_MISSING_'+k),
 ];
 const reported=CONTROLS.filter(k=>evidence.controls[k]==='OPERATOR_REPORTED');
 return Object.freeze({
  status:missing.length?'BLOCKED_SOURCE_PREPARATION':
   'REPORTED_EVIDENCE_REQUIRES_INDEPENDENT_REVIEW',
  releaseShaMatchReported:sameDeployment,
  historyPrefixMatchesSubmittedSource:historyExact,
  sourceMigrationCount:plan.sourceTargetCount,
  observedHistoryCount:plan.observedRows,
  unobservedSourceMigrations:plan.unobservedSourceMigrations,
  operatorReportedControls:reported,
  missingChecks:missing,
  evidenceOrigin:'UNTRUSTED_OPERATOR_SUBMISSION_NOT_ATTESTED',
  canMigrateVps:false,
  canEnablePrivateK5:false,
  canEnableModules:false,
  canInviteUsers:false,
  canPostFinancialSale:false,
  approval:'INDEPENDENT_OPERATOR_SECURITY_AND_FOUNDER_SIGNOFF_REQUIRED',
 });
}

function runCli(args){
 if(args.length===1&&args[0]==='--template'){
  process.stdout.write(JSON.stringify(candidateTemplate(),null,2)+'\n');
  return;
 }
 if(args.length===2&&args[0]==='--input'){
  const file=args[1];
  if(typeof file!=='string'||!file||file.startsWith('-'))
   throw new TypeError('Invalid evidence filepath');
  // Strict bounded redacted JSON only. Contents are never echoed.
  const raw=readFileSync(file);
  if(raw.length>8192||raw.length===0)throw new Error('Evidence size is invalid');
  const result=assessPilotEvidence(JSON.parse(raw.toString('utf8')));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  return;
 }
 throw new Error('Usage: node tools/salon-pilot/preflight.cjs --template|--input <redacted.json>');
}
if(require.main===module){
 try{runCli(process.argv.slice(2))}
 catch{
  // Never echo private user-supplied content or file path on failure.
  process.stderr.write('SALON PILOT PREFLIGHT: INVALID REDACTED EVIDENCE. NO ACTION AUTHORIZED.\n');
  process.exitCode=1;
 }
}
module.exports={CONTROLS,STATES,candidateTemplate,assessPilotEvidence,runCli};
