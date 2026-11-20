/**
 * Cashier Loyalty / Cut Club -> DRVO shared Loyalty NON-POSTING rules + preview math.
 * Sources (pin 046bf19): src/lib/loyalty/helpers.ts (tier rank, static rewards, progress,
 * levels, personal offer, movement labels), src/app/api/loyalty/adjust/route.ts,
 * src/app/api/loyalty/reverse-sale/route.ts,
 * src/app/api/public/client/loyalty/rewards/[rewardId]/redeem/route.ts and the
 * src/app/admin/cut-club/settings/page.tsx initial UI state.
 *
 * Everything here is pure and NON-POSTING: it never earns, redeems, adjusts or reverses a
 * real balance, never sends a message and is not an ADR-031 posting path. Points are
 * compared and returned as integer hundredths internally (Cashier ledger is DECIMAL(10,2))
 * so there is no float drift. Deliberate differences from Cashier:
 *  - redemption never fabricates a voucher code (Cashier never persisted it and keyed its
 *    idempotency on Date.now(), which is a retry hazard);
 *  - `notifyOnUpgrade` cannot be enabled (no Messaging owner / consent-evidenced worker);
 *  - the Cut Club settings defaults are Cashier UI state that Cashier never persisted or
 *    enforced, so they are marked unverified rather than treated as live earn rules;
 *  - the Cashier earn procedure (sp_Loyalty_*) is not in the pinned source, so there is
 *    intentionally NO earn calculation here.
 */
export const LOYALTY_PREVIEW_STATE = "UNPOSTED_LOYALTY_PREVIEW" as const;
export const TIER_CODES = ["BRONZE", "SILVER", "GOLD", "VIP"] as const;
export type TierCode = typeof TIER_CODES[number];
export const MOVEMENT_TYPES = [
  "EARN_SALE", "ADJUST_ADD", "ADJUST_SUBTRACT", "REVERSAL", "REDEEM", "REFERRAL_BONUS",
] as const;
export type MovementType = typeof MOVEMENT_TYPES[number];
export const MOVEMENT_LABELS_AR: Readonly<Record<MovementType, string>> = {
  EARN_SALE: "\u0643\u0633\u0628 \u0646\u0642\u0627\u0637 \u0645\u0646 \u0632\u064a\u0627\u0631\u0629",
  ADJUST_ADD: "\u0625\u0636\u0627\u0641\u0629 \u0646\u0642\u0627\u0637",
  ADJUST_SUBTRACT: "\u062e\u0635\u0645 \u0646\u0642\u0627\u0637",
  REVERSAL: "\u0639\u0643\u0633 \u0646\u0642\u0627\u0637 \u0641\u0627\u062a\u0648\u0631\u0629",
  REDEEM: "\u0627\u0633\u062a\u0628\u062f\u0627\u0644 \u0645\u0643\u0627\u0641\u0623\u0629",
  REFERRAL_BONUS: "\u0645\u0643\u0627\u0641\u0623\u0629 \u062f\u0639\u0648\u0629 \u0635\u062f\u064a\u0642",
};
export const MOVEMENT_FALLBACK_LABEL_AR = "\u062d\u0631\u0643\u0629 \u0646\u0642\u0627\u0637";
export type RewardType = "DISCOUNT_AMOUNT" | "FREE_SERVICE" | "UPGRADE";
export type RewardDefinition = Readonly<{
  id: number; requiredPoints: number; rewardType: RewardType; minTierCode: TierCode | null;
  titleEn: string;
}>;
/** Cashier STATIC_REWARDS (temporary in Cashier until a DB table exists); ids/costs/tier gates kept. */
export const REWARD_CATALOG: readonly RewardDefinition[] = [
  { id: 1, titleEn: "50 EGP Discount", requiredPoints: 220, rewardType: "DISCOUNT_AMOUNT", minTierCode: null },
  { id: 2, titleEn: "Free Styling", requiredPoints: 400, rewardType: "FREE_SERVICE", minTierCode: null },
  { id: 3, titleEn: "Free Skin Cleaning", requiredPoints: 600, rewardType: "FREE_SERVICE", minTierCode: null },
  { id: 4, titleEn: "VIP Package Upgrade", requiredPoints: 1200, rewardType: "UPGRADE", minTierCode: "GOLD" },
];
export type RewardStatus = "available" | "locked" | "tier_locked";
export type RewardView = RewardDefinition & Readonly<{
  status: RewardStatus; remainingPoints: number; progress: number;
}>;
export type NextRewardView = Readonly<{
  id: number; titleEn: string; requiredPoints: number; remainingPoints: number; progress: number;
}>;
export type TierDefinition = Readonly<{
  tierCode: string; minLifetimePoints: number; pointsMultiplier: number; sortOrder: number;
}>;
export type LevelView = TierDefinition & Readonly<{ isCurrent: boolean; isCompleted: boolean }>;

