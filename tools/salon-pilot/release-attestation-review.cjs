'use strict';
/**
 * P5 SC-0/Pilot offline CRYPTOGRAPHIC FIXTURE REVIEW only.
 * The packet supplies its OWN public keys: these are UNTRUSTED, NOT production
 * DRVO trust roots. A valid signature cannot grant a Module or Pilot rights.
 */
const {createPublicKey,verify}=require('node:crypto');
const KEY=/^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const VERSION=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const DIGEST=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,159}$/;
const COUNTRY=/^[A-Z]{2}$/;
const INDUSTRY=/^[A-Z][A-Z0-9_]{1,39}$/;
function exact(value,fields){
 if(!value||typeof value!=='object'||Array.isArray(value)||
   Object.keys(value).sort().join(',')!==[...fields].sort().join(','))
   throw new TypeError('Invalid signature packet');
}
function nameList(values){
 if(!Array.isArray(values)||values.length>100||
   values.some(x=>typeof x!=='string'||!KEY.test(x))||
   new Set(values).size!==values.length)
   throw new TypeError('Invalid module dependency list');
 return [...values].sort();
}
function b64(sig){
 if(typeof sig!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(sig))
   throw new TypeError('Invalid Ed25519 signature encoding');
 const bytes=Buffer.from(sig,'base64');
 if(bytes.length!==64||bytes.toString('base64')!==sig)
   throw new TypeError('Noncanonical signature');
 return bytes;
}
function ed25519(pem){
 if(typeof pem!=='string'||!pem.startsWith('-----BEGIN PUBLIC KEY-----\n')||
  !pem.trimEnd().endsWith('-----END PUBLIC KEY-----')||pem.length>1024)
  throw new TypeError('Only explicit Ed25519 SPKI public keys accepted');
 const key=createPublicKey(pem);
 if(key.asymmetricKeyType!=='ed25519'||key.type!=='public')
  throw new TypeError('Only Ed25519 public keys accepted');
 return key;
}
function marketTuple(m){
 exact(m,['country','industry','evidenceId']);
 if(typeof m.country!=='string'||!COUNTRY.test(m.country)||
   typeof m.industry!=='string'||!INDUSTRY.test(m.industry)||
   typeof m.evidenceId!=='string'||!ID.test(m.evidenceId))
   throw new TypeError('Invalid market approval scope');
 return Object.freeze({...m});
}
function canonicalRelease(r){
 exact(r,['key','version','required','optional','conflicts',
  'artifactSha256','deployedArtifactSha256','publisherId',
  'releaseApprovalId','signature','markets']);
 if(typeof r.key!=='string'||!KEY.test(r.key)||
   typeof r.version!=='string'||!VERSION.test(r.version)||
   typeof r.artifactSha256!=='string'||!DIGEST.test(r.artifactSha256)||
   r.deployedArtifactSha256!==r.artifactSha256||
   typeof r.publisherId!=='string'||!ID.test(r.publisherId)||
   typeof r.releaseApprovalId!=='string'||!ID.test(r.releaseApprovalId))
  throw new TypeError('Invalid publisher/release/deployed artifact data');
 b64(r.signature);
 const required=nameList(r.required),optional=nameList(r.optional),
  conflicts=nameList(r.conflicts);
 const edges=[...required,...optional,...conflicts];
 if(edges.includes(r.key)||new Set(edges).size!==edges.length)
  throw new TypeError('Overlapping/self module dependency');
 if(!Array.isArray(r.markets)||!r.markets.length||r.markets.length>30)
  throw new TypeError('Missing reviewed market');
 const markets=r.markets.map(marketTuple).sort((a,b)=>
  (a.country+':'+a.industry).localeCompare(b.country+':'+b.industry,'en'));
 if(new Set(markets.map(m=>m.country+':'+m.industry)).size!==markets.length)
  throw new TypeError('Duplicate market');
 // EXACT field sequence/schema used by SC-0 createVerifiedReleaseRegistry.
 const canonical=JSON.stringify({
  schema:'drvo-sc0-release-v1',
  key:r.key,version:r.version,artifactSha256:r.artifactSha256,
  deployedArtifactSha256:r.deployedArtifactSha256,
  publisherId:r.publisherId,releaseApprovalId:r.releaseApprovalId,
  required,optional,conflicts,markets,
 });
 return {canonical,markets};
}
function canonicalMarket(r,m,reviewerId){
 return JSON.stringify({
  schema:'drvo-market-approval-v1',
  releaseApprovalId:r.releaseApprovalId,
  artifactSha256:r.artifactSha256,
  country:m.country,industry:m.industry,evidenceId:m.evidenceId,
  reviewerId,
 });
}
/** Returns only a non-authoritative result, even when both signatures match. */
function reviewSyntheticReleaseAttestations(packet){
 exact(packet,['provenance','release','publisherPublicKeyPem',
  'marketReviewerPublicKeyPem','marketReceipts']);
 if(packet.provenance!=='SYNTHETIC_CI_ONLY')
  throw new TypeError('Production release verification NOT supported');
 const r=packet.release,{canonical,markets}=canonicalRelease(r);
 const publisherKey=ed25519(packet.publisherPublicKeyPem);
 const marketKey=ed25519(packet.marketReviewerPublicKeyPem);
 if(Buffer.from(publisherKey.export({type:'spki',format:'der'})).equals(
   Buffer.from(marketKey.export({type:'spki',format:'der'}))))
  throw new TypeError('Independent reviewer key required');
 if(!Array.isArray(packet.marketReceipts)||
  packet.marketReceipts.length!==markets.length)
  throw new TypeError('Missing independent market evidence');
 if(!verify(null,Buffer.from(canonical),publisherKey,b64(r.signature)))
  throw new Error('Publisher attestation failed');
 const byScope=new Map();
 for(const item of packet.marketReceipts){
  exact(item,['country','industry','evidenceId','reviewerId','signature']);
  const scope=marketTuple({
   country:item.country,industry:item.industry,evidenceId:item.evidenceId,
  });
  if(typeof item.reviewerId!=='string'||!ID.test(item.reviewerId)||
    item.reviewerId===r.publisherId)throw new Error('Not independently reviewed');
  const k=scope.country+':'+scope.industry;
  if(byScope.has(k))throw new Error('Duplicate review receipt');
  if(!verify(null,Buffer.from(canonicalMarket(r,scope,item.reviewerId)),
    marketKey,b64(item.signature)))throw new Error('Market approval signature failed');
  byScope.set(k,scope);
 }
 for(const m of markets){
  const actual=byScope.get(m.country+':'+m.industry);
  if(!actual||actual.evidenceId!==m.evidenceId)
   throw new Error('Approved market scope/evidence mismatch');
 }
 return Object.freeze({
  status:'SYNTHETIC_SIGNATURES_MATCH_UNTRUSTED_KEYS',
  publisherSignatureValidInFixture:true,
  marketSignaturesValidInFixture:true,
  evidenceOrigin:'SELF_SUPPLIED_UNTRUSTED_PUBLIC_KEYS',
  reviewedMarketCount:markets.length,
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
module.exports={canonicalRelease,canonicalMarket,reviewSyntheticReleaseAttestations};
