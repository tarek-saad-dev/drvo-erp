/**
 * Cashier PrintInvoiceModal → shared POS DRAFT receipt print model (NON-POSTING).
 *
 * Source: casher@046bf19
 * - src/components/pos/PrintInvoiceModal.tsx (blob f65310306b30ca8b9a260013aad3556d7bdbb5aa)
 * Related (READ excerpts only): PrintRecoveryCenter / printing settings — thermal agent
 * and POSTED reprint stay OPEN (ledger POS-07).
 *
 * DRVO prints an authorized POS DRAFT snapshot only. Never implies paid sale, stock
 * decrement, Treasury collection, or GL. Do not invent barcode master here.
 */
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCY = new Set(["EGP", "SAR", "AED", "USD"]);
const MAX = 9_000_000_000_000;
const LABEL_LIMIT = 200;

export const POS_DRAFT_RECEIPT_BANNER_AR = "مسودة — غير محصّلة / غير مرحّلة" as const;

export type DraftPrintLineInput = Readonly<{
  lineNo: number;
  offeringId: string;
  displayName: string;
  kind: string;
  quantity: number;
  unitPriceMinor: number;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  executorEmployeeId: string | null;
  executorDisplayName?: string | null;
}>;

export type DraftPrintSnapshotInput = Readonly<{
  draftId: string;
  createdAtUtc: string;
  currency: string;
  customerId: string | null;
  customerDisplayName?: string | null;
  customerPhone?: string | null;
  headerDiscountMinor: number;
  subtotalMinor: number;
  linesNetMinor?: number;
  totalDiscountMinor: number;
  grandTotalMinor: number;
  lines: readonly DraftPrintLineInput[];
  branchLabel?: string | null;
  businessLabel?: string | null;
}>;

export type PosDraftReceiptLine = Readonly<{
  lineNo: number;
  offeringId: string;
  displayName: string;
  kind: string;
  quantity: number;
  unitPriceMinor: number;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  executorEmployeeId: string | null;
  executorDisplayName: string | null;
}>;

export type PosDraftReceipt = Readonly<{
  documentKind: "POS_DRAFT_RECEIPT";
  posting: "NOT_POSTED";
  paymentState: "NOT_COLLECTED";
  accountingState: "NOT_POSTED";
  inventoryState: "NOT_DECREMENTED";
  /** Cashier local thermal agent / PrintRecoveryCenter — not ported. */
  thermalAgent: "NOT_AVAILABLE";
  /** Cashier POSTED sale reprint — blocked until ADR-031 + Sales owner. */
  postedReprint: "NOT_AUTHORIZED";
  bannerAr: typeof POS_DRAFT_RECEIPT_BANNER_AR;
  draftId: string;
  createdAtUtc: string;
  currency: string;
  customerId: string | null;
  customerDisplayName: string | null;
  customerPhone: string | null;
  branchLabel: string | null;
  businessLabel: string | null;
  headerDiscountMinor: number;
  subtotalMinor: number;
  linesNetMinor: number;
  totalDiscountMinor: number;
  grandTotalMinor: number;
  lines: readonly PosDraftReceiptLine[];
}>;

function uuid(v: unknown): v is string {
  return typeof v === "string" && GUID.test(v);
}

function money(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0 || v > MAX) {
    throw new TypeError(`Invalid ${field}`);
  }
  return v;
}

function label(v: unknown, field: string): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") throw new TypeError(`Invalid ${field}`);
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (trimmed.length > LABEL_LIMIT) throw new TypeError(`${field} too long`);
  // Printable Arabic/Latin text; no HTML/control injection.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/.test(trimmed)) {
    throw new TypeError(`Invalid ${field}`);
  }
  return trimmed;
}

/**
 * Build a printable NON-POSTING draft receipt model from an authorized draft snapshot.
 * Caller must already have Tenant/Business/Branch-scoped draft read authority.
 */
