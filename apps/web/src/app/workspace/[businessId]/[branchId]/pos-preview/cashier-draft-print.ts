/**
 * Cashier PrintInvoiceModal → private POS DRAFT print helpers (NON-POSTING).
 * Source: casher@046bf19 src/components/pos/PrintInvoiceModal.tsx (blob f6531030…).
 * Verbatim modal lives in `_cashier_source/pos-print/`. Thermal agent / POSTED reprint
 * stay OPEN (ledger POS-07). Browser window.print() only for authorized drafts.
 */
export const DRAFT_PRINT_BANNER_AR = "مسودة — غير محصّلة / غير مرحّلة" as const;

export type DraftPrintReceipt = {
  documentKind: "POS_DRAFT_RECEIPT";
  posting: "NOT_POSTED";
  paymentState: "NOT_COLLECTED";
  accountingState: "NOT_POSTED";
  inventoryState: "NOT_DECREMENTED";
  thermalAgent: "NOT_AVAILABLE";
  postedReprint: "NOT_AUTHORIZED";
  bannerAr: typeof DRAFT_PRINT_BANNER_AR;
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
  lines: Array<{
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
};

export function assertDraftPrintReceipt(value: unknown): DraftPrintReceipt {
  if (!value || typeof value !== "object") throw new TypeError("Invalid draft receipt");
  const r = value as DraftPrintReceipt;
  if (
    r.documentKind !== "POS_DRAFT_RECEIPT" ||
    r.posting !== "NOT_POSTED" ||
    r.paymentState !== "NOT_COLLECTED" ||
    r.accountingState !== "NOT_POSTED" ||
    r.inventoryState !== "NOT_DECREMENTED" ||
    r.thermalAgent !== "NOT_AVAILABLE" ||
    r.postedReprint !== "NOT_AUTHORIZED" ||
    r.bannerAr !== DRAFT_PRINT_BANNER_AR ||
    !Array.isArray(r.lines)
  ) {
    throw new TypeError("Unexpected draft print payload");
  }
  return r;
}

/** Open an authorized HTML receipt in a new window and invoke browser print. */
export function openDraftBrowserPrint(html: string): {ok: true} | {ok: false; reason: string} {
  if (typeof html !== "string" || !html.includes("POS_DRAFT_RECEIPT") ||
      !html.includes(DRAFT_PRINT_BANNER_AR)) {
    return {ok: false, reason: "INVALID_DRAFT_HTML"};
  }
  if (typeof window === "undefined" || typeof window.open !== "function") {
    return {ok: false, reason: "NO_WINDOW"};
  }
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!w) return {ok: false, reason: "POPUP_BLOCKED"};
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Defer until layout settles (Cashier browser fallback pattern).
  w.focus();
  setTimeout(() => {
    try { w.print(); } catch { /* operator can use browser print manually */ }
  }, 250);
  return {ok: true};
}
