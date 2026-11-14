'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign,verify}=require('node:crypto');
const {
 canonicalRelease,canonicalMarket,reviewSyntheticReleaseAttestations,
}=require('../tools/salon-pilot/release-attestation-review.cjs');
const {createVerifiedReleaseRegistry}=require(
 '../dist/packages/kernel/src/verified-release-registry.js');
const sha='f'.repeat(64);
function fixture(){
 const pub=generateKeyPairSync('ed25519');
 const market=generateKeyPairSync('ed25519');
 const release={
  key:'Catalog',version:'1.0.0',
  required:[],optional:[],conflicts:[],
  artifactSha256:sha,deployedArtifactSha256:sha,
  publisherId:'publisher:synthetic001',
  releaseApprovalId:'release:synthetic001',
  signature:'A'.repeat(86)+'==',
  markets:[{country:'EG',industry:'SALON',evidenceId:'evidence:synthetic001'}],
 };
 const sig=value=>sign(null,Buffer.from(value),pub.privateKey).toString('base64');
 release.signature=sig(canonicalRelease(release).canonical);
 const m=release.markets[0],reviewerId='independent:synthetic001';
 const approval={
  ...m,reviewerId,
  signature:sign(null,Buffer.from(canonicalMarket(release,m,reviewerId)),
   market.privateKey).toString('base64'),
 };
 const packet={
  provenance:'SYNTHETIC_CI_ONLY',release,
  publisherPublicKeyPem:pub.publicKey.export({type:'spki',format:'pem'}),
  marketReviewerPublicKeyPem:market.publicKey.export({type:'spki',format:'pem'}),
  marketReceipts:[approval],
 };
 return {packet,pub,market};
}
function untrusted(r){
 assert.equal(r.status,'SYNTHETIC_SIGNATURES_MATCH_UNTRUSTED_KEYS');
 assert.equal(r.evidenceOrigin,'SELF_SUPPLIED_UNTRUSTED_PUBLIC_KEYS');
 for(const key of [
  'independentOperatorTrustEstablished','realDeploymentVerified',
  'realMarketComplianceVerified','canPublishProductionRelease',
  'canGrantPilotRights','canEnablePrivateAuth',
  'canActivateModules','canApplySql',
 ])assert.equal(r[key],false,key);
}
test('P5 signer: distinct synthetic Ed25519 publisher+market valid but NEVER trusted/activated',()=>{
 const {packet}=fixture(),r=reviewSyntheticReleaseAttestations(packet);
 assert.equal(r.publisherSignatureValidInFixture,true);
 assert.equal(r.marketSignaturesValidInFixture,true);
 assert.equal(r.reviewedMarketCount,1);
 assert.ok(Object.isFrozen(r));untrusted(r);
});
test('P5 signer: canonical signed release payload is EXACTLY SC-0 verifier bytes',()=>{
 const {packet,pub}=fixture();
 const {canonical}=canonicalRelease(packet.release);
 let seen='';
 const registry=createVerifiedReleaseRegistry([packet.release],(payload,sig,publisher)=>{
  seen=payload;
  assert.equal(publisher,packet.release.publisherId);
  return verify(null,Buffer.from(payload),pub.publicKey,
   Buffer.from(sig,'base64'));
 });
 assert.equal(seen,canonical);
 assert.equal(registry.eligible('EG','SALON').length,1);
 untrusted(reviewSyntheticReleaseAttestations(packet));
});
test('P5 signer: tampered module dependency, artifact SHA, version, publisher approval deny',()=>{
 const badFields=[
  {key:'Booking'},{version:'2.0.0'},
  {artifactSha256:'e'.repeat(64)},{releaseApprovalId:'release:changed0001'},
  {required:['Customers']},
 ];
 for(const changes of badFields){
  const {packet}=fixture();
  packet.release={...packet.release,...changes};
  assert.throws(()=>reviewSyntheticReleaseAttestations(packet));
 }
});
test('P5 signer: forged publisher, mismatched deployment, malformed key/signature deny',()=>{
 let x=fixture();
 x.packet.release.deployedArtifactSha256='e'.repeat(64);
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 x=fixture();
 x.packet.release.signature='A'.repeat(64);
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 x=fixture();
 x.packet.publisherPublicKeyPem=x.market.publicKey.export({type:'spki',format:'pem'});
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 x=fixture();
 x.packet.marketReviewerPublicKeyPem=x.packet.publisherPublicKeyPem;
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
});
test('P5 signer: market and issuer independence, forged country/evidence signatures deny',()=>{
 const mods=[
  p=>{p.marketReceipts[0].country='SA';},
  p=>{p.marketReceipts[0].industry='CLINIC';},
  p=>{p.marketReceipts[0].evidenceId='evidence:changed0001';},
  p=>{p.marketReceipts[0].reviewerId=p.release.publisherId;},
  p=>{p.marketReceipts=[];},
  p=>{p.marketReceipts[0].signature='B'.repeat(86)+'==';},
 ];
 for(const mod of mods){
  const x=fixture();mod(x.packet);
  assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 }
});
test('P5 signer: missing target eligibility, duplicate receipt, self-issued packet and extra secret reject',()=>{
 let x=fixture();
 x.packet.release.markets.push({country:'SA',industry:'SALON',
   evidenceId:'evidence:sa00001'});
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 x=fixture();
 x.packet.marketReceipts.push({...x.packet.marketReceipts[0]});
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 x=fixture();x.packet.provenance='PRODUCTION';
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 x=fixture();x.packet.SQL_PASSWORD='secret';
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
 x=fixture();x.packet.release.optional.push('Catalog');
 assert.throws(()=>reviewSyntheticReleaseAttestations(x.packet));
});
test('P5 signer: a fully self-signed packet cannot change production empty registry',()=>{
 const {EMPTY_PRODUCTION_RELEASE_REGISTRY}=require(
  '../dist/packages/kernel/src/verified-release-registry.js');
 const r=reviewSyntheticReleaseAttestations(fixture().packet);
 untrusted(r);
 assert.equal(EMPTY_PRODUCTION_RELEASE_REGISTRY.size,0);
 assert.deepEqual(EMPTY_PRODUCTION_RELEASE_REGISTRY.eligible('EG','SALON'),[]);
});
