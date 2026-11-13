'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const {candidateTemplate,CONTROLS}=require('../tools/salon-pilot/preflight.cjs');
const {pilotNextActions}=require('../tools/salon-pilot/remediation.cjs');
const {sourceManifest}=require('../tools/staging-readiness/manifest-plan.cjs');
const cwd=path.resolve(__dirname,'..');
const sha='c'.repeat(40);
function allReported(){
 const e=candidateTemplate(sha);
 e.reportedDeployedSha=sha;
 e.migrationHistory.rows=sourceManifest().slice(0,9).map(x=>({
  name:x.name,checksum:x.checksum,
 }));
 for(const control of CONTROLS)e.controls[control]='OPERATOR_REPORTED';
 return e;
}
function deny(x){
 for(const field of ['canMigrateVps','canEnableK5','canEnableModules','canInviteUsers',
  'canPostFinancialSale','paidEntitlementsEnabled','publicAuthEnabled',
  'appliedVpsSqlMigrationsVerified','realOwnerStaffBrowserExecuted',
  'independentAttestationPerformed'])assert.equal(x[field],false,field);
 assert.match(x.approval,/NO_GO/);
 assert.equal(x.evidenceOrigin,'UNTRUSTED_OPERATOR_SUBMISSION_NOT_ATTESTED');
}
test('S9 template gives ordered actionable ten-item operator backlog with no gates bypassed',()=>{
 const report=pilotNextActions(candidateTemplate(sha));
 assert.equal(report.status,'BLOCKED_SOURCE_PREPARATION');
 assert.equal(report.blockingItems,10);
 assert.equal(report.checklist.length,10);
 assert.equal(report.checklist[0].id,'RELEASE_SHA');
 assert.equal(report.checklist[1].id,'SQL_001_009');
 assert.equal(report.pendingSourceSqlMigrations.length,17);
 assert.equal(new Set(report.checklist.map(x=>x.id)).size,10);
 assert.ok(report.checklist.some(a=>a.id==='isolatedRestoreAndChecksum'));
 deny(report);
});
test('self-reported perfect evidence stays NO-GO; migration prefix 010–017 remains held',()=>{
 const report=pilotNextActions(allReported());
 assert.equal(report.blockingItems,0);
 assert.equal(report.status,'REPORTED_EVIDENCE_REQUIRES_INDEPENDENT_REVIEW');
 assert.ok(report.checklist.every(x=>x.state==='OPERATOR_REPORTED_NOT_ATTESTED'));
 assert.deepEqual(report.pendingSourceSqlMigrations.map(x=>x.slice(0,3)),
  ['010','011','012','013','014','015','016','017']);
 deny(report);
});
test('partial evidence shows exact operator next steps and blocks all actions',()=>{
 const e=allReported();e.controls.isolatedRestoreAndChecksum='MISSING';
 e.reportedDeployedSha='d'.repeat(40);
 const report=pilotNextActions(e);
 assert.equal(report.blockingItems,2);
 assert.deepEqual(report.checklist.filter(x=>x.state.startsWith('MISSING')).map(x=>x.id),
  ['RELEASE_SHA','isolatedRestoreAndChecksum']);
 deny(report);
});
test('CLI never connects to SQL/VPS, never echoes supplied paths or evidence',()=>{
 const exe='tools/salon-pilot/remediation.cjs';
 const template=spawnSync(process.execPath,[exe,'--template'],{cwd,encoding:'utf8'});
 assert.equal(template.status,0,template.stderr);
 assert.equal(JSON.parse(template.stdout).blockingItems,10);
 const bad=spawnSync(process.execPath,[exe,'--input','/private/operator/secrets.json'],{cwd,encoding:'utf8'});
 assert.equal(bad.status,1);
 assert.doesNotMatch(bad.stderr,/\/private|password|secret|token/i);
 const cli=fs.readFileSync(path.join(cwd,exe),'utf8');
 assert.doesNotMatch(cli,/require\(['"](?:mssql|ssh2|node:http|node:https|node:child_process)['"]\)/);
 assert.doesNotMatch(cli,/fetch\s*\(|process\.env\./);
});
