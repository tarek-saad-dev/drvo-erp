import { createCandidateModuleRegistry } from "./candidate-module-registry";

/**
 * SC-0 read-only release-evidence boundary.
 * The caller MUST supply an out-of-band trusted verifier. This module never
 * verifies a signature by assertion or trusts an unreviewed fixture. Current
 * production adapter has ZERO trust anchors and ZERO accepted releases.
 * Verifying a publisher signature does not prove jurisdictional compliance.
 */
export interface ReleaseMarketApproval {
  readonly country: string;
  readonly industry: string;
  readonly evidenceId: string;
}
export interface ReleaseEvidence {
  readonly key: string;
  readonly version: string;
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly conflicts: readonly string[];
  readonly artifactSha256: string;
  readonly deployedArtifactSha256: string;
  readonly publisherId: string;
  readonly releaseApprovalId: string;
  readonly signature: string;
  readonly markets: readonly ReleaseMarketApproval[];
}
export interface VerifiedReleaseView {
  readonly key: string;
  readonly version: string;
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly conflicts: readonly string[];
  readonly artifactSha256: string;
  readonly markets: readonly ReleaseMarketApproval[];
}
export type TrustedReleaseVerifier = (
  canonicalPayload: string,
  signature: string,
  publisherId: string,
) => boolean;
export interface VerifiedReleaseRegistry {
  readonly size: number;
  /** Market must come from an independently trusted Business eligibility source. */
  eligible(country: string, industry: string): readonly VerifiedReleaseView[];
}
const KEY=/^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const VERSION=/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const DIGEST=/^[a-f0-9]{64}$/;
const COUNTRY=/^[A-Z]{2}$/;
const INDUSTRY=/^[A-Z][A-Z0-9_]{1,39}$/;
const EVIDENCE=/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,159}$/;
const SIGNATURE=/^[A-Za-z0-9_+/-]{32,256}={0,2}$/;
function keys(value:readonly string[],label:string):readonly string[]{
  if(!Array.isArray(value))throw Error("Invalid "+label);
  const found=new Set<string>();
  for(const key of value){
    if(typeof key!=="string"||!KEY.test(key)||found.has(key))
      throw Error("Invalid or duplicate "+label);
    found.add(key);
  }
  return Object.freeze([...found].sort());
}
function normalized(raw:ReleaseEvidence):{
  evidence:Readonly<ReleaseEvidence>;
  canonical:string;
  view:VerifiedReleaseView;
}{
  if(!raw||typeof raw!=="object"||
    typeof raw.key!=="string"||!KEY.test(raw.key)||
    typeof raw.version!=="string"||!VERSION.test(raw.version)||
    typeof raw.artifactSha256!=="string"||!DIGEST.test(raw.artifactSha256)||
    raw.deployedArtifactSha256!==raw.artifactSha256||
    typeof raw.publisherId!=="string"||!EVIDENCE.test(raw.publisherId)||
    typeof raw.releaseApprovalId!=="string"||!EVIDENCE.test(raw.releaseApprovalId)||
    typeof raw.signature!=="string"||!SIGNATURE.test(raw.signature)||
    !Array.isArray(raw.markets)||raw.markets.length===0) {
    throw Error("Invalid or incomplete reviewed release evidence");
  }
  const required=keys(raw.required,"required");
  const optional=keys(raw.optional,"optional");
  const conflicts=keys(raw.conflicts,"conflicts");
  const edgeKeys=[...required,...optional,...conflicts];
  if(edgeKeys.includes(raw.key)||new Set(edgeKeys).size!==edgeKeys.length)
    throw Error("Invalid self/overlapping dependency declaration");
  const marketSet=new Set<string>();
  const markets=raw.markets.map(m=>{
    if(!m||typeof m!=="object"||
       typeof m.country!=="string"||!COUNTRY.test(m.country)||
       typeof m.industry!=="string"||!INDUSTRY.test(m.industry)||
       typeof m.evidenceId!=="string"||!EVIDENCE.test(m.evidenceId))
      throw Error("Invalid market eligibility evidence");
    const scope=m.country+":"+m.industry;
    if(marketSet.has(scope))throw Error("Duplicate market eligibility");
    marketSet.add(scope);
    return Object.freeze({country:m.country,industry:m.industry,evidenceId:m.evidenceId});
  }).sort((a,b)=>(a.country+":"+a.industry).localeCompare(b.country+":"+b.industry,"en"));
  const frozenMarkets=Object.freeze(markets);
  const release=Object.freeze({
    key:raw.key,version:raw.version,required,optional,conflicts,
    artifactSha256:raw.artifactSha256,
    deployedArtifactSha256:raw.deployedArtifactSha256,
    publisherId:raw.publisherId,
    releaseApprovalId:raw.releaseApprovalId,
    signature:raw.signature,
    markets:frozenMarkets,
  });
  // Explicit deterministic signed-payload field order; never sign user JSON.
  const canonical=JSON.stringify({
    schema:"drvo-sc0-release-v1",key:release.key,version:release.version,
    artifactSha256:release.artifactSha256,
    deployedArtifactSha256:release.deployedArtifactSha256,
    publisherId:release.publisherId,releaseApprovalId:release.releaseApprovalId,
    required,optional,conflicts,markets,
  });
  return {
    evidence:release,canonical,
    view:Object.freeze({
      key:release.key,version:release.version,required,optional,conflicts,
      artifactSha256:release.artifactSha256,markets:frozenMarkets,
    }),
  };
}
/**
 * Fail closed on missing verifier, invalid release graph or market evidence.
 * A verifier returns true only for a separately approved publisher signature.
 * No keys, approvals, publishing endpoint or production receipts are bundled.
 */
