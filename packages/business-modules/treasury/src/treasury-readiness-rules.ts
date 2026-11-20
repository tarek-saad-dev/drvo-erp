/**
 * Treasury / Operations NON-POSTING readiness rules.
 * Adapted from Cashier pin 046bf19 (see _cashier_source/operations + _cashier_source/treasury):
 *  - treasuryCashMoveFilters.ts / liveCashMoveSql.ts  -> movement filters + "live" predicate
 *  - shiftOperationalGate.ts / viewOperationalState.ts -> shift write gate classification
 *  - handoffShiftSession.ts / invariants.ts            -> one-OPEN-shift-per-actor handoff plan
 *  - closeBusinessDay.ts / businessDayReconciliation.ts -> day-close readiness + catch-up plan
 *  - treasuryGroupDailyService.ts                      -> daily aggregation (rails, not payment methods)
 * Pure functions only: no SQL, no clock, no mutation. Nothing here closes a day, closes a shift,
 * moves cash, posts GL or settles anything (ADR-031 gate preserved).
 * apps/api/src/treasury/treasury-readiness-rules.ts is a byte-identical Nest copy because Nest's
 * rootDir cannot import outside src/; tests/treasury-readiness-source.test.cjs enforces equality.
 */
export const TREASURY_READINESS_STATE = "NONPOSTING_TREASURY_DAY_READINESS_PREVIEW" as const;
export const RAILS = ["CASH", "CARD", "BANK", "OTHER"] as const;
export const DIRECTIONS = ["IN", "OUT", "TRANSFER"] as const;
export const CURRENCIES = ["EGP", "SAR", "AED", "USD"] as const;
export type Rail = typeof RAILS[number];
export type Direction = typeof DIRECTIONS[number];
export type Currency = typeof CURRENCIES[number];

export type MovementRow = Readonly<{
  movementId: string; dayId: string; shiftId: string; direction: Direction;
  amountMinor: number; currency: Currency; fromRail: Rail; toRail: Rail;
  status: "RECORDED" | "CANCELLED"; createdAtUtc: string;
}>;
export type ReconRow = Readonly<{
  reconId: string; dayId: string; shiftId: string; rail: Rail;
  systemMinor: number; countedMinor: number; varianceMinor: number;
}>;
export type ShiftRow = Readonly<{
  shiftId: string; dayId: string; actorAccountId: string; status: "OPEN" | "CLOSED";
}>;
export type DayRow = Readonly<{ dayId: string; businessDate: string; status: "OPEN" | "CLOSED" }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const guid = (x: unknown): x is string => typeof x === "string" && UUID.test(x);
function dateValid(x: unknown): x is string {
  if (typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const ts = Date.parse(x + "T00:00:00Z");
  return Number.isFinite(ts) && new Date(ts).toISOString().slice(0, 10) === x;
}
function oneOf<T extends string>(list: readonly T[], x: unknown): x is T {
  return typeof x === "string" && (list as readonly string[]).includes(x);
}
function safeAdd(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(sum)) throw new TypeError("Minor-unit total exceeds safe integer range");
  return sum;
}

/** Cashier liveCashMovePredicate analog: cancelled originals never count toward live totals. */
export function isLiveMovement(m: Pick<MovementRow, "status">): boolean {
  return m.status === "RECORDED";
}

// ---------------------------------------------------------------- movement filters (TR-02)
export type MovementFilters = Readonly<{
  dayId: string | null; shiftId: string | null; direction: Direction | null;
  rail: Rail | null; currency: Currency | null; status: "LIVE" | "ALL";
  dateFrom: string | null; dateTo: string | null;
}>;
const FILTER_KEYS = ["dayId", "shiftId", "direction", "rail", "currency", "status",
  "dateFrom", "dateTo"] as const;
/**
 * Strict filter normalizer. Mirrors appendTreasuryCashMoveFilters vocabulary
 * (newDay->dayId, shiftMoveId->shiftId, dateFrom/dateTo) and adds direction/rail/currency.
 * Branch scoping is never a filter: it always comes from the trusted session scope.
 */
