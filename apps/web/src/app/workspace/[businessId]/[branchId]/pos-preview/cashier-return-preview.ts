/**
 * Cashier DeleteInvoiceDialog / deleteSalesInvoice -> private POS return preview helpers
 * (NON-POSTING). Source: casher@046bf19
 * - src/components/sales/DeleteInvoiceDialog.tsx (d7af1617…)
 * - src/lib/deleteSalesInvoice.ts (e38b5cea…)
 * Verbatim excerpts live in `_cashier_source/pos-returns/`.
 * Mirrors packages/business-modules/pos/src/return-preview.ts (`previewReturnRefund`).
 * No fetch, storage, clock or randomness: nothing is voided or refunded here.
 */
export type ReturnOutcome = "NO_REASON" | "MISSING_SALE_REF" | "READY_IN_CASHIER";
export type ReturnEntryState = {
  outcome: ReturnOutcome;
  normalizedReason: string;
  saleDisplayRef: string | null;
  cashierWouldEnableConfirm: boolean;
};

const REASON_LIMIT = 2_000;
const REF_LIMIT = 64;

/** Cashier DeleteInvoiceDialog textarea: keep printable text, bound length. */
export function sanitizeReturnReasonInput(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, REASON_LIMIT);
}

/** Display-only invoice label (Cashier InvNo). Empty -> null. */
export function sanitizeSaleDisplayRefInput(value: string): string {
  return value.replace(/[^\dA-Za-z#\-_.\u0600-\u06FF ]/g, "").slice(0, REF_LIMIT);
}

export function readSaleDisplayRef(raw: string): string | null {
  const trimmed = sanitizeSaleDisplayRefInput(raw).trim();
  if (!trimmed) return null;
  if (!/^[0-9A-Za-z#\-_.\u0600-\u06FF ]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

export function computeReturnEntry(saleDisplayRef: string | null, reason: string): ReturnEntryState {
  if (typeof reason !== "string" || reason.length > REASON_LIMIT) {
    throw new TypeError("Invalid return reason");
  }
  let ref: string | null = null;
  if (saleDisplayRef !== null) {
    if (typeof saleDisplayRef !== "string" || saleDisplayRef.length > REF_LIMIT) {
      throw new TypeError("Invalid sale reference");
    }
    const trimmed = saleDisplayRef.trim();
    if (trimmed) {
      if (!/^[0-9A-Za-z#\-_.\u0600-\u06FF ]{1,64}$/.test(trimmed)) {
        throw new TypeError("Invalid sale reference");
      }
      ref = trimmed;
    }
  }
  const normalizedReason = reason.trim();
  let outcome: ReturnOutcome = "READY_IN_CASHIER";
  if (!normalizedReason) outcome = "NO_REASON";
  else if (ref === null) outcome = "MISSING_SALE_REF";
  return {
    outcome,
    normalizedReason,
    saleDisplayRef: ref,
    cashierWouldEnableConfirm: outcome === "READY_IN_CASHIER",
  };
}
