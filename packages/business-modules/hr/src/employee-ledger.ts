/**
 * Cashier HR-05/06/07/11 + targets -> DRVO shared HR employee-ledger PREVIEW math.
 * Sources (pin 046bf19): src/lib/hr/employee-withdrawal-buckets.ts,
 * employee-ledger-running-balance.ts, employee-ledger-liquidity.ts,
 * interBranchSettlementMath.ts, types/employee-ledger.ts and
 * payroll/employee-target/calculate-daily-target.ts.
 *
 * Everything here is integer minor units, branch-scoped, pure and NON-POSTING:
 * it never creates a cash movement, payout, payroll approval or GL entry and is
 * not an ADR-031 posting path. Differences from Cashier are deliberate:
 *  - credit "adjustment" rows are rejected (Cashier drops them from bucket balance
 *    but counts them in list totals); corrections need an explicit later contract.
 *  - tiers use integer minor-unit thresholds and basis-point rates, rounded once
 *    half-up on the final sum (same rule as Cashier decimal.js, no float drift).
 */
export const HR_LEDGER_PREVIEW_STATE = "UNPOSTED_HR_LEDGER_PREVIEW" as const;
export type LedgerDirection = "credit" | "debit";
export const LEDGER_REASONS = [
  "hourly_wage", "monthly_salary", "target", "commission", "bonus", "advance",
  "payout", "deduction", "settlement", "adjustment", "employee_funding", "tip",
  "advance_repayment",
] as const;
export type LedgerReason = typeof LEDGER_REASONS[number];
export type LedgerEntry = Readonly<{
  employeeId: string; entryDate: string; direction: LedgerDirection;
  reason: LedgerReason; amountMinor: number;
}>;
export type EmployeeLedgerSummary = Readonly<{
  employeeId: string;
  salaryCreditsMinor: number; targetCreditsMinor: number;
  fundingCreditsMinor: number; repaymentCreditsMinor: number;
  settlementCreditsMinor: number; advanceDebitsMinor: number;
  payoutDebitsMinor: number; deductionDebitsMinor: number;
  settlementDebitsMinor: number; revenueWithdrawalMinor: number;
  payoutWithinDuesMinor: number; advanceExcessMinor: number;
  balanceMinor: number; outstandingAdvanceMinor: number;
}>;
export type BranchLedgerLiquidity = Readonly<{
  cashRequiredMinor: number; employeeDebtMinor: number; netMinor: number;
}>;
export type TargetTier = Readonly<{startMinor: number; rateBp: number}>;
export type TargetBreakdownRow = Readonly<{
  fromMinor: number; toMinor: number | null; eligibleMinor: number; rateBp: number;
}>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT = 9_000_000_000_000;
const MAX_ENTRIES = 500;
const MAX_TIERS = 50;
const REASONS: ReadonlySet<string> = new Set(LEDGER_REASONS);
const CREDIT_ONLY: ReadonlySet<string> = new Set([
  "hourly_wage", "monthly_salary", "target", "commission", "bonus",
  "employee_funding", "tip", "advance_repayment",
]);
const DEBIT_ONLY: ReadonlySet<string> = new Set(["advance", "payout", "deduction", "adjustment"]);

function validIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ts = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(ts) && new Date(ts).toISOString().slice(0, 10) === value;
}
function positiveMinor(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > LIMIT)
    throw new TypeError("Expected positive bounded integer minor units");
  return value;
}
function nonNegativeMinor(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > LIMIT)
    throw new TypeError("Expected non-negative bounded integer minor units");
  return value;
}
function signedMinor(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > LIMIT)
    throw new TypeError("Expected bounded integer minor units");
  return value;
}
function toNumber(value: bigint): number {
  if (value < -BigInt(LIMIT) || value > BigInt(LIMIT)) throw new RangeError("Amount too large");
  return Number(value);
}
function minBig(a: bigint, b: bigint): bigint { return a < b ? a : b; }
function maxBig(a: bigint, b: bigint): bigint { return a > b ? a : b; }

