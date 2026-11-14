'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,writeFileSync,rmSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {CONTROLS,ORIGIN,template,reviewNetworkEvidence}=
 require('../tools/salon-pilot/network-review.cjs');
function all(){
 const e=template('a'.repeat(40));
 e.observedOrigin=ORIGIN;e.externalWitnessReference='witness:synthetic-001';
 e.observedAtUtc='2026-11-14T12:00:00.000Z';
 e.proxyPolicyDigest='b'.repeat(64);
 for(const key of CONTROLS)e.controls[key]='OPERATOR_REPORTED';
 return e;
}
function deny(r){
 assert.equal(r.independentSecurityAttestationPerformed,false);
 assert.equal(r.externalRequestsPerformed,false);
 assert.equal(r.evidenceOrigin,'SELF_REPORTED_NOT_NETWORK_ATTESTED');
 for(const key of ['canEnablePublicK5','canInviteSalon','canApplySql','canApproveP3'])
  assert.equal(r[key],false,key);
}
test('P3 blank evidence template remains blocked and never starts network probe',()=>{
 const r=reviewNetworkEvidence(template());
 assert.equal(r.status,'BLOCKED_INCOMPLETE_EVIDENCE');
 assert.equal(r.missing.length,CONTROLS.length+4);
 deny(r);
});
test('P3 fully reported network boundary still needs independent external security review',()=>{
 const r=reviewNetworkEvidence(all());
 assert.equal(r.status,'REPORTED_REQUIRES_INDEPENDENT_REVIEW');
 assert.deepEqual(r.missing,[]);
 deny(r);
});
test('P3 missing proxy, role revocation and third-party witness remain explicit blockers',()=>{
 let e=all();e.controls.trustedNginxProxyAndRealIp='MISSING';
 assert.ok(reviewNetworkEvidence(e).missing.includes('MISSING_trustedNginxProxyAndRealIp'));
 e=all();e.controls.revokedSessionAndRoleNegativeHttp='MISSING';
 assert.ok(reviewNetworkEvidence(e).missing.includes('MISSING_revokedSessionAndRoleNegativeHttp'));
 e=all();e.externalWitnessReference=null;
 assert.ok(reviewNetworkEvidence(e).missing.includes('NO_INDEPENDENT_WITNESS_REF'));
});
test('P3 strict exact HTTPS origin and ref shape reject arbitrary domains and secret payload',()=>{
 const bad=[];
 const url=all();url.observedOrigin='https://fake.invalid';bad.push(url);
 const downgrade=all();downgrade.expectedOrigin='http://erp-stage.drvotech.com';bad.push(downgrade);
 const missing=all();delete missing.controls.strictOriginCsrfAndCookie;bad.push(missing);
 const credentials=all();credentials.sqlPassword='bad';bad.push(credentials);
 const secret=all();secret.externalWitnessReference='/etc/drvo-erp/private.env';bad.push(secret);
 const fake=all();fake.controls.externalNetworkWitness='APPROVED';bad.push(fake);
 const hash=all();hash.proxyPolicyDigest='not-a-digest';bad.push(hash);
 const time=all();time.observedAtUtc='2026-02-30T12:00:00.000Z';bad.push(time);
 const sha=all();sha.reviewedSha='latest';bad.push(sha);
 for(const e of bad)assert.throws(()=>reviewNetworkEvidence(e));
});
test('P3 CLI strict bounded input, output never reveals private filename/unknown key',()=>{
 const root=resolve(__dirname,'..');
 const tool='tools/salon-pilot/network-review.cjs';
 const t=spawnSync(process.execPath,[tool,'--template'],{cwd:root,encoding:'utf8'});
 assert.equal(t.status,0);
 assert.equal(JSON.parse(t.stdout).expectedOrigin,ORIGIN);
 const dir=mkdtempSync(join(tmpdir(),'drvo-network-check-'));
 try{
  const secretFile=join(dir,'sensitive-network-audit.json');
  writeFileSync(secretFile,JSON.stringify({...all(),privateToken:'PRIVATE_MARKER'}));
  const bad=spawnSync(process.execPath,[tool,'--input',secretFile],{cwd:root,encoding:'utf8'});
  assert.equal(bad.status,1);
  assert.ok(!bad.stderr.includes(secretFile));
  assert.ok(!bad.stderr.includes('PRIVATE_MARKER'));
  const valid=join(dir,'bounded.json');writeFileSync(valid,JSON.stringify(all()));
  const good=spawnSync(process.execPath,[tool,'--input',valid],{cwd:root,encoding:'utf8'});
  assert.equal(good.status,0);
  deny(JSON.parse(good.stdout));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