function fail(message: string): never { throw new TypeError(message); }
function centi(value: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(field + " must be a finite number");
  const scaled = Math.round(value * 100);
  if (Math.abs(scaled - value * 100) > 1e-6) fail(field + " allows at most 2 decimals");
  if (!Number.isSafeInteger(scaled)) fail(field + " out of range");
  if (opts.min !== undefined && value < opts.min) fail(field + " below minimum");
  if (opts.max !== undefined && value > opts.max) fail(field + " above maximum");
  return scaled;
}
const points = (c: number) => c / 100;

/** Cashier getTierRank: unknown codes rank 0 (BRONZE=1..VIP=4). */
export function getTierRank(tierCode: string): number {
  const i = (TIER_CODES as readonly string[]).indexOf(tierCode);
  return i < 0 ? 0 : i + 1;
}
/** Cashier canClientAccessReward. */
export function canClientAccessReward(clientTierCode: string, rewardMinTierCode: string | null): boolean {
  if (!rewardMinTierCode) return true;
  return getTierRank(clientTierCode) >= getTierRank(rewardMinTierCode);
}
export function getRewardById(rewardId: number): RewardDefinition | undefined {
  return REWARD_CATALOG.find(r => r.id === rewardId);
}
export function mapMovementTypeToArabicLabel(type: string): string {
  // Own-property lookup: Cashier's `labels[type] || fallback` returns Object.prototype members
  // (e.g. "toString") for hostile movement types.
  return Object.prototype.hasOwnProperty.call(MOVEMENT_LABELS_AR, type)
    ? (MOVEMENT_LABELS_AR as Record<string, string>)[type]! : MOVEMENT_FALLBACK_LABEL_AR;
}
/** Cashier calculateProgress (Math.round, capped at 100, required<=0 => 100). */
export function calculateProgress(currentPoints: number, requiredPoints: number): number {
  if (requiredPoints <= 0) return 100;
  return Math.min(100, Math.round((currentPoints / requiredPoints) * 100));
}
/** Cashier buildRewardsForClient. Unknown/empty tier counts as rank 1 like Cashier (`|| 1`). */
export function buildRewardsForClient(pointsBalance: number, tierCode: string): RewardView[] {
  const currentRank = getTierRank(tierCode) || 1;
  return REWARD_CATALOG.map(reward => {
    const rewardRank = reward.minTierCode ? getTierRank(reward.minTierCode) : 0;
    const status: RewardStatus = reward.minTierCode && currentRank < rewardRank ? "tier_locked"
      : pointsBalance >= reward.requiredPoints ? "available" : "locked";
    return {
      ...reward, status,
      remainingPoints: Math.max(0, reward.requiredPoints - pointsBalance),
      progress: calculateProgress(pointsBalance, reward.requiredPoints),
    };
  });
}
/** Cashier getNextReward: lowest-cost still-"locked" reward (tier_locked is skipped). */
export function getNextReward(rewards: readonly RewardView[]): NextRewardView | null {
  const next = rewards.filter(r => r.status === "locked")
    .sort((a, b) => a.requiredPoints - b.requiredPoints)[0];
  return next ? {
    id: next.id, titleEn: next.titleEn, requiredPoints: next.requiredPoints,
    remainingPoints: next.remainingPoints, progress: next.progress,
  } : null;
}
/** Cashier buildLevels. */
export function buildLevels(tiers: readonly TierDefinition[], currentTierCode: string,
  lifetimeEarnedPoints: number): LevelView[] {
  return tiers.map(t => ({
    ...t, isCurrent: t.tierCode === currentTierCode,
    isCompleted: lifetimeEarnedPoints >= t.minLifetimePoints,
  }));
}
/**
 * DRVO-DERIVED (not source-proven): highest tier whose threshold is met by lifetime earned
 * points. Cashier resolves tiers inside SQL procedures that are not in the pinned source.
 */
export function resolveTierForLifetime(tiers: readonly TierDefinition[],
  lifetimeEarnedPoints: number): string | null {
  const met = tiers.filter(t => lifetimeEarnedPoints >= t.minLifetimePoints)
    .sort((a, b) => b.minLifetimePoints - a.minLifetimePoints || b.sortOrder - a.sortOrder);
  return met[0]?.tierCode ?? null;
}
export type PersonalOfferType = "DOUBLE_POINTS" | "COMEBACK";
/** Cashier determinePersonalOffer; `nowMs` injected (Cashier read Date.now()). Offer is display-only. */
export function determinePersonalOffer(lastVisitDate: string | null, nowMs: number): PersonalOfferType {
  if (lastVisitDate) {
    const days = Math.floor((nowMs - new Date(lastVisitDate).getTime()) / 86400000);
    if (days > 45) return "COMEBACK";
  }
  return "DOUBLE_POINTS";
}

