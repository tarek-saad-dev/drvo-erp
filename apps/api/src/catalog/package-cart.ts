/**
 * Cashier `groomPackageCart.ts` + `groomOptionalAddons.ts` → shared POS package cart policy.
 * Commercial package price sits on the anchor line; included required lines are zero;
 * selected optionals keep live list prices. Nonposting DRAFT expand only — no payment.
 */
export type PackageCartRole = "anchor" | "included" | "addon";
export type OptionalGroupKey = "groom_addons" | "home_visit";

export type PackageCartMeta = Readonly<{
  packageId: string;
  packageName: string;
  role: PackageCartRole;
  groupKey: string;
  includedCount: number;
  commercialPackagePriceMinor: number;
  optionalGroup?: OptionalGroupKey | null;
}>;

export type PackageCartLine = Readonly<{
  id: string;
  offeringId: string;
  displayName: string;
  unitPriceMinor: number;
  quantity: number;
  packageMeta: PackageCartMeta;
}>;

export type ResolvedPackageLine = Readonly<{
  offeringId: string;
  displayName: string;
  priceMinor: number;
  durationMinutes: number;
}>;

export type ResolvedPackageForCart = Readonly<{
  packageId: string;
  packageName: string;
  packagePriceMinor: number;
  packageDurationMinutes: number;
  totalDurationMinutes: number;
  requiredOfferingIds: readonly string[];
  addonOfferingIds: readonly string[];
  services: readonly ResolvedPackageLine[];
}>;

export type CartDisplayRow =
  | {
      kind: "package";
      groupKey: string;
      packageId: string;
      packageName: string;
      includedCount: number;
      priceMinor: number;
      anchor: PackageCartLine;
      included: PackageCartLine[];
      addons: PackageCartLine[];
      allIds: string[];
    }
  | { kind: "standalone"; item: { id: string; offeringId: string; packageMeta?: PackageCartMeta } };

export const GROOM_ADDONS_CATEGORY_NAME = "Groom Add-ons";
export const GROOM_HOME_VISIT_CATEGORY_NAME = "Groom Home Visit";

export const GROOM_OPTIONAL_GROUP_META: Record<
  OptionalGroupKey,
  {
    key: OptionalGroupKey;
    labelEn: string;
    labelAr: string;
    multiSelect: boolean;
    mutuallyExclusive: boolean;
  }
> = {
  groom_addons: {
    key: "groom_addons",
    labelEn: "Optional Groom Add-ons",
    labelAr: "إضافات العريس الاختيارية",
    multiSelect: true,
    mutuallyExclusive: false,
  },
  home_visit: {
    key: "home_visit",
    labelEn: "Groom Home Visit",
    labelAr: "زيارة تجهيز العريس",
    multiSelect: false,
    mutuallyExclusive: true,
  },
};

const LIMIT = 9_000_000_000_000;

