const test=require("node:test");
const assert=require("node:assert/strict");
const {planSyntheticPilotChange}=require("../dist/packages/kernel/src/pilot-grant-protocol");
const uuid=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
function command(kind="PROPOSED"){
 return {
  provenance:"SYNTHETIC_CI_ONLY",kind,
  scope:{tenantId:uuid(1),businessId:uuid(2),branchId:uuid(3),
    accountId:uuid(4),grantId:uuid(5)},
  expectedRevision:0,requestId:uuid(6),payloadSha256:"a".repeat(64),
  operatorAccountId:uuid(7),independentReviewerAccountId:uuid(8),
  nowUtc:"2026-11-14T10:00:00.000Z",
  releaseEvidenceReference:kind==="PROPOSED"?"release:synthetic-001":null,
  expiresAtUtc:kind==="PROPOSED"?"2026-11-15T10:00:00.000Z":null,
 };
}
function never(r){
 for(const k of ["canWriteGrant","canActivateModule","canApproveCommercial","auditWritten"])
  assert.equal(r[k],false,k);
}
test("P5B: immutable one-time proposal is NEVER persisted or active",()=>{
 const r=planSyntheticPilotChange([],command());
 assert.equal(r.status,"SIMULATED_EVENT_NOT_WRITTEN");
 assert.equal(r.plannedEvent.revision,1);
 assert.equal(r.plannedEvent.kind,"PROPOSED");
 assert.ok(Object.isFrozen(r));
 assert.ok(Object.isFrozen(r.plannedEvent.scope));
 never(r);
});
test("P5B: exact idempotency replay is no-op; same key with changed payload denies",()=>{
 const c=command(),a=planSyntheticPilotChange([],c).plannedEvent;
 let r=planSyntheticPilotChange([a],c);
 assert.equal(r.status,"SIMULATED_IDEMPOTENT_REPLAY");never(r);
 r=planSyntheticPilotChange([a],{...c,payloadSha256:"b".repeat(64)});
 assert.equal(r.reason,"IDEMPOTENCY_PAYLOAD_CONFLICT");never(r);
 r=planSyntheticPilotChange([a],{...c,kind:"REVOKED",
  releaseEvidenceReference:null,expiresAtUtc:null});
 assert.equal(r.reason,"IDEMPOTENCY_PAYLOAD_CONFLICT");
});
test("P5B: two commands on revision zero cannot both be accepted against updated snapshot",()=>{
 const first=command(),second={...command(),requestId:uuid(9)};
 const a=planSyntheticPilotChange([],first).plannedEvent;
 const stale=planSyntheticPilotChange([a],second);
 assert.equal(stale.status,"DENIED");assert.equal(stale.reason,"STALE_BUSINESS_REVISION");
 // A REAL SQL CAS is needed for concurrent requests; this is a model only.
 never(stale);
});
test("P5B: separate reviewer, operator and Pilot Account all distinct",()=>{
 for(const changes of [
  {operatorAccountId:uuid(4)},
  {independentReviewerAccountId:uuid(4)},
  {independentReviewerAccountId:uuid(7)},
 ]){const r=planSyntheticPilotChange([],{...command(),...changes});
   assert.equal(r.reason,"INVALID_SYNTHETIC_INPUT");never(r);}
});
test("P5B: revoke is a second proposed event, never a live revocation",()=>{
 const proposed=planSyntheticPilotChange([],command()).plannedEvent;
 const revoke={...command("REVOKED"),expectedRevision:1,
  requestId:uuid(10),payloadSha256:"c".repeat(64),
  nowUtc:"2026-11-14T10:01:00.000Z"};
 const r=planSyntheticPilotChange([proposed],revoke);
 assert.equal(r.status,"SIMULATED_EVENT_NOT_WRITTEN");
 assert.equal(r.plannedEvent.revision,2);
 assert.equal(r.plannedEvent.kind,"REVOKED");never(r);
 assert.equal(planSyntheticPilotChange([proposed,r.plannedEvent],{
  ...revoke,requestId:uuid(11),expectedRevision:2,
 }).reason,"NO_REVOCABLE_PROPOSAL");
 const replay=planSyntheticPilotChange([proposed,r.plannedEvent],revoke);
 assert.equal(replay.status,"SIMULATED_IDEMPOTENT_REPLAY");never(replay);
});
test("P5B: no revoke before proposal, no re-proposal over existing grant",()=>{
 let r=planSyntheticPilotChange([],command("REVOKED"));
 assert.equal(r.reason,"NO_REVOCABLE_PROPOSAL");
 const h=[planSyntheticPilotChange([],command()).plannedEvent];
 r=planSyntheticPilotChange(h,{...command(),requestId:uuid(12),expectedRevision:1});
 assert.equal(r.reason,"GRANT_ALREADY_PROPOSED");
});
test("P5B: history cannot mix another Tenant, Business, Branch or Account",()=>{
 const event=planSyntheticPilotChange([],command()).plannedEvent;
 for(const k of ["tenantId","businessId","branchId","accountId","grantId"]){
  const c=command();c.scope={...c.scope,[k]:uuid(111)};
  const r=planSyntheticPilotChange([event],c);
  assert.equal(r.reason,"INVALID_OR_CROSS_SCOPE_HISTORY");never(r);
 }
});
test("P5B: fake event logs, bad versions and duplicate requests fail closed",()=>{
 const event=planSyntheticPilotChange([],command()).plannedEvent;
 for(const hist of [
  [{...event,revision:3}],
  [event,{...event,revision:2}],
  [event,{...event,requestId:uuid(14),revision:2,kind:"PROPOSED"}],
  [{...event,independentReviewerAccountId:event.operatorAccountId}],
 ]){const r=planSyntheticPilotChange(hist,command());
   assert.equal(r.reason,"INVALID_OR_CROSS_SCOPE_HISTORY");never(r);}
});
test("P5B: malformed time, expired proposal, absent signed reference and wrong provenance deny",()=>{
 const variants=[
  {nowUtc:"2026-02-30T10:00:00.000Z"},
  {expiresAtUtc:"2026-11-13T10:00:00.000Z"},
  {releaseEvidenceReference:null},
  {provenance:"UNTRUSTED_HTTP"},
  {requestId:"nope"},
  {payloadSha256:"tampered"},
  {expectedRevision:-1},
 ];
 for(const v of variants){
  const r=planSyntheticPilotChange([],{...command(),...v});
  assert.equal(r.reason,"INVALID_SYNTHETIC_INPUT");never(r);
 }
});
test("P5B: past the last event timestamp, stale clock is denied",()=>{
 const event=planSyntheticPilotChange([],command()).plannedEvent;
 const c={...command("REVOKED"),expectedRevision:1,
  requestId:uuid(22),nowUtc:"2026-11-14T09:00:00.000Z"};
 assert.equal(planSyntheticPilotChange([event],c).reason,
  "NONMONOTONIC_OBSERVATION");
});
