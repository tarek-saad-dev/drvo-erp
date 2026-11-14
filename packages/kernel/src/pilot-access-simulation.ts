import type { VerifiedReleaseRegistry, VerifiedReleaseView } from "./verified-release-registry";

/**
 * P5 Option A — PURE SYNTHETIC POLICY SIMULATOR, NOT A SECURITY ENFORCEMENT
 * POINT. Never call from HTTP handlers, workers, SQL, or entitlement checks.
 * Actual grants require independent review, authoritative server scope,
 * trustworthy release approval, current signed evidence and SQL transactions.
 */
export const PILOT_ALLOWED_ACTIONS = Object.freeze([
  "catalog.read", "catalog.manage",
  "customers.read", "customers.manage",
  "booking.read", "booking.manage",
  "pos.draft.read", "pos.draft.manage",
] as const);
export type PilotAction = typeof PILOT_ALLOWED_ACTIONS[number];

export interface SyntheticPilotActor {
  readonly tenantId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly accountId: string;
  readonly accountActive: boolean;
  readonly sessionActive: boolean;
  readonly businessMembershipActive: boolean;
  readonly branchAssignmentActive: boolean;
  /** Simulated already-verified K5 BranchRole/RolePermission intersection. */
  readonly effectiveActions: readonly string[];
}
export interface SyntheticPilotGrant {
  readonly kind: "PILOT_NON_COMMERCIAL";
  readonly tenantId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly accountId: string;
  readonly revision: number;
  readonly approved: boolean;
  readonly approvalReference: string;
  readonly independentReviewerId: string;
  readonly issuedAtUtc: string;
  readonly expiresAtUtc: string;
  readonly revokedAtUtc: string | null;
  readonly moduleKeys: readonly string[];
  readonly allowedActions: readonly string[];
}
export interface SyntheticPilotPolicyInput {
  readonly provenance: "SYNTHETIC_CI_ONLY";
  readonly actor: SyntheticPilotActor;
  readonly grant: SyntheticPilotGrant;
  readonly registry: VerifiedReleaseRegistry;
  readonly country: string;
  readonly industry: string;
  readonly nowUtc: string;
  readonly maxApprovedDurationMinutes: number;
  readonly expectedGrantRevision: number;
  readonly withdrawnModuleKeys: readonly string[];
  readonly requestedModuleKey: string;
  readonly requestedAction: string;
}
export type PilotDenyReason =
  | "INVALID_SYNTHETIC_INPUT"
  | "UNTRUSTED_SCOPE_OR_SESSION"
  | "MISSING_SEPARATE_APPROVAL"
  | "GRANT_REVOKED"
  | "GRANT_NOT_YET_VALID_OR_EXPIRED"
  | "STALE_GRANT_REVISION"
  | "UNAUTHORIZED_ACTION"
  | "UNRELEASED_OR_INELIGIBLE"
  | "REQUIRED_MODULE_NOT_GRANTED"
  | "RELEASE_WITHDRAWN"
  | "SYNTHETIC_CONDITIONS_MET";