function normalizeCatName(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGroomAddonsCategory(catName: string | null | undefined): boolean {
  return normalizeCatName(catName) === normalizeCatName(GROOM_ADDONS_CATEGORY_NAME);
}

export function isGroomHomeVisitCategory(catName: string | null | undefined): boolean {
  return normalizeCatName(catName) === normalizeCatName(GROOM_HOME_VISIT_CATEGORY_NAME);
}

/** Resolve optional group from Catalog category display name (Cashier cat-name path). */
export function resolveOptionalGroupByCategoryName(
  catName: string | null | undefined,
): OptionalGroupKey | null {
  if (isGroomHomeVisitCategory(catName)) return "home_visit";
  if (isGroomAddonsCategory(catName)) return "groom_addons";
  return null;
}

export function hasConflictingHomeVisitIds(
  selectedIds: readonly string[],
  homeVisitIds: Iterable<string>,
): boolean {
  const home = new Set([...homeVisitIds].map((id) => id.toLowerCase()));
  let count = 0;
  for (const id of selectedIds) {
    if (home.has(id.toLowerCase())) count += 1;
    if (count > 1) return true;
  }
  return false;
}

export function applyHomeVisitExclusivity<T extends { offeringId: string }>(
  items: readonly T[],
  incomingOfferingId: string,
  homeVisitIds: Iterable<string>,
): T[] {
  const home = new Set([...homeVisitIds].map((id) => id.toLowerCase()));
  const incoming = incomingOfferingId.toLowerCase();
  if (!home.has(incoming)) return [...items];
  return items.filter(
    (item) => !home.has(item.offeringId.toLowerCase()) || item.offeringId.toLowerCase() === incoming,
  );
}

export function newPackageGroupKey(packageId: string): string {
  return `pkg-${packageId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertMinor(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > LIMIT) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value;
}

/** Expand a server-resolved package into commercial cart lines (Cashier buildPackageCartItems). */
export function buildPackageCartItems(args: {
  resolved: ResolvedPackageForCart;
  groupKey?: string;
  counter?: number;
  optionalGroupByOfferingId?: Readonly<Record<string, OptionalGroupKey | null | undefined>>;
}): PackageCartLine[] {
  const groupKey = args.groupKey ?? newPackageGroupKey(args.resolved.packageId);
  const counter = args.counter ?? Date.now();
  const requiredSet = new Set(args.resolved.requiredOfferingIds.map((id) => id.toLowerCase()));
  const includedCount = args.resolved.requiredOfferingIds.length;
  const packagePriceMinor = assertMinor(
    args.resolved.packagePriceMinor,
    "packagePriceMinor",
  );
  const items: PackageCartLine[] = [];

  args.resolved.services.forEach((line, idx) => {
    const offeringKey = line.offeringId.toLowerCase();
    const isRequired = requiredSet.has(offeringKey);
    const priceMinor = assertMinor(line.priceMinor, "line priceMinor");
    const isAnchor = isRequired && priceMinor > 0;
    const role: PackageCartRole = !isRequired ? "addon" : isAnchor ? "anchor" : "included";
    const displayName =
      role === "anchor" ? args.resolved.packageName : line.displayName;
    const optionalGroup =
      args.optionalGroupByOfferingId?.[offeringKey] ??
      args.optionalGroupByOfferingId?.[line.offeringId] ??
      null;

    items.push({
      id: `pkg-${args.resolved.packageId}-${line.offeringId}-${counter + idx}`,
      offeringId: line.offeringId,
      displayName,
      unitPriceMinor: priceMinor,
      quantity: 1,
      packageMeta: {
        packageId: args.resolved.packageId,
        packageName: args.resolved.packageName,
        role,
        groupKey,
        includedCount,
        commercialPackagePriceMinor: packagePriceMinor,
        optionalGroup,
      },
    });
  });

  return items;
}

export function findOverlappingRequiredCartItems<
  T extends { offeringId: string; packageMeta?: PackageCartMeta | null },
>(cart: readonly T[], requiredOfferingIds: readonly string[]): T[] {
  const required = new Set(requiredOfferingIds.map((id) => id.toLowerCase()));
  return cart.filter(
    (item) => !item.packageMeta && required.has(item.offeringId.toLowerCase()),
  );
}

export function findReusableAddonOfferingIds<
  T extends { offeringId: string; packageMeta?: PackageCartMeta | null },
>(cart: readonly T[], optionalOfferingIds: readonly string[]): string[] {
  const optional = new Set(optionalOfferingIds.map((id) => id.toLowerCase()));
  const found: string[] = [];
  for (const item of cart) {
    if (item.packageMeta) continue;
    const key = item.offeringId.toLowerCase();
    if (!optional.has(key)) continue;
    if (!found.some((id) => id.toLowerCase() === key)) found.push(item.offeringId);
  }
  return found;
}

export function removePackageGroup<
  T extends { packageMeta?: PackageCartMeta | null },
>(cart: readonly T[], groupKey: string): T[] {
  return cart.filter((item) => item.packageMeta?.groupKey !== groupKey);
}

export function groupCartForDisplay(
  items: readonly PackageCartLine[],
): CartDisplayRow[] {
  const rows: CartDisplayRow[] = [];
  const seenGroups = new Set<string>();

  for (const item of items) {
    const meta = item.packageMeta;
    if (!meta) {
      rows.push({ kind: "standalone", item });
      continue;
    }
    if (seenGroups.has(meta.groupKey)) continue;
    seenGroups.add(meta.groupKey);

    const groupItems = items.filter((i) => i.packageMeta?.groupKey === meta.groupKey);
    const anchor =
      groupItems.find((i) => i.packageMeta.role === "anchor") ?? groupItems[0]!;
    const included = groupItems.filter((i) => i.packageMeta.role === "included");
    const addons = groupItems.filter((i) => i.packageMeta.role === "addon");

    rows.push({
      kind: "package",
      groupKey: meta.groupKey,
      packageId: meta.packageId,
      packageName: meta.packageName,
      includedCount: meta.includedCount,
      priceMinor: anchor.unitPriceMinor,
      anchor,
      included,
      addons,
      allIds: groupItems.map((i) => i.id),
    });
  }

  return rows;
}

export type PackageResolveErrorCode =
  | "PACKAGE_NOT_FOUND"
  | "PACKAGE_NOT_ACTIVE"
  | "PACKAGE_EMPTY"
  | "PACKAGE_SERVICE_INVALID"
  | "PACKAGE_ADDON_INVALID"
  | "HOME_VISIT_EXCLUSIVE";

export class PackageResolveError extends Error {
  readonly code: PackageResolveErrorCode;
  readonly metadata: Record<string, unknown>;
  constructor(code: PackageResolveErrorCode, metadata: Record<string, unknown> = {}) {
    super(code);
    this.name = "PackageResolveError";
    this.code = code;
    this.metadata = metadata;
  }
}

export type CatalogPackageInput = Readonly<{
  packageId: string;
  kind: "REGULAR" | "GROOM";
  displayName: string;
  priceMinor: number;
  durationMinutes: number | null;
  isActive: boolean;
  items: readonly Readonly<{
    offeringId: string;
    sortOrder: number;
    isRequired: boolean;
  }>[];
}>;

export type CatalogOfferingInput = Readonly<{
  offeringId: string;
  categoryId: string | null;
  kind: "PRODUCT" | "SERVICE";
  displayName: string;
  priceMinor: number;
  durationMinutes: number | null;
  isActive: boolean;
}>;

/**
 * Server-truth commercial resolve: package PriceMinor on first required priced line,
 * remaining required lines at 0, addons at live Catalog list prices.
 */
export function resolvePackageCommercial(args: {
  pkg: CatalogPackageInput;
  offerings: readonly CatalogOfferingInput[];
  categoriesById?: Readonly<Record<string, string | null | undefined>>;
  addonOfferingIds?: readonly string[];
}): {
  resolved: ResolvedPackageForCart;
  optionalGroups: Array<{
    key: OptionalGroupKey;
    labelEn: string;
    labelAr: string;
    multiSelect: boolean;
    mutuallyExclusive: boolean;
    offeringIds: string[];
  }>;
  optionalGroupByOfferingId: Record<string, OptionalGroupKey | null>;
} {
  if (!args.pkg.isActive) {
    throw new PackageResolveError("PACKAGE_NOT_ACTIVE", { packageId: args.pkg.packageId });
  }
  const required = args.pkg.items
    .filter((i) => i.isRequired)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.offeringId.localeCompare(b.offeringId));
  const optional = args.pkg.items.filter((i) => !i.isRequired);
  if (!required.length) {
    throw new PackageResolveError("PACKAGE_EMPTY", { packageId: args.pkg.packageId });
  }

  const byOffering = new Map(
    args.offerings.map((o) => [o.offeringId.toLowerCase(), o]),
  );
  const optionalGroupByOfferingId: Record<string, OptionalGroupKey | null> = {};
  const homeVisitIds: string[] = [];

  for (const item of optional) {
    const offering = byOffering.get(item.offeringId.toLowerCase());
    const catName =
      offering?.categoryId && args.categoriesById
        ? args.categoriesById[offering.categoryId] ??
          args.categoriesById[offering.categoryId.toLowerCase()]
        : null;
    const group = resolveOptionalGroupByCategoryName(catName ?? null) ?? "groom_addons";
    optionalGroupByOfferingId[item.offeringId.toLowerCase()] = group;
    if (group === "home_visit") homeVisitIds.push(item.offeringId);
  }

  const addonOfferingIds = [...new Set((args.addonOfferingIds ?? []).map((id) => id))];
  const optionalSet = new Set(optional.map((i) => i.offeringId.toLowerCase()));
  for (const id of addonOfferingIds) {
    if (!optionalSet.has(id.toLowerCase())) {
      throw new PackageResolveError("PACKAGE_ADDON_INVALID", { offeringId: id });
    }
  }
  if (hasConflictingHomeVisitIds(addonOfferingIds, homeVisitIds)) {
    throw new PackageResolveError("HOME_VISIT_EXCLUSIVE", {
      addonOfferingIds,
      homeVisitIds,
    });
  }

  const services: ResolvedPackageLine[] = [];
  let assignedAnchor = false;
  for (const item of required) {
    const offering = byOffering.get(item.offeringId.toLowerCase());
    if (!offering || !offering.isActive || offering.kind !== "SERVICE") {
      throw new PackageResolveError("PACKAGE_SERVICE_INVALID", {
        offeringId: item.offeringId,
      });
    }
    const priceMinor = !assignedAnchor ? assertMinor(args.pkg.priceMinor, "packagePriceMinor") : 0;
    if (!assignedAnchor) assignedAnchor = true;
    services.push({
      offeringId: offering.offeringId,
      displayName: offering.displayName,
      priceMinor,
      durationMinutes: offering.durationMinutes ?? 0,
    });
  }

  let addonDuration = 0;
  for (const id of addonOfferingIds) {
    const offering = byOffering.get(id.toLowerCase());
    if (!offering || !offering.isActive || offering.kind !== "SERVICE") {
      throw new PackageResolveError("PACKAGE_SERVICE_INVALID", { offeringId: id });
    }
    const priceMinor = assertMinor(offering.priceMinor, "addon priceMinor");
    const dur = offering.durationMinutes ?? 0;
    if (dur > 0) addonDuration += dur;
    services.push({
      offeringId: offering.offeringId,
      displayName: offering.displayName,
      priceMinor,
      durationMinutes: dur,
    });
  }

  const packageDurationMinutes = args.pkg.durationMinutes ?? 0;
  const groups: OptionalGroupKey[] = ["groom_addons", "home_visit"];
  const optionalGroups = groups
    .map((key) => {
      const offeringIds = Object.entries(optionalGroupByOfferingId)
        .filter(([, g]) => g === key)
        .map(([id]) => {
          const hit = optional.find((o) => o.offeringId.toLowerCase() === id);
          return hit?.offeringId ?? id;
        });
      return { ...GROOM_OPTIONAL_GROUP_META[key], offeringIds };
    })
    .filter((g) => g.offeringIds.length > 0);

  return {
    resolved: {
      packageId: args.pkg.packageId,
      packageName: args.pkg.displayName,
      packagePriceMinor: assertMinor(args.pkg.priceMinor, "packagePriceMinor"),
      packageDurationMinutes,
      totalDurationMinutes: packageDurationMinutes + addonDuration,
      requiredOfferingIds: required.map((r) => r.offeringId),
      addonOfferingIds,
      services,
    },
    optionalGroups,
    optionalGroupByOfferingId,
    // addonTotal available to callers via sum of addon service prices
  };
}
