'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,writeFileSync,rmSync,mkdtempSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {sourceManifest}=require('../tools/staging-readiness/manifest-plan.cjs');
const {template,reconcilePost017}=require('../tools/staging-readiness/post-migration-review.cjs');
const rows=sourceManifest().map(x=>({name:x.name,checksum:x.checksum}));
const full=()=>{
 const x=template('a'.repeat(40));
 x.reportedDeployedSha=x.reviewedSha;
 x.observedAtUtc='2026-11-14T01:00:00.000Z';
 x.historyRows=rows.map(y=>({...y}));
 x.operatorObservationId='operator:synthetic-001';
 x.independentReviewerId='reviewer:synthetic-001';
 x.verifiedRestoreWitnessId='restore:synthetic-001';
 x.approvedMigrationWindowId='window:synthetic-001';
 return x;
};
function noAuthority(r){
 assert.equal(r.evidenceOrigin,'UNTRUSTED_LOCAL_OPERATOR_SUBMISSION');
 for(const k of ['independentSqlInspectionPerformed',
   'independentRestoreVerified','rootK5fPost017CheckerApproved',
   'canApplySqlOnVps','canEnablePrivateAuth','canGrantPilotRights','canInviteSalon'])
   assert.equal(r[k],false,k);
}
test('P4: blank template fails all real go gates',()=>{
 const a=reconcilePost017(template());
 assert.equal(a.status,'BLOCKED_REPORTED_HISTORY_INCOMPLETE');
 assert.equal(a.observedRows,0);
 assert.equal(a.pendingSourceMigrations.length,17);
 noAuthority(a);
});
test('P4: complete self-reported 017 checksum history is NOT independently verified',()=>{
 const a=reconcilePost017(full());
 assert.equal(a.status,'REPORTED_MATCH_NOT_ATTESTED');
 assert.equal(a.reportedK5fPrefix,true);
 assert.equal(a.reportedTarget,true);
 assert.equal(a.pendingSourceMigrations.length,0);
 assert.deepEqual(a.missing,[]);
 assert.equal(a.lastReportedMigration,'017_booking_resource_window_close.sql');
 assert.equal(Object.isFrozen(a),true);noAuthority(a);
});
test('P4: exact historic 009 observation remains blocked without post-017 proof',()=>{
 const x=full();x.historyRows=x.historyRows.slice(0,9);
 const r=reconcilePost017(x);
 assert.equal(r.observedRows,9);
 assert.equal(r.reportedK5fPrefix,true);
 assert.equal(r.reportedTarget,false);
 assert.deepEqual(r.pendingSourceMigrations.map(x=>x.slice(0,3)),
  ['010','011','012','013','014','015','016','017']);
 assert.ok(r.missing.includes('POST_017_HISTORY_NOT_REPORTED'));noAuthority(r);
});
test('P4: checksum drift, reorder, missing prefix row, extra SQL history and foreign DB deny',()=>{
 const original=full();
 for(const bad of [
  {...original,database:'Cashier'},
  {...original,historyRows:[...original.historyRows].reverse()},
  {...original,historyRows:[...original.historyRows,{name:'018_unsafe.sql',checksum:'f'.repeat(64)}]},
  {...original,historyRows:original.historyRows.map((x,i)=>i===9?{...x,checksum:'f'.repeat(64)}:x)},
  {...original,historyRows:[...original.historyRows.slice(0,4),...original.historyRows.slice(5)]},
  {...original,historyRows:[...original.historyRows.slice(0,4),
   {...original.historyRows[4],extra:'secret'},...original.historyRows.slice(5)]},
  {...original,sqlPassword:'should-not-store'},
  {...original,independentReviewerId:'/root/.ssh/id_ed25519'},
  {...original,approvedMigrationWindowId:'x'},
  {...original,observedAtUtc:'2026-02-30T01:00:00.000Z'},
  {...original,reviewedSha:'latest'},
 ])assert.throws(()=>reconcilePost017(bad));
});
test('P4: missing reviewer, restore evidence and released SHA NEVER become an approval',()=>{
 const x=full();x.independentReviewerId=null;
 x.verifiedRestoreWitnessId=null;x.reportedDeployedSha='b'.repeat(40);
 const r=reconcilePost017(x);
 assert.ok(r.missing.includes('INDEPENDENT_REVIEWER_MISSING'));
 assert.ok(r.missing.includes('INDEPENDENT_RESTORE_WITNESS_MISSING'));
 assert.ok(r.missing.includes('DEPLOYED_SHA_UNVERIFIED'));
 noAuthority(r);
});
test('P4: local CLI never connects to SQL or discloses private paths/unknown fields',()=>{
 const root=resolve(__dirname,'..'),script='tools/staging-readiness/post-migration-review.cjs';
 const t=spawnSync(process.execPath,[script,'--template'],{cwd:root,encoding:'utf8'});
 assert.equal(t.status,0,t.stderr);
 assert.deepEqual(JSON.parse(t.stdout).historyRows,[]);
 const temp=mkdtempSync(join(tmpdir(),'drvo-p4-'));
 try{
  const secret=join(temp,'private-evidence.json');
  writeFileSync(secret,JSON.stringify({...full(),privateKey:'BAD_SECRET'}));
  const bad=spawnSync(process.execPath,[script,'--input',secret],{cwd:root,encoding:'utf8'});
  assert.equal(bad.status,1);assert.ok(!bad.stderr.includes(secret));
  assert.ok(!bad.stderr.includes('BAD_SECRET'));
  const safe=join(temp,'redacted.json');writeFileSync(safe,JSON.stringify(full()));
  const ok=spawnSync(process.execPath,[script,'--input',safe],{cwd:root,encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);noAuthority(JSON.parse(ok.stdout));
  const text=readFileSync(join(root,script),'utf8');
  assert.doesNotMatch(text,/require\(['"](?:mssql|ssh2|node:http|node:https|node:child_process)['"]\)/);
 }finally{rmSync(temp,{force:true,recursive:true});}
});
