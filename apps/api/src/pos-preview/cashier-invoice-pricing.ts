/**
 * Cashier POS canonical invoice totals -> DRVO branch-authorized price QUOTE.
 * Source pin: casher@bc9c03fff86074872590ad0fd3525f9a4e416958
 * src/lib/sales/service-line-totals.ts (blob 13942cef1852003af388a086f45c324ff1ae4d17).
 *
 * Ported behavior (not a new simplified calculator):
 * - per-line price * qty, line discount AMOUNT takes precedence over percentage;
 * - invoice/header discount applied to SUM OF NET LINES (never gross);
 * - explicit header amount >0 takes precedence over header percentage;
 * - clamping discounts to base, derived display percentage, total Qty+Bonus.
 * DRVO adapter hardens Cashier permissive inputs to integer minor amounts and
 * integer basis points (1 basis point=0.01%); STRICT validation/default deny.
 * No tax policy, settlement, payment, stock, booking or invoice mutation.
 */
const LIMIT=9_000_000_000_000;
const MAX=BigInt(LIMIT);
const RATE=10_000n;

export type CashierLinePricingInput=Readonly<{
 unitPriceMinor:number;quantity:number;
 lineDiscountMinor?:number|null;lineDiscountPercentBps?:number|null;
 bonusMinor?:number|null;
}>;
export type CashierHeaderPricingInput=Readonly<{
 headerDiscountMinor?:number|null;headerDiscountPercentBps?:number|null;
}>;
export type CashierPricedLine=Readonly<{
 grossMinor:number;discountMinor:number;discountPercentBps:number;netMinor:number;
}>;
export type CashierInvoiceQuote=Readonly<{
 subtotalMinor:number;lineDiscountTotalMinor:number;linesNetTotalMinor:number;
 headerDiscountMinor:number;headerDiscountPercentBps:number;
 totalDiscountMinor:number;grandTotalMinor:number;totalQty:number;totalBonusMinor:number;
 lines:readonly CashierPricedLine[];
}>;
function amount(x:unknown):bigint{
 if(typeof x!=="number"||!Number.isSafeInteger(x)||x<0||x>LIMIT)
  throw new TypeError("POS money must be nonnegative safe integer minor units");
 return BigInt(x);
}
function percent(x:unknown):bigint{
 if(typeof x!=="number"||!Number.isSafeInteger(x)||x<0||x>10000)
  throw new TypeError("POS discount must be integer basis points 0..10000");
 return BigInt(x);
}
function bounded(x:bigint):number{
 if(x<0n||x>MAX)throw new RangeError("POS monetary limit exceeded");
 return Number(x);
}
function rateDiscount(base:bigint,bps:bigint):bigint{
 // Cashier Math.round( (base in major * percent /100) *100 ).
 // Integer half-up for nonnegative minor units; avoids JS binary noise.
 return (base*bps+RATE/2n)/RATE;
}
function displayedPercent(discount:bigint,base:bigint):number{
 if(base===0n)return 0;
 return Number((discount*RATE+base/2n)/base);
}
function quantity(x:unknown):number{
 if(typeof x!=="number"||!Number.isSafeInteger(x)||x<1||x>20)
  throw new TypeError("POS quantity must be integer 1..20");
 return x;
}
export function computeCashierLinePrice(input:CashierLinePricingInput):CashierPricedLine{
 if(!input||typeof input!=="object")throw new TypeError("Missing price line");
 const price=amount(input.unitPriceMinor),qty=quantity(input.quantity);
 const gross=price*BigInt(qty);bounded(gross);
 const explicit=input.lineDiscountMinor;
 const explicitPercent=input.lineDiscountPercentBps;
 if(explicit!==null&&explicit!==undefined)amount(explicit);
 if(explicitPercent!==null&&explicitPercent!==undefined)percent(explicitPercent);
 // Cashier: finite explicit line DisVal is dominant even when zero.
 let d=explicit!==null&&explicit!==undefined?
  BigInt(explicit):
  explicitPercent!==null&&explicitPercent!==undefined?
   rateDiscount(gross,BigInt(explicitPercent)):0n;
 let p=explicitPercent!==null&&explicitPercent!==undefined?
  BigInt(explicitPercent):BigInt(displayedPercent(d,gross));
 if(d>gross){d=gross;p=gross>0n?RATE:0n;}
 return {grossMinor:bounded(gross),discountMinor:bounded(d),
  discountPercentBps:Number(p),netMinor:bounded(gross-d)};
}
export function computeCashierInvoiceQuote(
 items:readonly CashierLinePricingInput[],header:CashierHeaderPricingInput={},
):CashierInvoiceQuote{
 if(!Array.isArray(items)||items.length<1||items.length>20)
  throw new TypeError("POS invoice lines must be 1..20");
 if(!header||typeof header!=="object")
  throw new TypeError("Invalid invoice discount");
 const rawHeader=header.headerDiscountMinor;
 const rawPercent=header.headerDiscountPercentBps;
 if(rawHeader!==undefined&&rawHeader!==null)amount(rawHeader);
 if(rawPercent!==undefined&&rawPercent!==null)percent(rawPercent);
 const lines=items.map(computeCashierLinePrice);
 let gross=0n,linesNet=0n,lineDiscount=0n,bonus=0n,totalQty=0;
 for(let i=0;i<lines.length;i++){
  const l=lines[i]!;
  gross+=BigInt(l.grossMinor);linesNet+=BigInt(l.netMinor);
  lineDiscount+=BigInt(l.discountMinor);
  const it=items[i]!;
  bonus+=amount(it.bonusMinor??0);
  totalQty+=quantity(it.quantity);
  bounded(gross);bounded(linesNet);bounded(lineDiscount);bounded(bonus);
 }
 // Cashier: explicit invoice/header amount is prioritized only when >0.
 let hd=rawHeader!==undefined&&rawHeader!==null&&rawHeader>0?
  BigInt(rawHeader):
  rawPercent!==undefined&&rawPercent!==null&&rawPercent>0?
   rateDiscount(linesNet,BigInt(rawPercent)):0n;
 let hp=rawHeader!==undefined&&rawHeader!==null&&rawHeader>0?
  BigInt(displayedPercent(hd,linesNet)):
  rawPercent!==undefined&&rawPercent!==null?BigInt(rawPercent):0n;
 if(rawHeader!==undefined&&rawHeader!==null&&rawHeader>0&&
    rawPercent!==undefined&&rawPercent!==null&&rawPercent>0)
  hp=BigInt(rawPercent);
 // Original Cashier resolveHeaderDiscount short-circuits an empty/net-zero invoice.
 if(linesNet===0n){hd=0n;hp=0n;}
 else if(hd>linesNet){hd=linesNet;hp=RATE;}
 return {
  subtotalMinor:bounded(gross),lineDiscountTotalMinor:bounded(lineDiscount),
  linesNetTotalMinor:bounded(linesNet),
  headerDiscountMinor:bounded(hd),headerDiscountPercentBps:Number(hp),
  totalDiscountMinor:bounded(lineDiscount+hd),
  grandTotalMinor:bounded(linesNet-hd),totalQty,totalBonusMinor:bounded(bonus),lines,
 };
}
