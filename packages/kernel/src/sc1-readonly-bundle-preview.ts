import { previewRequiredFixtureModules } from "./module-preview";
import type { VerifiedReleaseRegistry } from "./verified-release-registry";

/**
 * SC-1 deterministic READ-ONLY engineering calculation.
 * Never a valid commercial quote, entitlement, ACTIVE state or approval token.
 * The public/private API has no reviewed Business eligibility/pricing/revision
 * provider yet and MUST return UNQUOTABLE regardless of caller input.
 */
export interface Sc1PriceFact {
  readonly moduleKey: string;
  readonly priceRevision: string;
  readonly priceEvidenceId: string;
  readonly currency: string;
  readonly billingInterval: "ONE_TIME" | "MONTHLY";
  readonly baseMinor: number;
  readonly taxMinor: number;
}
export interface Sc1PreviewInput {
  readonly provenance: "SYNTHETIC_CI_ONLY";
  readonly registry: VerifiedReleaseRegistry;
  readonly tenantId: string;
  readonly businessId: string;
  readonly graphRevision: number;
  readonly country: string;
  readonly industry: string;
  readonly requested: readonly string[];
  readonly alreadyActive: readonly string[];
  readonly prices: readonly Sc1PriceFact[];
}
export type Sc1UnquotableReason =
  | "MISSING_TRUSTED_SCOPE"
  | "MISSING_TRUSTED_REVISION"
  | "MISSING_VERIFIED_SELECTION"
  | "UNRELEASED_OR_INELIGIBLE"
  | "INVALID_DEPENDENCY_GRAPH"
  | "UNKNOWN_ACTIVE_MODULE"
  | "MISSING_VERIFIED_PRICE"
  | "INCOMPATIBLE_PRICE_POLICY"
  | "INVALID_PRICE_EVIDENCE";
export interface Sc1PreviewLine {
  readonly moduleKey: string;
  readonly version: string;
  readonly origin: "selected" | "required" | "existing";
  readonly alreadyActive: boolean;
  /** Null != free: a currently active module is not re-quoted or rebilled. */
  readonly newBaseMinor: number | null;
  readonly newTaxMinor: number | null;
  readonly priceEvidenceId: string | null;
}
export type Sc1ReadOnlyResult =
  | Readonly<{status:"UNQUOTABLE";reason:Sc1UnquotableReason;
    approvable:false}>
  | Readonly<{status:"SIMULATION_ONLY";approvable:false;
    tenantId:string;businessId:string;graphRevision:number;
    currency:string|null;billingInterval:"ONE_TIME"|"MONTHLY"|null;
    lines:readonly Sc1PreviewLine[];totalNewChargesMinor:number;
    selectedCount:number}>;

const GUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const KEY=/^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const PRICE_REV=/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,159}$/;
const COUNTRY=/^[A-Z]{2}$/;
const INDUSTRY=/^[A-Z][A-Z0-9_]{1,39}$/;
const CURRENCY=/^[A-Z]{3}$/;
const blocked=(reason:Sc1UnquotableReason):Sc1ReadOnlyResult=>
  Object.freeze({status:"UNQUOTABLE" as const,reason,approvable:false as const});
function isKeyList(input:readonly string[]):boolean{
  return Array.isArray(input)&&input.length<=100 &&
    input.every(k=>typeof k==="string"&&KEY.test(k)) &&
    new Set(input).size===input.length;
}
function validFact(f:Sc1PriceFact):boolean{
  return !!f && typeof f.moduleKey==="string"&&KEY.test(f.moduleKey) &&
    typeof f.priceRevision==="string"&&PRICE_REV.test(f.priceRevision) &&
    typeof f.priceEvidenceId==="string"&&PRICE_REV.test(f.priceEvidenceId) &&
    typeof f.currency==="string"&&CURRENCY.test(f.currency) &&
    (f.billingInterval==="ONE_TIME"||f.billingInterval==="MONTHLY") &&
    Number.isSafeInteger(f.baseMinor)&&f.baseMinor>=0 &&
    Number.isSafeInteger(f.taxMinor)&&f.taxMinor>=0;
}
/**
 * ONLY synthetic test evidence may use this calculator. It does not create an
 * approval-quality hash, live snapshot, bill, contract or activation.
 * Incomplete or incompatible facts explicitly return UNQUOTABLE.
 */
