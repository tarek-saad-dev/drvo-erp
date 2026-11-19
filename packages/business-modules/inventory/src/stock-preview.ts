/**
 * Cashier admin inventory concepts → DRVO Shared Inventory stock workspace helper.
 *
 * Pin concepts (casher@046bf19): product-tracked stock list + dashboard KPIs.
 * With SQL027 balances: qtyMilli/stockStatus are owned; cost KPIs stay UNKNOWN.
 * Without balances: on-hand UNKNOWN (never invent qty 0 as paid truth).
 * No sale decrement, transfers GL, or ADR-031.
 */
export type CatalogOfferingInput = Readonly<{
  offeringId: string;
  kind: string;
  displayName: string;
  priceMinor: number;
  currency: string;
  isActive: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
}>;

export type BalanceInput = Readonly<{
  offeringId: string;
  qtyMilli: number;
  reorderLevelMilli: number | null;
  stockStatus: "OK" | "LOW" | "OUT";
}>;

export type StockPreviewRow = Readonly<{
  offeringId: string;
  displayName: string;
  categoryName: string | null;
  priceMinor: number;
  currency: string;
  isActive: boolean;
  onHand: number | "UNKNOWN";
  qtyMilli: number | "UNKNOWN";
  stockStatus: "OK" | "LOW" | "OUT" | "UNKNOWN";
  barcode: null;
  productCode: null;
}>;

export type StockPreviewKpis = Readonly<{
  activeProducts: number;
  unitsAvailable: number | "UNKNOWN";
  unitsMilli: number | "UNKNOWN";
  inventoryValueAtCost: "UNKNOWN";
  lowStock: number | "UNKNOWN";
  outOfStock: number | "UNKNOWN";
}>;

export type StockPreviewWorkspace = Readonly<{
  state: "DRAFT_UNVERIFIED_STOCK_PREVIEW" | "NONPOSTING_BRANCH_STOCK_BALANCES";
  verification: "UNVERIFIED" | "BALANCES_OWNED";
  posting: "NOT_POSTED";
  stockLedger: "NOT_AVAILABLE" | "BRANCH_BALANCE_TABLE";
  purchasingPosts: "NOT_AVAILABLE" | "RECEIVE_DRAFTS_ONLY";
  adr031: "NOT_IN_SCOPE";
  kpis: StockPreviewKpis;
  items: readonly StockPreviewRow[];
  query: string;
}>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT = 9_000_000_000_000;

function assertOffering(raw: CatalogOfferingInput): void {
  if (!raw || typeof raw.offeringId !== "string" || !UUID.test(raw.offeringId)) {
    throw new TypeError("Invalid offeringId");
  }
  if (typeof raw.kind !== "string" || !raw.kind.trim()) {
    throw new TypeError("Invalid offering kind");
  }
  if (typeof raw.displayName !== "string" || !raw.displayName.trim()) {
    throw new TypeError("Invalid displayName");
  }
  if (!Number.isSafeInteger(raw.priceMinor) || raw.priceMinor < 0 ||
      raw.priceMinor > LIMIT) {
    throw new TypeError("Invalid priceMinor");
  }
  if (typeof raw.currency !== "string" || !/^[A-Z]{3}$/.test(raw.currency)) {
    throw new TypeError("Invalid currency");
  }
  if (typeof raw.isActive !== "boolean") throw new TypeError("Invalid isActive");
}

/** Cashier stock-tracked products ≈ DRVO Catalog kind PRODUCT. */
export function isCatalogProductOffering(
  offering: CatalogOfferingInput,
): boolean {
  assertOffering(offering);
  return offering.kind.trim().toUpperCase() === "PRODUCT";
}

export function matchesStockPreviewQuery(
  row: Pick<StockPreviewRow, "displayName" | "offeringId">,
  query: string,
): boolean {
  if (typeof query !== "string") throw new TypeError("Invalid query");
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (row.displayName.toLowerCase().includes(q)) return true;
  const id = row.offeringId.toLowerCase();
  return id.startsWith(q) || id.slice(0, 8).startsWith(q);
}

function unitsFromMilli(qtyMilli: number): number {
  return Number((qtyMilli / 1000).toFixed(3));
}

/**
 * Build stock workspace from Catalog offerings, optionally merged with owned balances.
 * Cost valuation remains UNKNOWN until Accounting/ADR-031.
 */
