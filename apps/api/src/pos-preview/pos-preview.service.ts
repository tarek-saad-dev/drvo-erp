import {
  BadRequestException, Injectable, NotFoundException, ServiceUnavailableException,
} from "@nestjs/common";
import type { Actor } from "../identity/identity.service";
import { CatalogService, type CatalogOffering } from "../catalog/catalog.service";
import { computeCashierInvoiceQuote, type CashierLinePricingInput } from "./cashier-invoice-pricing";

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

/** Cashier service-line/header discount concept adapted to DRVO minor units.
 * This is an ephemeral operator quote comparison, not a sale, receivable,
 * payroll earning, payment confirmation, tax computation or persisted discount.
 */
export type AdjustmentPreview = Omit<CheckoutPreview, "state"> & {
  state: "DRAFT_ADJUSTMENT_PREVIEW_ONLY"; discountRecorded: false;
  headerDiscountMinor: number; afterDiscountMinor: number;
  customerPresentedMinor: number; possibleTipMinor: number; shortfallMinor: number;
};
export function computeAdjustmentPreview(
  offerings: readonly CatalogOffering[], input: unknown,
): AdjustmentPreview {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).length !== 3 ||
      !Object.prototype.hasOwnProperty.call(input, "lines") ||
      !Object.prototype.hasOwnProperty.call(input, "headerDiscountMinor") ||
      !Object.prototype.hasOwnProperty.call(input, "customerPresentedMinor")) {
    throw new BadRequestException("Invalid adjustment preview");
  }
  const payload = input as {lines: unknown;headerDiscountMinor: unknown;customerPresentedMinor: unknown};
  const moneyMinor = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) &&
    value >= 0 && value <= 9_000_000_000_000;
  if (!moneyMinor(payload.headerDiscountMinor) || !moneyMinor(payload.customerPresentedMinor)) {
    throw new BadRequestException("Invalid money amount");
  }
  const priced = computeListPricePreview(offerings, {lines: payload.lines});
  if (payload.headerDiscountMinor > priced.listPriceSubtotalMinor) {
    throw new BadRequestException("Discount exceeds current list subtotal");
  }
  const afterDiscountMinor = priced.listPriceSubtotalMinor-payload.headerDiscountMinor;
  const difference = BigInt(payload.customerPresentedMinor)-BigInt(afterDiscountMinor);
  return {
    ...priced, state:"DRAFT_ADJUSTMENT_PREVIEW_ONLY",discountRecorded:false,
    headerDiscountMinor:payload.headerDiscountMinor,afterDiscountMinor,
    customerPresentedMinor:payload.customerPresentedMinor,
    possibleTipMinor:difference>0n?Number(difference):0,
    shortfallMinor:difference<0n?Number(-difference):0,
  };
}

/**
 * POS core pricing preview: ACTUAL Cashier per-line discounts + header
 * discount precedence, not a salon demonstration, and never a sale POST.
 * Catalog prices are always loaded from the signed-in actor's authorized
 * Business/Branch SQL path; no browser-supplied prices or employee/tenant IDs.
 */
