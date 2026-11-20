/**
 * Cashier void/delete invoice (`DeleteInvoiceDialog` + `deleteSalesInvoice`) -> shared POS
 * returns/refund NON-POSTING preview policy.
 *
 * Source: casher@046bf19
 * - src/components/sales/DeleteInvoiceDialog.tsx (blob d7af1617…)
 * - src/lib/deleteSalesInvoice.ts (blob e38b5cea…)
 * - DELETE /api/sales/[id] reason guard (route blob 2e9746f0…)
 *
 * Cashier hard-deletes a posted sale and cascades stock reverse, treasury cash-move remove,
 * and loyalty ledger delete. DRVO has no Sales void owner and ADR-031 is open: this module
 * only answers whether Cashier would enable confirm, and always leaves every write side
 * NOT_AUTHORIZED. Do not invent partial-refund documents or stock increments here.
 */
export type ReturnRefundOutcome = "NO_REASON" | "MISSING_SALE_REF" | "READY_IN_CASHIER";

export type ReturnRefundPreview = Readonly<{
  state: "UNPOSTED_RETURN_REFUND_PREVIEW";
  persisted: false;
  paymentState: "NOT_COLLECTED";
  saleReverseState: "BLOCKED_ADR_031_SALES_VOID";
  stockIncrement: "NOT_AUTHORIZED";
  treasuryCashRefund: "NOT_AUTHORIZED";
  loyaltyReverse: "NOT_AUTHORIZED";
  glPosting: "NOT_AUTHORIZED";
  outboundMessaging: "NOT_AUTHORIZED";
  outcome: ReturnRefundOutcome;
  normalizedReason: string;
  saleDisplayRef: string | null;
  /** Mirrors Cashier DeleteInvoiceDialog confirm enablement: target present + reason.trim(). */
  cashierWouldEnableConfirm: boolean;
}>;

const REASON_LIMIT = 2_000;
const REF_LIMIT = 64;

/**
 * Cashier `deleteSalesInvoice` / DELETE route: trim; empty after trim is rejected.
 * Returns the normalized reason string (may be empty — callers decide outcome).
 */
export function normalizeReturnReason(reason: unknown): string {
  if (typeof reason !== "string") throw new TypeError("Invalid return reason");
  if (reason.length > REASON_LIMIT) throw new TypeError("Return reason too long");
  return reason.trim();
}

function normalizeSaleDisplayRef(saleDisplayRef: unknown): string | null {
  if (saleDisplayRef === null || saleDisplayRef === undefined) return null;
  if (typeof saleDisplayRef !== "string") throw new TypeError("Invalid sale reference");
  if (saleDisplayRef.length > REF_LIMIT) throw new TypeError("Sale reference too long");
  const trimmed = saleDisplayRef.trim();
  if (!trimmed) return null;
  // Display-only invoice label (Cashier InvNo / InvID). No path separators.
  if (!/^[0-9A-Za-z#\-_.\u0600-\u06FF ]{1,64}$/.test(trimmed)) {
    throw new TypeError("Invalid sale reference");
  }
  return trimmed;
}

/**
 * NON-POSTING preview of Cashier's void/delete confirm gate.
 * Never reverses a sale, never increments stock, never refunds cash, never touches loyalty/GL.
 */
export function previewReturnRefund(
  saleDisplayRef: string | null,
  reason: string,
): ReturnRefundPreview {
  const ref = normalizeSaleDisplayRef(saleDisplayRef);
  const normalizedReason = normalizeReturnReason(reason);
  let outcome: ReturnRefundOutcome = "READY_IN_CASHIER";
  if (!normalizedReason) outcome = "NO_REASON";
  else if (ref === null) outcome = "MISSING_SALE_REF";
  return {
    state: "UNPOSTED_RETURN_REFUND_PREVIEW",
    persisted: false,
    paymentState: "NOT_COLLECTED",
    saleReverseState: "BLOCKED_ADR_031_SALES_VOID",
    stockIncrement: "NOT_AUTHORIZED",
    treasuryCashRefund: "NOT_AUTHORIZED",
    loyaltyReverse: "NOT_AUTHORIZED",
    glPosting: "NOT_AUTHORIZED",
    outboundMessaging: "NOT_AUTHORIZED",
    outcome,
    normalizedReason,
    saleDisplayRef: ref,
    cashierWouldEnableConfirm: outcome === "READY_IN_CASHIER",
  };
}