export function normalizeMovementFilters(raw: unknown): MovementFilters {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    throw new TypeError("Filters must be an object");
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o))
    if (!(FILTER_KEYS as readonly string[]).includes(k)) throw new TypeError("Unknown filter " + k);
  const get = (k: string) => (o[k] === undefined || o[k] === null || o[k] === "" ? null : o[k]);
  const dayId = get("dayId"), shiftId = get("shiftId"), direction = get("direction");
  const rail = get("rail"), currency = get("currency"), dateFrom = get("dateFrom"), dateTo = get("dateTo");
  const status = o.status === undefined ? "LIVE" : o.status;
  if (dayId !== null && !guid(dayId)) throw new TypeError("Invalid dayId");
  if (shiftId !== null && !guid(shiftId)) throw new TypeError("Invalid shiftId");
  if (direction !== null && !oneOf(DIRECTIONS, direction)) throw new TypeError("Invalid direction");
  if (rail !== null && !oneOf(RAILS, rail)) throw new TypeError("Invalid rail");
  if (currency !== null && !oneOf(CURRENCIES, currency)) throw new TypeError("Invalid currency");
  if (status !== "LIVE" && status !== "ALL") throw new TypeError("Invalid status");
  if (dateFrom !== null && !dateValid(dateFrom)) throw new TypeError("Invalid dateFrom");
  if (dateTo !== null && !dateValid(dateTo)) throw new TypeError("Invalid dateTo");
  if (dateFrom !== null && dateTo !== null && (dateFrom as string) > (dateTo as string))
    throw new TypeError("dateFrom after dateTo");
  return {
    dayId: dayId as string | null, shiftId: shiftId as string | null,
    direction: direction as Direction | null, rail: rail as Rail | null,
    currency: currency as Currency | null, status,
    dateFrom: dateFrom as string | null, dateTo: dateTo as string | null,
  };
}
/** A rail filter matches any movement that touches the rail (from or to). */
export function filterMovements(rows: readonly MovementRow[], f: MovementFilters): MovementRow[] {
  return rows.filter((m) => {
    if (f.status === "LIVE" && !isLiveMovement(m)) return false;
    if (f.dayId !== null && m.dayId !== f.dayId) return false;
    if (f.shiftId !== null && m.shiftId !== f.shiftId) return false;
    if (f.direction !== null && m.direction !== f.direction) return false;
    if (f.currency !== null && m.currency !== f.currency) return false;
    if (f.rail !== null && m.fromRail !== f.rail && m.toRail !== f.rail) return false;
    const date = m.createdAtUtc.slice(0, 10);
    if (f.dateFrom !== null && date < f.dateFrom) return false;
    if (f.dateTo !== null && date > f.dateTo) return false;
    return true;
  });
}

// ---------------------------------------------------------------- rail totals (TR-01/TR-02)
export type RailTotal = Readonly<{
  currency: Currency; rail: Rail; inMinor: number; outMinor: number;
  transferInMinor: number; transferOutMinor: number; netMinor: number; movementCount: number;
}>;
/**
 * Same sign convention as SQL030 core.CreateTreasuryShiftRecon: IN adds ToRail, OUT subtracts
 * FromRail, TRANSFER subtracts FromRail and adds ToRail. Only live (RECORDED) rows count.
 * This is a movement-derived figure, NOT a true till/bank balance.
 */
