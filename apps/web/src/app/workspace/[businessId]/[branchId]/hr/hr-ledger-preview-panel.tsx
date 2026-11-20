"use client";
import {useRef,useState} from "react";
import {
 LEDGER_REASON_OPTIONS,MAX_LEDGER_DRAFT_ROWS,buildLedgerPreviewBody,directionsForReason,
 formatMinor,isSafePreview,validIsoDate,
} from "./hr-admin-model";
import type {
 HrEmployee,LedgerDirection,LedgerDraftRow,LedgerPreviewView,LedgerProposalDraft,
} from "./hr-admin-model";

// Draft-only employee ledger (Cashier HR-05/06/07 characterization). The rows below live in
// React state ONLY and are sent to the non-writing ledger-preview endpoint. There is no payout,
// no Treasury/cash movement, no payroll posting and no persisted ledger (ADR-031).
export default function HrLedgerPreviewPanel({previewUrl,employees,onUnauthorized}:{
 previewUrl:string;employees:HrEmployee[];onUnauthorized:()=>void;
}){
 const [rows,setRows]=useState<LedgerDraftRow[]>([]);
 const [employeeId,setEmployeeId]=useState("");
 const [entryDate,setEntryDate]=useState("");
 const [reason,setReason]=useState("monthly_salary");
 const [direction,setDirection]=useState<LedgerDirection>("credit");
 const [amount,setAmount]=useState("");
 const [proposalOn,setProposalOn]=useState(false);
 const [proposalEmployee,setProposalEmployee]=useState("");
 const [proposalKind,setProposalKind]=useState<"advance"|"advance_repayment">("advance");
 const [proposalAmount,setProposalAmount]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [result,setResult]=useState<LedgerPreviewView|null>(null);
 const seq=useRef(0);
 const names=new Map(employees.map(e=>[e.employeeId.toLowerCase(),e.displayName]));
 const label=(id:string)=>names.get(id.toLowerCase())??id;
 const allowed=directionsForReason(reason);

 function changeReason(next:string){
  setReason(next);
  const dirs=directionsForReason(next);
  if(!dirs.includes(direction)&&dirs[0])setDirection(dirs[0]);
 }
 function addRow(){
  setError("");
  if(rows.length>=MAX_LEDGER_DRAFT_ROWS){setError("وصلت للحد الأقصى للقيود في المعاينة.");return;}
  if(!employeeId){setError("اختار موظفًا.");return;}
  if(!validIsoDate(entryDate)){setError("اكتب تاريخًا صحيحًا.");return;}
  const row:LedgerDraftRow={key:"r"+(++seq.current),employeeId,entryDate,direction,reason,amountText:amount};
  const check=buildLedgerPreviewBody([row],null);
  if(!check.ok){setError(check.error);return;}
  setRows(current=>[...current,row]);setAmount("");setResult(null);
 }
 async function runPreview(){
  if(busy)return;
  const proposal:LedgerProposalDraft=proposalOn?{employeeId:proposalEmployee,kind:proposalKind,
   amountText:proposalAmount}:null;
  const built=buildLedgerPreviewBody(rows,proposal);
  if(!built.ok){setError(built.error);return;}
  setBusy(true);setError("");setResult(null);
  try{
   const r=await fetch(previewUrl,{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(built.body)});
   if(r.status===401){onUnauthorized();return;}
   if(r.status===403||r.status===404){setError("غير مصرح بمعاينة دفتر الموظفين في هذا الفرع.");return;}
   if(r.status===400){setError("البيانات مرفوضة: تأكد أن كل الموظفين من هذا الفرع وأن المقترح ممكن (مثلاً لا سداد بدون سلفة قائمة).");return;}
   if(!r.ok){setError("معاينة الدفتر غير متاحة حاليًا (HR مغلق أو الخدمة غير جاهزة).");return;}
   const data=await r.json() as LedgerPreviewView;
   if(!isSafePreview(data)){setError("رد غير آمن: المعاينة لازم تكون غير مرحّلة.");return;}
   setResult(data);
  }catch{setError("الاتصال غير متاح؛ جرّب مرة أخرى.");}
  finally{setBusy(false);}
 }
 return <section className="k5-admin-card hr-panel" data-hr="ledger-preview">
  <h2>دفتر الموظف — معاينة غير مرحّلة</h2>
  <p className="k5-muted" data-hr="ledger-preview-limits">
   القيود هنا مسودة في المتصفح فقط وتُرسل لحساب الأرصدة دون حفظ. لا يوجد صرف نقدي ولا ترحيل
   مرتبات ولا قيد في الخزينة أو الأستاذ (ADR-031)؛ الحالة: UNPOSTED_HR_LEDGER_PREVIEW.
  </p>
  {employees.length===0?<p>أضف موظفين للفرع أولاً من تبويب الموظفون.</p>:<>
  <div className="catalog-form hr-form-grid">
   <label>الموظف
    <select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>
     <option value="">اختار موظفًا</option>
     {employees.map(e=><option key={e.employeeId} value={e.employeeId}>{e.displayName} ({e.employeeCode})</option>)}
    </select>
   </label>
   <label>تاريخ القيد
    <input type="date" value={entryDate} onChange={e=>setEntryDate(e.target.value)}/>
   </label>
   <label>السبب
    <select value={reason} onChange={e=>changeReason(e.target.value)}>
     {LEDGER_REASON_OPTIONS.map(o=><option key={o.reason} value={o.reason}>{o.label}</option>)}
    </select>
   </label>
   <label>الاتجاه
    <select value={direction} disabled={allowed.length<2}
     onChange={e=>setDirection(e.target.value as LedgerDirection)}>
     {allowed.map(d=><option key={d} value={d}>{d==="credit"?"دائن (له)":"مدين (عليه)"}</option>)}
    </select>
   </label>
   <label>المبلغ
    <input inputMode="decimal" dir="ltr" value={amount} placeholder="0.00"
     onChange={e=>setAmount(e.target.value)}/>
   </label>
   <button className="k5-save" type="button" onClick={addRow}>إضافة قيد للمسودة</button>
  </div>
  <div className="hr-proposal">
   <label className="hr-check"><input type="checkbox" checked={proposalOn}
    onChange={e=>setProposalOn(e.target.checked)}/> معاينة سلفة أو سداد سلفة (اقتراح)</label>
   {proposalOn&&<div className="catalog-form hr-form-grid">
    <label>الموظف
     <select value={proposalEmployee} onChange={e=>setProposalEmployee(e.target.value)}>
      <option value="">اختار موظفًا</option>
      {employees.map(e=><option key={e.employeeId} value={e.employeeId}>{e.displayName}</option>)}
     </select>
    </label>
    <label>النوع
     <select value={proposalKind} onChange={e=>setProposalKind(e.target.value as "advance"|"advance_repayment")}>
      <option value="advance">سلفة جديدة</option>
      <option value="advance_repayment">سداد سلفة</option>
     </select>
    </label>
    <label>المبلغ
     <input inputMode="decimal" dir="ltr" value={proposalAmount} placeholder="0.00"
      onChange={e=>setProposalAmount(e.target.value)}/>
    </label>
   </div>}
  </div>
  {error&&<p role="alert" className="k5-error">{error}</p>}
  <h3>مسودة القيود ({rows.length})</h3>
  {rows.length===0?<p className="k5-muted">لا توجد قيود في المسودة.</p>:
  <div className="k5-table-wrap"><table className="k5-table">
   <thead><tr><th>الموظف</th><th>التاريخ</th><th>السبب</th><th>الاتجاه</th><th>المبلغ</th><th/></tr></thead>
   <tbody>{rows.map(r=><tr key={r.key}>
    <td>{label(r.employeeId)}</td><td dir="ltr">{r.entryDate}</td>
    <td>{LEDGER_REASON_OPTIONS.find(o=>o.reason===r.reason)?.label??r.reason}</td>
    <td>{r.direction==="credit"?"دائن":"مدين"}</td><td dir="ltr">{r.amountText}</td>
    <td><button type="button" onClick={()=>{setRows(c=>c.filter(x=>x.key!==r.key));setResult(null);}}>حذف</button></td>
   </tr>)}</tbody>
  </table></div>}
  <button className="k5-save" type="button" disabled={busy||(rows.length===0&&!proposalOn)}
   onClick={()=>void runPreview()}>{busy?"جاري الحساب…":"احسب المعاينة (بدون حفظ)"}</button>
  {result&&<div data-hr="ledger-preview-result">
   <p role="status" className="k5-notice">معاينة غير مرحّلة — لم يُحفظ شيء ولم تتحرك أي نقدية.</p>
   <div className="k5-table-wrap"><table className="k5-table">
    <thead><tr><th>الموظف</th><th>الرصيد</th><th>سلفة مستحقة</th><th>مرتبات</th><th>تارجت/عمولة</th><th>سلف</th><th>صرف (معاينة)</th><th>خصومات</th></tr></thead>
    <tbody>{result.employees.map(s=><tr key={s.employeeId}>
     <td>{label(s.employeeId)}</td><td dir="ltr">{formatMinor(s.balanceMinor)}</td>
     <td dir="ltr">{formatMinor(s.outstandingAdvanceMinor)}</td>
     <td dir="ltr">{formatMinor(s.salaryCreditsMinor)}</td>
     <td dir="ltr">{formatMinor(s.targetCreditsMinor)}</td>
     <td dir="ltr">{formatMinor(s.advanceDebitsMinor)}</td>
     <td dir="ltr">{formatMinor(s.payoutDebitsMinor)}</td>
     <td dir="ltr">{formatMinor(s.deductionDebitsMinor)}</td>
    </tr>)}</tbody>
   </table></div>
   <p>سيولة الفرع المطلوبة لو تم الصرف: <b dir="ltr">{formatMinor(result.liquidity.cashRequiredMinor)}</b>
    {" "}| مديونية الموظفين: <b dir="ltr">{formatMinor(result.liquidity.employeeDebtMinor)}</b>
    {" "}| الصافي: <b dir="ltr">{formatMinor(result.liquidity.netMinor)}</b></p>
   {result.proposal&&<pre dir="ltr" className="hr-proposal-result" data-hr="ledger-proposal-result">
    {JSON.stringify(result.proposal,null,1)}</pre>}
  </div>}
  </>}
  <button type="button" disabled aria-disabled="true" data-hr="ledger-payout-blocked"
   title="Blocked by ADR-031: payout needs Treasury owner">
   صرف / ترحيل للخزينة — غير متاح (BLOCKED ADR-031)
  </button>
 </section>;
}