export function buildDraftStockPreview(
  offerings: readonly CatalogOfferingInput[],
  query = "",
  balances?: readonly BalanceInput[] | null,
): StockPreviewWorkspace {
  if (!Array.isArray(offerings) || offerings.length > 5000) {
    throw new TypeError("Invalid offerings list");
  }
  if (typeof query !== "string" || query.length > 200) {
    throw new TypeError("Invalid query");
  }
  const balanceMap = new Map<string, BalanceInput>();
  if (balances != null) {
    if (!Array.isArray(balances) || balances.length > 5000) {
      throw new TypeError("Invalid balances list");
    }
    for (const b of balances) {
      if (!b || typeof b.offeringId !== "string" || !UUID.test(b.offeringId)) {
        throw new TypeError("Invalid balance offeringId");
      }
      if (!Number.isSafeInteger(b.qtyMilli) || b.qtyMilli < -LIMIT || b.qtyMilli > LIMIT) {
        throw new TypeError("Invalid qtyMilli");
      }
      if (b.reorderLevelMilli != null &&
        (!Number.isSafeInteger(b.reorderLevelMilli) || b.reorderLevelMilli < 0 ||
         b.reorderLevelMilli > LIMIT)) {
        throw new TypeError("Invalid reorderLevelMilli");
      }
      if (!["OK", "LOW", "OUT"].includes(b.stockStatus)) {
        throw new TypeError("Invalid stockStatus");
      }
      balanceMap.set(b.offeringId.toLowerCase(), b);
    }
  }
  const owned = balanceMap.size > 0 || balances != null;

  const products: StockPreviewRow[] = [];
  for (const offering of offerings) {
    if (!isCatalogProductOffering(offering)) continue;
    const id = offering.offeringId.toLowerCase();
    const bal = balanceMap.get(id);
    products.push({
      offeringId: id,
      displayName: offering.displayName.trim(),
      categoryName:
        typeof offering.categoryName === "string" && offering.categoryName.trim()
          ? offering.categoryName.trim()
          : null,
      priceMinor: offering.priceMinor,
      currency: offering.currency,
      isActive: offering.isActive,
      onHand: owned && bal ? unitsFromMilli(bal.qtyMilli) : owned ? 0 : "UNKNOWN",
      qtyMilli: owned && bal ? bal.qtyMilli : owned ? 0 : "UNKNOWN",
      stockStatus: owned && bal ? bal.stockStatus : owned ? "OUT" : "UNKNOWN",
      barcode: null,
      productCode: null,
    });
  }

  products.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ar") ||
    a.offeringId.localeCompare(b.offeringId));

  const items = products.filter((row) => matchesStockPreviewQuery(row, query));
  const activeProducts = products.filter((row) => row.isActive).length;

  let unitsMilli: number | "UNKNOWN" = "UNKNOWN";
  let lowStock: number | "UNKNOWN" = "UNKNOWN";
  let outOfStock: number | "UNKNOWN" = "UNKNOWN";
  if (owned) {
    unitsMilli = 0;
    lowStock = 0;
    outOfStock = 0;
    for (const row of products) {
      if (typeof row.qtyMilli === "number") unitsMilli += row.qtyMilli;
      if (row.stockStatus === "LOW") lowStock++;
      if (row.stockStatus === "OUT") outOfStock++;
    }
  }

  return Object.freeze({
    state: owned ? "NONPOSTING_BRANCH_STOCK_BALANCES" : "DRAFT_UNVERIFIED_STOCK_PREVIEW",
    verification: owned ? "BALANCES_OWNED" : "UNVERIFIED",
    posting: "NOT_POSTED",
    stockLedger: owned ? "BRANCH_BALANCE_TABLE" : "NOT_AVAILABLE",
    purchasingPosts: owned ? "RECEIVE_DRAFTS_ONLY" : "NOT_AVAILABLE",
    adr031: "NOT_IN_SCOPE",
    kpis: Object.freeze({
      activeProducts,
      unitsAvailable: typeof unitsMilli === "number" ? unitsFromMilli(unitsMilli) : "UNKNOWN",
      unitsMilli,
      inventoryValueAtCost: "UNKNOWN",
      lowStock,
      outOfStock,
    }),
    items: Object.freeze(items),
    query: query.trim(),
  });
}