export type PreviewIssue =
  | "REWARD_CONFIRMATION_REQUIRED" | "REWARD_NOT_FOUND" | "TIER_TOO_LOW" | "INSUFFICIENT_POINTS"
  | "ALREADY_REVERSED" | "NO_EARNED_POINTS";
const base = { state: LOYALTY_PREVIEW_STATE, persisted: false,
  financialPostingState: "NOT_AUTHORIZED" } as const;
export type BalancePreview = Readonly<typeof base & {
  ok: boolean; issue: PreviewIssue | null; movementType: MovementType | null;
  pointsBefore: number; pointsDelta: number; pointsAfter: number;
}>;

/**
 * Cashier adjust route: delta must be non-zero, a note is mandatory, and a deduction larger
 * than the current balance is refused (balance can never be driven negative).
 */
export function previewManualAdjustment(balance: number, pointsDelta: number, notes: unknown): BalancePreview {
  const before = centi(balance, "balance", { min: 0 });
  const delta = centi(pointsDelta, "pointsDelta");
  if (delta === 0) fail("pointsDelta must be non-zero");
  if (typeof notes !== "string" || notes.trim().length === 0) fail("notes are required");
  if (notes.trim().length > 500) fail("notes too long");
  const ok = !(delta < 0 && -delta > before);
  return { ...base, ok, issue: ok ? null : "INSUFFICIENT_POINTS",
    movementType: delta > 0 ? "ADJUST_ADD" : "ADJUST_SUBTRACT",
    pointsBefore: points(before), pointsDelta: points(delta),
    pointsAfter: points(ok ? before + delta : before) };
}
/**
 * Cashier public redeem route validation order: confirm -> reward exists -> tier gate ->
 * balance. No redemption code is produced and nothing is debited.
 */
export function previewRewardRedemption(balance: number, tierCode: string, rewardId: unknown,
  confirm: unknown): BalancePreview & Readonly<{ redemptionCode: null; reward: RewardDefinition | null }> {
  const before = centi(balance, "balance", { min: 0 });
  const mk = (issue: PreviewIssue | null, reward: RewardDefinition | null) => {
    const cost = reward?.requiredPoints ?? 0;
    const ok = issue === null;
    return { ...base, ok, issue, movementType: ok ? "REDEEM" as const : null,
      pointsBefore: points(before), pointsDelta: ok ? -cost : 0,
      pointsAfter: points(ok ? before - cost * 100 : before),
      redemptionCode: null, reward };
  };
  if (confirm !== true) return mk("REWARD_CONFIRMATION_REQUIRED", null);
  const reward = typeof rewardId === "number" && Number.isSafeInteger(rewardId) && rewardId > 0
    ? getRewardById(rewardId) : undefined;
  if (!reward) return mk("REWARD_NOT_FOUND", null);
  if (!canClientAccessReward(tierCode || "BRONZE", reward.minTierCode)) return mk("TIER_TOO_LOW", reward);
  if (before < reward.requiredPoints * 100) return mk("INSUFFICIENT_POINTS", reward);
  return mk(null, reward);
}
export type SaleLedgerRow = Readonly<{ movementType: MovementType; pointsDelta: number }>;
/**
 * Cashier reverse-sale route: a reversal needs previously earned EARN_SALE points for that
 * invoice and is refused when a REVERSAL already exists. Result may drive the balance below
 * zero (flagged, not hidden) because Cashier's procedure behaviour is not in the pinned source.
 */
export function previewSaleReversal(balance: number, invoiceRows: readonly SaleLedgerRow[],
  notes: unknown): BalancePreview & Readonly<{ wouldGoNegative: boolean }> {
  const before = centi(balance, "balance", { min: 0 });
  if (typeof notes !== "string" || notes.trim().length === 0) fail("notes are required");
  if (!Array.isArray(invoiceRows) || invoiceRows.length > 200) fail("invalid invoice ledger rows");
  let earned = 0;
  let reversed = false;
  for (const row of invoiceRows) {
    if (!(MOVEMENT_TYPES as readonly string[]).includes(row.movementType)) fail("unknown movementType");
    const delta = centi(row.pointsDelta, "pointsDelta");
    if (row.movementType === "EARN_SALE") {
      if (delta <= 0) fail("EARN_SALE must be positive");
      earned += delta;
    } else if (row.movementType === "REVERSAL") reversed = true;
  }
  const issue: PreviewIssue | null = reversed ? "ALREADY_REVERSED" : earned === 0 ? "NO_EARNED_POINTS" : null;
  const ok = issue === null;
  const after = ok ? before - earned : before;
  return { ...base, ok, issue, movementType: ok ? "REVERSAL" : null,
    pointsBefore: points(before), pointsDelta: ok ? -points(earned) : 0,
    pointsAfter: points(after), wouldGoNegative: after < 0 };
}

