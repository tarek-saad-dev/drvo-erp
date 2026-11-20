"use client";
/**
 * Cashier TipsModal UX for the private POS, NONPOSTING.
 * Source UX: casher@046bf19 src/components/pos/TipsModal.tsx (blob 6fdbc6da…) +
 * src/lib/pos/tipMath.ts. Total comes from the server-priced preview; this panel only
 * computes "customer presented - due" and the default executor recipient.
 * It NEVER calls /api/pos/tips, records a tip, credits an employee ledger, takes cash in,
 * or sends a message: Cashier's write path is ADR-031 + HR ledger + Treasury gated.
 */
import {useMemo,useState} from "react";
import {computeTipEntry,readTipAmountMinor,sanitizeTipAmountInput,
  type TipExecutorLine} from "./cashier-tip-preview";

function money(minor:number,currency:string):string{
 return (minor/100).toFixed(2)+" "+currency;
}

export default function CashierTipsPreview({totalDueMinor,currency,executorLines,
  executorNames,disabled}:{
 totalDueMinor:number|null;currency:string;executorLines:TipExecutorLine[];
 executorNames:Record<string,string>;disabled:boolean;
}){
 const [amountInput,setAmountInput]=useState("");
 const [recipientId,setRecipientId]=useState<string|null>(null);
 const presentedMinor=readTipAmountMinor(amountInput);
 const entry=useMemo(()=>{
  if(totalDueMinor===null)return null;
  try{
   // A stale recipient (cart changed) falls back to the default top executor.
   const valid=recipientId!==null&&executorLines.some(l=>l.employeeId.toLowerCase()===recipientId);
   return computeTipEntry(totalDueMinor,presentedMinor,executorLines,valid?recipientId:null);
  }catch{return null;}
 },[totalDueMinor,presentedMinor,executorLines,recipientId]);
 const label=(id:string)=>executorNames[id]??id.slice(0,8)+"…"; // names keyed by lowercase GUID
 return <section className="k5-admin-card" aria-label="إكرامية — معاينة Cashier"
  data-cashier-pos="tips-preview">
  <div className="k5-admin-summary"><h2>تبس (إكرامية) — معاينة فقط</h2>
   <p className="k5-muted">زي نافذة Cashier: اكتب العميل دفع كام والفرق يبقى التبس المحتمل للحلاق.
    مفيش تسجيل ولا إيداع للحلاق ولا قبض — ده مقفول لحد ADR-031 وموافقة HR/Treasury.</p>
  </div>
  {totalDueMinor===null||entry===null?
   <p className="k5-muted" role="status">احسب معاينة الأسعار (أو الخصم) أولاً عشان نعرف إجمالي الفاتورة.</p>:<>
   <p>إجمالي الفاتورة (استرشادي): <strong dir="ltr">{money(totalDueMinor,currency)}</strong></p>
   <label>العميل دفع كام؟ ({currency}) — لم يُحصَّل
    <input type="text" inputMode="decimal" autoComplete="off" maxLength={14}
     placeholder="مثال: 250" value={amountInput} disabled={disabled}
     onChange={e=>setAmountInput(sanitizeTipAmountInput(e.target.value))}/>
   </label>
   <p data-cashier-pos="tip-outcome" data-outcome={entry.outcome}>
    مبلغ التبس (الفرق): <strong dir="ltr">{
     entry.outcome==="NO_AMOUNT"?"—":
     entry.outcome==="TIP"?money(entry.possibleTipMinor,currency):
     entry.outcome==="BELOW_INVOICE"?"المبلغ أقل من الفاتورة ("+money(entry.shortfallMinor,currency)+")":
     "لا يوجد تبس"}</strong>
   </p>
   {amountInput!==""&&presentedMinor===null&&
    <p role="alert" className="k5-error">اكتب مبلغًا صالحًا بحد أقصى رقمين بعد العلامة.</p>}
   {entry.candidates.length===0?
    <p className="k5-muted" role="status">اختار حلاق/منفذ واحسب معاينة الأسعار عشان نعرف مين يستلم التبس (Cashier بيطلب حلاق على سطور الخدمة).</p>:
    entry.candidates.length===1?
     <p>الحلاق: <strong>{label(entry.candidates[0].employeeId)}</strong>
      <span className="k5-muted"> (قيمة الخدمات {money(entry.candidates[0].serviceValueMinor,currency)})</span></p>:
     <label>إيداع التبس للحلاق
      <select value={entry.recipientEmployeeId??""} disabled={disabled}
       onChange={e=>setRecipientId(e.target.value||null)}>
       {entry.candidates.map(c=><option key={c.employeeId} value={c.employeeId}>
        {label(c.employeeId)} ({money(c.serviceValueMinor,currency)})</option>)}
      </select>
     </label>}
   <button type="button" className="k5-save" disabled aria-disabled="true"
    data-cashier-pos="tip-record-blocked"
    title="BLOCKED_ADR_031_HR_TREASURY — لا يوجد مالك تبس/دفتر موظف/خزينة">
    تسجيل التبس — محظور
   </button>
   <p className="k5-muted">
    {entry.cashierWouldEnableSubmit?
     "Cashier كان هيفعّل زر التسجيل هنا؛ في DRVO ما بيتسجلش تبس ولا بيتحرك دفتر الموظف أو الخزينة.":
     "حتى في Cashier الزر مش هيتفعّل بالحالة دي."}
    {" "}لا تحصيل · لا قيد · لا واتساب.
   </p>
  </>}
 </section>;
}
