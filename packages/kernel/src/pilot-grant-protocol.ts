/**
 * P5-B: deterministic synthetic change-planning only. NOT a grant writer,
 * approval, audit log, entitlement or runtime access decision.
 * Required independent SQL/K5/release enforcement has not been authorized.
 */
export type PilotEventType="PROPOSED"|"REVOKED";
export interface PilotScope {
  readonly tenantId:string;
  readonly businessId:string;
  readonly branchId:string;
  readonly accountId:string;
  readonly grantId:string;
}
export interface PilotSyntheticEvent {
  readonly kind:PilotEventType;
  readonly scope:PilotScope;
  readonly revision:number;
  readonly requestId:string;
  readonly payloadSha256:string;
  readonly operatorAccountId:string;
  readonly independentReviewerAccountId:string;
  readonly observedAtUtc:string;
  /** Only proposal events carry a claimed reference; no verification implied. */
  readonly releaseEvidenceReference:string|null;
  readonly expiresAtUtc:string|null;
}
export interface PilotSyntheticCommand {
  readonly provenance:"SYNTHETIC_CI_ONLY";
  readonly kind:PilotEventType;
  readonly scope:PilotScope;
  readonly expectedRevision:number;
  readonly requestId:string;
  readonly payloadSha256:string;
  readonly operatorAccountId:string;
  readonly independentReviewerAccountId:string;
  readonly nowUtc:string;
  readonly releaseEvidenceReference:string|null;
  readonly expiresAtUtc:string|null;
}
export type PilotSyntheticPlan=Readonly<{
  status:"SIMULATED_EVENT_NOT_WRITTEN"|"SIMULATED_IDEMPOTENT_REPLAY"|"DENIED";
  reason:string;
  plannedEvent:PilotSyntheticEvent|null;
  canWriteGrant:false;
  canActivateModule:false;
  canApproveCommercial:false;
  auditWritten:false;
}>;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const REF=/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,127}$/;
const TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/;
function time(x:unknown):number|null{
  if(typeof x!=="string"||!TIME.test(x))return null;
  const parsed=Date.parse(x);
  return Number.isFinite(parsed)&&new Date(parsed).toISOString()===x?parsed:null;
}
function scopeValid(s:PilotScope|undefined):boolean{
  return !!s&&[s.tenantId,s.businessId,s.branchId,s.accountId,s.grantId]
    .every(v=>typeof v==="string"&&UUID.test(v));
}
function sameScope(a:PilotScope,b:PilotScope):boolean{
  return a.tenantId===b.tenantId&&a.businessId===b.businessId&&
    a.branchId===b.branchId&&a.accountId===b.accountId&&a.grantId===b.grantId;
}
const reject=(reason:string):PilotSyntheticPlan=>
  Object.freeze({
    status:"DENIED" as const,reason,plannedEvent:null,
    canWriteGrant:false as const,canActivateModule:false as const,
    canApproveCommercial:false as const,auditWritten:false as const,
  });
function allowed(e:PilotSyntheticEvent|null,reason:string,replay=false):PilotSyntheticPlan{
  return Object.freeze({
    status:(replay?"SIMULATED_IDEMPOTENT_REPLAY":"SIMULATED_EVENT_NOT_WRITTEN") as
      "SIMULATED_IDEMPOTENT_REPLAY"|"SIMULATED_EVENT_NOT_WRITTEN",
    reason,plannedEvent:e,
    canWriteGrant:false as const,canActivateModule:false as const,
    canApproveCommercial:false as const,auditWritten:false as const,
  });
}
function validFields(kind:unknown,scope:PilotScope,revision:number,
 requestId:string,digest:string,operatorId:string,reviewerId:string,
 observed:string,releaseRef:string|null,expires:string|null):boolean{
  if((kind!=="PROPOSED"&&kind!=="REVOKED")||!scopeValid(scope)||
    !Number.isSafeInteger(revision)||revision<0||
    typeof requestId!=="string"||!UUID.test(requestId)||
    typeof digest!=="string"||!HASH.test(digest)||
    typeof operatorId!=="string"||!UUID.test(operatorId)||
    typeof reviewerId!=="string"||!UUID.test(reviewerId)||
    reviewerId===operatorId||reviewerId===scope.accountId||
    operatorId===scope.accountId||time(observed)===null)return false;
  if(kind==="PROPOSED"){
    return typeof releaseRef==="string"&&REF.test(releaseRef)&&
      time(expires)!==null&&time(expires)!>time(observed)!;
  }
  return releaseRef===null&&expires===null;
}
/**
 * A command is evaluated only against a synthetic immutable event snapshot.
 * Never trusts caller event arrays as production truth. Real CAS requires an
 * audited scoped SQL transaction under a separately approved architecture.
 */