export interface SyntheticPilotDecision {
  readonly status: "SIMULATION_ONLY_NOT_AUTHORITY";
  readonly wouldAllowInSyntheticScenario: boolean;
  readonly reason: PilotDenyReason;
  readonly canIssueGrant: false;
  readonly canEnableRuntime: false;
  readonly canBill: false;
  readonly auditPreview: Readonly<{
    readonly recordWritten: false;
    readonly tenantId: string | null;
    readonly businessId: string | null;
    readonly branchId: string | null;
    readonly accountId: string | null;
    readonly moduleKey: string | null;
    readonly action: string | null;
    readonly grantRevision: number | null;
    readonly approvalReference: string | null;
    readonly result: "SIMULATED_ALLOW" | "SIMULATED_DENY";
  }>;
}
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const REF=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const COUNTRY=/^[A-Z]{2}$/;
const INDUSTRY=/^[A-Z][A-Z0-9_]{1,39}$/;
const CANONICAL_TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}:\d{2}\.000Z$/;
// A timestamp is interpreted only as a synthetic trusted clock fixture.
function instant(value:unknown):number|null {
  if(typeof value!=="string"||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(value))return null;
  const d=Date.parse(value);
  return Number.isFinite(d)&&new Date(d).toISOString()===value?d:null;
}
function validList(input:unknown,valid:(s:string)=>boolean):input is readonly string[] {
  return Array.isArray(input)&&input.length<=100&&
    input.every(s=>typeof s==="string"&&valid(s))&&
    new Set(input).size===input.length;
}
const legalAction=(action:string)=>PILOT_ALLOWED_ACTIONS.some(a=>a===action);
function result(
  input:unknown,reason:PilotDenyReason,
):SyntheticPilotDecision {
  const i=(input&&typeof input==="object"?input:{}) as Partial<SyntheticPilotPolicyInput>;
  const a=(i.actor&&typeof i.actor==="object"?i.actor:{}) as Partial<SyntheticPilotActor>;
  const g=(i.grant&&typeof i.grant==="object"?i.grant:{}) as Partial<SyntheticPilotGrant>;
  const good=reason==="SYNTHETIC_CONDITIONS_MET";
  return Object.freeze({
    status:"SIMULATION_ONLY_NOT_AUTHORITY" as const,
    wouldAllowInSyntheticScenario:good,
    reason,
    canIssueGrant:false as const,
    canEnableRuntime:false as const,
    canBill:false as const,
    auditPreview:Object.freeze({
      recordWritten:false as const,
      tenantId:typeof a.tenantId==="string"&&GUID.test(a.tenantId)?a.tenantId:null,
      businessId:typeof a.businessId==="string"&&GUID.test(a.businessId)?a.businessId:null,
      branchId:typeof a.branchId==="string"&&GUID.test(a.branchId)?a.branchId:null,
      accountId:typeof a.accountId==="string"&&GUID.test(a.accountId)?a.accountId:null,
      moduleKey:typeof i.requestedModuleKey==="string"&&KEY.test(i.requestedModuleKey)?
        i.requestedModuleKey:null,
      action:typeof i.requestedAction==="string"&&legalAction(i.requestedAction)?
        i.requestedAction:null,
      grantRevision:Number.isSafeInteger(g.revision)&&
        (g.revision as number)>0?g.revision as number:null,
      approvalReference:typeof g.approvalReference==="string"&&
        REF.test(g.approvalReference)?g.approvalReference:null,
      result:good?"SIMULATED_ALLOW" as const:"SIMULATED_DENY" as const,
    }),
  });
}
function requiredClosure(
  moduleKey:string,byKey:ReadonlyMap<string,VerifiedReleaseView>,
):readonly string[]|null{
  const visited=new Set<string>();
  const pending=[moduleKey];
  while(pending.length){
    const key=pending.pop()!;
    if(visited.has(key))continue;
    const release=byKey.get(key);
    if(!release)return null;
    visited.add(key);
    for(const required of release.required)pending.push(required);
  }
  return [...visited];
}
export function evaluateSyntheticPilotAccess(input:SyntheticPilotPolicyInput):SyntheticPilotDecision {
  // All inputs are synthetic CI fixtures, never request parameters or trusted
  // server data. Even a positive simulation CANNOT grant actual access.
  if(!input||input.provenance!=="SYNTHETIC_CI_ONLY"||
     !input.actor||!input.grant||!input.registry||
     typeof input.registry.eligible!=="function")
    return result(input,"INVALID_SYNTHETIC_INPUT");
  const {actor:a,grant:g}=input;
  const now=instant(input.nowUtc),start=instant(g.issuedAtUtc),
    expiry=instant(g.expiresAtUtc);
  if(![a.tenantId,a.businessId,a.branchId,a.accountId,
       g.tenantId,g.businessId,g.branchId,g.accountId,
       g.independentReviewerId].every(x=>typeof x==="string"&&GUID.test(x))||
     !KEY.test(input.requestedModuleKey)||
     !COUNTRY.test(input.country)||!INDUSTRY.test(input.industry)||
     now===null||start===null||expiry===null||
     !Number.isSafeInteger(input.maxApprovedDurationMinutes)||
     input.maxApprovedDurationMinutes<=0||
     !validList(input.withdrawnModuleKeys,s=>KEY.test(s))||
     !validList(g.moduleKeys,s=>KEY.test(s))||
     !validList(g.allowedActions,legalAction)||
     !validList(a.effectiveActions,legalAction))
    return result(input,"INVALID_SYNTHETIC_INPUT");
  if(!a.accountActive||!a.sessionActive||
     !a.businessMembershipActive||!a.branchAssignmentActive||
     [a.tenantId,a.businessId,a.branchId,a.accountId].some((v,j)=>
       v!==[g.tenantId,g.businessId,g.branchId,g.accountId][j]))
    return result(input,"UNTRUSTED_SCOPE_OR_SESSION");
  if(g.kind!=="PILOT_NON_COMMERCIAL"||g.approved!==true||
     !REF.test(g.approvalReference)||g.independentReviewerId===a.accountId)
    return result(input,"MISSING_SEPARATE_APPROVAL");
  if(g.revokedAtUtc!==null){
    // Fail closed even if the claimed effective revocation is future-dated.
    return result(input,"GRANT_REVOKED");
  }
  if(start>=expiry||now<start||now>=expiry||
     (expiry-start)>input.maxApprovedDurationMinutes*60000)
    return result(input,"GRANT_NOT_YET_VALID_OR_EXPIRED");
  if(!Number.isSafeInteger(g.revision)||g.revision<=0||
     !Number.isSafeInteger(input.expectedGrantRevision)||
     g.revision!==input.expectedGrantRevision)
    return result(input,"STALE_GRANT_REVISION");
  if(!legalAction(input.requestedAction)||
     !g.allowedActions.includes(input.requestedAction)||
     !a.effectiveActions.includes(input.requestedAction))
    return result(input,"UNAUTHORIZED_ACTION");
  let releases:readonly VerifiedReleaseView[];
  try{releases=input.registry.eligible(input.country,input.industry);}
  catch{return result(input,"UNRELEASED_OR_INELIGIBLE");}
  if(!Array.isArray(releases))return result(input,"UNRELEASED_OR_INELIGIBLE");
  const byKey=new Map(releases.map(r=>[r.key,r]));
  const closure=requiredClosure(input.requestedModuleKey,byKey);
  if(!closure)return result(input,"UNRELEASED_OR_INELIGIBLE");
  if(closure.some(key=>input.withdrawnModuleKeys.includes(key)))
    return result(input,"RELEASE_WITHDRAWN");
  if(closure.some(key=>!g.moduleKeys.includes(key)))
    return result(input,"REQUIRED_MODULE_NOT_GRANTED");
  return result(input,"SYNTHETIC_CONDITIONS_MET");
}