export function normalizeLedgerEntries(entries: readonly LedgerEntry[]): LedgerEntry[] {
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES)
    throw new TypeError("Invalid ledger entries");
  return entries.map((e) => {
    if (!e || typeof e.employeeId !== "string" || !UUID.test(e.employeeId) ||
        !validIsoDate(e.entryDate) ||
        (e.direction !== "credit" && e.direction !== "debit") ||
        typeof e.reason !== "string" || !REASONS.has(e.reason))
      throw new TypeError("Invalid ledger entry");
    if ((e.direction === "credit" && DEBIT_ONLY.has(e.reason)) ||
        (e.direction === "debit" && CREDIT_ONLY.has(e.reason)))
      throw new TypeError("Ledger reason does not match direction");
    return {
      employeeId: e.employeeId.toLowerCase(), entryDate: e.entryDate,
      direction: e.direction, reason: e.reason, amountMinor: positiveMinor(e.amountMinor),
    };
  });
}

/** Input is newest-first (Cashier UI order); balance is chronological credit - debit. */
export function attachRunningBalances<T extends Readonly<{direction: LedgerDirection; amountMinor: number}>>(
  entriesNewestFirst: readonly T[],
): Array<T & {runningBalanceMinor: number}> {
  if (!Array.isArray(entriesNewestFirst) || entriesNewestFirst.length > MAX_ENTRIES)
    throw new TypeError("Invalid ledger entries");
  const balances: number[] = new Array(entriesNewestFirst.length).fill(0);
  let running = 0n;
  for (let i = entriesNewestFirst.length - 1; i >= 0; i--) {
    const entry = entriesNewestFirst[i] as T;
    const amount = BigInt(positiveMinor(entry.amountMinor));
    running += entry.direction === "credit" ? amount : -amount;
    balances[i] = toNumber(running);
  }
  return entriesNewestFirst.map((entry, i) => ({...entry, runningBalanceMinor: balances[i] as number}));
}

/** Per-employee statement, newest first (date desc, later input first), with running balance. */
export function buildEmployeeStatements(entries: readonly LedgerEntry[]): Array<{
  employeeId: string;
  entries: Array<LedgerEntry & {runningBalanceMinor: number}>;
}> {
  const rows = normalizeLedgerEntries(entries).map((entry, index) => ({entry, index}));
  const byEmployee = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byEmployee.get(row.entry.employeeId) ?? [];
    list.push(row);
    byEmployee.set(row.entry.employeeId, list);
  }
  return Array.from(byEmployee.keys()).sort().map((employeeId) => {
    const list = (byEmployee.get(employeeId) as typeof rows).slice().sort((a, b) =>
      a.entry.entryDate === b.entry.entryDate ? b.index - a.index :
        (a.entry.entryDate < b.entry.entryDate ? 1 : -1));
    return {employeeId, entries: attachRunningBalances(list.map((r) => r.entry))};
  });
}

/** Funding/repayment covers advances first, then payouts (Cashier computeEmployeeWithdrawalBuckets). */
export function computeWithdrawalBuckets(input: Readonly<{
  advanceDebitsMinor: number; payoutDebitsMinor: number; coverCreditsMinor: number;
}>): {moneyTakenMinor: number; payoutWithinDuesMinor: number;
  revenueWithdrawalMinor: number; advanceExcessMinor: number} {
  const advance = BigInt(nonNegativeMinor(input.advanceDebitsMinor));
  const payout = BigInt(nonNegativeMinor(input.payoutDebitsMinor));
  const cover = BigInt(nonNegativeMinor(input.coverCreditsMinor));
  const advCovered = minBig(advance, cover);
  const payCovered = minBig(payout, cover - advCovered);
  return {
    moneyTakenMinor: toNumber(advance + payout),
    payoutWithinDuesMinor: toNumber(payout - payCovered),
    revenueWithdrawalMinor: toNumber(advCovered + payCovered),
    advanceExcessMinor: toNumber(advance - advCovered),
  };
}

