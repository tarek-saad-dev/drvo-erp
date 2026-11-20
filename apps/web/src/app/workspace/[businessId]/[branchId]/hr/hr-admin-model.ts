// Pure HR admin model (HR-01 Light UX). No fetch, no storage, no clock, no randomness.
// Everything here is presentation/validation only; the API + SQL remain the authority and
// no payroll, payout or Treasury/cash effect exists (ADR-031).

export type HrEmployee = {
 employeeId: string; employeeCode: string; displayName: string;
 employmentType: "full_time" | "part_time" | "freelance";
 payrollMethod: "hourly" | "daily" | "monthly";
 isActive: boolean; branchActive: boolean; isBookable: boolean;
 resourceId: string | null; resourceName: string | null;
};

export const HR_ADMIN_TABS = [
 { id: "employees", label: "الموظفون" },
 { id: "ledger-preview", label: "دفتر الموظف (معاينة)" },
 { id: "target-preview", label: "الهدف الشهري (معاينة)" },
] as const;
export type HrAdminTabId = typeof HR_ADMIN_TABS[number]["id"];
export function resolveHrTab(value: string | null | undefined): HrAdminTabId {
 return HR_ADMIN_TABS.find(t => t.id === value)?.id ?? "employees";
}

export const EMPLOYMENT_LABELS: Record<HrEmployee["employmentType"], string> = {
 full_time: "دوام كامل", part_time: "دوام جزئي", freelance: "فري لانس",
};
export const PAYROLL_LABELS: Record<HrEmployee["payrollMethod"], string> = {
 hourly: "بالساعة", daily: "يومية", monthly: "شهري",
};

export type StatusFilter = "active" | "inactive" | "all";
export type BarberFilter = "all" | "barber" | "not_barber";
export type HrFilters = {
 query: string; status: StatusFilter;
 employment: "all" | HrEmployee["employmentType"];
 payroll: "all" | HrEmployee["payrollMethod"];
 barber: BarberFilter;
};
export const DEFAULT_HR_FILTERS: HrFilters = {
 query: "", status: "active", employment: "all", payroll: "all", barber: "all",
};

/** Active in the business AND in this branch; everything else is "غير نشط / مؤرشف". */
export function isRosterActive(e: HrEmployee): boolean {
 return e.isActive && e.branchActive;
}
export function normalizeSearch(text: string): string {
 return text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}
export function filterEmployees(list: readonly HrEmployee[], f: HrFilters): HrEmployee[] {
 const q = normalizeSearch(f.query);
 return list.filter(e => {
  if (f.status === "active" && !isRosterActive(e)) return false;
  if (f.status === "inactive" && isRosterActive(e)) return false;
  if (f.employment !== "all" && e.employmentType !== f.employment) return false;
  if (f.payroll !== "all" && e.payrollMethod !== f.payroll) return false;
  if (f.barber === "barber" && !e.isBookable) return false;
  if (f.barber === "not_barber" && e.isBookable) return false;
  if (!q) return true;
  const hay = normalizeSearch([e.employeeCode, e.displayName, e.resourceName ?? ""].join(" "));
  return hay.includes(q);
 });
}
export type RosterSummary = {
 total: number; active: number; inactive: number; barbers: number; freelance: number;
};
export function summarizeRoster(list: readonly HrEmployee[]): RosterSummary {
 let active = 0, barbers = 0, freelance = 0;
 for (const e of list) {
  if (isRosterActive(e)) active++;
  if (e.isBookable) barbers++;
  if (e.employmentType === "freelance") freelance++;
 }
 return { total: list.length, active, inactive: list.length - active, barbers, freelance };
}
/** core.ReadHrBranchRoster returns TOP(200); warn instead of silently hiding rows. */
export const ROSTER_SERVER_LIMIT = 200;
export function rosterMayBeTruncated(list: readonly HrEmployee[]): boolean {
 return list.length >= ROSTER_SERVER_LIMIT;
}

// ---- Money / ledger draft helpers (integer minor units, two decimals) -----------------

