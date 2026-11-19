/**
 * Local Nest copy of packages/business-modules/operations BusinessDay + Shift readiness.
 * Keep characterization tests on the package source; Nest rootDir cannot import outside src/.
 */
export type BusinessDayAction="NO_OP"|"ROLLED_OVER"|"OPENED_MISSING_DAY";
export type BranchScope=Readonly<{tenantId:string;businessId:string;branchId:string}>;
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
export function planBusinessDay(input:Readonly<{
 scope:BranchScope;openDayDate:string|null;expectedDate:string;pastRolloverWindow:boolean;
}>):BusinessDayAction{
 if(!input||!scopeValid(input.scope)||!dateValid(input.expectedDate)||
  (input.openDayDate!==null&&!dateValid(input.openDayDate))||
  typeof input.pastRolloverWindow!=="boolean")
  throw new TypeError("Valid tenant/business/branch scope, dates and rollover flag required");
 if(input.openDayDate===input.expectedDate||
  (input.openDayDate!==null&&input.openDayDate>input.expectedDate))return "NO_OP";
 if(input.openDayDate!==null&&input.openDayDate<input.expectedDate)
  return input.pastRolloverWindow?"ROLLED_OVER":"NO_OP";
 return "OPENED_MISSING_DAY";
}
export type ShiftReadiness=Readonly<{
 state:"READY_FOR_NONFINANCIAL_WORK"|"BLOCKED";
 reasons:ReadonlyArray<
  "NO_OPEN_DAY"|"STALE_BUSINESS_DAY"|"NO_OPEN_SHIFT"|"SHIFT_DAY_MISMATCH"|"ACTOR_MISMATCH"
 >;
 financialPostingState:"NOT_AUTHORIZED";
}>;
export function evaluateShiftReadiness(input:Readonly<{
 trustedScope:BranchScope;trustedActorAccountId:string;trustedExpectedDate:string;
 day:Readonly<{scope:BranchScope;dayId:string;businessDate:string;status:"OPEN"|"CLOSED"}>|null;
 shift:Readonly<{scope:BranchScope;shiftId:string;dayId:string;status:"OPEN"|"CLOSED";
  actorAccountId:string}>|null;
}>):ShiftReadiness{
 if(!input||!scopeValid(input.trustedScope)||!guid(input.trustedActorAccountId)||
  !dateValid(input.trustedExpectedDate)||
  (input.day!==null&&(!scopeValid(input.day.scope)||!sameScope(input.trustedScope,input.day.scope)||
   !guid(input.day.dayId)||!dateValid(input.day.businessDate)||
   !["OPEN","CLOSED"].includes(input.day.status)))||
  (input.shift!==null&&(!scopeValid(input.shift.scope)||
   !sameScope(input.trustedScope,input.shift.scope)||!guid(input.shift.shiftId)||
   !guid(input.shift.dayId)||!guid(input.shift.actorAccountId)||
   !["OPEN","CLOSED"].includes(input.shift.status))))
  throw new TypeError("Invalid trusted Operations evidence");
 const reasons:ShiftReadiness["reasons"][number][]=[];
 if(input.day===null||input.day.status!=="OPEN")reasons.push("NO_OPEN_DAY");
 else if(input.day.businessDate!==input.trustedExpectedDate)reasons.push("STALE_BUSINESS_DAY");
 if(input.shift===null||input.shift.status!=="OPEN")reasons.push("NO_OPEN_SHIFT");
 else{
  if(input.day===null||input.shift.dayId!==input.day.dayId)reasons.push("SHIFT_DAY_MISMATCH");
  if(input.shift.actorAccountId!==input.trustedActorAccountId)reasons.push("ACTOR_MISMATCH");
 }
 return {state:reasons.length?"BLOCKED":"READY_FOR_NONFINANCIAL_WORK",
  reasons,financialPostingState:"NOT_AUTHORIZED"};
}
