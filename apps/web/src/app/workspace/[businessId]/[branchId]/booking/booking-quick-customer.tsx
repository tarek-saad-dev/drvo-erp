"use client";

import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {
 prepareQuickCustomer,createdCustomerId,conflictCustomerId,matchingBusinessCustomer,
} from "./booking-quick-customer.mjs";

type Customer={customerId:string;displayName:string;phoneE164:string|null;isActive:boolean};

/**
 * Source-preserving Cashier quick-registration workflow, reused through the
 * independently owned Customers Core API. It does NOT bypass customers.manage.
 * Rendered inside Booking's existing form: no nested form or alternative SQL.
 */
export default function BookingQuickCustomer({apiRoot,disabled,onSelected}:{
 apiRoot:string;disabled:boolean;onSelected:(customer:Customer)=>void;
}){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [name,setName]=useState("");
 const [phone,setPhone]=useState("");
 const [busy,setBusy]=useState(false);
 const [denied,setDenied]=useState(false);
 const [message,setMessage]=useState("");
 const retry=useRef<string|null>(null);
 const endpoint=apiRoot+"/customers";

 async function selectExisting(customerId:string,phoneE164:string):Promise<Customer|null>{
  // A duplicate ID from a conflict is NOT proof of identity/branch authorization.
  // Re-read under the same K5 Business scope and require exact verified identity.
  const r=await fetch(endpoint+"?q="+encodeURIComponent(phoneE164),{
   credentials:"same-origin",cache:"no-store",
  });
  if(r.status===401){router.replace("/sign-in");return null;}
  if(r.status===403||r.status===404){setDenied(true);return null;}
  if(!r.ok)return null;
  const result=await r.json() as unknown;
  return matchingBusinessCustomer(result,customerId,phoneE164);
 }

 function selected(customer:Customer){
  onSelected(customer);
  setOpen(false);setName("");setPhone("");setMessage("");retry.current=null;
 }

 async function create(){
  if(busy||disabled||denied)return;
  const input=prepareQuickCustomer(name,phone);
  if(!input){
   setMessage("اكتب اسم العميل ورقم موبايل صحيح (01 أو +20).");return;
  }
  if(!retry.current)retry.current=crypto.randomUUID();
  setBusy(true);setMessage("");
  try{
   const r=await fetch(endpoint,{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":retry.current},
    body:JSON.stringify(input),
   });
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){
    setDenied(true);setMessage("حسابك لا يملك صلاحية تسجيل العملاء.");return;
   }
   if(r.status===409){
    const duplicate=conflictCustomerId(await r.json().catch(()=>null));
    retry.current=null;
    if(duplicate){
     const existing=await selectExisting(duplicate,input.phoneE164);
     if(existing){
      selected(existing);
      return;
     }
     setMessage("الموبايل مسجل بالفعل. ابحث عنه في دليل الـBusiness قبل الحجز.");
    }else setMessage("فيه تعارض في الطلب؛ راجع البيانات وحاول مجددًا.");
    return;
   }
   if(r.status===400){
    retry.current=null;
    setMessage("بيانات العميل غير مقبولة؛ راجع الاسم والموبايل.");return;
   }
   if(!r.ok){
    setMessage("الحفظ غير مؤكد؛ أعد المحاولة بنفس البيانات لتجنب التكرار.");return;
   }
   const result=await r.json() as {id?:unknown;created?:unknown};
   const id=createdCustomerId(result);
   if(!id){
    setMessage("الاستجابة غير مؤكدة؛ أعد المحاولة بنفس البيانات.");return;
   }
   if(result.created!==true){
    // Idempotency replay: re-read, do not invent a fresh Customer identity.
    const existing=await selectExisting(id,input.phoneE164);
    if(!existing){
     setMessage("الطلب اتسجل قبل كده، لكن تعذر تأكيد بيانات العميل. حاول البحث عنه.");
     return;
    }
    selected(existing);return;
   }
   selected({customerId:id,displayName:input.displayName,
    phoneE164:input.phoneE164,isActive:true});
  }catch{
   setMessage("تعذر الاتصال. أعد المحاولة من غير تغيير البيانات لتجنب التكرار.");
  }finally{setBusy(false);}
 }

 return <div className="k5-booking-quick-customer" data-booking-quick-customer="customers-core">
  <button type="button" className="k5-salon-refresh"
   disabled={disabled||busy||denied} onClick={()=>{
    setOpen(v=>!v);setMessage("");
   }}>＋ تسجيل عميل جديد من الحجز</button>
  {open&&<div className="catalog-form" aria-label="تسجيل عميل داخل الحجز">
   <label>اسم العميل<input maxLength={160} required value={name}
    disabled={disabled||busy||denied}
    onChange={e=>{setName(e.target.value);retry.current=null;setMessage("");}}/></label>
   <label>الموبايل (01 أو +20)<input type="tel" dir="ltr" required
    value={phone} disabled={disabled||busy||denied}
    onChange={e=>{setPhone(e.target.value);retry.current=null;setMessage("");}}/></label>
   <button type="button" className="k5-save" disabled={disabled||busy||denied}
    onClick={()=>void create()}>حفظ واختيار العميل</button>
   <button type="button" disabled={busy} onClick={()=>setOpen(false)}>إلغاء</button>
  </div>}
  {message&&<p role="status" className="k5-notice">{message}</p>}
  {denied&&<p role="alert" className="k5-error">
   صلاحية Customers Manage غير متاحة؛ اطلب من مسؤول الفرع تفعيلها.
  </p>}
 </div>;
}