export function computeCashierQuotePreview(
 offerings:readonly CatalogOffering[],body:unknown,
){
 if(!body||typeof body!=="object"||Array.isArray(body))
  throw new BadRequestException("Invalid Cashier invoice quote");
 const b=body as Record<string,unknown>;
 const allowed=["lines","headerDiscountMinor","headerDiscountPercentBps"];
 if(Object.keys(b).some(k=>!allowed.includes(k))||
    !Object.prototype.hasOwnProperty.call(b,"lines"))
  throw new BadRequestException("Unknown invoice fields");
 if(!Array.isArray(b.lines)||b.lines.length<1||b.lines.length>20)
  throw new BadRequestException("Invalid invoice lines");
 const seen=new Set<string>();let currency:string|undefined;
 const lines:Array<CashierLinePricingInput&{
  offeringId:string;kind:"SERVICE"|"PRODUCT";displayName:string;
 }>= [];
 for(const raw of b.lines){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))
   throw new BadRequestException("Invalid line");
  const r=raw as Record<string,unknown>;
  const accepted=["offeringId","quantity","lineDiscountMinor","lineDiscountPercentBps"];
  if(Object.keys(r).some(k=>!accepted.includes(k))||
     !Object.prototype.hasOwnProperty.call(r,"offeringId")||
     !Object.prototype.hasOwnProperty.call(r,"quantity")||
     typeof r.offeringId!=="string"||!GUID.test(r.offeringId)||
     seen.has(String(r.offeringId).toLowerCase()))
   throw new BadRequestException("Invalid line fields or duplicate");
  seen.add(r.offeringId.toLowerCase());
  const fresh=offerings.find(x=>x.offeringId.toLowerCase()===r.offeringId.toLowerCase());
  if(!fresh||!fresh.isActive)throw new NotFoundException();
  if(!TWO_DECIMAL.has(fresh.currency)||!Number.isSafeInteger(fresh.priceMinor)||
     fresh.priceMinor<0||fresh.priceMinor>9_000_000_000_000)
   throw new BadRequestException("Invalid authorized Catalog pricing");
  if(currency!==undefined&&fresh.currency!==currency)
   throw new BadRequestException("Mixed currency pricing not supported");
  currency=fresh.currency;
  lines.push({
   offeringId:fresh.offeringId,kind:fresh.kind,displayName:fresh.displayName,
   unitPriceMinor:fresh.priceMinor,quantity:r.quantity as number,
   ...(r.lineDiscountMinor===undefined?{}:{lineDiscountMinor:r.lineDiscountMinor as number}),
   ...(r.lineDiscountPercentBps===undefined?{}:{lineDiscountPercentBps:r.lineDiscountPercentBps as number}),
  });
 }
 try{
  const quote=computeCashierInvoiceQuote(lines,{
   ...(b.headerDiscountMinor===undefined?{}:{headerDiscountMinor:b.headerDiscountMinor as number}),
   ...(b.headerDiscountPercentBps===undefined?{}:{
    headerDiscountPercentBps:b.headerDiscountPercentBps as number}),
  });
  return {
   state:"CASHIER_INVOICE_PRICE_QUOTE_ONLY" as const,
   sourceRule:"CASHIER_LINE_AND_HEADER_DISCOUNT" as const,
   priceSource:"FRESH_AUTHORIZED_CATALOG" as const,
   persisted:false as const,taxComputed:false as const,
   accountingState:"NOT_POSTED" as const,paymentState:"NOT_COLLECTED" as const,
   inventoryState:"NOT_DECREMENTED" as const,currency:currency!,
   ...quote,
   lines:quote.lines.map((x,i)=>({
    ...x,offeringId:lines[i]!.offeringId,kind:lines[i]!.kind,
    displayName:lines[i]!.displayName,unitPriceMinor:lines[i]!.unitPriceMinor,
    quantity:lines[i]!.quantity,
   })),
  };
 }catch(e){
  if(e instanceof TypeError||e instanceof RangeError)
   throw new BadRequestException("Invalid Cashier pricing inputs");
  throw e;
 }
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
  async cashierQuote(actor: Actor, token: string,
   businessId: string, branchId: string, body: unknown) {
   enabled();
   // Real SQL identity, K5 and Catalog permission evaluated at every request.
   const catalog=await this.catalog.list(actor,token,businessId,branchId);
   return computeCashierQuotePreview(catalog.offerings,body);
  }

  async adjustments(actor: Actor, token: string, businessId: string, branchId: string, body: unknown) {
    enabled();
    // Pricing is derived ONLY from a freshly authorized scoped Catalog read.
    // Presented cash is hypothetical; this route has no POS/Treasury/HR writes.
    if (!body || typeof body !== "object") throw new BadRequestException("Invalid preview");
    const catalog = await this.catalog.list(actor, token, businessId, branchId);
    return computeAdjustmentPreview(catalog.offerings, body);
  }
}