export function computeRailTotals(rows: readonly MovementRow[]): RailTotal[] {
  type Acc = { currency: Currency; rail: Rail; i: number; o: number; ti: number; to: number; n: number };
  const acc = new Map<string, Acc>();
  const slot = (currency: Currency, rail: Rail): Acc => {
    const key = currency + "|" + rail;
    let a = acc.get(key);
    if (!a) { a = { currency, rail, i: 0, o: 0, ti: 0, to: 0, n: 0 }; acc.set(key, a); }
    a.n += 1;
    return a;
  };
  for (const m of rows) {
    if (!isLiveMovement(m)) continue;
    if (!Number.isSafeInteger(m.amountMinor) || m.amountMinor < 1)
      throw new TypeError("Invalid movement amount");
    if (m.direction === "IN") { const a = slot(m.currency, m.toRail); a.i = safeAdd(a.i, m.amountMinor); }
    else if (m.direction === "OUT") { const a = slot(m.currency, m.fromRail); a.o = safeAdd(a.o, m.amountMinor); }
    else {
      const f = slot(m.currency, m.fromRail); f.to = safeAdd(f.to, m.amountMinor);
      const t = slot(m.currency, m.toRail); t.ti = safeAdd(t.ti, m.amountMinor);
    }
  }
  const order = (r: Rail) => RAILS.indexOf(r);
  return [...acc.values()]
    .sort((a, b) => a.currency.localeCompare(b.currency) || order(a.rail) - order(b.rail))
    .map((a) => ({
      currency: a.currency, rail: a.rail, inMinor: a.i, outMinor: a.o,
      transferInMinor: a.ti, transferOutMinor: a.to, netMinor: a.i + a.ti - a.o - a.to,
      movementCount: a.n,
    }));
}

// ---------------------------------------------------------------- shift summary + day-close readiness
export type ShiftSummary = Readonly<{
  shiftId: string; status: "OPEN" | "CLOSED"; actorAccountId: string;
  liveMovementCount: number; currencies: Currency[];
  /** Currency-blind, exactly like SQL030 recon: SUM(AmountMinor) per rail across currencies. */
  systemMinorByRail: Readonly<Record<Rail, number>>;
  reconRails: Rail[]; reconVarianceMinor: number; hasRecon: boolean;
}>;
function railSystem(rows: readonly MovementRow[]): Record<Rail, number> {
  const out: Record<Rail, number> = { CASH: 0, CARD: 0, BANK: 0, OTHER: 0 };
  for (const m of rows) {
    if (!isLiveMovement(m)) continue;
    if (m.direction === "IN") out[m.toRail] = safeAdd(out[m.toRail], m.amountMinor);
    else if (m.direction === "OUT") out[m.fromRail] = safeAdd(out[m.fromRail], -m.amountMinor);
    else {
      out[m.toRail] = safeAdd(out[m.toRail], m.amountMinor);
      out[m.fromRail] = safeAdd(out[m.fromRail], -m.amountMinor);
    }
  }
  return out;
}
export function summarizeShifts(
  shifts: readonly ShiftRow[], movements: readonly MovementRow[], recons: readonly ReconRow[],
): ShiftSummary[] {
  return shifts.map((s) => {
    const mine = movements.filter((m) => m.shiftId === s.shiftId && isLiveMovement(m));
    const rs = recons.filter((r) => r.shiftId === s.shiftId);
    return {
      shiftId: s.shiftId, status: s.status, actorAccountId: s.actorAccountId,
      liveMovementCount: mine.length,
      currencies: CURRENCIES.filter((c) => mine.some((m) => m.currency === c)),
      systemMinorByRail: railSystem(mine),
      reconRails: RAILS.filter((r) => rs.some((x) => x.rail === r)),
      reconVarianceMinor: rs.reduce((n, r) => safeAdd(n, r.varianceMinor), 0),
      hasRecon: rs.length > 0,
    };
  });
}

export type CatchUpPlan = "NO_OP" | "ROLLED_OVER" | "OPENED_MISSING_DAY";
/** Verbatim decision table of Cashier planBusinessDayReconciliation (pure). */
export function planCatchUp(openDayDate: string | null, expectedDate: string,
  pastRolloverWindow: boolean): CatchUpPlan {
  if (openDayDate === expectedDate) return "NO_OP";
  if (openDayDate && openDayDate > expectedDate) return "NO_OP";
  if (openDayDate && openDayDate < expectedDate) return pastRolloverWindow ? "ROLLED_OVER" : "NO_OP";
  return "OPENED_MISSING_DAY";
}

