const test=require("node:test");
const assert=require("node:assert/strict");
const {generateKeyPairSync,sign,verify}=require("node:crypto");
const {
 createVerifiedReleaseRegistry,EMPTY_PRODUCTION_RELEASE_REGISTRY,
}=require("../dist/packages/kernel/src/verified-release-registry.js");
const sha="f".repeat(64);
function release(key,required=[],markets=[{country:"EG",industry:"SALON",evidenceId:"eligibility:reviewed-001"}]){
 return {
  key,version:"1.0.0",required,optional:[],conflicts:[],
  artifactSha256:sha,deployedArtifactSha256:sha,
  publisherId:"drvo-reviewer-001",releaseApprovalId:"release:reviewed-001",
  signature:"A".repeat(86)+"==",markets,
 };
}
test("SC-0: production has zero reviewed releases, not candidates",()=>{
 assert.equal(EMPTY_PRODUCTION_RELEASE_REGISTRY.size,0);
 assert.deepEqual(EMPTY_PRODUCTION_RELEASE_REGISTRY.eligible("EG","SALON"),[]);
});
test("SC-0: a missing or rejecting verifier cannot authorize releases",()=>{
 assert.throws(()=>createVerifiedReleaseRegistry([release("Catalog")],()=>false),/Unverified/);
 assert.throws(()=>createVerifiedReleaseRegistry([release("Catalog")],null),/verifier/);
});
test("SC-0: canonical verified payload can be cryptographically attested with Ed25519",()=>{
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 let canonical="";
 try{createVerifiedReleaseRegistry([release("Catalog")],payload=>{
  canonical=payload;return false;
 });}catch(e){assert.match(e.message,/Unverified/);}
 assert.ok(canonical.includes('"artifactSha256"'));
 assert.ok(canonical.includes('"releaseApprovalId"'));
 const signature=sign(null,Buffer.from(canonical),privateKey).toString("base64");
 const approved={...release("Catalog"),signature};
 const v=(payload,signatureBase64,publisher)=>{
  assert.equal(publisher,"drvo-reviewer-001");
  return verify(null,Buffer.from(payload),publicKey,Buffer.from(signatureBase64,"base64"));
 };
 const registry=createVerifiedReleaseRegistry([approved],v);
 assert.equal(registry.size,1);
 assert.deepEqual(registry.eligible("EG","SALON").map(r=>r.key),["Catalog"]);
 assert.deepEqual(registry.eligible("SA","SALON"),[]);
 assert.deepEqual(registry.eligible("EG","CLINIC"),[]);
 assert.deepEqual(registry.eligible("EG","../../SALON"),[]);
 assert.throws(()=>createVerifiedReleaseRegistry([
  {...approved,releaseApprovalId:"release:changed-002"},
 ],v),/Unverified/);
});
test("SC-0: immutable deep snapshot, no caller-mutated release or market scope",()=>{
 const doc=release("Catalog");
 const original=createVerifiedReleaseRegistry([doc],()=>true);
 doc.required.push("Unsafe");
 doc.markets[0].country="SA";
 assert.deepEqual(original.eligible("EG","SALON").map(x=>x.key),["Catalog"]);
 assert.deepEqual(original.eligible("SA","SALON"),[]);
 assert.ok(Object.isFrozen(original.eligible("EG","SALON")[0]));
 assert.ok(Object.isFrozen(original.eligible("EG","SALON")[0].markets[0]));
 assert.throws(()=>original.eligible("EG","SALON")[0].required.push("Injected"),TypeError);
});
test("SC-0: malformed release, stale or missing deployment evidence and unknown market deny",()=>{
 for(const bad of [
  {...release("Catalog"),artifactSha256:"not-a-digest"},
  {...release("Catalog"),deployedArtifactSha256:"e".repeat(64)},
  {...release("Catalog"),markets:[]},
  {...release("Catalog"),publisherId:""},
  {...release("Catalog"),releaseApprovalId:""},
  {...release("Catalog"),signature:""},
  {...release("Catalog"),markets:[{country:"*",industry:"SALON",evidenceId:"x"}]},
  {...release("Catalog"),markets:[{country:"EG",industry:"SALON",evidenceId:""}]},
  {...release("Catalog"),optional:["Booking"],required:["Booking"]},
  {...release("Catalog"),required:["Catalog"]},
  {...release("Catalog"),version:"latest"},
 ]){
  assert.throws(()=>createVerifiedReleaseRegistry([bad],()=>true));
 }
});
test("SC-0: missing required, cycle, conflict, duplicate and cross-market dependency reject",()=>{
 for(const inputs of [
  [release("A",["Missing"])],
  [release("A",["B"]),release("B",["A"])],
  [release("A",["B"]),{...release("B"),conflicts:["A"]}],
  [release("A"),release("A")],
  [release("A",["B"]),release("B",[],[{country:"SA",industry:"SALON",evidenceId:"approved:sa-001"}])],
 ]){
  assert.throws(()=>createVerifiedReleaseRegistry(inputs,()=>true));
 }
});
test("SC-0: reviewed multi-module dependency closure can be eligible in exact scope",()=>{
 const r=createVerifiedReleaseRegistry([release("Booking",["Catalog"]),release("Catalog")],()=>true);
 assert.deepEqual(r.eligible("EG","SALON").map(x=>x.key),["Booking","Catalog"]);
 assert.equal(r.eligible("SA","SALON").length,0);
});