export function parseMoneyToMinor(text: string): number | null {
 const t = text.trim();
 if (!/^\d{1,11}(\.\d{1,2})?$/.test(t)) return null;
 const [whole, frac = ""] = t.split(".");
 const minor = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
 return Number.isSafeInteger(minor) && minor >= 1 ? minor : null;
}
export function parseNonNegativeMoneyToMinor(text: string): number | null {
 const t = text.trim();
 if (/^0+(\.0{1,2})?$/.test(t)) return 0;
 return parseMoneyToMinor(t);
}
export function formatMinor(minor: number): string {
 const sign = minor < 0 ? "-" : "";
 const abs = Math.abs(minor);
 const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
 return sign + whole + "." + String(abs % 100).padStart(2, "0");
}

export const LEDGER_REASON_OPTIONS = [
 { reason: "hourly_wage", label: "أجر بالساعة", directions: ["credit"] },
 { reason: "monthly_salary", label: "مرتب شهري", directions: ["credit"] },
 { reason: "target", label: "تارجت", directions: ["credit"] },
 { reason: "commission", label: "عمولة", directions: ["credit"] },
 { reason: "bonus", label: "مكافأة", directions: ["credit"] },
 { reason: "tip", label: "إكرامية", directions: ["credit"] },
 { reason: "employee_funding", label: "تمويل من الموظف", directions: ["credit"] },
 { reason: "advance_repayment", label: "سداد سلفة", directions: ["credit"] },
 { reason: "advance", label: "سلفة", directions: ["debit"] },
 { reason: "payout", label: "صرف (معاينة فقط)", directions: ["debit"] },
 { reason: "deduction", label: "خصم", directions: ["debit"] },
 { reason: "adjustment", label: "تسوية", directions: ["debit"] },
 { reason: "settlement", label: "تسوية بين فروع", directions: ["credit", "debit"] },
] as const;
export type LedgerDirection = "credit" | "debit";
export type LedgerReasonValue = typeof LEDGER_REASON_OPTIONS[number]["reason"];
export function directionsForReason(reason: string): readonly LedgerDirection[] {
 return LEDGER_REASON_OPTIONS.find(o => o.reason === reason)?.directions ?? [];
}
export const MAX_LEDGER_DRAFT_ROWS = 500;
export const MAX_TARGET_TIERS = 50;

export type LedgerDraftRow = {
 key: string; employeeId: string; entryDate: string;
 direction: LedgerDirection; reason: string; amountText: string;
};
export type LedgerProposalDraft = {
 employeeId: string; kind: "advance" | "advance_repayment"; amountText: string;
} | null;
export type LedgerPreviewBody = {
 entries: Array<{ employeeId: string; entryDate: string; direction: LedgerDirection;
  reason: string; amountMinor: number }>;
 proposal: { employeeId: string; kind: "advance" | "advance_repayment"; amountMinor: number } | null;
};
export type BodyResult<T> = { ok: true; body: T } | { ok: false; error: string };

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validIsoDate(value: string): boolean {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const ts = Date.parse(value + "T00:00:00Z");
 return Number.isFinite(ts) && new Date(ts).toISOString().slice(0, 10) === value;
}

export function buildLedgerPreviewBody(
 rows: readonly LedgerDraftRow[], proposal: LedgerProposalDraft,
): BodyResult<LedgerPreviewBody> {
 if (rows.length > MAX_LEDGER_DRAFT_ROWS) return { ok: false, error: "عدد القيود أكبر من الحد المسموح (500)." };
 const entries: LedgerPreviewBody["entries"] = [];
 for (const r of rows) {
  const amountMinor = parseMoneyToMinor(r.amountText);
  if (!GUID.test(r.employeeId)) return { ok: false, error: "اختار موظفًا لكل قيد." };
  if (!validIsoDate(r.entryDate)) return { ok: false, error: "تاريخ القيد غير صحيح." };
  if (!directionsForReason(r.reason).includes(r.direction))
   return { ok: false, error: "سبب القيد لا يتوافق مع الاتجاه." };
  if (amountMinor === null) return { ok: false, error: "المبلغ لازم يكون موجبًا بحد أقصى منزلتين." };
  entries.push({ employeeId: r.employeeId.toLowerCase(), entryDate: r.entryDate,
   direction: r.direction, reason: r.reason, amountMinor });
 }
 let p: LedgerPreviewBody["proposal"] = null;
 if (proposal) {
  const amountMinor = parseMoneyToMinor(proposal.amountText);
  if (!GUID.test(proposal.employeeId) || amountMinor === null)
   return { ok: false, error: "راجع موظف ومبلغ مقترح السلفة/السداد." };
  p = { employeeId: proposal.employeeId.toLowerCase(), kind: proposal.kind, amountMinor };
 }
 return { ok: true, body: { entries, proposal: p } };
}

