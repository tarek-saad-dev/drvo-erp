/**
 * Purchasing AP preview helpers (nonposting).
 * Line extension uses QtyMilli (1000 = 1 unit) * UnitCostMinor / 1000.
 * Never posts payable, Treasury payment, or GL (ADR-031 gated).
 */
export type PurchaseReceiveLineInput = {
  lineNo: number;
  offeringId: string;
  qtyMilli: number;
  unitCostMinor: number;
};

export type ApPreviewState = {
  state: "AP_PREVIEW_ONLY";
  treasuryState: "NOT_PAID";
  accountingState: "NOT_POSTED";
  adr031: "NOT_IN_SCOPE";
  purchasingPosts: "RECEIVE_DRAFTS_ONLY";
};

export const AP_PREVIEW_STATE: ApPreviewState = Object.freeze({
  state: "AP_PREVIEW_ONLY",
  treasuryState: "NOT_PAID",
  accountingState: "NOT_POSTED",
  adr031: "NOT_IN_SCOPE",
  purchasingPosts: "RECEIVE_DRAFTS_ONLY",
});

const MAX = 9000000000000;

export function lineExtMinor(qtyMilli: number, unitCostMinor: number): number {
  if (!Number.isSafeInteger(qtyMilli) || qtyMilli < 1 || qtyMilli > MAX)
    throw new Error("Invalid qtyMilli");
  if (!Number.isSafeInteger(unitCostMinor) || unitCostMinor < 0 || unitCostMinor > MAX)
    throw new Error("Invalid unitCostMinor");
  const product = qtyMilli * unitCostMinor;
  if (!Number.isSafeInteger(product)) throw new Error("Line extension overflow");
  return Math.trunc(product / 1000);
}

export function sumApMinor(lines: ReadonlyArray<{ lineExtMinor: number }>): number {
  let total = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.lineExtMinor) || line.lineExtMinor < 0 || line.lineExtMinor > MAX)
      throw new Error("Invalid lineExtMinor");
    total += line.lineExtMinor;
    if (!Number.isSafeInteger(total) || total > MAX) throw new Error("AP total overflow");
  }
  return total;
}

export function previewPurchaseAp(
  lines: ReadonlyArray<PurchaseReceiveLineInput>,
): { lines: Array<PurchaseReceiveLineInput & { lineExtMinor: number }>; apTotalMinor: number } & ApPreviewState {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 50)
    throw new Error("Invalid purchase lines");
  const seenNo = new Set<number>();
  const seenOff = new Set<string>();
  const mapped = lines.map((line) => {
    if (!Number.isSafeInteger(line.lineNo) || line.lineNo < 1 || line.lineNo > 50)
      throw new Error("Invalid lineNo");
    if (seenNo.has(line.lineNo)) throw new Error("Duplicate lineNo");
    seenNo.add(line.lineNo);
    if (typeof line.offeringId !== "string" || !line.offeringId)
      throw new Error("Invalid offeringId");
    if (seenOff.has(line.offeringId)) throw new Error("Duplicate offeringId");
    seenOff.add(line.offeringId);
    const ext = lineExtMinor(line.qtyMilli, line.unitCostMinor);
    return { ...line, lineExtMinor: ext };
  });
  return {
    ...AP_PREVIEW_STATE,
    lines: mapped,
    apTotalMinor: sumApMinor(mapped),
  };
}