export type CloseBlocker = "NO_OPEN_DAY" | "OPEN_SHIFTS_PRESENT";
export type CloseWarning =
  | "STALE_BUSINESS_DAY" | "CLOSED_SHIFT_WITHOUT_RECON" | "RECON_VARIANCE_PRESENT"
  | "MIXED_CURRENCY_RECON_AMBIGUOUS" | "FORCE_CLOSE_SKIPS_RECON" | "EVIDENCE_TRUNCATED";
export type DayCloseReadiness = Readonly<{
  state: "READY_TO_CLOSE_PREVIEW" | "BLOCKED";
  blockers: CloseBlocker[]; warnings: CloseWarning[];
  openShiftIds: string[]; unreconciledShiftIds: string[];
  catchUpPlan: CatchUpPlan;
  forceClose: Readonly<{ wouldCloseShiftIds: string[]; skipsReconciliation: boolean }>;
  closeMutation: "NOT_PERFORMED"; financialPostingState: "NOT_AUTHORIZED"; varianceGlState: "GATED";
}>;
export type Evidence = Readonly<{
  movementsMayBeTruncated: boolean; shiftsMayBeTruncated: boolean; reconsMayBeTruncated: boolean;
}>;
export function evaluateDayCloseReadiness(input: Readonly<{
  day: DayRow | null; shifts: readonly ShiftRow[]; movements: readonly MovementRow[];
  recons: readonly ReconRow[]; expectedDate: string; evidence: Evidence;
}>): { readiness: DayCloseReadiness; shiftSummaries: ShiftSummary[] } {
  if (!input || !dateValid(input.expectedDate)) throw new TypeError("Valid expectedDate required");
  if (input.day !== null && (!guid(input.day.dayId) || !dateValid(input.day.businessDate) ||
    !oneOf(["OPEN", "CLOSED"] as const, input.day.status)))
    throw new TypeError("Invalid day evidence");
  const day = input.day && input.day.status === "OPEN" ? input.day : null;
  const dayShifts = day ? input.shifts.filter((s) => s.dayId === day.dayId) : [];
  const dayMoves = day ? input.movements.filter((m) => m.dayId === day.dayId) : [];
  const dayRecons = day ? input.recons.filter((r) => r.dayId === day.dayId) : [];
  const summaries = summarizeShifts(dayShifts, dayMoves, dayRecons);
  const blockers: CloseBlocker[] = [];
  const warnings: CloseWarning[] = [];
  const openShiftIds = summaries.filter((s) => s.status === "OPEN").map((s) => s.shiftId);
  if (!day) blockers.push("NO_OPEN_DAY");
  if (openShiftIds.length > 0) blockers.push("OPEN_SHIFTS_PRESENT");
  if (day && day.businessDate !== input.expectedDate) warnings.push("STALE_BUSINESS_DAY");
  const unreconciled = summaries.filter((s) => s.status === "CLOSED" && s.liveMovementCount > 0 && !s.hasRecon)
    .map((s) => s.shiftId);
  if (unreconciled.length > 0) warnings.push("CLOSED_SHIFT_WITHOUT_RECON");
  if (summaries.some((s) => s.reconVarianceMinor !== 0)) warnings.push("RECON_VARIANCE_PRESENT");
  if (summaries.some((s) => s.currencies.length > 1)) warnings.push("MIXED_CURRENCY_RECON_AMBIGUOUS");
  if (openShiftIds.length > 0) warnings.push("FORCE_CLOSE_SKIPS_RECON");
  const e = input.evidence;
  if (e.movementsMayBeTruncated || e.shiftsMayBeTruncated || e.reconsMayBeTruncated)
    warnings.push("EVIDENCE_TRUNCATED");
  return {
    readiness: {
      state: blockers.length ? "BLOCKED" : "READY_TO_CLOSE_PREVIEW",
      blockers, warnings, openShiftIds, unreconciledShiftIds: unreconciled,
      catchUpPlan: planCatchUp(day ? day.businessDate : null, input.expectedDate, true),
      forceClose: { wouldCloseShiftIds: openShiftIds, skipsReconciliation: openShiftIds.length > 0 },
      closeMutation: "NOT_PERFORMED", financialPostingState: "NOT_AUTHORIZED", varianceGlState: "GATED",
    },
    shiftSummaries: summaries,
  };
}

