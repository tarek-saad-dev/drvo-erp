'use strict';
/**
 * Strict source-only Salon P2 recovery evidence REVIEW.
 * Never opens a backup, connects SQL/SSH/HTTP, restores a DB, or signs GO.
 * Local operator input is self-reported and untrusted, not an attestation.
 */
const {readFileSync}=require('node:fs');
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const NONSECRET_ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,79}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const STATES=Object.freeze(['MISSING','OPERATOR_REPORTED']);
const CONTROLS=Object.freeze([
 'offHostCustody','encryptionAtRest','independentIsolatedRestore',
 'schemaHistoryReconciled','scopedPermissionsReconciled','retentionReviewed',
 'rpoRtoReviewed','sourceDatabaseConfirmed',
]);
const exact=(v,keys)=>{
 if(!v||typeof v!=='object'||Array.isArray(v)||
    Object.keys(v).sort().join(',')!==[...keys].sort().join(','))
   throw new TypeError('Unsafe recovery evidence shape');
};
function template(reviewedSha='0000000000000000000000000000000000000000'){
 if(!SHA.test(reviewedSha))throw new TypeError('Invalid SHA');
 return {
  reviewedSha,restoreEnvironment:'ISOLATED_DRVO_ONLY',
  backupEvidenceId:null,restoreEvidenceId:null,
  backupCapturedUtc:null,restoreCompletedUtc:null,
  sourceManifestSha256:null,restoredManifestSha256:null,
  controls:Object.fromEntries(CONTROLS.map(k=>[k,'MISSING'])),
 };
}
function parseUtc(s){
 if(s===null)return null;
 if(typeof s!=='string'||!ISO.test(s)||!Number.isFinite(Date.parse(s))||
   new Date(s).toISOString()!==s)throw new TypeError('Invalid UTC timestamp');
 return Date.parse(s);
}
function validateId(s){
 if(s!==null&&(typeof s!=='string'||!NONSECRET_ID.test(s)))
   throw new TypeError('Invalid non-secret reference');
}
function validateHash(s){
 if(s!==null&&(typeof s!=='string'||!HASH.test(s)))
   throw new TypeError('Invalid checksum reference');
}
function reviewRecoveryEvidence(e){
 exact(e,[
  'reviewedSha','restoreEnvironment','backupEvidenceId','restoreEvidenceId',
  'backupCapturedUtc','restoreCompletedUtc','sourceManifestSha256',
  'restoredManifestSha256','controls',
 ]);
 if(typeof e.reviewedSha!=='string'||!SHA.test(e.reviewedSha)||
   e.restoreEnvironment!=='ISOLATED_DRVO_ONLY')
   throw new TypeError('Wrong reviewed release or restore environment');
 validateId(e.backupEvidenceId);validateId(e.restoreEvidenceId);
 validateHash(e.sourceManifestSha256);validateHash(e.restoredManifestSha256);
 const captured=parseUtc(e.backupCapturedUtc);
 const restored=parseUtc(e.restoreCompletedUtc);
 if(restored!==null&&captured!==null&&restored<captured)
   throw new TypeError('Restore predates captured backup');
 exact(e.controls,CONTROLS);
 for(const k of CONTROLS){
  if(!STATES.includes(e.controls[k]))throw new TypeError('Invalid reported recovery control');
 }
 const present=e.backupEvidenceId!==null&&e.restoreEvidenceId!==null&&
  captured!==null&&restored!==null&&e.sourceManifestSha256!==null&&
  e.restoredManifestSha256!==null;
 const match=e.sourceManifestSha256!==null&&
  e.sourceManifestSha256===e.restoredManifestSha256;
 const missing=Object.freeze([
  ...(!present?['RECOVERY_RECEIPTS_INCOMPLETE']:[]),
  ...(!match?['MANIFEST_CHECKSUMS_NOT_REPORTED_EQUAL']:[]),
  ...CONTROLS.filter(k=>e.controls[k]==='MISSING').map(k=>'MISSING_'+k),
 ]);
 return Object.freeze({
  status:missing.length?'BLOCKED_SOURCE_EVIDENCE':'REPORTED_NOT_ATTESTED',
  evidenceOrigin:'UNTRUSTED_LOCAL_OPERATOR_SUMMARY',
  independentRecoveryActuallyVerified:false,
  reportedChecksumEqual:match,
  missingControls:missing,
  canRestoreVps:false,canApproveSqlMigration:false,
  canEnablePrivateK5:false,canOnboardSalon:false,
  reviewerAction:'INDEPENDENT_OFFSITE_RESTORE_AND_SECURITY_SIGNOFF_REQUIRED',
 });
}
function readEvidence(path){
 if(typeof path!=='string'||!path||path.startsWith('-'))
  throw new TypeError('Invalid path');
 const raw=readFileSync(path);
 if(raw.length===0||raw.length>8192)throw new TypeError('Invalid local evidence size');
 return JSON.parse(raw.toString('utf8'));
}
function runCli(args){
 try{
  if(args.length===1&&args[0]==='--template'){
    process.stdout.write(JSON.stringify(template(),null,2)+'\n');return;
  }
  if(args.length===2&&args[0]==='--input'){
    process.stdout.write(JSON.stringify(reviewRecoveryEvidence(readEvidence(args[1])),null,2)+'\n');
    return;
  }
  throw new TypeError('Invalid arguments');
 }catch{
  // No operator-provided identifiers, sensitive file paths or contents in errors.
  process.stderr.write('RECOVERY REVIEW: INVALID OR UNVERIFIED EVIDENCE. NO ACTION AUTHORIZED.\n');
  process.exitCode=1;
 }
}
if(require.main===module)runCli(process.argv.slice(2));
module.exports={CONTROLS,template,reviewRecoveryEvidence,readEvidence,runCli};
