/**
 * Client mirror of Cashier@046bf19 groomPackageCart / optional-group display helpers.
 * Authoritative commercial resolve stays on Catalog POST .../packages/:id/resolve.
 */
export type PackageCartRole = "anchor" | "included" | "addon";
export type OptionalGroupKey = "groom_addons" | "home_visit";

export type PackageCartMeta = {
  packageId: string;
  packageName: string;
  role: PackageCartRole;
  groupKey: string;
  includedCount: number;
  commercialPackagePriceMinor: number;
  optionalGroup?: OptionalGroupKey | null;
};

export type PackageAwareCartLine = {
  offeringId: string;
  quantity: number;
  lineId?: string;
  displayName?: string;
  displayUnitPriceMinor?: number;
  packageMeta?: PackageCartMeta;
};

export type CartDisplayRow =
  | {
      kind: "package";
      groupKey: string;
      packageId: string;
      packageName: string;
      includedCount: number;
      priceMinor: number;
      anchor: PackageAwareCartLine;
      included: PackageAwareCartLine[];
      addons: PackageAwareCartLine[];
    }
  | { kind: "standalone"; item: PackageAwareCartLine };

export function groupCartForDisplay(items: PackageAwareCartLine[]): CartDisplayRow[] {
  const rows: CartDisplayRow[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const meta = item.packageMeta;
    if (!meta) {
      rows.push({ kind: "standalone", item });
      continue;
    }
    if (seen.has(meta.groupKey)) continue;
    seen.add(meta.groupKey);
    const group = items.filter((i) => i.packageMeta?.groupKey === meta.groupKey);
    const anchor = group.find((i) => i.packageMeta?.role === "anchor") ?? group[0]!;
    rows.push({
      kind: "package",
      groupKey: meta.groupKey,
      packageId: meta.packageId,
      packageName: meta.packageName,
      includedCount: meta.includedCount,
      priceMinor: anchor.displayUnitPriceMinor ?? meta.commercialPackagePriceMinor,
      anchor,
      included: group.filter((i) => i.packageMeta?.role === "included"),
      addons: group.filter((i) => i.packageMeta?.role === "addon"),
    });
  }
  return rows;
}

export function findOverlappingRequiredCartItems(
  cart: PackageAwareCartLine[],
  requiredOfferingIds: string[],
): PackageAwareCartLine[] {
  const required = new Set(requiredOfferingIds.map((id) => id.toLowerCase()));
  return cart.filter(
    (item) => !item.packageMeta && required.has(item.offeringId.toLowerCase()),
  );
}

export function findReusableAddonOfferingIds(
  cart: PackageAwareCartLine[],
  optionalOfferingIds: string[],
): string[] {
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

export function removePackageGroup(
  cart: PackageAwareCartLine[],
  groupKey: string,
): PackageAwareCartLine[] {
  return cart.filter((item) => item.packageMeta?.groupKey !== groupKey);
}

/** Flat expand kept for Booking handoff when resolve is unavailable. */
export function expandPackageToDraftLines(args: {
  pkg: {
    isActive: boolean;
    items: Array<{ offeringId: string; sortOrder: number; isRequired: boolean }>;
  };
  offerings: Array<{ offeringId: string; kind: string; isActive: boolean }>;
  lines: PackageAwareCartLine[];
  optionalOfferingIds?: string[];
  maxLines?: number;
}): { ok: true; lines: PackageAwareCartLine[]; added: number } | { ok: false; reason: string } {
  const max = args.maxLines ?? 20;
  if (!args.pkg.isActive) return { ok: false, reason: "الباقة غير نشطة." };
  const optionalSet = new Set((args.optionalOfferingIds ?? []).map((id) => id.toLowerCase()));
  const allowedOptional = new Set(
    args.pkg.items.filter((i) => !i.isRequired).map((i) => i.offeringId.toLowerCase()),
  );
  for (const id of optionalSet) {
    if (!allowedOptional.has(id)) return { ok: false, reason: "إضافة اختيارية مش تابعة للباقة." };
  }
  const selected = args.pkg.items
    .filter((i) => i.isRequired || optionalSet.has(i.offeringId.toLowerCase()))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.offeringId.localeCompare(b.offeringId));
  if (!selected.some((i) => i.isRequired)) {
    return { ok: false, reason: "الباقة مفيش فيها خدمات إلزامية." };
  }
  const next = args.lines.map((l) => ({ ...l }));
  let added = 0;
  for (const item of selected) {
    const offering = args.offerings.find((o) => o.offeringId === item.offeringId);
    if (!offering || !offering.isActive || offering.kind !== "SERVICE") {
      return { ok: false, reason: "خدمة داخل الباقة مش متاحة في الكتالوج الحالي." };
    }
    const existing = next.find((l) => l.offeringId === item.offeringId);
    if (existing) continue;
    if (next.length >= max) return { ok: false, reason: "السلة ممتلئة (حد أقصى 20 سطر)." };
    next.push({ offeringId: item.offeringId, quantity: 1 });
    added++;
  }
  if (added === 0) return { ok: false, reason: "خدمات الباقة موجودة بالفعل في السلة." };
  return { ok: true, lines: next, added };
}
