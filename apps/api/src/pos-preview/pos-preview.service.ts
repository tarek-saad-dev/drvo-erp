import {
  BadRequestException, Injectable, NotFoundException, ServiceUnavailableException,
} from "@nestjs/common";
import type { Actor } from "../identity/identity.service";
import { CatalogService, type CatalogOffering } from "../catalog/catalog.service";

type DraftLine = { offeringId: string; quantity: number };
type PreviewLine = { offeringId: string; kind: "SERVICE" | "PRODUCT";
  displayName: string; quantity: number; unitPriceMinor: number; lineSubtotalMinor: number };
export type CheckoutPreview = {
  state: "DRAFT_PREVIEW_ONLY"; persisted: false; accountingState: "NOT_POSTED";
  paymentState: "NOT_COLLECTED"; taxComputed: false; currency: string;
  lines: PreviewLine[]; listPriceSubtotalMinor: number;
};
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TWO_DECIMAL = new Set(["EGP", "SAR", "AED", "USD"]);

function enabled(): void {
  if (process.env.DRVO_K5_AUTH_ENABLED !== "YES" ||
      process.env.DRVO_CATALOG_ENABLED !== "YES" ||
      process.env.DRVO_POS_PREVIEW_ENABLED !== "YES") {
    throw new ServiceUnavailableException("POS preview is not enabled");
  }
}

/** Pure, server-side calculation over an authorized fresh Catalog read (NOT a payable quote). */
export function computeListPricePreview(offerings: readonly CatalogOffering[], input: unknown): CheckoutPreview {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).length !== 1 || !Object.prototype.hasOwnProperty.call(input, "lines")) {
    throw new BadRequestException("Invalid preview payload");
  }
  const value = (input as { lines: unknown }).lines;
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw new BadRequestException("Invalid preview lines");
  }
  const ids = new Set<string>();
  const snapshot: PreviewLine[] = [];
  let currency: string | undefined;
  let subtotal = 0n;
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
        Object.keys(raw).length !== 2 ||
        !Object.prototype.hasOwnProperty.call(raw, "offeringId") ||
        !Object.prototype.hasOwnProperty.call(raw, "quantity")) {
      throw new BadRequestException("Invalid preview line");
    }
    const line = raw as DraftLine;
    if (typeof line.offeringId !== "string" || !GUID.test(line.offeringId) ||
        typeof line.quantity !== "number" || !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 || line.quantity > 20 || ids.has(line.offeringId.toLowerCase())) {
      throw new BadRequestException("Invalid item or quantity");
    }
    ids.add(line.offeringId.toLowerCase());
    const item = offerings.find(o => o.offeringId.toLowerCase() === line.offeringId.toLowerCase());
    // Don't expose whether a foreign/inactive offering exists.
    if (!item || !item.isActive) throw new NotFoundException();
    if (!TWO_DECIMAL.has(item.currency) ||
        !Number.isSafeInteger(item.priceMinor) || item.priceMinor < 0 ||
        item.priceMinor > 9_000_000_000_000) {
      throw new BadRequestException("Offering cannot be previewed");
    }
    if (currency !== undefined && currency !== item.currency) {
      throw new BadRequestException("Mixed currency preview is not supported");
    }
    currency = item.currency;
    const amount = BigInt(item.priceMinor) * BigInt(line.quantity);
    subtotal += amount;
    if (subtotal > 9_000_000_000_000n) throw new BadRequestException("Preview amount too large");
    snapshot.push({
      offeringId: item.offeringId, kind: item.kind, displayName: item.displayName,
      quantity: line.quantity, unitPriceMinor: item.priceMinor, lineSubtotalMinor: Number(amount),
    });
  }
  return {
    state: "DRAFT_PREVIEW_ONLY", persisted: false, accountingState: "NOT_POSTED",
    paymentState: "NOT_COLLECTED", taxComputed: false, currency: currency!,
    lines: snapshot, listPriceSubtotalMinor: Number(subtotal),
  };
}

@Injectable()
export class PosPreviewService {
  constructor(private readonly catalog: CatalogService) {}

  async offerings(actor: Actor, token: string, businessId: string, branchId: string) {
    enabled();
    const catalog = await this.catalog.list(actor, token, businessId, branchId);
    return { state: "DRAFT_PREVIEW_ONLY" as const, persisted: false as const,
      offerings: catalog.offerings.filter(o => o.isActive) };
  }

  async checkout(actor: Actor, token: string, businessId: string, branchId: string, body: unknown) {
    enabled();
    // Full request validation BEFORE query; scope/session/Branch catalog.read are rechecked inside SQL.
    if (!body || typeof body !== "object") throw new BadRequestException("Invalid preview");
    const catalog = await this.catalog.list(actor, token, businessId, branchId);
    return computeListPricePreview(catalog.offerings, body);
  }
}
