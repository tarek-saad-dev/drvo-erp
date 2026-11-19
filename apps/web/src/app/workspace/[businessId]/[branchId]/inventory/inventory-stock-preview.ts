/**
 * Local copy of packages/business-modules/inventory/src/stock-preview.ts for the
 * private Next client bundle. Keep semantics identical; domain tests own truth.
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

export type StockPreviewRow = Readonly<{
  offeringId: string;
  displayName: string;
  categoryName: string | null;
  priceMinor: number;
  currency: string;
  isActive: boolean;
  onHand: "UNKNOWN";
  stockStatus: "UNKNOWN";
  barcode: null;
  productCode: null;
}>;

export type StockPreviewKpis = Readonly<{
  activeProducts: number;
  unitsAvailable: "UNKNOWN";
  inventoryValueAtCost: "UNKNOWN";
  lowStock: "UNKNOWN";
  outOfStock: "UNKNOWN";
}>;

export type StockPreviewWorkspace = Readonly<{
  state: "DRAFT_UNVERIFIED_STOCK_PREVIEW";
  verification: "UNVERIFIED";
  posting: "NOT_POSTED";
  stockLedger: "NOT_AVAILABLE";
  purchasingPosts: "NOT_AVAILABLE";
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

export function buildDraftStockPreview(
  offerings: readonly CatalogOfferingInput[],
  query = "",
): StockPreviewWorkspace {
  if (!Array.isArray(offerings) || offerings.length > 5000) {
    throw new TypeError("Invalid offerings list");
  }
  if (typeof query !== "string" || query.length > 200) {
    throw new TypeError("Invalid query");
  }

  const products: StockPreviewRow[] = [];
  for (const offering of offerings) {
    if (!isCatalogProductOffering(offering)) continue;
    products.push({
      offeringId: offering.offeringId.toLowerCase(),
      displayName: offering.displayName.trim(),
      categoryName:
        typeof offering.categoryName === "string" && offering.categoryName.trim()
          ? offering.categoryName.trim()
          : null,
      priceMinor: offering.priceMinor,
      currency: offering.currency,
      isActive: offering.isActive,
      onHand: "UNKNOWN",
      stockStatus: "UNKNOWN",
      barcode: null,
      productCode: null,
    });
  }

  products.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ar") ||
    a.offeringId.localeCompare(b.offeringId));

  const items = products.filter((row) => matchesStockPreviewQuery(row, query));
  const activeProducts = products.filter((row) => row.isActive).length;

  return Object.freeze({
    state: "DRAFT_UNVERIFIED_STOCK_PREVIEW",
    verification: "UNVERIFIED",
    posting: "NOT_POSTED",
    stockLedger: "NOT_AVAILABLE",
    purchasingPosts: "NOT_AVAILABLE",
    adr031: "NOT_IN_SCOPE",
    kpis: Object.freeze({
      activeProducts,
      unitsAvailable: "UNKNOWN",
      inventoryValueAtCost: "UNKNOWN",
      lowStock: "UNKNOWN",
      outOfStock: "UNKNOWN",
    }),
    items: Object.freeze(items),
    query: query.trim(),
  });
}