export function previewSyntheticBusinessBundle(input:Sc1PreviewInput):Sc1ReadOnlyResult{
  if(!input||input.provenance!=="SYNTHETIC_CI_ONLY"||
     !GUID.test(input.tenantId)||!GUID.test(input.businessId))
    return blocked("MISSING_TRUSTED_SCOPE");
  if(!Number.isSafeInteger(input.graphRevision)||input.graphRevision<1)
    return blocked("MISSING_TRUSTED_REVISION");
  if(!isKeyList(input.requested)||!isKeyList(input.alreadyActive)||
     input.requested.length===0)
    return blocked("MISSING_VERIFIED_SELECTION");
  if(!COUNTRY.test(input.country)||!INDUSTRY.test(input.industry)||
     !input.registry||typeof input.registry.eligible!=="function")
    return blocked("UNRELEASED_OR_INELIGIBLE");
  const eligible=input.registry.eligible(input.country,input.industry);
  const byKey=new Map(eligible.map(x=>[x.key,x]));
  if(input.requested.some(k=>!byKey.has(k)))
    return blocked("UNRELEASED_OR_INELIGIBLE");
  if(input.alreadyActive.some(k=>!byKey.has(k)))
    return blocked("UNKNOWN_ACTIVE_MODULE");
  let plan:ReturnType<typeof previewRequiredFixtureModules>;
  try{
    // Reuse deterministic K6A/B graph algorithm as arithmetic only.
    plan=previewRequiredFixtureModules(eligible.map(m=>({
      key:m.key,version:m.version,required:m.required,
      optional:m.optional,conflicts:m.conflicts,
    })),[...input.requested],[...input.alreadyActive]);
  }catch{
    return blocked("INVALID_DEPENDENCY_GRAPH");
  }
  if(!Array.isArray(input.prices)||input.prices.length>100)
    return blocked("MISSING_VERIFIED_PRICE");
  const prices=new Map<string,Sc1PriceFact>();
  for(const price of input.prices){
    if(!validFact(price)||prices.has(price.moduleKey))
      return blocked("INVALID_PRICE_EVIDENCE");
    prices.set(price.moduleKey,price);
  }
  const lines:Sc1PreviewLine[]=[];
  let currency:string|null=null, interval:"ONE_TIME"|"MONTHLY"|null=null;
  let total=0;
  for(const item of plan.items){
    if(item.alreadyActive){
      lines.push(Object.freeze({
        moduleKey:item.key,version:item.version,origin:item.origin,
        alreadyActive:true,newBaseMinor:null,newTaxMinor:null,
        priceEvidenceId:null,
      }));
      continue;
    }
    const price=prices.get(item.key);
    if(!price)return blocked("MISSING_VERIFIED_PRICE");
    if(currency!==null && (currency!==price.currency ||
        interval!==price.billingInterval))
      return blocked("INCOMPATIBLE_PRICE_POLICY");
    currency=price.currency;interval=price.billingInterval;
    const charge=price.baseMinor+price.taxMinor;
    if(!Number.isSafeInteger(charge)||!Number.isSafeInteger(total+charge))
      return blocked("INVALID_PRICE_EVIDENCE");
    total+=charge;
    lines.push(Object.freeze({
      moduleKey:item.key,version:item.version,origin:item.origin,
      alreadyActive:false,newBaseMinor:price.baseMinor,
      newTaxMinor:price.taxMinor,priceEvidenceId:price.priceEvidenceId,
    }));
  }
  return Object.freeze({
    status:"SIMULATION_ONLY" as const, approvable:false as const,
    tenantId:input.tenantId,businessId:input.businessId,
    graphRevision:input.graphRevision,currency,
    billingInterval:interval,lines:Object.freeze(lines),
    totalNewChargesMinor:total,selectedCount:input.requested.length,
  });
}
