"use client";
import {useCallback,useEffect,useRef,useState} from "react";

/** K5 private operator flow, actually persists SQL022 Cashier quote snapshots. */
type Line={offeringId:string;quantity:number;
 lineDiscountMinor?:number;lineDiscountPercentBps?:number};
type Customer={customerId:string;displayName:string;isActive:boolean};
type Employee={employeeId:string;displayName:string;isActive:boolean;branchActive:boolean};
type Stored={draftId:string;currency:string;customerId:string|null;
 grandTotalMinor:number;headerDiscountMinor:number;totalDiscountMinor:number;
 lines:Array<{offeringId:string;displayName:string;quantity:number;discountMinor:number;
  netMinor:number;executorEmployeeId:string|null}>};
const money=(n:number,c:string)=>(n/100).toFixed(2)+" "+c;

export default function CashierRichDraftActions({apiRoot,draftApi,lines,header,
 quoteTotalMinor,currency,afterSaved}:{
 apiRoot:string;draftApi:string;lines:Line[];
 header:{headerDiscountMinor?:number;headerDiscountPercentBps?:number};
 quoteTotalMinor:number;currency:string;afterSaved:()=>void;
}){
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [customerId,setCustomerId]=useState("");
 const [executors,setExecutors]=useState<Record<string,string>>({});
 const [state,setState]=useState<"loading"|"ready"|"denied">("loading");
 const [saved,setSaved]=useState<Stored[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState(false);
 const retry=useRef<string|null>(null);
 const api=apiRoot;
 const load=useCallback(async()=>{
  try{
   const [c,h,d]=await Promise.all([
    fetch(api+"/customers",{cache:"no-store",credentials:"same-origin"}),
    fetch(api+"/hr/employees",{cache:"no-store",credentials:"same-origin"}),
    fetch(draftApi+"/cashier",{cache:"no-store",credentials:"same-origin"}),
   ]);
   if(!c.ok||!h.ok||!d.ok){setState("denied");return;}
   const cx=await c.json() as {customers:Customer[]};
   const hx=await h.json() as {employees:Employee[]};
   const dx=await d.json() as {state:string;drafts:Stored[]};
   if(!Array.isArray(cx.customers)||!Array.isArray(hx.employees)||
      !Array.isArray(dx.drafts)||dx.state!=="CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY"){
    setState("denied");return;
   }
   setCustomers(cx.customers.filter(x=>x.isActive));
   setEmployees(hx.employees.filter(x=>x.isActive&&x.branchActive));
   setSaved(dx.drafts);setState("ready");
  }catch{setState("denied");}
 },[api,draftApi]);
 useEffect(()=>{void load();},[load]);
 const resetRetry=()=>{retry.current=null;setMessage("");};
 async function save(){
  if(busy||state!=="ready")return;
  const body={
   lines:lines.map(l=>({
    ...l,executorEmployeeId:executors[l.offeringId]||null,
   })),
   customerId:customerId||null,...header,expectedTotalMinor:quoteTotalMinor,
  };
  setBusy(true);setMessage("");setError(false);
  if(!retry.current)retry.current=crypto.randomUUID();
  try{
   const r=await fetch(draftApi+"/cashier",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":retry.current},
    body:JSON.stringify(body),
   });
   if(r.status===409){retry.current=null;setError(true);
    setMessage("السعر اتغيّر أو البيانات اختلفت؛ احسب الفاتورة تاني قبل الحفظ.");return;}
   if(r.status===401||r.status===403||r.status===404){setState("denied");
    setError(true);setMessage("الحفظ غير مصرح به للحساب أو بيانات العميل/الموظف.");return;}
   if(!r.ok){setError(true);setMessage("تعذر الحفظ؛ إعادة نفس الطلب بالبيانات نفسها آمنة.");return;}
   const savedResponse=await r.json() as {status:string;grandTotalMinor:number;
    discountsPersisted:boolean;paymentState:string;accountingState:string};
   if(savedResponse.status!=="DRAFT"||savedResponse.discountsPersisted!==true||
      savedResponse.paymentState!=="NOT_COLLECTED"||
      savedResponse.accountingState!=="NOT_POSTED"||
      savedResponse.grandTotalMinor!==quoteTotalMinor){
    setError(true);setMessage("استجابة مسودة الأسعار غير متوقعة؛ راجع السجلات.");return;
   }
   retry.current=null;
   await load();afterSaved();
   setMessage("اتحفظت مسودة Cashier بخصومات السطور والعميل والمنفذ. لم يتم تحصيل أو ترحيل.");
  }catch{setError(true);setMessage("اتصال غير متاح؛ أعد المحاولة بنفس البيانات.");}
  finally{setBusy(false);}
 }
 return <section className="k5-invite-card" aria-label="حفظ مسودة Cashier الحقيقية">
  <h3>حفظ مسودة Cashier V2 — بدون دفع</h3>
  <p className="k5-muted">بعد حساب السعر من Catalog، تقدر تحفظ الخصومات وتربط العميل ومنفذ كل خدمة.
   السعر بيتراجع في SQL لحظة الحفظ، ولو اتغير لازم تعمل معاينة جديدة.</p>
  {state==="loading"&&<p role="status">جاري فحص صلاحيات Customer وHR وPOS Draft…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">
   الحفظ المتقدم محتاج customers.read وhr.read وpos.draft.manage وCatalog داخل الفرع،
   بالإضافة إلى Migration 022 والـFeature Flag.</p>}
  {state==="ready"&&<>
   <div className="catalog-form">
    <label>العميل (اختياري)
     <select value={customerId} onChange={e=>{setCustomerId(e.target.value);resetRetry();}}>
      <option value="">عميل نقدي / بدون ربط</option>
      {customers.map(c=><option key={c.customerId} value={c.customerId}>{c.displayName}</option>)}
     </select>
    </label>
    <label>الإجمالي بعد الخصم (معاينة معتمدة)
     <input readOnly value={money(quoteTotalMinor,currency)}/>
    </label>
   </div>
   <div className="k5-table-wrap"><table className="k5-table">
    <thead><tr><th>الصنف</th><th>منفذ الخدمة / الموظف (اختياري)</th></tr></thead>
    <tbody>{lines.map(l=><tr key={l.offeringId}><td>{l.offeringId.slice(0,8)}…</td>
     <td><select value={executors[l.offeringId]??""} aria-label={"منفذ سطر "+l.offeringId}
      onChange={e=>{setExecutors(v=>({...v,[l.offeringId]:e.target.value}));resetRetry();}}>
      <option value="">بدون تعيين</option>
      {employees.map(emp=><option key={emp.employeeId} value={emp.employeeId}>{emp.displayName}</option>)}
     </select></td>
    </tr>)}</tbody>
   </table></div>
   <button type="button" className="k5-save" disabled={busy} onClick={()=>void save()}>
    {busy?"جاري الحفظ داخل SQL…":"احفظ مسودة Cashier المحسوبة"}
   </button>
   <h4>مسودات V2 المحفوظة في الفرع</h4>
   {saved.length===0?<p className="k5-muted">لسه مفيش مسودات محسوبة محفوظة.</p>:
    <div className="k5-table-wrap"><table className="k5-table"><thead>
     <tr><th>العميل</th><th>الخصم</th><th>الصافي</th><th>السطور</th></tr></thead>
     <tbody>{saved.map(d=><tr key={d.draftId}>
      <td>{customers.find(c=>c.customerId===d.customerId)?.displayName??"بدون عميل"}</td>
      <td>{money(d.totalDiscountMinor,d.currency)}</td>
      <td>{money(d.grandTotalMinor,d.currency)}</td>
      <td>{d.lines.map(l=>l.displayName+" × "+l.quantity+
       " (خصم "+money(l.discountMinor,d.currency)+")").join("، ")}</td>
     </tr>)}</tbody></table></div>}
  </>}
  {message&&<p role={error?"alert":"status"} className={error?"k5-error":"k5-notice"}>{message}</p>}
  <p className="k5-muted">الخصومات DRAFT فقط؛ مفيش ضريبة محسوبة أو دفع أو قيد GL أو خصم مخزون.</p>
 </section>;
}
