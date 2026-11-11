"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Customer={customerId:string;displayName:string;phoneE164:string|null;isActive:boolean};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function CustomersClient({businessId,branchId}:{businessId:string;branchId:string}){
 const router=useRouter();
 const [state,setState]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [displayName,setName]=useState("");
 const [phone,setPhone]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const idempotency=useRef<string|null>(null);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+encodeURIComponent(branchId)+"/customers";
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const r=await fetch(api,{credentials:"same-origin",cache:"no-store"});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setState("denied");return;}
   if(!r.ok){setState("unavailable");return;}
   const data=await r.json() as {customers?:Customer[]};
   if(!Array.isArray(data.customers)){setState("unavailable");return;}
   setCustomers(data.customers);setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  if(phone&&!/^\+[1-9][0-9]{6,14}$/.test(phone)){
   setNotice("رقم الموبايل لازم يكون بصيغة دولية زي +2010... أو سيبه فارغ.");return;
  }
  setBusy(true);setNotice("");
  if(!idempotency.current)idempotency.current=crypto.randomUUID();
  try{
   const r=await fetch(api,{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":idempotency.current},
    body:JSON.stringify({displayName,phoneE164:phone||null}),
   });
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===404||r.status===403){setState("denied");return;}
   if(r.status===409){idempotency.current=null;setNotice("بيانات الطلب اتغيرت. جرّب مرة تانية.");return;}
   if(!r.ok){setNotice("تعذر الحفظ. أعد المحاولة بنفس البيانات.");return;}
   idempotency.current=null;setName("");setPhone("");
   setNotice("تم تسجيل العميل.");await load();
  }catch{setNotice("تعذر الاتصال، ينفع تعيد المحاولة بدون تكرار التسجيل.");}
  finally{setBusy(false);}
 }
 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">CUSTOMERS / CRM</span><h1>العملاء</h1>
   <p className="k5-muted">بيانات العملاء مشتركة داخل نفس الـBusiness فقط. مفيش تسويق أو رسائل تلقائية.</p>
  </div></div>
  {state==="loading"&&<p role="status" className="k5-table-state">جاري تحميل العملاء…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">مش مصرح لك بعرض العملاء.</p>}
  {state==="unavailable"&&<p role="alert" className="k5-error">العملاء غير متاحين حاليًا.</p>}
  {state==="ready"&&<>
   {notice&&<p role="status" className="k5-notice">{notice}</p>}
   <section className="k5-admin-card k5-invite-card">
    <h2>إضافة عميل</h2>
    <form className="catalog-form" onSubmit={submit}>
     <label>اسم العميل<input required maxLength={160} value={displayName}
      onChange={e=>{setName(e.target.value);idempotency.current=null;}}/></label>
     <label>رقم الموبايل الدولي (اختياري)<input dir="ltr" type="tel" maxLength={16}
      value={phone} placeholder="+201012345678" onChange={e=>{
       setPhone(e.target.value);idempotency.current=null;
      }}/></label>
     <button disabled={busy} className="k5-save">تسجيل العميل</button>
    </form>
   </section>
   <section className="k5-admin-card">
    <div className="k5-admin-summary"><h2>دليل العملاء</h2>
     <span className="k5-count">{customers.length} عميل</span></div>
    <p className="k5-muted" style={{padding:"0 24px"}}>دي أول 200 نتيجة؛ البحث والصفحات المتعددة هيتضافوا في Iteration لاحقة.</p>
    <div className="k5-table-wrap"><table className="k5-table">
     <thead><tr><th>الاسم</th><th>الموبايل</th></tr></thead>
     <tbody>{customers.length===0?
      <tr><td colSpan={2} className="k5-empty">مفيش عملاء مسجلين.</td></tr>:
      customers.map(c=><tr key={c.customerId}>
       <td>{c.displayName}</td><td dir="ltr">{c.phoneE164??"—"}</td>
      </tr>)}</tbody>
    </table></div>
   </section>
  </>}
 </main>;
}
