'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {mkdtempSync,writeFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {CONTROLS,template,reviewRecoveryEvidence}=require('../tools/salon-pilot/recovery-review.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const all=()=>{
 const e=template('a'.repeat(40));
 e.backupEvidenceId='backup:synthetic-001';
 e.restoreEvidenceId='restore:synthetic-001';
 e.backupCapturedUtc='2026-11-14T00:00:00.000Z';
 e.restoreCompletedUtc='2026-11-14T01:00:00.000Z';
 e.sourceManifestSha256='b'.repeat(64);
 e.restoredManifestSha256='b'.repeat(64);
 for(const k of CONTROLS)e.controls[k]='OPERATOR_REPORTED';
 return e;
};
function deny(r){
 assert.equal(r.independentRecoveryActuallyVerified,false);
 for(const k of [
  'canRestoreVps','canApproveSqlMigration','canEnablePrivateK5','canOnboardSalon',
 ])assert.equal(r[k],false,k);
 assert.equal(r.evidenceOrigin,'UNTRUSTED_LOCAL_OPERATOR_SUMMARY');
}
test('Recovery evidence template is missing and no GO can be implied',()=>{
 const r=reviewRecoveryEvidence(template());
 assert.equal(r.status,'BLOCKED_SOURCE_EVIDENCE');
 assert.ok(r.missingControls.includes('RECOVERY_RECEIPTS_INCOMPLETE'));
 assert.equal(r.missingControls.length,CONTROLS.length+2);
 deny(r);
});
test('Even a complete self-report and matching checksums never attest an isolated restore',()=>{
 const r=reviewRecoveryEvidence(all());
 assert.equal(r.status,'REPORTED_NOT_ATTESTED');
 assert.deepEqual(r.missingControls,[]);
 assert.equal(r.reportedChecksumEqual,true);
 deny(r);
});
test('Changed checksum, missing independent restore or unknown retention still block',()=>{
 const e=all();e.restoredManifestSha256='c'.repeat(64);
 const r=reviewRecoveryEvidence(e);
 assert.ok(r.missingControls.includes('MANIFEST_CHECKSUMS_NOT_REPORTED_EQUAL'));deny(r);
 const missing=all();missing.controls.independentIsolatedRestore='MISSING';
 assert.ok(reviewRecoveryEvidence(missing).missingControls.includes('MISSING_independentIsolatedRestore'));
 const noReceipt=all();noReceipt.restoreEvidenceId=null;
 assert.ok(reviewRecoveryEvidence(noReceipt).missingControls.includes('RECOVERY_RECEIPTS_INCOMPLETE'));
});
test('No foreign DB, timestamp reversal, secret field, arbitrary attestation or bad digest',()=>{
 const bad=[];
 const foreign=all();foreign.restoreEnvironment='CASHIER_PROD';bad.push(foreign);
 const reversed=all();reversed.restoreCompletedUtc='2026-11-13T00:00:00.000Z';bad.push(reversed);
 const invalidTime=all();invalidTime.backupCapturedUtc='2026-02-30T00:00:00.000Z';bad.push(invalidTime);
 const secret=all();secret.SQL_PASSWORD='exfiltrate';bad.push(secret);
 const secretControl=all();secretControl.controls.operatorPrivateKey='secret';bad.push(secretControl);
 const claim=all();claim.controls.offHostCustody='APPROVED';bad.push(claim);
 const hash=all();hash.sourceManifestSha256='bad';bad.push(hash);
 const path=all();path.backupEvidenceId='/etc/drvo-erp/staging-sql.env';bad.push(path);
 const badSha=all();badSha.reviewedSha='latest';bad.push(badSha);
 const missing=all();delete missing.controls.retentionReviewed;bad.push(missing);
 for(const e of bad)assert.throws(()=>reviewRecoveryEvidence(e));
});
test('CLI accepts local redacted evidence only and does not print its path or secrets on invalid input',()=>{
 const root=resolve(__dirname,'..');
 const path='tools/salon-pilot/recovery-review.cjs';
 const templateOutput=spawnSync(process.execPath,[path,'--template'],{cwd:root,encoding:'utf8'});
 assert.equal(templateOutput.status,0);
 assert.equal(JSON.parse(templateOutput.stdout).controls.offHostCustody,'MISSING');
 const tmp=mkdtempSync(join(tmpdir(),'drvo-recovery-test-'));
 try{
  const invalid=join(tmp,'sensitive-private-name.json');
  writeFileSync(invalid,JSON.stringify({...all(),env:'SENSITIVE_MARKER'}));
  const r=spawnSync(process.execPath,[path,'--input',invalid],{cwd:root,encoding:'utf8'});
  assert.equal(r.status,1);
  assert.ok(!r.stderr.includes(invalid));
  assert.ok(!r.stderr.includes('SENSITIVE_MARKER'));
  const valid=join(tmp,'valid.json');writeFileSync(valid,JSON.stringify(all()));
  const good=spawnSync(process.execPath,[path,'--input',valid],{cwd:root,encoding:'utf8'});
  assert.equal(good.status,0);
  deny(JSON.parse(good.stdout));
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
