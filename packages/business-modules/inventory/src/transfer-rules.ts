/**
 * Branch transfer rules - characterization of Cashier transferInventory.service.ts
 * (casher@046bf19, blob 0bb552bc) as DRVO nonposting rules.
 *
 * Cashier createTransferDraft: SAME_BRANCH / NO_LINES / INVALID_QTY (qty must be > 0).
 * Cashier postTransfer: source deduct with allowNegativeOverride=false (OVER_TRANSFER blocked).
 * DRVO adaptation (SQL032): one atomic APPLIED document; cancel reverses both deltas and is
 * blocked when the destination no longer holds the transferred quantity. No GL/COGS/AP (ADR-031).
 */
export type TransferLineInput = Readonly<{ offeringId: string; qtyMilli: number }>;
export type TransferBalances = Readonly<Record<string, number>>;

export type TransferRuleCode =
  | "SAME_BRANCH"
  | "NO_LINES"
  | "INVALID_QTY"
  | "DUPLICATE_PRODUCT"
  | "INSUFFICIENT_SOURCE_STOCK"
  | "DESTINATION_STOCK_CONSUMED";

export type TransferDelta = Readonly<{
  branchId: string;
  offeringId: string;
  deltaMilli: number;
}>;

export type TransferPlan =
  | Readonly<{ ok: true; deltas: readonly TransferDelta[]; posting: "NOT_POSTED"; adr031: "NOT_IN_SCOPE" }>
  | Readonly<{ ok: false; code: TransferRuleCode; offeringId: string | null }>;

const MAX_MILLI = 9_000_000_000_000;
const MAX_LINES = 50;

function fail(code: TransferRuleCode, offeringId: string | null = null): TransferPlan {
  return { ok: false, code, offeringId };
}

/** Plans the APPLY deltas for a transfer. Pure: callers pass owned source balances. */
export function planTransferApply(
  fromBranchId: string,
  toBranchId: string,
  lines: readonly TransferLineInput[],
  sourceBalances: TransferBalances,
): TransferPlan {
  if (fromBranchId === toBranchId) return fail("SAME_BRANCH");
  if (lines.length < 1 || lines.length > MAX_LINES) return fail("NO_LINES");
  const seen = new Set<string>();
  const deltas: TransferDelta[] = [];
  for (const line of lines) {
    if (!Number.isSafeInteger(line.qtyMilli) || line.qtyMilli < 1 || line.qtyMilli > MAX_MILLI) {
      return fail("INVALID_QTY", line.offeringId);
    }
    if (seen.has(line.offeringId)) return fail("DUPLICATE_PRODUCT", line.offeringId);
    seen.add(line.offeringId);
    if ((sourceBalances[line.offeringId] ?? 0) < line.qtyMilli) {
      return fail("INSUFFICIENT_SOURCE_STOCK", line.offeringId);
    }
    const outDelta = 0 - line.qtyMilli;
    deltas.push({ branchId: fromBranchId, offeringId: line.offeringId, deltaMilli: outDelta });
    deltas.push({ branchId: toBranchId, offeringId: line.offeringId, deltaMilli: line.qtyMilli });
  }
  return { ok: true, deltas, posting: "NOT_POSTED", adr031: "NOT_IN_SCOPE" };
}

/** Plans the CANCEL deltas: exact reverse of APPLY, blocked if destination stock was consumed. */
export function planTransferCancel(
  fromBranchId: string,
  toBranchId: string,
  lines: readonly TransferLineInput[],
  destinationBalances: TransferBalances,
): TransferPlan {
  if (fromBranchId === toBranchId) return fail("SAME_BRANCH");
  if (lines.length < 1) return fail("NO_LINES");
  const deltas: TransferDelta[] = [];
  for (const line of lines) {
    if ((destinationBalances[line.offeringId] ?? 0) < line.qtyMilli) {
      return fail("DESTINATION_STOCK_CONSUMED", line.offeringId);
    }
    const destDelta = 0 - line.qtyMilli;
    deltas.push({ branchId: toBranchId, offeringId: line.offeringId, deltaMilli: destDelta });
    deltas.push({ branchId: fromBranchId, offeringId: line.offeringId, deltaMilli: line.qtyMilli });
  }
  return { ok: true, deltas, posting: "NOT_POSTED", adr031: "NOT_IN_SCOPE" };
}