export function createVerifiedReleaseRegistry(
  input:readonly ReleaseEvidence[],
  verify:TrustedReleaseVerifier,
):VerifiedReleaseRegistry{
  if(!Array.isArray(input)||typeof verify!=="function")
    throw Error("Missing trusted release input or verifier");
  const validated=input.map(normalized);
  const seen=new Set<string>();
  for(const row of validated){
    if(seen.has(row.evidence.key))throw Error("Ambiguous duplicate module/version");
    seen.add(row.evidence.key);
    if(!verify(row.canonical,row.evidence.signature,row.evidence.publisherId))
      throw Error("Unverified release publisher approval");
  }
  const ordered=validated.sort((a,b)=>a.view.key.localeCompare(b.view.key,"en"));
  // Reuse K6B's pure REQUIRED graph and conflict validation, but NOT its
  // fixture/candidate authorization or any default pricing/activation state.
  createCandidateModuleRegistry(ordered.map(r=>({
    key:r.view.key,version:r.view.version,
    required:r.view.required,optional:r.view.optional,conflicts:r.view.conflicts,
  })));
  const byKey=new Map(ordered.map(x=>[x.view.key,x.view]));
  for(const entry of ordered){
    for(const market of entry.view.markets){
      for(const dep of entry.view.required){
        const prerequisite=byKey.get(dep);
        if(!prerequisite?.markets.some(m=>m.country===market.country&&
          m.industry===market.industry))
          throw Error("Required Module not eligible in reviewed market");
      }
    }
  }
  const result=Object.freeze(ordered.map(r=>r.view));
  return Object.freeze({
    size:result.length,
    eligible(country:string,industry:string):readonly VerifiedReleaseView[]{
      if(!COUNTRY.test(country)||!INDUSTRY.test(industry))return Object.freeze([]);
      return Object.freeze(result.filter(r=>r.markets.some(m=>
        m.country===country&&m.industry===industry)));
    },
  });
}
/**
 * SAFETY-CRITICAL production default. No trusted signer/key or evidence record
 * has been approved yet. Never replace this with sample/fixture records.
 */
export const EMPTY_PRODUCTION_RELEASE_REGISTRY:
  VerifiedReleaseRegistry=createVerifiedReleaseRegistry([],()=>false);