export function summarizeLedgerByEmployee(entries: readonly LedgerEntry[]): EmployeeLedgerSummary[] {
  const rows = normalizeLedgerEntries(entries);
  const acc = new Map<string, Record<string, bigint>>();
  for (const e of rows) {
    const a = acc.get(e.employeeId) ?? {
      salary: 0n, target: 0n, funding: 0n, repayment: 0n, settleCredit: 0n,
      advance: 0n, payout: 0n, deduction: 0n, settleDebit: 0n,
    };
    const amount = BigInt(e.amountMinor);
    const bump = (key: string) => { a[key] = (a[key] as bigint) + amount; };
    if (e.direction === "credit") {
      if (e.reason === "hourly_wage" || e.reason === "monthly_salary") bump("salary");
      else if (e.reason === "target" || e.reason === "commission" || e.reason === "bonus") bump("target");
      else if (e.reason === "employee_funding" || e.reason === "tip") bump("funding");
      else if (e.reason === "advance_repayment") bump("repayment");
      else bump("settleCredit");
    } else if (e.reason === "advance") bump("advance");
    else if (e.reason === "payout") bump("payout");
    else if (e.reason === "settlement") bump("settleDebit");
    else bump("deduction");
    acc.set(e.employeeId, a);
  }
  return Array.from(acc.keys()).sort().map((employeeId) => {
    const a = acc.get(employeeId) as Record<string, bigint>;
    const v = (k: string) => a[k] as bigint;
    const buckets = computeWithdrawalBuckets({
      advanceDebitsMinor: toNumber(v("advance")), payoutDebitsMinor: toNumber(v("payout")),
      coverCreditsMinor: toNumber(v("funding") + v("repayment")),
    });
    const balance = v("salary") + v("target") + v("funding") + v("repayment") +
      (v("settleCredit") - v("settleDebit")) - v("payout") - v("advance") - v("deduction");
    return {
      employeeId,
      salaryCreditsMinor: toNumber(v("salary")), targetCreditsMinor: toNumber(v("target")),
      fundingCreditsMinor: toNumber(v("funding")), repaymentCreditsMinor: toNumber(v("repayment")),
      settlementCreditsMinor: toNumber(v("settleCredit")),
      advanceDebitsMinor: toNumber(v("advance")), payoutDebitsMinor: toNumber(v("payout")),
      deductionDebitsMinor: toNumber(v("deduction")),
      settlementDebitsMinor: toNumber(v("settleDebit")),
      revenueWithdrawalMinor: buckets.revenueWithdrawalMinor,
      payoutWithinDuesMinor: buckets.payoutWithinDuesMinor,
      advanceExcessMinor: buckets.advanceExcessMinor,
      balanceMinor: toNumber(balance),
      outstandingAdvanceMinor: toNumber(maxBig(0n, -balance)),
    };
  });
}

/** Cash needed for positive balances without netting another employee's debt. */
export function summarizeBranchLiquidity(
  summaries: readonly Pick<EmployeeLedgerSummary, "balanceMinor">[],
): BranchLedgerLiquidity {
  let required = 0n, debt = 0n;
  for (const s of summaries) {
    const b = BigInt(signedMinor(s.balanceMinor));
    if (b > 0n) required += b; else if (b < 0n) debt -= b;
  }
  return {cashRequiredMinor: toNumber(required), employeeDebtMinor: toNumber(debt),
    netMinor: toNumber(required - debt)};
}

export function previewAdvanceRepayment(balanceMinor: number, amountMinor: number): {
  state: typeof HR_LEDGER_PREVIEW_STATE; outstandingBeforeMinor: number;
  repaymentMinor: number; outstandingAfterMinor: number; balanceAfterMinor: number;
} {
  const balance = BigInt(signedMinor(balanceMinor));
  const amount = BigInt(positiveMinor(amountMinor));
  const outstanding = maxBig(0n, -balance);
  if (outstanding <= 0n) throw new RangeError("No outstanding advance");
  if (amount > outstanding) throw new RangeError("Repayment exceeds outstanding advance");
  const after = balance + amount;
  return {state: HR_LEDGER_PREVIEW_STATE, outstandingBeforeMinor: toNumber(outstanding),
    repaymentMinor: toNumber(amount), outstandingAfterMinor: toNumber(maxBig(0n, -after)),
    balanceAfterMinor: toNumber(after)};
}