// ---------------------------------------------------------------- shift write gate + handoff (OPS-03)
export type ShiftWriteGateReason =
  "ready" | "loading" | "unauthenticated" | "no_day" | "no_shift" | "handoff_required";
/** Same decision order as Cashier classifyShiftWriteGate (branch ids are DRVO UUID strings). */
export function classifyShiftWriteGate(i: Readonly<{
  loading: boolean; isAuthenticated: boolean; hasActiveDay: boolean; hasOpenShift: boolean;
  viewBranchId: string | null | undefined; operationalBranchId: string | null | undefined;
}>): ShiftWriteGateReason {
  if (i.loading) return "loading";
  if (!i.isAuthenticated) return "unauthenticated";
  const matches = i.viewBranchId != null && i.operationalBranchId != null &&
    i.viewBranchId === i.operationalBranchId;
  if (matches && i.hasOpenShift && i.hasActiveDay) return "ready";
  if (i.hasOpenShift && !matches) return "handoff_required";
  if (!i.hasActiveDay) return "no_day";
  return "no_shift";
}
export type HandoffPlan = "ALREADY_OPEN_HERE" | "FIRST_OPEN_HERE" | "CLOSE_ELSEWHERE_AND_OPEN_HERE" | "BLOCKED";
export type HandoffReason = "NO_OPEN_DAY_ON_TARGET" | "ACTOR_HAS_OPEN_SHIFT_ELSEWHERE" |
  "SOURCE_SHIFT_CLOSES_WITHOUT_RECON";
export type HandoffPreview = Readonly<{
  plan: HandoffPlan; gate: ShiftWriteGateReason; reasons: HandoffReason[];
  requiresAtomicClose: boolean;
  /** Preview stays non-mutating; atomic close+open is POST .../shift-handoff (SQL039). */
  atomicHandoff: "AVAILABLE_VIA_SQL039";
  evidence: Readonly<{ openShiftHere: "TRUSTED_SQL_READ"; openShiftElsewhere: "CALLER_SUPPLIED_UNVERIFIED" | "NOT_APPLICABLE" }>;
  mutation: "NOT_PERFORMED"; financialPostingState: "NOT_AUTHORIZED";
}>;
export function previewShiftHandoff(i: Readonly<{
  targetBranchId: string; targetDayOpen: boolean; actorHasOpenShiftHere: boolean;
  actorOpenShiftElsewhereBranchId: string | null;
}>): HandoffPreview {
  if (!guid(i.targetBranchId) ||
    (i.actorOpenShiftElsewhereBranchId !== null && !guid(i.actorOpenShiftElsewhereBranchId)) ||
    typeof i.targetDayOpen !== "boolean" || typeof i.actorHasOpenShiftHere !== "boolean")
    throw new TypeError("Invalid handoff evidence");
  // One OPEN shift per actor tenant-wide: trusted local evidence wins over a caller claim.
  const elsewhere = i.actorHasOpenShiftHere ? null : i.actorOpenShiftElsewhereBranchId;
  if (elsewhere === i.targetBranchId) throw new TypeError("Elsewhere branch equals target branch");
  const gate = classifyShiftWriteGate({
    loading: false, isAuthenticated: true, hasActiveDay: i.targetDayOpen,
    hasOpenShift: i.actorHasOpenShiftHere || elsewhere !== null,
    viewBranchId: i.targetBranchId,
    operationalBranchId: i.actorHasOpenShiftHere ? i.targetBranchId : elsewhere,
  });
  const reasons: HandoffReason[] = [];
  let plan: HandoffPlan;
  if (!i.targetDayOpen) { reasons.push("NO_OPEN_DAY_ON_TARGET"); plan = "BLOCKED"; }
  else if (i.actorHasOpenShiftHere) plan = "ALREADY_OPEN_HERE";
  else if (elsewhere === null) plan = "FIRST_OPEN_HERE";
  else {
    plan = "CLOSE_ELSEWHERE_AND_OPEN_HERE";
    reasons.push("ACTOR_HAS_OPEN_SHIFT_ELSEWHERE", "SOURCE_SHIFT_CLOSES_WITHOUT_RECON");
  }
  return {
    plan, gate, reasons, requiresAtomicClose: elsewhere !== null && i.targetDayOpen,
    atomicHandoff: "AVAILABLE_VIA_SQL039",
    evidence: { openShiftHere: "TRUSTED_SQL_READ",
      openShiftElsewhere: elsewhere === null ? "NOT_APPLICABLE" : "CALLER_SUPPLIED_UNVERIFIED" },
    mutation: "NOT_PERFORMED", financialPostingState: "NOT_AUTHORIZED",
  };
}

