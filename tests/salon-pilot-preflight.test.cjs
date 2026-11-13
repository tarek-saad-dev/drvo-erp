'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const {sourceManifest}=require('../tools/staging-readiness/manifest-plan.cjs');
const {CONTROLS,candidateTemplate,assessPilotEvidence}=
 require('../tools/salon-pilot/preflight.cjs');

const source=sourceManifest();
const sameSha='a'.repeat(40);
const copy=x=>JSON.parse(JSON.stringify(x));
const all=()=>{
 const e=candidateTemplate(sameSha);
 e.reportedDeployedSha=sameSha;
 e.migrationHistory.rows=source.slice(0,9).map(x=>({
  name:x.name,checksum:x.checksum,
 }));
 for(const key of CONTROLS)e.controls[key]='OPERATOR_REPORTED';
 return e;
};
const deny=r=>{
 for(const k of [
  'canMigrateVps','canEnablePrivateK5','canEnableModules',
  'canInviteUsers','canPostFinancialSale',
 ])assert.equal(r[k],false,k);
 assert.equal(r.evidenceOrigin,'UNTRUSTED_OPERATOR_SUBMISSION_NOT_ATTESTED');
};

test('template is missing-evidence by default and NEVER authorizes VPS work',()=>{
 const template=candidateTemplate(sameSha);
 const result=assessPilotEvidence(template);
 assert.equal(result.status,'BLOCKED_SOURCE_PREPARATION');
 assert.equal(result.missingChecks.length,10);
 assert.equal(result.observedHistoryCount,0);
 assert.equal(result.unobservedSourceMigrations.length,17);
 deny(result);
});
test('even perfect self-reported evidence cannot authorize SQL, K5 or invite',()=>{
 const result=assessPilotEvidence(all());
 assert.equal(result.status,'REPORTED_EVIDENCE_REQUIRES_INDEPENDENT_REVIEW');
 assert.deepEqual(result.missingChecks,[]);
 assert.equal(result.historyPrefixMatchesSubmittedSource,true);
 assert.equal(result.releaseShaMatchReported,true);
 assert.deepEqual(result.unobservedSourceMigrations.map(n=>n.slice(0,3)),
  ['010','011','012','013','014','015','016','017']);
 assert.equal(result.operatorReportedControls.length,CONTROLS.length);
 deny(result);
});
test('release divergence, partial SQL and unsigned controls remain blockers',()=>{
 const sha=all();sha.reportedDeployedSha='b'.repeat(40);
 let result=assessPilotEvidence(sha);
 assert.ok(result.missingChecks.includes('RELEASE_SHA_NOT_MATCHED'));
 deny(result);
 const history=all();history.migrationHistory.rows.pop();
 result=assessPilotEvidence(history);
 assert.ok(result.missingChecks.includes('STAGING_HISTORY_NOT_OBSERVED_AS_001_009'));
 deny(result);
 const field=all();field.controls.isolatedRestoreAndChecksum='MISSING';
 result=assessPilotEvidence(field);
 assert.ok(result.missingChecks.some(x=>x.includes('isolatedRestoreAndChecksum')));
 deny(result);
});
test('do not accept drifting history, SQL after 009, foreign DB or arbitrary attestations',()=>{
 const bad=[];
 const sourceEvidence=all();
 const drift=copy(sourceEvidence);drift.migrationHistory.rows[7].checksum='f'.repeat(64);bad.push(drift);
 const tooMany=copy(sourceEvidence);tooMany.migrationHistory.rows.push({
  name:source[9].name,checksum:source[9].checksum,
 });bad.push(tooMany);
 const foreign=copy(sourceEvidence);foreign.migrationHistory.database='Cashier';bad.push(foreign);
 const extra=copy(sourceEvidence);extra.sqlPassword='DO_NOT_STORE';bad.push(extra);
 const secretControl=copy(sourceEvidence);secretControl.controls.sqlPassword='DO_NOT_STORE';bad.push(secretControl);
 const newCode=copy(sourceEvidence);newCode.controls.moduleEntitlementDecisionADR032='YES';bad.push(newCode);
 const malformedSha=copy(sourceEvidence);malformedSha.reviewedSha='foo';bad.push(malformedSha);
 const missingKey=copy(sourceEvidence);delete missingKey.controls.rootOwnedCheckerAndHash;bad.push(missingKey);
 const wrongHistory=copy(sourceEvidence);wrongHistory.migrationHistory.rows.reverse();bad.push(wrongHistory);
 for(const e of bad)assert.throws(()=>assessPilotEvidence(e));
});
test('CLI renders safe template and rejects invalid evidence without echoing credentials',()=>{
 const exe='tools/salon-pilot/preflight.cjs';
 const t=spawnSync(process.execPath,[exe,'--template'],{
  encoding:'utf8',cwd:require('node:path').resolve(__dirname,'..'),
 });
 assert.equal(t.status,0);assert.equal(JSON.parse(t.stdout).controls.isolatedRestoreAndChecksum,'MISSING');
 const dummy=spawnSync(process.execPath,[exe,'--input','/nonexistent/private/path'],{
  encoding:'utf8',cwd:require('node:path').resolve(__dirname,'..'),
 });
 assert.equal(dummy.status,1);
 assert.doesNotMatch(dummy.stderr,/nonexistent|password|token|secret/i);
 assert.match(dummy.stderr,/NO ACTION AUTHORIZED/);
 const sourceText=fs.readFileSync(exe,'utf8');
 assert.doesNotMatch(sourceText,/require\(['"](?:mssql|node:child_process|node:http|node:https|ssh2)['"]\)/);
});
