const test=require("node:test");
const assert=require("node:assert/strict");
const {createVerifiedReleaseRegistry,EMPTY_PRODUCTION_RELEASE_REGISTRY}=
 require("../dist/packages/kernel/src/verified-release-registry.js");
const {evaluateSyntheticPilotAccess,PILOT_ALLOWED_ACTIONS}=
 require("../dist/packages/kernel/src/pilot-access-simulation.js");
const guid=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const markets=[{country:"EG",industry:"SALON",evidenceId:"eligibility:synthetic-ci001"}];
const sha="a".repeat(64);
function release(key,required=[]){
 return {
  key,version:"1.0.0",required,optional:[],conflicts:[],
  artifactSha256:sha,deployedArtifactSha256:sha,
  publisherId:"drvo-ci-synthetic-001",releaseApprovalId:"release:synthetic-001",
  signature:"A".repeat(86)+"==",markets,
 };
}
function registry(){
 return createVerifiedReleaseRegistry([
  release("Catalog"),release("Customers"),release("Booking",["Catalog","Customers"]),
 ],()=>true);
}
function input(){
 return {
  provenance:"SYNTHETIC_CI_ONLY",registry:registry(),
  country:"EG",industry:"SALON",nowUtc:"2026-11-14T12:00:00.000Z",
  maxApprovedDurationMinutes:1440,expectedGrantRevision:3,
  withdrawnModuleKeys:[],requestedModuleKey:"Booking",requestedAction:"booking.read",
  actor:{
   tenantId:guid(1),businessId:guid(2),branchId:guid(3),
   accountId:guid(4),accountActive:true,sessionActive:true,
   businessMembershipActive:true,branchAssignmentActive:true,
   effectiveActions:["booking.read"],
  },
  grant:{
   kind:"PILOT_NON_COMMERCIAL",tenantId:guid(1),businessId:guid(2),
   branchId:guid(3),accountId:guid(4),
   revision:3,approved:true,approvalReference:"approval:synthetic-001",
   independentReviewerId:guid(5),
   issuedAtUtc:"2026-11-14T11:00:00.000Z",
   expiresAtUtc:"2026-11-14T18:00:00.000Z",revokedAtUtc:null,
   moduleKeys:["Catalog","Customers","Booking"],allowedActions:["booking.read"],
  },
 };
}
const copy=x=>({
 ...x,actor:{...x.actor,effectiveActions:[...x.actor.effectiveActions]},
 grant:{...x.grant,moduleKeys:[...x.grant.moduleKeys],
  allowedActions:[...x.grant.allowedActions]},
 withdrawnModuleKeys:[...x.withdrawnModuleKeys],
});
function deny(r,reason){
 assert.equal(r.status,"SIMULATION_ONLY_NOT_AUTHORITY");
 assert.equal(r.wouldAllowInSyntheticScenario,false);
 assert.equal(r.reason,reason);
 for(const k of ["canIssueGrant","canEnableRuntime","canBill"])
  assert.equal(r[k],false,k);
 assert.equal(r.auditPreview.recordWritten,false);
 assert.equal(r.auditPreview.result,"SIMULATED_DENY");
}
test("P5: simulated positive case NEVER issues a grant, runtime rights, billing or audit",()=>{
 const r=evaluateSyntheticPilotAccess(input());
 assert.equal(r.status,"SIMULATION_ONLY_NOT_AUTHORITY");
 assert.equal(r.reason,"SYNTHETIC_CONDITIONS_MET");
 assert.equal(r.wouldAllowInSyntheticScenario,true);
 assert.equal(r.canIssueGrant,false);
 assert.equal(r.canEnableRuntime,false);
 assert.equal(r.canBill,false);
 assert.equal(r.auditPreview.recordWritten,false);
 assert.equal(r.auditPreview.result,"SIMULATED_ALLOW");
 assert.deepEqual([r.auditPreview.tenantId,r.auditPreview.businessId,r.auditPreview.branchId],
  [guid(1),guid(2),guid(3)]);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(Object.isFrozen(r.auditPreview),true);
 assert.ok(PILOT_ALLOWED_ACTIONS.includes("booking.read"));
 assert.ok(!PILOT_ALLOWED_ACTIONS.includes("pos.sale.post"));
});
test("P5: empty REAL SC0 production registry never permits even simulated Pilot",()=>{
 const i=input();i.registry=EMPTY_PRODUCTION_RELEASE_REGISTRY;
 deny(evaluateSyntheticPilotAccess(i),"UNRELEASED_OR_INELIGIBLE");
});
test("P5: forged Tenant, other Business, other Branch, other Account deny",()=>{
 for(const field of ["tenantId","businessId","branchId","accountId"]){
  const i=input();i.actor={...i.actor,[field]:guid(100)};
  deny(evaluateSyntheticPilotAccess(i),"UNTRUSTED_SCOPE_OR_SESSION");
 }
});
test("P5: invalid/revoked K5 actor and missing Branch assignment deny",()=>{
 for(const field of [
  "accountActive","sessionActive","businessMembershipActive","branchAssignmentActive"
 ]){
  const i=input();i.actor={...i.actor,[field]:false};
  deny(evaluateSyntheticPilotAccess(i),"UNTRUSTED_SCOPE_OR_SESSION");
 }
});
test("P5: expired, not-yet-valid and over-duration grants deny",()=>{
 let i=input();i.nowUtc=i.grant.expiresAtUtc;
 deny(evaluateSyntheticPilotAccess(i),"GRANT_NOT_YET_VALID_OR_EXPIRED");
 i=input();i.nowUtc="2026-11-14T10:00:00.000Z";
 deny(evaluateSyntheticPilotAccess(i),"GRANT_NOT_YET_VALID_OR_EXPIRED");
 i=input();i.maxApprovedDurationMinutes=100;
 deny(evaluateSyntheticPilotAccess(i),"GRANT_NOT_YET_VALID_OR_EXPIRED");
 i=input();i.grant={...i.grant,expiresAtUtc:i.grant.issuedAtUtc};
 deny(evaluateSyntheticPilotAccess(i),"GRANT_NOT_YET_VALID_OR_EXPIRED");
});
test("P5: revocation is immediately denied, including claimed future revoke",()=>{
 for(const revoked of [
  "2026-11-14T11:30:00.000Z","2026-11-15T01:00:00.000Z"
 ]){
  const i=input();i.grant={...i.grant,revokedAtUtc:revoked};
  deny(evaluateSyntheticPilotAccess(i),"GRANT_REVOKED");
 }
});
test("P5: no implicit Owner, paid or staff manage role; exact action intersection",()=>{
 let i=input();i.requestedAction="booking.manage";
 deny(evaluateSyntheticPilotAccess(i),"UNAUTHORIZED_ACTION");
 i=input();i.grant={...i.grant,allowedActions:["booking.manage"]};
 deny(evaluateSyntheticPilotAccess(i),"UNAUTHORIZED_ACTION");
 i=input();i.actor={...i.actor,effectiveActions:["booking.manage"]};
 deny(evaluateSyntheticPilotAccess(i),"UNAUTHORIZED_ACTION");
 for(const action of ["pos.sale.post","billing.manage","*","pos.draft.post"]){
  i=input();i.requestedAction=action;
  deny(evaluateSyntheticPilotAccess(i),"UNAUTHORIZED_ACTION");
 }
});
test("P5: missing Required dependencies, withdrawn releases and wrong market deny",()=>{
 let i=input();i.grant={...i.grant,moduleKeys:["Booking","Catalog"]};
 deny(evaluateSyntheticPilotAccess(i),"REQUIRED_MODULE_NOT_GRANTED");
 i=input();i.withdrawnModuleKeys=["Catalog"];
 deny(evaluateSyntheticPilotAccess(i),"RELEASE_WITHDRAWN");
 i=input();i.country="SA";
 deny(evaluateSyntheticPilotAccess(i),"UNRELEASED_OR_INELIGIBLE");
 i=input();i.requestedModuleKey="Nonexistent";
 deny(evaluateSyntheticPilotAccess(i),"UNRELEASED_OR_INELIGIBLE");
});
test("P5: approval from independent reviewer + revision are required",()=>{
 let i=input();i.grant={...i.grant,approved:false};
 deny(evaluateSyntheticPilotAccess(i),"MISSING_SEPARATE_APPROVAL");
 i=input();i.grant={...i.grant,independentReviewerId:i.actor.accountId};
 deny(evaluateSyntheticPilotAccess(i),"MISSING_SEPARATE_APPROVAL");
 i=input();i.grant={...i.grant,kind:"PAID_ENTITLEMENT"};
 deny(evaluateSyntheticPilotAccess(i),"MISSING_SEPARATE_APPROVAL");
 i=input();i.expectedGrantRevision=4;
 deny(evaluateSyntheticPilotAccess(i),"STALE_GRANT_REVISION");
});
test("P5: malformed, missing provenance, unsafe audit refs and injections deny",()=>{
 let i=input();i.provenance="FROM_HTTP_REQUEST";
 deny(evaluateSyntheticPilotAccess(i),"INVALID_SYNTHETIC_INPUT");
 i=input();i.nowUtc="2026-02-30T12:00:00.000Z";
 deny(evaluateSyntheticPilotAccess(i),"INVALID_SYNTHETIC_INPUT");
 i=input();i.grant={...i.grant,moduleKeys:["Catalog","Catalog","Booking"]};
 deny(evaluateSyntheticPilotAccess(i),"INVALID_SYNTHETIC_INPUT");
 i=input();i.grant={...i.grant,allowedActions:["*"]};
 deny(evaluateSyntheticPilotAccess(i),"INVALID_SYNTHETIC_INPUT");
 i=input();i.grant={...i.grant,approvalReference:"../../etc/secret"};
 deny(evaluateSyntheticPilotAccess(i),"MISSING_SEPARATE_APPROVAL");
 i=input();i.actor={...i.actor,accountId:"invalid-id"};
 deny(evaluateSyntheticPilotAccess(i),"INVALID_SYNTHETIC_INPUT");
 deny(evaluateSyntheticPilotAccess(null),"INVALID_SYNTHETIC_INPUT");
});
test("P5: input mutation after pure calculation cannot change frozen simulated outcome",()=>{
 const i=input();const r=evaluateSyntheticPilotAccess(i);
 i.actor.effectiveActions.push("pos.draft.manage");
 i.grant.moduleKeys.push("Injected");
 assert.equal(r.wouldAllowInSyntheticScenario,true);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(r.auditPreview.action,"booking.read");
});