/** Advance may exceed accrued dues; the excess becomes outstanding employee debt. */
export function previewAdvanceDisbursement(balanceMinor: number, amountMinor: number): {
  state: typeof HR_LEDGER_PREVIEW_STATE; coveredByDuesMinor: number;
  becomesOutstandingMinor: number; balanceAfterMinor: number; outstandingAfterMinor: number;
} {
  const balance = BigInt(signedMinor(balanceMinor));
  const amount = BigInt(positiveMinor(amountMinor));
  const covered = minBig(amount, maxBig(0n, balance));
  const after = balance - amount;
  return {state: HR_LEDGER_PREVIEW_STATE, coveredByDuesMinor: toNumber(covered),
    becomesOutstandingMinor: toNumber(amount - covered), balanceAfterMinor: toNumber(after),
    outstandingAfterMinor: toNumber(maxBig(0n, -after))};
}

/** Cashier computeMaxSettlementAmount: min(positive source, abs(negative destination)). */
export function computeMaxSettlementMinor(sourceBalanceMinor: number, destBalanceMinor: number): number {
  const src = BigInt(signedMinor(sourceBalanceMinor));
  const dst = BigInt(signedMinor(destBalanceMinor));
  if (src <= 0n || dst >= 0n) return 0;
  return toNumber(minBig(src, -dst));
}

function normalizeTiers(tiers: readonly TargetTier[], sortTiers: boolean): TargetTier[] {
  if (!Array.isArray(tiers) || tiers.length < 1 || tiers.length > MAX_TIERS)
    throw new TypeError("Invalid target tiers");
  const mapped = tiers.map((t) => {
    if (!t) throw new TypeError("Invalid target tier");
    const startMinor = nonNegativeMinor(t.startMinor);
    if (typeof t.rateBp !== "number" || !Number.isSafeInteger(t.rateBp) ||
        t.rateBp < 0 || t.rateBp > 10_000) throw new TypeError("Invalid target rate");
    return {startMinor, rateBp: t.rateBp};
  });
  const ordered = sortTiers ? [...mapped].sort((a, b) => a.startMinor - b.startMinor) : mapped;
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1] as TargetTier, cur = ordered[i] as TargetTier;
    if (cur.startMinor === prev.startMinor) throw new TypeError("Duplicate target tier start");
    if (cur.startMinor < prev.startMinor) throw new TypeError("Target tiers must ascend");
  }
  return ordered;
}

/** Progressive marginal target; tiers apply to the sales basis supplied (MTD in Cashier). */
export function calculateTargetMinor(
  salesMinor: number, tiers: readonly TargetTier[], options?: {sortTiers?: boolean},
): {salesMinor: number; targetMinor: number; activeTierIndex: number | null;
  breakdown: TargetBreakdownRow[]} {
  const sales = BigInt(nonNegativeMinor(salesMinor));
  const ordered = normalizeTiers(tiers, options?.sortTiers === true);
  let numerator = 0n;
  let active: number | null = null;
  const breakdown = ordered.map((tier, i) => {
    const from = BigInt(tier.startMinor);
    const next = ordered[i + 1];
    const to = next ? BigInt(next.startMinor) : null;
    let eligible = 0n;
    if (sales > from) eligible = minBig(sales, to ?? sales) - from;
    if (eligible < 0n) eligible = 0n;
    numerator += eligible * BigInt(tier.rateBp);
    if (eligible > 0n) active = i + 1;
    return {fromMinor: tier.startMinor, toMinor: next ? next.startMinor : null,
      eligibleMinor: toNumber(eligible), rateBp: tier.rateBp};
  });
  // numerator is minor*bp; /10000 -> minor, rounded once half-up.
  const targetMinor = toNumber((numerator + 5_000n) / 10_000n);
  return {salesMinor: toNumber(sales), targetMinor, activeTierIndex: active, breakdown};
}

/** Day payable = target(MTD sales through the day) - target(MTD sales through prior day). */
export function calculateMtdDayTarget(
  mtdSalesMinor: number, priorMtdSalesMinor: number, tiers: readonly TargetTier[],
): {mtdTargetMinor: number; priorMtdTargetMinor: number; dayDeltaMinor: number;
  activeTierIndex: number | null; breakdown: TargetBreakdownRow[]} {
  const today = calculateTargetMinor(mtdSalesMinor, tiers);
  const prior = calculateTargetMinor(priorMtdSalesMinor, tiers);
  return {mtdTargetMinor: today.targetMinor, priorMtdTargetMinor: prior.targetMinor,
    dayDeltaMinor: today.targetMinor - prior.targetMinor,
    activeTierIndex: today.activeTierIndex, breakdown: today.breakdown};
}
