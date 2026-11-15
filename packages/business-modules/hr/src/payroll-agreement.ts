/**
 * Cashier CU-1 -> DRVO shared HR payroll agreement preview.
 * Source: Cashier `src/lib/payroll/payrollAgreementMath.ts`.
 * Keeps the Cashier valid-date proration rule but uses strict branch UUIDs and
 * integer minor-units, so it is NOT a cash payable, payroll approval or GL posting.
 */
export type BranchPayAgreement = Readonly<{
  branchId: string; enabled: boolean; monthlySalaryMinor: number;
}>;
export type HrScope = Readonly<{tenantId: string; businessId: string}>;
export type RetroPayAgreement = Readonly<{
  scope: HrScope; effectiveFrom: string; reason: string;
  branches: readonly BranchPayAgreement[];
}>;
export type PriorWageEvidence = Readonly<{
  branchId: string; amountMinor: number; ledgerCreditMinor: number;
}>;
export type BranchRetroImpact = Readonly<{
  branchId: string; dailyCount: number;
  oldWagesMinor: number; oldLedgerCreditsMinor: number;
  monthlySalaryMinor: number; newEntitlementMinor: number; differenceMinor: number;
}>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT = 9_000_000_000_000;
function normalizedId(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new TypeError("Invalid scoped identifier");
  return value.toLowerCase();
}
function validIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value+"T00:00:00Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10)===value;
}
function minor(value: unknown, allowNegative = false): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) ||
      Math.abs(value) > LIMIT || (!allowNegative && value < 0)) {
    throw new TypeError("Expected bounded integer currency minor units");
  }
  return value;
}
function safeNumber(value: bigint): number {
  if (value < -BigInt(LIMIT) || value > BigInt(LIMIT)) throw new RangeError("Amount too large");
  return Number(value);
}
export function prorateSalaryMinor(effectiveFrom: string, monthlySalaryMinor: number) {
  if (!validIsoDate(effectiveFrom)) throw new TypeError("Invalid agreement date");
  minor(monthlySalaryMinor);
  const year=Number(effectiveFrom.slice(0,4));
  const month=Number(effectiveFrom.slice(5,7));
  const day=Number(effectiveFrom.slice(8,10));
  const monthDays = new Date(Date.UTC(year,month,0)).getUTCDate();
  const days = monthDays-day+1;
  // Positive salary: nearest minor unit (half up), with no binary floating point drift.
  const amountMinor = safeNumber(
    (BigInt(monthlySalaryMinor)*BigInt(days)+BigInt(Math.floor(monthDays/2)))/BigInt(monthDays));
  return {days,monthDays,amountMinor};
}
export function validateRetroPayAgreement(input: RetroPayAgreement): void {
  if (!input || !input.scope ||
      !validIsoDate(input.effectiveFrom) ||
      typeof input.reason!=="string" || input.reason.trim().length<8 ||
      input.reason.length>500 ||
      !Array.isArray(input.branches) || input.branches.length<1 || input.branches.length>100) {
    throw new TypeError("Invalid salary agreement");
  }
  normalizedId(input.scope.tenantId);
  normalizedId(input.scope.businessId);
  const seen = new Set<string>();
  let active = 0;
  for (const b of input.branches) {
    if (!b || typeof b.enabled!=="boolean") throw new TypeError("Invalid Branch salary");
    const id = normalizedId(b.branchId);
    if (seen.has(id)) throw new TypeError("Duplicated Branch salary");
    seen.add(id);
    minor(b.monthlySalaryMinor);
    if (b.enabled) {active++;if(b.monthlySalaryMinor<1)throw new TypeError("Active salary required");}
  }
  if (!active) throw new TypeError("An enabled branch is required");
}
export function previewRetroSalaryAgreement(
  agreement: RetroPayAgreement, evidence: readonly PriorWageEvidence[],
): {state:"UNPOSTED_HR_PREVIEW"; impacts:BranchRetroImpact[]} {
  validateRetroPayAgreement(agreement);
  if (!Array.isArray(evidence) || evidence.length>20000) throw new TypeError("Invalid payroll evidence");
  const branchIds = new Set(agreement.branches.map(b=>normalizedId(b.branchId)));
  const totals=new Map<string,{count:number;wages:bigint;credits:bigint}>();
  for (const row of evidence) {
    if (!row || !branchIds.has(normalizedId(row.branchId))) {
      throw new TypeError("Unscoped Branch payroll evidence");
    }
    const id=normalizedId(row.branchId);
    const current=totals.get(id)??{count:0,wages:0n,credits:0n};
    current.count++;
    current.wages+=BigInt(minor(row.amountMinor,true));
    current.credits+=BigInt(minor(row.ledgerCreditMinor,true));
    totals.set(id,current);
  }
  return {state:"UNPOSTED_HR_PREVIEW",impacts:agreement.branches.filter(b=>b.enabled).map(b=>{
    const old=totals.get(normalizedId(b.branchId))??{count:0,wages:0n,credits:0n};
    const entitlement=prorateSalaryMinor(agreement.effectiveFrom,b.monthlySalaryMinor).amountMinor;
    const oldWagesMinor=safeNumber(old.wages);
    const oldLedgerCreditsMinor=safeNumber(old.credits);
    return {branchId:b.branchId,dailyCount:old.count,oldWagesMinor,oldLedgerCreditsMinor,
      monthlySalaryMinor:b.monthlySalaryMinor,newEntitlementMinor:entitlement,
      differenceMinor:safeNumber(BigInt(entitlement)-old.credits)};
  })};
}
