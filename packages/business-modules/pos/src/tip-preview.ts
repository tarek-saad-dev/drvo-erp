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
