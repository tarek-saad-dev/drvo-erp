/**
 * Cashier Shift/BusinessDay -> DRVO Operations shared guard (non-posting).
 * Source: Cashier src/app/api/shift/open/route.ts and
 * src/app/api/day/close-and-open/route.ts; copied behavior is NOT a state write.
 * Only evaluate SERVER-TRUSTED scope/day/shift evidence; never use browser claims
 * to authorize custody, POS settlement, paid Expense or GL.
 */
import type {BranchScope} from "./business-day";

export type ScopedBusinessDay=Readonly<{
 scope:BranchScope;dayId:string;businessDate:string;status:"OPEN"|"CLOSED";
}>;
export type ScopedShift=Readonly<{
 scope:BranchScope;shiftId:string;dayId:string;
 status:"OPEN"|"CLOSED";actorAccountId:string;
}>;
export type ShiftReadinessInput=Readonly<{
 trustedScope:BranchScope;trustedActorAccountId:string;
 trustedExpectedDate:string;day:ScopedBusinessDay|null;shift:ScopedShift|null;
}>;
export type ShiftReadiness=Readonly<{
 state:"READY_FOR_NONFINANCIAL_WORK"|"BLOCKED";
 reasons:ReadonlyArray<
  "NO_OPEN_DAY"|"STALE_BUSINESS_DAY"|"NO_OPEN_SHIFT"|"SHIFT_DAY_MISMATCH"|"ACTOR_MISMATCH"
 >;
 financialPostingState:"NOT_AUTHORIZED";
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const guid=(x:unknown):x is string=>typeof x==="string"&&UUID.test(x);
function dateValid(x:unknown):x is string{
 if(typeof x!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const ts=Date.parse(x+"T00:00:00Z");
 return Number.isFinite(ts)&&new Date(ts).toISOString().slice(0,10)===x;
}
function scopeValid(scope:BranchScope):boolean{
 return Boolean(scope&&guid(scope.tenantId)&&guid(scope.businessId)&&guid(scope.branchId));
}
function sameScope(a:BranchScope,b:BranchScope):boolean{
 return a.tenantId===b.tenantId&&a.businessId===b.businessId&&a.branchId===b.branchId;
}
/**
 * A READY result only means the trusted operational day/shift evidence agrees.
 * It never grants financial posting/settlement; ADR-031 and verified Treasury
 * custody/Accounting remain independent required authorizations.
 */
export function evaluateShiftReadiness(input:ShiftReadinessInput):ShiftReadiness{
 if(!input||!scopeValid(input.trustedScope)||!guid(input.trustedActorAccountId)||
    !dateValid(input.trustedExpectedDate)||
    (input.day!==null&&(!input.day||!scopeValid(input.day.scope)||
      !sameScope(input.trustedScope,input.day.scope)||!guid(input.day.dayId)||
      !dateValid(input.day.businessDate)||
      !["OPEN","CLOSED"].includes(input.day.status)))||
    (input.shift!==null&&(!input.shift||!scopeValid(input.shift.scope)||
      !sameScope(input.trustedScope,input.shift.scope)||!guid(input.shift.shiftId)||
      !guid(input.shift.dayId)||!guid(input.shift.actorAccountId)||
      !["OPEN","CLOSED"].includes(input.shift.status))))
  throw new TypeError("Invalid trusted Operations evidence");
 const reasons:ShiftReadiness["reasons"][number][]=[];
 if(input.day===null||input.day.status!=="OPEN")
  reasons.push("NO_OPEN_DAY");
 else if(input.day.businessDate!==input.trustedExpectedDate)
  reasons.push("STALE_BUSINESS_DAY");
 if(input.shift===null||input.shift.status!=="OPEN")
  reasons.push("NO_OPEN_SHIFT");
 else{
  if(input.day===null||input.shift.dayId!==input.day.dayId)
   reasons.push("SHIFT_DAY_MISMATCH");
  if(input.shift.actorAccountId!==input.trustedActorAccountId)
   reasons.push("ACTOR_MISMATCH");
 }
 return {state:reasons.length?"BLOCKED":"READY_FOR_NONFINANCIAL_WORK",
  reasons,financialPostingState:"NOT_AUTHORIZED"};
}