export type CutClubConfig = Readonly<{
  points: Readonly<{ pointsPerCurrency: number; coinMultiplier: number;
    expiryEnabled: boolean; expiryDays: number }>;
  store: Readonly<{ enabled: boolean; minPurchaseInterval: number; maxPurchasesPerDay: number }>;
  referral: Readonly<{ enabled: boolean; rewardCoins: number; requireFirstVisit: boolean }>;
  mysteryBox: Readonly<{ enabled: boolean; dailyLimit: number }>;
  tiers: Readonly<{ autoUpgrade: boolean; notifyOnUpgrade: boolean }>;
}>;
/**
 * Cashier settings page initial state, kept as UNVERIFIED defaults: Cashier held them in React
 * state only (no persistence, no enforcement). notifyOnUpgrade is false in DRVO (no messaging).
 */
export const CUT_CLUB_DEFAULT_CONFIG: CutClubConfig = {
  points: { pointsPerCurrency: 1, coinMultiplier: 1, expiryEnabled: false, expiryDays: 365 },
  store: { enabled: true, minPurchaseInterval: 0, maxPurchasesPerDay: 0 },
  referral: { enabled: true, rewardCoins: 200, requireFirstVisit: true },
  mysteryBox: { enabled: true, dailyLimit: 3 },
  tiers: { autoUpgrade: true, notifyOnUpgrade: false },
};
export const CUT_CLUB_DEFAULTS_PROVENANCE =
  "CASHIER_SETTINGS_PAGE_UI_STATE_NOT_PERSISTED_NOT_ENFORCED" as const;
function section(value: unknown, keys: readonly string[], name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some(k => !Object.prototype.hasOwnProperty.call(value, k))) fail("invalid " + name + " settings");
  return value as Record<string, unknown>;
}
function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(field + " must be boolean");
  return value;
}
function int(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    fail(field + " must be an integer in [" + min + "," + max + "]");
  return value;
}
/** Strict validation (no hidden keys). Returns a normalized config; never persists it. */
export function validateCutClubConfig(input: unknown): CutClubConfig {
  const root = section(input, ["points", "store", "referral", "mysteryBox", "tiers"], "Cut Club");
  const p = section(root.points, ["pointsPerCurrency", "coinMultiplier", "expiryEnabled", "expiryDays"], "points");
  const s = section(root.store, ["enabled", "minPurchaseInterval", "maxPurchasesPerDay"], "store");
  const r = section(root.referral, ["enabled", "rewardCoins", "requireFirstVisit"], "referral");
  const m = section(root.mysteryBox, ["enabled", "dailyLimit"], "mysteryBox");
  const t = section(root.tiers, ["autoUpgrade", "notifyOnUpgrade"], "tiers");
  const ppc = centi(p.pointsPerCurrency, "pointsPerCurrency", { min: 0.01, max: 1000 });
  const mult = centi(p.coinMultiplier, "coinMultiplier", { min: 0.01, max: 100 });
  if (bool(t.notifyOnUpgrade, "notifyOnUpgrade"))
    fail("notifyOnUpgrade is not available: no Messaging owner or consent-evidenced worker");
  return {
    points: { pointsPerCurrency: points(ppc), coinMultiplier: points(mult),
      expiryEnabled: bool(p.expiryEnabled, "expiryEnabled"),
      expiryDays: int(p.expiryDays, "expiryDays", 1, 3650) },
    store: { enabled: bool(s.enabled, "store.enabled"),
      minPurchaseInterval: int(s.minPurchaseInterval, "minPurchaseInterval", 0, 100000),
      maxPurchasesPerDay: int(s.maxPurchasesPerDay, "maxPurchasesPerDay", 0, 1000) },
    referral: { enabled: bool(r.enabled, "referral.enabled"),
      rewardCoins: int(r.rewardCoins, "rewardCoins", 0, 100000),
      requireFirstVisit: bool(r.requireFirstVisit, "requireFirstVisit") },
    mysteryBox: { enabled: bool(m.enabled, "mysteryBox.enabled"),
      dailyLimit: int(m.dailyLimit, "dailyLimit", 0, 1000) },
    tiers: { autoUpgrade: bool(t.autoUpgrade, "autoUpgrade"), notifyOnUpgrade: false },
  };
}
