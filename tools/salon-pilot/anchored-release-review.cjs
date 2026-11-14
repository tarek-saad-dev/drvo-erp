'use strict';
/**
 * Offline P5 negative-trust fixture reviewer. Caller-supplied enrollment
 * snapshots are synthetic data, NOT DRVO operator-enrolled trust anchors.
 * This module MUST NOT be imported by an API, worker, or runtime grant path.
 */
const {createPublicKey}=require('node:crypto');
const {reviewSyntheticReleaseAttestations}=
 require('./release-attestation-review.cjs');

const ID=/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,159}$/;
function exact(obj,fields) {
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||
  Object.keys(obj).sort().join(',')!==[...fields].sort().join(','))
  throw new TypeError('Invalid synthetic enrollment fixture');
}
function time(value) {
 if(typeof value!=='string'||
  !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))
  throw new TypeError('Expected canonical UTC instant');
 const millis=Date.parse(value);
 if(!Number.isFinite(millis)||new Date(millis).toISOString()!==value)
  throw new TypeError('Invalid UTC instant');
 return millis;
}
function publicKey(pem) {
 if(typeof pem!=='string'||pem.length>1024||
  !pem.startsWith('-----BEGIN PUBLIC KEY-----\n')||
  !pem.trimEnd().endsWith('-----END PUBLIC KEY-----'))
  throw new TypeError('Expected Ed25519 SPKI public key');
 const key=createPublicKey(pem);
 if(key.type!=='public'||key.asymmetricKeyType!=='ed25519')
  throw new TypeError('Expected Ed25519 SPKI public key');
 return Buffer.from(key.export({type:'spki',format:'der'}));
}
function record(item,at) {
 exact(item,['keyId','issuerId','publicKeyPem','notBeforeUtc',
  'notAfterUtc','revokedAtUtc']);
 if(typeof item.keyId!=='string'||!ID.test(item.keyId)||
  typeof item.issuerId!=='string'||!ID.test(item.issuerId))
  throw new TypeError('Missing synthetic key enrollment identity');
 const start=time(item.notBeforeUtc),end=time(item.notAfterUtc);
 if(start>=end||at<start||at>=end||item.revokedAtUtc!==null)
  throw new Error('Synthetic trust key not current or explicitly revoked');
 return publicKey(item.publicKeyPem);
}
/**
 * Simulates a hypothetical pre-enrolled Publisher+Market trust root.
 * The snapshot and its timestamp are NOT independently authenticated, and
 * successful output NEVER gives runtime eligibility or grant authority.
 */
function reviewSyntheticAnchoredRelease(packet,snapshot) {
 exact(snapshot,['provenance','asOfUtc','publisher','marketReviewer']);
 if(snapshot.provenance!=='SYNTHETIC_CI_ONLY')
  throw new Error('Production trust enrollment not supported');
 const at=time(snapshot.asOfUtc);
 const pub=record(snapshot.publisher,at);
 const market=record(snapshot.marketReviewer,at);
 if(snapshot.publisher.keyId===snapshot.marketReviewer.keyId||
  snapshot.publisher.issuerId===snapshot.marketReviewer.issuerId||
  pub.equals(market))throw new Error('Distinct Publisher/Market trust required');
 if(!packet||!packet.release||!Array.isArray(packet.marketReceipts)||
  snapshot.publisher.issuerId!==packet.release.publisherId||
  packet.marketReceipts.some(x=>!x||
   x.reviewerId!==snapshot.marketReviewer.issuerId))
  throw new Error('Unenrolled signer identity');
 // Reject swapping a self-signed public key into an otherwise valid packet.
 if(!pub.equals(publicKey(packet.publisherPublicKeyPem))||
  !market.equals(publicKey(packet.marketReviewerPublicKeyPem)))
  throw new Error('Signed packet key is not enrolled in fixture');
 const result=reviewSyntheticReleaseAttestations(packet);
 return Object.freeze({
  ...result,
  status:'SYNTHETIC_ANCHORED_SIGNATURES_MATCH_UNTRUSTED_SNAPSHOT',
  evidenceOrigin:'CALLER_SUPPLIED_SYNTHETIC_ENROLLMENT_FIXTURE',
  syntheticKeyMatchingOnly:true,
  independentOperatorTrustEstablished:false,
  realDeploymentVerified:false,
  realMarketComplianceVerified:false,
  canPublishProductionRelease:false,
  canGrantPilotRights:false,
  canEnablePrivateAuth:false,
  canActivateModules:false,
  canApplySql:false,
 });
}
module.exports={reviewSyntheticAnchoredRelease};