export function buildPosDraftReceipt(input: DraftPrintSnapshotInput): PosDraftReceipt {
  if (!input || typeof input !== "object") throw new TypeError("Invalid draft snapshot");
  if (!uuid(input.draftId)) throw new TypeError("Invalid draft id");
  if (typeof input.createdAtUtc !== "string" || !input.createdAtUtc.trim()) {
    throw new TypeError("Invalid draft timestamp");
  }
  const currency = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
  if (!CURRENCY.has(currency)) throw new TypeError("Invalid currency");
  const customerId =
    input.customerId === null || input.customerId === undefined
      ? null
      : uuid(input.customerId)
        ? input.customerId.toLowerCase()
        : (() => {
            throw new TypeError("Invalid customer id");
          })();
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 20) {
    throw new TypeError("Draft lines must be 1..20");
  }
  const headerDiscountMinor = money(input.headerDiscountMinor, "headerDiscountMinor");
  const subtotalMinor = money(input.subtotalMinor, "subtotalMinor");
  const totalDiscountMinor = money(input.totalDiscountMinor, "totalDiscountMinor");
  const grandTotalMinor = money(input.grandTotalMinor, "grandTotalMinor");
  const lines: PosDraftReceiptLine[] = input.lines.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new TypeError("Invalid draft line");
    if (!uuid(raw.offeringId)) throw new TypeError("Invalid offering id");
    if (typeof raw.displayName !== "string" || !raw.displayName.trim()) {
      throw new TypeError("Invalid line display name");
    }
    if (typeof raw.kind !== "string" || !raw.kind.trim()) throw new TypeError("Invalid line kind");
    if (
      typeof raw.quantity !== "number" ||
      !Number.isSafeInteger(raw.quantity) ||
      raw.quantity < 1 ||
      raw.quantity > 20
    ) {
      throw new TypeError("Invalid line quantity");
    }
    const lineNo =
      typeof raw.lineNo === "number" && Number.isSafeInteger(raw.lineNo) && raw.lineNo >= 1
        ? raw.lineNo
        : index + 1;
    const executorEmployeeId =
      raw.executorEmployeeId === null || raw.executorEmployeeId === undefined
        ? null
        : uuid(raw.executorEmployeeId)
          ? raw.executorEmployeeId.toLowerCase()
          : (() => {
              throw new TypeError("Invalid executor");
            })();
    return {
      lineNo,
      offeringId: raw.offeringId.toLowerCase(),
      displayName: raw.displayName.trim().slice(0, LABEL_LIMIT),
      kind: raw.kind.trim().slice(0, 32),
      quantity: raw.quantity,
      unitPriceMinor: money(raw.unitPriceMinor, "unitPriceMinor"),
      grossMinor: money(raw.grossMinor, "grossMinor"),
      discountMinor: money(raw.discountMinor, "discountMinor"),
      netMinor: money(raw.netMinor, "netMinor"),
      executorEmployeeId,
      executorDisplayName: label(raw.executorDisplayName ?? null, "executorDisplayName"),
    };
  });
  const linesNetMinor =
    input.linesNetMinor === undefined
      ? lines.reduce((sum, line) => sum + line.netMinor, 0)
      : money(input.linesNetMinor, "linesNetMinor");
  if (linesNetMinor - headerDiscountMinor !== grandTotalMinor) {
    throw new TypeError("Draft totals do not reconcile");
  }
  return {
    documentKind: "POS_DRAFT_RECEIPT",
    posting: "NOT_POSTED",
    paymentState: "NOT_COLLECTED",
    accountingState: "NOT_POSTED",
    inventoryState: "NOT_DECREMENTED",
    thermalAgent: "NOT_AVAILABLE",
    postedReprint: "NOT_AUTHORIZED",
    bannerAr: POS_DRAFT_RECEIPT_BANNER_AR,
    draftId: input.draftId.toLowerCase(),
    createdAtUtc: input.createdAtUtc,
    currency,
    customerId,
    customerDisplayName: label(input.customerDisplayName ?? null, "customerDisplayName"),
    customerPhone: label(input.customerPhone ?? null, "customerPhone"),
    branchLabel: label(input.branchLabel ?? null, "branchLabel"),
    businessLabel: label(input.businessLabel ?? null, "businessLabel"),
    headerDiscountMinor,
    subtotalMinor,
    linesNetMinor,
    totalDiscountMinor,
    grandTotalMinor,
    lines,
  };
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moneyMajor(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

/**
 * Minimal RTL HTML for browser window.print(). Not Cashier's thermal agent path.
 * Deliberately omits payment method / paid totals — draft is NOT_COLLECTED.
 */
export function renderPosDraftReceiptHtml(receipt: PosDraftReceipt): string {
  if (!receipt || receipt.documentKind !== "POS_DRAFT_RECEIPT") {
    throw new TypeError("Invalid POS draft receipt");
  }
  const when = (() => {
    try {
      return new Date(receipt.createdAtUtc).toLocaleString("ar-EG");
    } catch {
      return receipt.createdAtUtc;
    }
  })();
  const rows = receipt.lines
    .map((line) => {
      const executor = line.executorDisplayName
        ? `<div class="barber">${esc(line.executorDisplayName)}</div>`
        : "";
      return `<tr>
      <td>${line.lineNo}</td>
      <td><div class="name">${esc(line.displayName)}</div>
        <div class="qty">× ${line.quantity}</div>${executor}</td>
      <td class="amt">${esc(moneyMajor(line.netMinor, receipt.currency))}</td>
    </tr>`;
    })
    .join("");
  const brand = receipt.businessLabel || "DRVO POS";
  const branch = receipt.branchLabel ? `<div class="meta">${esc(receipt.branchLabel)}</div>` : "";
  const customer = receipt.customerDisplayName
    ? `<div class="info-row"><span>العميل</span><span>${esc(receipt.customerDisplayName)}</span></div>`
    : `<div class="info-row"><span>العميل</span><span>بدون عميل</span></div>`;
  const phone = receipt.customerPhone
    ? `<div class="info-row"><span>الهاتف</span><span>${esc(receipt.customerPhone)}</span></div>`
    : "";
  const headerDisc =
    receipt.headerDiscountMinor > 0
      ? `<div class="total-row"><span>خصم الفاتورة</span><span>- ${esc(moneyMajor(receipt.headerDiscountMinor, receipt.currency))}</span></div>`
      : "";
  const lineDisc =
    receipt.totalDiscountMinor - receipt.headerDiscountMinor > 0
      ? `<div class="total-row"><span>خصومات الأصناف</span><span>- ${esc(moneyMajor(receipt.totalDiscountMinor - receipt.headerDiscountMinor, receipt.currency))}</span></div>`
      : "";
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>مسودة POS ${esc(receipt.draftId.slice(0, 8))}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #111; margin: 0; }
  .frame { width: 72mm; margin: 0 auto; }
  .banner { background: #111; color: #fff; text-align: center; font-weight: 800;
    padding: 8px 6px; margin-bottom: 8px; letter-spacing: 0.02em; }
  .brand { text-align: center; font-weight: 800; font-size: 16px; }
  .meta, .qty, .barber { color: #444; font-size: 11px; }
  .info-row, .total-row { display: flex; justify-content: space-between; gap: 8px;
    font-size: 12px; padding: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th, td { text-align: right; vertical-align: top; padding: 3px 0; border-bottom: 1px dashed #ccc; }
  th:first-child, td:first-child { width: 18px; }
  th:last-child, td.amt { text-align: left; white-space: nowrap; }
  .grand { font-weight: 800; font-size: 14px; border-top: 2px solid #111; margin-top: 4px; padding-top: 6px; }
  .foot { text-align: center; margin-top: 10px; font-size: 11px; color: #333; }
  .states { font-family: ui-monospace, monospace; font-size: 10px; text-align: center; margin-top: 6px; }
  @media print { .no-print { display: none !important; } body { margin: 0; } }
</style>
</head>
<body>
  <div class="frame">
    <div class="banner" data-pos-draft-banner="1">${esc(receipt.bannerAr)}</div>
    <div class="brand">${esc(brand)}</div>
    ${branch}
    <div class="info-row"><span>رقم المسودة</span><span>#${esc(receipt.draftId.slice(0, 8))}</span></div>
    <div class="info-row"><span>التوقيت</span><span>${esc(when)}</span></div>
    ${customer}${phone}
    <div class="info-row"><span>طريقة الدفع</span><span>غير محصّلة</span></div>
    <table>
      <thead><tr><th>#</th><th>الصنف / الحلاق</th><th>السعر</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total-row"><span>المجموع الفرعي</span><span>${esc(moneyMajor(receipt.subtotalMinor, receipt.currency))}</span></div>
    ${lineDisc}${headerDisc}
    <div class="total-row grand"><span>الإجمالي (مسودة)</span><span>${esc(moneyMajor(receipt.grandTotalMinor, receipt.currency))}</span></div>
    <div class="states">${receipt.documentKind} · ${receipt.paymentState} · ${receipt.posting}</div>
    <div class="foot">إيصال مسودة للمعاينة التشغيلية — ليس فاتورة بيع مرحّلة</div>
  </div>
</body>
</html>`;
}
