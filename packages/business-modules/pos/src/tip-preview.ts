/**
 * Cashier `src/lib/pos/tipMath.ts` -> shared POS preview policy.
 * Do not treat customer-presented money as a settled tender or call surplus
 * taxable revenue. Actual tip allocation/employee-ledger credit requires
 * explicit authorized POS/Treasury/HR coordination.
 */
export type ServiceExecutorLine = Readonly<{
  employeeId: string; lineSubtotalMinor: number;
}>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT=9_000_000_000_000;
function minor(value: number): bigint {
  if (!Number.isSafeInteger(value)||value<0||value>LIMIT) throw new TypeError("Invalid minor amount");
  return BigInt(value);
}
export function previewTenderSurplus(
  totalDueMinor: number, customerPresentedMinor: number,
): {state:"NOT_COLLECTED";amountDifferenceMinor:number;possibleTipMinor:number;shortfallMinor:number} {
  const diff=minor(customerPresentedMinor)-minor(totalDueMinor);
  return {
    state:"NOT_COLLECTED",amountDifferenceMinor:Number(diff),
    possibleTipMinor:diff>0n?Number(diff):0,
    shortfallMinor:diff<0n?Number(-diff):0,
  };
}
export function rankServiceExecutorTipCandidates(
  lines: readonly ServiceExecutorLine[],
): Array<{employeeId:string;serviceValueMinor:number}> {
  if (!Array.isArray(lines)||lines.length>500)throw new TypeError("Invalid service lines");
  const totals=new Map<string,bigint>();
  for(const line of lines){
    if(!line||typeof line.employeeId!=="string"||!UUID.test(line.employeeId))
      throw new TypeError("Invalid employee reference");
    const id=line.employeeId.toLowerCase();
    totals.set(id,(totals.get(id)??0n)+minor(line.lineSubtotalMinor));
  }
  return Array.from(totals).map(([employeeId,value])=>{
    if(value>BigInt(LIMIT))throw new RangeError("Tip basis too large");
    return {employeeId,serviceValueMinor:Number(value)};
  }).sort((a,b)=>b.serviceValueMinor-a.serviceValueMinor||
    a.employeeId.localeCompare(b.employeeId));
}

export type TipEntryOutcome="NO_AMOUNT"|"TIP"|"NO_TIP"|"BELOW_INVOICE";
export type TipEntryPreview=Readonly<{
  state:"UNPOSTED_TIP_ENTRY_PREVIEW";persisted:false;
  paymentState:"NOT_COLLECTED";
  tipRecordingState:"BLOCKED_ADR_031_HR_TREASURY";
  employeeLedgerCredit:"NOT_AUTHORIZED";treasuryCashIn:"NOT_AUTHORIZED";
  outcome:TipEntryOutcome;possibleTipMinor:number;shortfallMinor:number;
  recipientEmployeeId:string|null;
  candidates:Array<{employeeId:string;serviceValueMinor:number}>;
  /** Mirrors Cashier TipsModal `canSubmit` minus payment-method; DRVO never submits. */
  cashierWouldEnableSubmit:boolean;
}>;
/**
 * Cashier TipsModal state machine, NON-POSTING: default recipient is the highest-revenue
 * executor (Cashier `barbers[0]`), a chosen recipient must be one of the cart executors,
 * and only a strictly positive difference is a possible tip. Nothing is recorded.
 */
export function previewTipEntry(
  totalDueMinor: number, customerPresentedMinor: number|null,
  lines: readonly ServiceExecutorLine[], selectedEmployeeId: string|null,
): TipEntryPreview {
  minor(totalDueMinor);
  const candidates=rankServiceExecutorTipCandidates(lines);
  let recipient=candidates[0]?.employeeId??null;
  if(selectedEmployeeId!==null){
    if(typeof selectedEmployeeId!=="string"||!UUID.test(selectedEmployeeId))
      throw new TypeError("Invalid employee reference");
    const id=selectedEmployeeId.toLowerCase();
    if(!candidates.some(c=>c.employeeId===id))
      throw new TypeError("Tip recipient must be a cart service executor");
    recipient=id;
  }
  let outcome:TipEntryOutcome="NO_AMOUNT",tip=0,shortfall=0;
  if(customerPresentedMinor!==null){
    const s=previewTenderSurplus(totalDueMinor,customerPresentedMinor);
    tip=s.possibleTipMinor;shortfall=s.shortfallMinor;
    outcome=tip>0?"TIP":shortfall>0?"BELOW_INVOICE":"NO_TIP";
  }
  return {
    state:"UNPOSTED_TIP_ENTRY_PREVIEW",persisted:false,paymentState:"NOT_COLLECTED",
    tipRecordingState:"BLOCKED_ADR_031_HR_TREASURY",
    employeeLedgerCredit:"NOT_AUTHORIZED",treasuryCashIn:"NOT_AUTHORIZED",
    outcome,possibleTipMinor:tip,shortfallMinor:shortfall,
    recipientEmployeeId:recipient,candidates,
    cashierWouldEnableSubmit:lines.length>0&&recipient!==null&&tip>0,
  };
}
