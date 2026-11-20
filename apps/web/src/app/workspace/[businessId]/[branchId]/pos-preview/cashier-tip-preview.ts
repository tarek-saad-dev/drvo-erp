/**
 * Cashier TipsModal / tipMath -> private POS preview helpers (NON-POSTING).
 * Source: casher@046bf19 src/lib/pos/tipMath.ts (2b140c81…) and
 * src/components/pos/TipsModal.tsx (6fdbc6da…). Verbatim excerpts live in
 * `_cashier_source/pos-tips/`. Mirrors packages/business-modules/pos/src/tip-preview.ts
 * (`previewTipEntry`); apps/web/test/pos-tips-preview.test.cjs proves the two agree.
 * No fetch, storage, clock or randomness: tips are never recorded here.
 */
export type TipExecutorLine={employeeId:string;lineSubtotalMinor:number};
export type TipOutcome="NO_AMOUNT"|"TIP"|"NO_TIP"|"BELOW_INVOICE";
export type TipEntryState={
  outcome:TipOutcome;possibleTipMinor:number;shortfallMinor:number;
  recipientEmployeeId:string|null;
  candidates:Array<{employeeId:string;serviceValueMinor:number}>;
  cashierWouldEnableSubmit:boolean;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT=9_000_000_000_000;

/** Cashier TipsModal `sanitizeAmountInput`, unchanged behaviour. */
export function sanitizeTipAmountInput(value:string):string{
  let sanitized=value.replace(/[^\d.,]/g,"");
  sanitized=sanitized.replace(/,/g,".");
  const parts=sanitized.split(".");
  if(parts.length>2)sanitized=parts[0]+"."+parts.slice(1).join("");
  return sanitized;
}
/**
 * Exact minor-unit decoder (DRVO is stricter than Cashier's float `Number()`): at most two
 * decimals, bounded, no exponent. Returns null for empty/invalid so the UI shows "—".
 */
export function readTipAmountMinor(raw:string):number|null{
  const value=sanitizeTipAmountInput(raw.trim());
  if(!/^(?=.*\d)\d{0,10}(?:\.\d{0,2})?$/.test(value))return null;
  const [major,decimal=""]=value.split(".");
  const minor=Number(major||"0")*100+Number(decimal.padEnd(2,"0"));
  return Number.isSafeInteger(minor)&&minor<=LIMIT?minor:null;
}
/** Group service lines by executor, highest value first (ties: employeeId). */
export function rankTipCandidates(lines:readonly TipExecutorLine[]):
  Array<{employeeId:string;serviceValueMinor:number}>{
  if(!Array.isArray(lines)||lines.length>500)throw new TypeError("Invalid service lines");
  const totals=new Map<string,number>();
  for(const line of lines){
    if(!line||typeof line.employeeId!=="string"||!UUID.test(line.employeeId))
      throw new TypeError("Invalid employee reference");
    if(!Number.isSafeInteger(line.lineSubtotalMinor)||line.lineSubtotalMinor<0||line.lineSubtotalMinor>LIMIT)
      throw new TypeError("Invalid minor amount");
    const id=line.employeeId.toLowerCase();
    totals.set(id,(totals.get(id)??0)+line.lineSubtotalMinor);
  }
  return Array.from(totals).map(([employeeId,serviceValueMinor])=>{
    if(serviceValueMinor>LIMIT)throw new RangeError("Tip basis too large");
    return {employeeId,serviceValueMinor};
  }).sort((a,b)=>b.serviceValueMinor-a.serviceValueMinor||a.employeeId.localeCompare(b.employeeId));
}
/** Cashier TipsModal state: tip = presented - due, only strictly positive counts. */
export function computeTipEntry(totalDueMinor:number,customerPresentedMinor:number|null,
  lines:readonly TipExecutorLine[],selectedEmployeeId:string|null):TipEntryState{
  if(!Number.isSafeInteger(totalDueMinor)||totalDueMinor<0||totalDueMinor>LIMIT)
    throw new TypeError("Invalid minor amount");
  const candidates=rankTipCandidates(lines);
  let recipient=candidates[0]?.employeeId??null;
  if(selectedEmployeeId!==null){
    if(typeof selectedEmployeeId!=="string"||!UUID.test(selectedEmployeeId))
      throw new TypeError("Invalid employee reference");
    const id=selectedEmployeeId.toLowerCase();
    if(!candidates.some(c=>c.employeeId===id))
      throw new TypeError("Tip recipient must be a cart service executor");
    recipient=id;
  }
  let outcome:TipOutcome="NO_AMOUNT",tip=0,shortfall=0;
  if(customerPresentedMinor!==null){
    if(!Number.isSafeInteger(customerPresentedMinor)||customerPresentedMinor<0||customerPresentedMinor>LIMIT)
      throw new TypeError("Invalid minor amount");
    const diff=customerPresentedMinor-totalDueMinor;
    tip=diff>0?diff:0;shortfall=diff<0?-diff:0;
    outcome=tip>0?"TIP":shortfall>0?"BELOW_INVOICE":"NO_TIP";
  }
  return {outcome,possibleTipMinor:tip,shortfallMinor:shortfall,recipientEmployeeId:recipient,
    candidates,cashierWouldEnableSubmit:lines.length>0&&recipient!==null&&tip>0};
}