export function planSyntheticPilotChange(
  history:readonly PilotSyntheticEvent[],command:PilotSyntheticCommand,
):PilotSyntheticPlan{
  if(!command||command.provenance!=="SYNTHETIC_CI_ONLY"||
     !Array.isArray(history)||history.length>100||
     !validFields(command.kind,command.scope,command.expectedRevision,
       command.requestId,command.payloadSha256,
       command.operatorAccountId,command.independentReviewerAccountId,
       command.nowUtc,command.releaseEvidenceReference,command.expiresAtUtc))
    return reject("INVALID_SYNTHETIC_INPUT");
  const requests=new Map<string,PilotSyntheticEvent>();
  let previous:PilotSyntheticEvent|null=null;
  for(const item of history){
    if(!item||!sameScope(item.scope,command.scope)||
      !validFields(item.kind,item.scope,item.revision,
        item.requestId,item.payloadSha256,item.operatorAccountId,
        item.independentReviewerAccountId,item.observedAtUtc,
        item.releaseEvidenceReference,item.expiresAtUtc)||
      item.revision!==(previous?previous.revision+1:1)||
      (previous&&time(item.observedAtUtc)!<time(previous.observedAtUtc)!)||
      (previous&&item.kind==="PROPOSED")||
      (!previous&&item.kind!=="PROPOSED")||
      (previous?.kind==="REVOKED")||
      requests.has(item.requestId))
      return reject("INVALID_OR_CROSS_SCOPE_HISTORY");
    requests.set(item.requestId,item);
    previous=item;
  }
  const replay=requests.get(command.requestId);
  if(replay){
    // UUID retry + exact payload+operation only. Never re-executes a write.
    if(replay.payloadSha256!==command.payloadSha256||
       replay.kind!==command.kind)return reject("IDEMPOTENCY_PAYLOAD_CONFLICT");
    return allowed(replay,"REPLAY_ONLY_NO_WRITE",true);
  }
  const version=previous?previous.revision:0;
  if(version!==command.expectedRevision)return reject("STALE_BUSINESS_REVISION");
  if(command.kind==="PROPOSED"&&previous!==null)return reject("GRANT_ALREADY_PROPOSED");
  if(command.kind==="REVOKED"&&(!previous||previous.kind==="REVOKED"))
    return reject("NO_REVOCABLE_PROPOSAL");
  if(previous&&time(command.nowUtc)!<time(previous.observedAtUtc)!)
    return reject("NONMONOTONIC_OBSERVATION");
  const plannedEvent:Object=Object.freeze({
    kind:command.kind,scope:Object.freeze({...command.scope}),revision:version+1,
    requestId:command.requestId,payloadSha256:command.payloadSha256,
    operatorAccountId:command.operatorAccountId,
    independentReviewerAccountId:command.independentReviewerAccountId,
    observedAtUtc:command.nowUtc,
    releaseEvidenceReference:command.releaseEvidenceReference,
    expiresAtUtc:command.expiresAtUtc,
  });
  return allowed(plannedEvent as PilotSyntheticEvent,"SIMULATION_NO_PERSISTENCE");
}
