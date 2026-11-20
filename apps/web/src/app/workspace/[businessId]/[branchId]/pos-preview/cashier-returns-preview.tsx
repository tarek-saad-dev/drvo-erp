"use client";
/**
 * Cashier DeleteInvoiceDialog UX for the private POS, NONPOSTING.
 * Source UX: casher@046bf19 src/components/sales/DeleteInvoiceDialog.tsx (blob d7af1617…)
 * + src/lib/deleteSalesInvoice.ts. Operator may type a hypothetical invoice label and reason
 * to see whether Cashier would enable confirm. DRVO NEVER deletes a sale, never reverses
 * stock, never refunds cash/Treasury, never reverses loyalty, never posts GL, never WhatsApps:
 * Cashier's write path is ADR-031 + Sales void owner gated (ledger POS-16).
 */
import {useMemo,useState} from "react";
import {computeReturnEntry,readSaleDisplayRef,sanitizeReturnReasonInput,
  sanitizeSaleDisplayRefInput} from "./cashier-return-preview";

export default function CashierReturnsPreview({disabled}:{disabled:boolean}){
 const [refInput,setRefInput]=useState("");
 const [reasonInput,setReasonInput]=useState("");
 const saleRef=readSaleDisplayRef(refInput);
 const entry=useMemo(()=>{
  try{return computeReturnEntry(saleRef,reasonInput);}catch{return null;}
 },[saleRef,reasonInput]);
 return <section className="k5-admin-card" aria-label="مرتجع / استرداد — معاينة Cashier"
  data-cashier-pos="returns-preview">
  <div className="k5-admin-summary"><h2>مرتجع / مسح فاتورة — معاينة فقط</h2>
   <p className="k5-muted" role="status" data-cashier-pos="returns-nonposting-banner">
    NONPOSTING — مفيش عكس بيع ولا زيادة مخزون ولا رد كاش ولا خزينة ولا نقاط ولا قيد محاسبي.
    مسار Cashier (مسح فاتورة + عكس المخزون/الخزينة/الولاء) مقفول لحد ADR-031 ومالك Sales void.
   </p>
  </div>
  {entry===null?
   <p className="k5-muted" role="status">أدخل رقم فاتورة افتراضي وسببًا صالحًا للمعاينة.</p>:<>
   <label>رقم الفاتورة (افتراضي / للعرض فقط)
    <input type="text" autoComplete="off" maxLength={64}
     placeholder="مثال: 1042" value={refInput} disabled={disabled}
     onChange={e=>setRefInput(sanitizeSaleDisplayRefInput(e.target.value))}/>
   </label>
   <label>سبب المسح / المرتجع <span aria-hidden="true">*</span>
    <textarea rows={3} maxLength={2000} placeholder="اكتب سبب مسح الفاتورة..."
     value={reasonInput} disabled={disabled}
     onChange={e=>setReasonInput(sanitizeReturnReasonInput(e.target.value))}/>
   </label>
   <p data-cashier-pos="return-outcome" data-outcome={entry.outcome}>
    حالة المعاينة: <strong>{
     entry.outcome==="NO_REASON"?"سبب المسح مطلوب (زي Cashier)":
     entry.outcome==="MISSING_SALE_REF"?"مفيش مرجع فاتورة — Cashier بيفتح الحوار من فاتورة موجودة":
     "Cashier كان هيفعّل زر المسح هنا"}</strong>
   </p>
   <ul className="k5-muted" data-cashier-pos="returns-blocked-effects">
    <li>عكس البيع / الحذف: محظور (BLOCKED_ADR_031_SALES_VOID)</li>
    <li>زيادة مخزون: غير مصرّح</li>
    <li>رد كاش / خزينة: غير مصرّح</li>
    <li>عكس نقاط الولاء: غير مصرّح</li>
    <li>قيد محاسبي / واتساب: غير مصرّح</li>
   </ul>
   <button type="button" className="k5-save" disabled aria-disabled="true"
    data-cashier-pos="return-void-blocked"
    title="BLOCKED_ADR_031_SALES_VOID — لا يوجد مالك عكس بيع/مرتجع">
    مسح الفاتورة / استرداد — محظور
   </button>
   <p className="k5-muted">
    {entry.cashierWouldEnableConfirm?
     "Cashier كان هيفعّل زر المسح هنا؛ في DRVO مفيش حذف ولا عكس مخزون ولا رد فلوس.":
     "حتى في Cashier الزر مش هيتفعّل بالحالة دي."}
    {" "}لا عكس بيع · لا مخزون+ · لا خزينة · لا نقاط · لا قيد · لا واتساب.
   </p>
  </>}
 </section>;
}
