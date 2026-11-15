/**
 * Cashier CU-1 -> DRVO shared BusinessDay domain policy.
 * Adapted from Cashier `src/modules/operations/domain/businessDayReconciliation.ts`,
 * verified against the pinned source snapshots in tests/. NEVER opens/closes a
 * day or claims a payment: command/persistence belongs to the Operations owner.
 */
export type BusinessDayAction = "NO_OP" | "ROLLED_OVER" | "OPENED_MISSING_DAY";
export type BranchScope = Readonly<{tenantId: string; businessId: string; branchId: string}>;
export type DayPlanningInput = Readonly<{
  scope: BranchScope;
  openDayDate: string | null;
  expectedDate: string;
  pastRolloverWindow: boolean;
}>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validDay(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(date+"T00:00:00Z");
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === date;
}
export function planBusinessDay(input: DayPlanningInput): BusinessDayAction {
  if (!input || !input.scope ||
      !UUID.test(input.scope.tenantId) ||
      !UUID.test(input.scope.businessId) ||
      !UUID.test(input.scope.branchId) ||
      !validDay(input.expectedDate) ||
      (input.openDayDate !== null && !validDay(input.openDayDate)) ||
      typeof input.pastRolloverWindow !== "boolean") {
    throw new TypeError("Valid tenant/business/branch scope, dates and rollover flag required");
  }
  if (input.openDayDate === input.expectedDate ||
      (input.openDayDate !== null && input.openDayDate > input.expectedDate)) {
    return "NO_OP";
  }
  if (input.openDayDate !== null && input.openDayDate < input.expectedDate) {
    return input.pastRolloverWindow ? "ROLLED_OVER" : "NO_OP";
  }
  return "OPENED_MISSING_DAY";
}
export function needsBusinessDayMutation(action: BusinessDayAction): boolean {
  if (!["NO_OP","ROLLED_OVER","OPENED_MISSING_DAY"].includes(action)) {
    throw new TypeError("Invalid BusinessDay action");
  }
  return action !== "NO_OP";
}
