"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

/**
 * Read-only Cashier V2 DRAFT history, not Customer purchase history.
 * GETs are independently authorized by the existing scoped SQL022–023 owner.
 * Restoring offers only a NEW cart; saved prices/discounts are never reused.
 * Draft print opens the NONPOSTING print view (Cashier PrintInvoiceModal adaptation).
 */
type Customer={customerId:string;displayName:string;isActive:boolean};
type Employee={employeeId:string;displayName:string;isActive:boolean;branchActive:boolean};
type DraftLine={offeringId:string;displayName:string;kind:string;quantity:number;
 discountMinor:number;netMinor:number;executorEmployeeId:string|null};
type Draft={draftId:string;createdAtUtc:string;currency:string;customerId:string|null;
 totalDiscountMinor:number;grandTotalMinor:number;status:"DRAFT";lines:DraftLine[]};
const money=(n:number,c:string)=>(n/100).toFixed(2)+" "+c;

export default function CashierDraftHistory({apiRoot,draftApi,revision,disabled,onUseDraft,
 printBasePath}:{
 apiRoot:string;draftApi:string;revision:number;disabled:boolean;
 onUseDraft:(lines:Array<{offeringId:string;quantity:number}>)=>void;
 printBasePath:string;
}){
 const [state,setState]=useState<"loading"|"ready"|"denied">("loading");
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [filter,setFilter]=useState("ALL");
 const [mayBeTruncated,setMayBeTruncated]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   setState("loading");
   try{
    const [c,h,d]=await Promise.all([
     fetch(apiRoot+"/customers",{credentials:"same-origin",cache:"no-store"}),
     fetch(apiRoot+"/hr/employees",{credentials:"same-origin",cache:"no-store"}),
     fetch(draftApi+"/cashier",{credentials:"same-origin",cache:"no-store"}),
    ]);
    if(!c.ok||!h.ok||!d.ok)throw Error("Scope or feature denied");
    const cx=await c.json() as {customers:Customer[]};
    const hx=await h.json() as {employees:Employee[]};
    const dx=await d.json() as {state:string;drafts:Draft[];
     limit:number;mayBeTruncated:boolean;paymentState:string;accountingState:string};
    if(!Array.isArray(cx.customers)||!Array.isArray(hx.employees)||
       !Array.isArray(dx.drafts)||dx.drafts.length>50||
       dx.state!=="CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY"||dx.limit!==50||
       dx.paymentState!=="NOT_COLLECTED"||dx.accountingState!=="NOT_POSTED"||
       !dx.drafts.every(x=>x.status==="DRAFT"&&Array.isArray(x.lines)))
     throw Error("Unexpected read-only draft response");
    if(cancelled)return;
    setCustomers(cx.customers.filter(x=>x.isActive));
    setEmployees(hx.employees.filter(x=>x.isActive&&x.branchActive));
    setDrafts(dx.drafts);setMayBeTruncated(dx.mayBeTruncated===true);
    setState("ready");
   }catch{
    if(cancelled)return;
    setDrafts([]);setCustomers([]);setEmployees([]);
    setState("denied");
   }
  }
  void load();
  return ()=>{cancelled=true;};
 },[apiRoot,draftApi,revision]);
 const customerName=(id:string|null)=>!id?"بدون عميل":
  customers.find(x=>x.customerId.toLowerCase()===id.toLowerCase())?.displayName??
   "عميل غير متاح في القائمة الحالية";
 const employeeName=(id:string|null)=>!id?"لم يتم تعيين منفّذ":
  employees.find(x=>x.employeeId.toLowerCase()===id.toLowerCase())?.displayName??
   "منفّذ غير متاح في القائمة الحالية";
 const visible=drafts.filter(d=>filter==="ALL"||
  (filter==="UNLINKED"?d.customerId===null:d.customerId?.toLowerCase()===filter.toLowerCase()));
 return <section className="k5-admin-card" dir="rtl" aria-label="سجل مسودات Cashier حسب العميل">
  <h2>سجل مسودات Cashier حسب العميل</h2>
  <p className="k5-muted">آخر 50 مسودة أسعار V2 مسموح بيها في الفرع فقط.
   ده <strong>مش سجل مشتريات أو فواتير مدفوعة</strong>؛ مفيش تحصيل أو ترحيل.</p>
  {state==="loading"&&<p role="status">جاري قراءة المسودات من SQL بصلاحيات الفرع…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">
   السجل غير متاح: راجع تفعيل POS V2 وصلاحيات POS وCatalog وCustomers وHR.</p>}
  {state==="ready"&&<>
   <label>فلترة حسب العميل
    <select value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="ALL">كل المسودات المسموح بها</option>
     <option value="UNLINKED">مسودات بدون عميل</option>
     {customers.map(c=><option key={c.customerId} value={c.customerId}>{c.displayName}</option>)}
    </select>
   </label>
   <p className="k5-muted">النتيجة: {visible.length} من {drafts.length} مسودة ظاهرة.</p>
   {mayBeTruncated&&<p className="k5-muted" role="status">
    النتائج محدودة بأحدث 50 مسودة في الفرع؛ الفلترة ليست سجلًا تاريخيًا كاملًا.</p>}
   {visible.length===0?<p className="k5-muted">لا توجد مسودات مطابقة في النتائج المتاحة.</p>:
    <div className="k5-table-wrap"><table className="k5-table">
     <thead><tr><th>وقت الحفظ</th><th>العميل</th><th>الخصم</th><th>صافي المسودة</th>
      <th>تفاصيل</th><th>طباعة مسودة</th><th>سلة جديدة</th></tr></thead>
     <tbody>{visible.map(d=><tr key={d.draftId}>
      <td>{new Date(d.createdAtUtc).toLocaleString("ar-EG")}</td>
      <td>{customerName(d.customerId)}</td>
      <td dir="ltr">{money(d.totalDiscountMinor,d.currency)}</td>
      <td dir="ltr">{money(d.grandTotalMinor,d.currency)}</td>
      <td><details><summary>عرض الأصناف والمنفّذين</summary>
       <ul>{d.lines.map((l,i)=><li key={l.offeringId+"-"+i}>
        {l.displayName} × {l.quantity} — {employeeName(l.executorEmployeeId)}
        {" — خصم "+money(l.discountMinor,d.currency)+" — صافي "+money(l.netMinor,d.currency)}
       </li>)}</ul>
       <p className="k5-muted">DRAFT · NOT_COLLECTED · NOT_POSTED</p>
      </details></td>
      <td><Link className="k5-salon-refresh" data-cashier-pos="draft-print-open"
       href={printBasePath+"/draft-print?draftId="+encodeURIComponent(d.draftId)}
       aria-disabled={disabled?true:undefined}
       onClick={e=>{if(disabled)e.preventDefault();}}
       title="مسودة — غير محصّلة / غير مرحّلة">
       طباعة المسودة
      </Link></td>
      <td><button type="button" className="k5-salon-refresh" disabled={disabled}
       onClick={()=>onUseDraft(d.lines.map(l=>({offeringId:l.offeringId,quantity:l.quantity})))}>
       جهّز سلة بالأسعار الحالية
      </button></td>
     </tr>)}</tbody>
    </table></div>}
  </>}
 </section>;
}
