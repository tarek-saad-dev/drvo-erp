const test=require("node:test");
const assert=require("node:assert/strict");
const {createVerifiedReleaseRegistry}=require("../dist/packages/kernel/src/verified-release-registry");
const {previewSyntheticBusinessBundle}=require("../dist/packages/kernel/src/sc1-readonly-bundle-preview");
const uuid=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const country={country:"EG",industry:"SALON",evidenceId:"eligibility:reviewed-001"};
function release(key,required=[],optional=[],conflicts=[]){
 return {key,version:"1.0.0",required,optional,conflicts,
  artifactSha256:"a".repeat(64),deployedArtifactSha256:"a".repeat(64),
  publisherId:"drvo-fixture-001",releaseApprovalId:"reviewed:fixture-001",
  signature:"A".repeat(86)+"==",markets:[country]};
}
const registry=()=>createVerifiedReleaseRegistry([
 release("Booking",["Customers","Catalog"],["Reminders"]),
 release("Catalog"),release("Customers"),release("Reminders"),
],()=>true);
const price=(moduleKey,baseMinor,taxMinor=0,extra={})=>({
 moduleKey,priceRevision:"price:synthetic-v001",
 priceEvidenceId:"reviewed:fixture-price001",
 currency:"EGP",billingInterval:"MONTHLY",baseMinor,taxMinor,...extra,
});
const input=()=>({
 provenance:"SYNTHETIC_CI_ONLY",
 registry:registry(),tenantId:uuid(1),businessId:uuid(2),graphRevision:2,
 country:"EG",industry:"SALON",requested:["Booking"],alreadyActive:[],
 prices:[price("Catalog",1000,140),price("Customers",500,70),price("Booking",2000,280)],
});
const blocked=(result,reason)=>assert.deepEqual(result,{
 status:"UNQUOTABLE",reason,approvable:false,
});
test("SC1: transitive Required closure, deterministic order, all explicit charges and tax",()=>{
 const r=previewSyntheticBusinessBundle(input());
 assert.equal(r.status,"SIMULATION_ONLY");
 assert.equal(r.approvable,false);
 assert.deepEqual(r.lines.map(x=>x.moduleKey),["Catalog","Customers","Booking"]);
 assert.deepEqual(r.lines.map(x=>x.origin),["required","required","selected"]);
 assert.equal(r.totalNewChargesMinor,3990);
 assert.equal(r.currency,"EGP");assert.equal(r.billingInterval,"MONTHLY");
 assert.ok(r.lines.every(x=>x.priceEvidenceId==="reviewed:fixture-price001"));
 assert.ok(Object.isFrozen(r.lines));assert.ok(Object.isFrozen(r.lines[0]));
 const original=JSON.stringify(r);
 const rerun=previewSyntheticBusinessBundle(input());
 assert.equal(JSON.stringify(rerun),original);
});
test("SC1: alreadyActive prerequisite stays visible but not recharged",()=>{
 const i=input();
 i.alreadyActive=["Catalog"];
 i.prices=i.prices.filter(p=>p.moduleKey!=="Catalog");
 const r=previewSyntheticBusinessBundle(i);
 assert.equal(r.status,"SIMULATION_ONLY");
 const a=r.lines.find(x=>x.moduleKey==="Catalog");
 assert.equal(a.alreadyActive,true);assert.equal(a.origin,"existing");
 assert.equal(a.newBaseMinor,null);assert.equal(a.priceEvidenceId,null);
 assert.equal(r.totalNewChargesMinor,2850);
});
test("SC1: Optional add-on is NOT silently charged or included",()=>{
 const r=previewSyntheticBusinessBundle(input());
 assert.ok(!r.lines.some(x=>x.moduleKey==="Reminders"));
 const i=input();
 i.requested=["Booking","Reminders"];
 i.prices.push(price("Reminders",300,42));
 const optional=previewSyntheticBusinessBundle(i);
 assert.equal(optional.status,"SIMULATION_ONLY");
 assert.equal(optional.lines.some(x=>x.moduleKey==="Reminders"),true);
 assert.equal(optional.totalNewChargesMinor,4332);
});
test("SC1: missing price/Tax evidence never becomes free or approvable",()=>{
 const i=input();
 i.prices=i.prices.filter(p=>p.moduleKey!=="Catalog");
 blocked(previewSyntheticBusinessBundle(i),"MISSING_VERIFIED_PRICE");
 const x=input();
 x.prices=x.prices.map(p=>p.moduleKey==="Catalog"?{...p,taxMinor:undefined}:p);
 blocked(previewSyntheticBusinessBundle(x),"INVALID_PRICE_EVIDENCE");
});
test("SC1: unknown country/industry or unreviewed module fails closed",()=>{
 const i=input();i.country="SA";
 blocked(previewSyntheticBusinessBundle(i),"UNRELEASED_OR_INELIGIBLE");
 const x=input();x.industry="CLINIC";
 blocked(previewSyntheticBusinessBundle(x),"UNRELEASED_OR_INELIGIBLE");
 const y=input();y.requested=["Unknown"];
 blocked(previewSyntheticBusinessBundle(y),"UNRELEASED_OR_INELIGIBLE");
 const z=input();z.alreadyActive=["Unknown"];
 blocked(previewSyntheticBusinessBundle(z),"UNKNOWN_ACTIVE_MODULE");
});
test("SC1: unrelated price currency/recurrence and math overflow deny",()=>{
 const i=input();
 i.prices=i.prices.map(p=>p.moduleKey==="Catalog"?{...p,currency:"USD"}:p);
 blocked(previewSyntheticBusinessBundle(i),"INCOMPATIBLE_PRICE_POLICY");
 const x=input();
 x.prices=x.prices.map(p=>p.moduleKey==="Customers"?{...p,billingInterval:"ONE_TIME"}:p);
 blocked(previewSyntheticBusinessBundle(x),"INCOMPATIBLE_PRICE_POLICY");
 const y=input();
 y.prices=y.prices.map(p=>({...p,baseMinor:Number.MAX_SAFE_INTEGER-10,taxMinor:20}));
 blocked(previewSyntheticBusinessBundle(y),"INVALID_PRICE_EVIDENCE");
});
test("SC1: untrusted Business scope, absent revision and duplicate request deny",()=>{
 const i=input();i.businessId="attacker";
 blocked(previewSyntheticBusinessBundle(i),"MISSING_TRUSTED_SCOPE");
 const x=input();x.provenance="CLIENT_ASSERTED";
 blocked(previewSyntheticBusinessBundle(x),"MISSING_TRUSTED_SCOPE");
 const z=input();z.graphRevision=0;
 blocked(previewSyntheticBusinessBundle(z),"MISSING_TRUSTED_REVISION");
 const d=input();d.requested=["Booking","Booking"];
 blocked(previewSyntheticBusinessBundle(d),"MISSING_VERIFIED_SELECTION");
});
test("SC1: existing module conflicts, tampered price IDs and duplicate pricing deny",()=>{
 const i=input();
 i.prices.push({...i.prices[0]});
 blocked(previewSyntheticBusinessBundle(i),"INVALID_PRICE_EVIDENCE");
 const x=input();
 x.prices[0]={...x.prices[0],priceEvidenceId:""};
 blocked(previewSyntheticBusinessBundle(x),"INVALID_PRICE_EVIDENCE");
 const badRegistry=createVerifiedReleaseRegistry([
  release("A",[],[],["B"]),release("B"),
 ],()=>true);
 const y=input();y.registry=badRegistry;y.requested=["A"];y.alreadyActive=["B"];
 blocked(previewSyntheticBusinessBundle(y),"INVALID_DEPENDENCY_GRAPH");
});
