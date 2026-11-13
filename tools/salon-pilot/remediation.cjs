'use strict';
/**
 * Read-only actionable operator punch list for the pre-migration Salon Pilot.
 * Never authorizes any operation or accepts a self-attestation as approval.
 * Input is the same strictly bounded, redacted S3 evidence schema.
 */
const {CONTROLS,candidateTemplate,assessPilotEvidence,readRedactedEvidence}=
 require('./preflight.cjs');
const GUIDANCE=Object.freeze({
 rootOwnedCheckerAndHash:['Security/Root Operator','Verify root-owned K5F checker and its independently recorded hash; do not paste private keys or raw logs'],
 k5fReadOnlyAudit:['Root Operator','Run approved READ-ONLY K5F inspection and independently review redacted outputs'],
 trustedProxyOriginAndAccess:['Security/Platform','Validate trusted reverse proxy, exact Origin and deny-by-default scope against independently signed policy'],
 encryptedOffHostBackup:['Backup Operator','Record encryption and independent offsite backup custody without uploading credentials'],
 isolatedRestoreAndChecksum:['Independent Recovery Operator','Restore encrypted backup on isolated infrastructure and compare independently verified checksums'],
 ownerStaffAndForeignScopeNegativeTests:['Security/QA','After authorized synthetic identities and SQL window, independently execute Owner/Staff/foreign Tenant/Branch negatives'],
 migrationWindowOperatorApproval:['Founder/DB Operator','Obtain SEPARATE operator approval for controlled SQL 010–017 window after K5F and restore'],
 moduleEntitlementDecisionADR032:['Founder/Billing/Security','Record independently signed ADR-032 Business-scoped private entitlement decision; never infer consent from operator report'],
});
function pilotNextActions(evidence){
 const result=assessPilotEvidence(evidence);
 const actions=[
  {id:'RELEASE_SHA',owner:'Release Operator',state:result.releaseShaMatchReported?
   'OPERATOR_REPORTED_NOT_ATTESTED':'MISSING_OR_MISMATCHED',
   next:'Independently match reviewed source commit to deployed release.sha; CI/Staging receiver alone does not prove live release'},
  {id:'SQL_001_009',owner:'DB/Root Operator',state:result.historyPrefixMatchesSubmittedSource?
   'OPERATOR_REPORTED_NOT_ATTESTED':'MISSING_OR_MISMATCHED',
   next:'Independently compare read-only staging core.SchemaMigration 001–009 names and SHA-256 hashes to immutable source; do NOT apply 010–017'},
  ...CONTROLS.map(id=>({
   id,owner:GUIDANCE[id][0],
   state:evidence.controls[id]==='OPERATOR_REPORTED'?
    'OPERATOR_REPORTED_NOT_ATTESTED':'MISSING',
   next:GUIDANCE[id][1],
  })),
 ];
 const missing=actions.filter(a=>a.state==='MISSING'||a.state==='MISSING_OR_MISMATCHED');
 return Object.freeze({
  mode:'LOCAL_REDACTED_SOURCE_REVIEW_ONLY',
  status:result.status,
  evidenceOrigin:result.evidenceOrigin,
  independentAttestationPerformed:false,
  approval:'NO_GO_INDEPENDENT_OPERATOR_SECURITY_AND_FOUNDER_SIGNOFF_REQUIRED',
  blockingItems:missing.length,
  checklist:actions,
  pendingSourceSqlMigrations:result.unobservedSourceMigrations,
  appliedVpsSqlMigrationsVerified:false,
  publicAuthEnabled:false,
  paidEntitlementsEnabled:false,
  realOwnerStaffBrowserExecuted:false,
  canMigrateVps:false,canEnableK5:false,canEnableModules:false,
  canInviteUsers:false,canPostFinancialSale:false,
 });
}
function runCli(args){
 try{
  let evidence;
  if(args.length===1&&args[0]==='--template')
   evidence=candidateTemplate();
  else if(args.length===2&&args[0]==='--input')
   evidence=readRedactedEvidence(args[1]);
  else throw new TypeError('Invalid arguments');
  process.stdout.write(JSON.stringify(pilotNextActions(evidence),null,2)+'\n');
 }catch{
  // No evidence content or operator-supplied private filepath ever gets echoed.
  process.stderr.write('PILOT REMEDIATION: INVALID REDACTED EVIDENCE. NO ACTION AUTHORIZED.\n');
  process.exitCode=1;
 }
}
if(require.main===module)runCli(process.argv.slice(2));
module.exports={pilotNextActions,runCli};
