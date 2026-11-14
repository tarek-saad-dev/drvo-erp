'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign}=require('node:crypto');
const {canonicalRelease,canonicalMarket}=
 require('../tools/salon-pilot/release-attestation-review.cjs');
const {reviewSyntheticAnchoredRelease}=
 require('../tools/salon-pilot/anchored-release-review.cjs');

function make() {
 const p=generateKeyPairSync('ed25519');
 const m=generateKeyPairSync('ed25519');
 const pubPem=p.publicKey.export({type:'spki',format:'pem'});
 const marketPem=m.publicKey.export({type:'spki',format:'pem'});
 const market={country:'EG',industry:'SALON',evidenceId:'evidence:synthetic100'};
 const release={
  key:'Booking',version:'1.0.0',required:['Catalog'],optional:[],
  conflicts:[],artifactSha256:'a'.repeat(64),
  deployedArtifactSha256:'a'.repeat(64),
  publisherId:'publisher:synthetic100',
  releaseApprovalId:'release:synthetic100',
  signature:'A'.repeat(86)+'==',markets:[market],
 };
 release.signature=sign(null,Buffer.from(canonicalRelease(release).canonical),
  p.privateKey).toString('base64');
 const reviewerId='market:synthetic100';
 const receipt={...market,reviewerId,
  signature:sign(null,Buffer.from(canonicalMarket(release,market,reviewerId)),
   m.privateKey).toString('base64')};
 const packet={
  provenance:'SYNTHETIC_CI_ONLY',release,
  publisherPublicKeyPem:pubPem,marketReviewerPublicKeyPem:marketPem,
  marketReceipts:[receipt],
 };
 const begin='2026-01-01T00:00:00.000Z';
 const end='2027-01-01T00:00:00.000Z';
 const key=(keyId,issuerId,publicKeyPem)=>({
  keyId,issuerId,publicKeyPem,notBeforeUtc:begin,
  notAfterUtc:end,revokedAtUtc:null,
 });
 const snapshot={
  provenance:'SYNTHETIC_CI_ONLY',asOfUtc:'2026-11-14T00:00:00.000Z',
  publisher:key('key:publisher100',release.publisherId,pubPem),
  marketReviewer:key('key:market100',reviewerId,marketPem),
 };
 return {packet,snapshot};
}
function denyMutations(changes) {
 for(const change of changes){
  const x=make();change(x);
  assert.throws(()=>reviewSyntheticAnchoredRelease(x.packet,x.snapshot));
 }
}
test('P5 anchor fixture: exact distinct Ed25519 keys match but NEVER authorize production',()=>{
 const x=make(),r=reviewSyntheticAnchoredRelease(x.packet,x.snapshot);
 assert.equal(r.status,'SYNTHETIC_ANCHORED_SIGNATURES_MATCH_UNTRUSTED_SNAPSHOT');
 assert.equal(r.evidenceOrigin,'CALLER_SUPPLIED_SYNTHETIC_ENROLLMENT_FIXTURE');
 assert.equal(r.syntheticKeyMatchingOnly,true);
 assert.equal(r.reviewedMarketCount,1);
 for(const field of [
  'independentOperatorTrustEstablished','realDeploymentVerified',
  'realMarketComplianceVerified','canPublishProductionRelease',
  'canGrantPilotRights','canEnablePrivateAuth','canActivateModules','canApplySql',
 ])assert.equal(r[field],false,field);
 assert.ok(Object.isFrozen(r));
});
test('P5 anchor fixture: valid attacker-generated signatures cannot substitute trusted keys',()=>{
 const attacker=make(),original=make();
 assert.throws(()=>reviewSyntheticAnchoredRelease(
  attacker.packet,original.snapshot),/not enrolled/);
 denyMutations([
  x=>{x.snapshot.publisher.publicKeyPem=x.snapshot.marketReviewer.publicKeyPem;},
  x=>{x.snapshot.marketReviewer.publicKeyPem=x.snapshot.publisher.publicKeyPem;},
  x=>{x.packet.publisherPublicKeyPem=x.packet.marketReviewerPublicKeyPem;},
 ]);
});
test('P5 anchor fixture: issuer role/key identity boundaries fail closed',()=>{
 denyMutations([
  x=>{x.snapshot.marketReviewer.issuerId=x.snapshot.publisher.issuerId;},
  x=>{x.snapshot.marketReviewer.keyId=x.snapshot.publisher.keyId;},
  x=>{x.snapshot.publisher.issuerId='publisher:other0001';},
  x=>{x.snapshot.marketReviewer.issuerId='market:other0001';},
  x=>{x.packet.marketReceipts[0].reviewerId=x.packet.release.publisherId;},
 ]);
});
test('P5 anchor fixture: expired, future, revoked and inverted validity fail closed',()=>{
 denyMutations([
  x=>{x.snapshot.publisher.notAfterUtc=x.snapshot.asOfUtc;},
  x=>{x.snapshot.publisher.notBeforeUtc='2026-12-01T00:00:00.000Z';},
  x=>{x.snapshot.marketReviewer.revokedAtUtc='2026-01-01T00:00:00.000Z';},
  x=>{x.snapshot.marketReviewer.notAfterUtc='2025-01-01T00:00:00.000Z';},
  x=>{x.snapshot.asOfUtc='2027-01-01T00:00:00.000Z';},
  x=>{x.snapshot.asOfUtc='2026-02-30T00:00:00.000Z';},
  x=>{x.snapshot.asOfUtc='not-a-date';},
 ]);
});
test('P5 anchor fixture: unknown fields, production provenance or unsupported key denied',()=>{
 denyMutations([
  x=>{x.snapshot.provenance='PRODUCTION';},
  x=>{x.snapshot.SQL_CONNECTION_STRING='secret';},
  x=>{x.snapshot.publisher.privateKey='secret';},
  x=>{x.snapshot.publisher.publicKeyPem='arbitrary';},
  x=>{x.snapshot.marketReviewer.revokedAtUtc=undefined;},
  x=>{delete x.snapshot.marketReviewer;},
  x=>{x.packet.provenance='PRODUCTION';},
 ]);
});
test('P5 anchor fixture: changed market, artifact and release signature denied',()=>{
 denyMutations([
  x=>{x.packet.marketReceipts[0].country='SA';},
  x=>{x.packet.release.version='9.9.9';},
  x=>{x.packet.release.artifactSha256='f'.repeat(64);},
  x=>{x.packet.marketReceipts=[];},
 ]);
});