// ---------------------------------------------------------------- daily aggregation (TR-01/TR-06)
export type DayStatus = "open" | "closed" | "missing";
export type BranchDaily = Readonly<{ branchId: string; dayStatus: DayStatus; rails: readonly RailTotal[] }>;
export type GroupRailRow = Readonly<{
  currency: Currency; rail: Rail; inMinor: number; outMinor: number; netMinor: number;
  movementCount: number; percentageOfNet: number;
}>;
export type GroupDaily = Readonly<{
  branchCount: number; openDayCount: number; closedDayCount: number; missingDayCount: number;
  branchesWithActivity: number; rails: GroupRailRow[]; topRail: string | null;
}>;
/** Cashier round2 */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/**
 * Cashier loadGroupDailyTreasury semantics on minor units: IN-like = in+transferIn,
 * OUT-like = out+transferOut, per-rail percentage of the currency net (0 when net is 0),
 * rails sorted by net desc, topRail = first. Currencies are never summed together.
 */
export function aggregateDaily(branches: readonly BranchDaily[]): GroupDaily {
  const acc = new Map<string, { currency: Currency; rail: Rail; i: number; o: number; n: number }>();
  let open = 0, closed = 0, missing = 0, active = 0;
  for (const b of branches) {
    if (b.dayStatus === "open") open++; else if (b.dayStatus === "closed") closed++; else missing++;
    let n = 0;
    for (const r of b.rails) {
      n += r.movementCount;
      const key = r.currency + "|" + r.rail;
      const a = acc.get(key) ?? { currency: r.currency, rail: r.rail, i: 0, o: 0, n: 0 };
      a.i = safeAdd(a.i, safeAdd(r.inMinor, r.transferInMinor));
      a.o = safeAdd(a.o, safeAdd(r.outMinor, r.transferOutMinor));
      a.n += r.movementCount;
      acc.set(key, a);
    }
    if (n > 0) active++;
  }
  const net = new Map<Currency, number>();
  for (const a of acc.values()) net.set(a.currency, (net.get(a.currency) ?? 0) + a.i - a.o);
  const rails: GroupRailRow[] = [...acc.values()].map((a) => {
    const n = a.i - a.o, total = net.get(a.currency) ?? 0;
    return { currency: a.currency, rail: a.rail, inMinor: a.i, outMinor: a.o, netMinor: n,
      movementCount: a.n, percentageOfNet: total !== 0 ? round2((n / total) * 100) : 0 };
  }).sort((a, b) => b.netMinor - a.netMinor || a.currency.localeCompare(b.currency) ||
    RAILS.indexOf(a.rail) - RAILS.indexOf(b.rail));
  const first = rails[0];
  return {
    branchCount: branches.length, openDayCount: open, closedDayCount: closed,
    missingDayCount: missing, branchesWithActivity: active, rails,
    topRail: first ? first.currency + ":" + first.rail : null,
  };
}