export type TargetTierDraft = { key: string; startText: string; ratePercentText: string };
export type TargetPreviewBody = {
 mtdSalesMinor: number; priorMtdSalesMinor: number;
 tiers: Array<{ startMinor: number; rateBp: number }>;
};
export function parsePercentToBp(text: string): number | null {
 const t = text.trim();
 if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
 const [whole, frac = ""] = t.split(".");
 const bp = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
 return bp >= 0 && bp <= 10_000 ? bp : null;
}
export function buildTargetPreviewBody(
 mtdText: string, priorText: string, tiers: readonly TargetTierDraft[],
): BodyResult<TargetPreviewBody> {
 const mtd = parseNonNegativeMoneyToMinor(mtdText);
 const prior = parseNonNegativeMoneyToMinor(priorText);
 if (mtd === null || prior === null) return { ok: false, error: "مبيعات الشهر (MTD) لازم تكون أرقامًا غير سالبة." };
 if (prior > mtd) return { ok: false, error: "مبيعات اليوم السابق لا يمكن أن تتجاوز مبيعات الشهر حتى اليوم." };
 if (tiers.length < 1 || tiers.length > MAX_TARGET_TIERS)
  return { ok: false, error: "أضف شريحة واحدة على الأقل (حد أقصى 50)." };
 const out: TargetPreviewBody["tiers"] = [];
 for (const t of tiers) {
  const startMinor = parseNonNegativeMoneyToMinor(t.startText);
  const rateBp = parsePercentToBp(t.ratePercentText);
  if (startMinor === null || rateBp === null)
   return { ok: false, error: "بداية الشريحة أو النسبة غير صحيحة (النسبة من 0 إلى 100)." };
  const prev = out[out.length - 1];
  if (prev && startMinor <= prev.startMinor)
   return { ok: false, error: "بدايات الشرائح لازم تتصاعد بدون تكرار." };
  out.push({ startMinor, rateBp });
 }
 return { ok: true, body: { mtdSalesMinor: mtd, priorMtdSalesMinor: prior, tiers: out } };
}

// ---- Preview response shapes (mirrors apps/api HrService.previewLedger/previewTarget) ---

export const HR_PREVIEW_STATE = "UNPOSTED_HR_LEDGER_PREVIEW" as const;
export type LedgerSummaryView = {
 employeeId: string; balanceMinor: number; outstandingAdvanceMinor: number;
 salaryCreditsMinor: number; targetCreditsMinor: number; fundingCreditsMinor: number;
 repaymentCreditsMinor: number; advanceDebitsMinor: number; payoutDebitsMinor: number;
 deductionDebitsMinor: number;
};
export type LedgerPreviewView = {
 state: string; persisted: boolean; financialPostingState: string;
 employees: LedgerSummaryView[];
 liquidity: { cashRequiredMinor: number; employeeDebtMinor: number; netMinor: number };
 proposal: Record<string, unknown> | null;
};
export type TargetPreviewView = {
 state: string; persisted: boolean; financialPostingState: string;
 mtdTargetMinor: number; priorMtdTargetMinor: number; dayDeltaMinor: number;
 activeTierIndex: number | null;
 breakdown: Array<{ fromMinor: number; toMinor: number | null; eligibleMinor: number; rateBp: number }>;
};
/** A preview is only rendered when it explicitly declares itself unposted and unpersisted. */
export function isSafePreview(p: { state?: unknown; persisted?: unknown; financialPostingState?: unknown }): boolean {
 return p.state === HR_PREVIEW_STATE && p.persisted === false &&
  p.financialPostingState === "NOT_AUTHORIZED";
}
