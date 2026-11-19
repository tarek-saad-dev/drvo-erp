"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {canonicalizeEgyptPhoneE164} from "../customers/egyptian-phone.mjs";

type Customer={customerId:string;displayName:string;phoneE164:string|null;isActive:boolean};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validCustomer(c:unknown):c is Customer{
 if(!c||typeof c!=="object")return false;
 const row=c as Customer;
 return GUID.test(row.customerId)&&typeof row.displayName==="string"
  &&typeof row.isActive==="boolean"
  &&(row.phoneE164===null||typeof row.phoneE164==="string");
}

export default function PosCustomerOperator({apiRoot,customerId,onSelect,onCreated}:{
 apiRoot:string;customerId:string;onSelect:(id:string)=>void;onCreated:()=>void;
}){
 const router=useRouter();
 const [status,setStatus]=useState<"ready"|"denied">("ready");
 const [query,setQuery]=useState("");
 const [results,setResults]=useState<Customer[]>([]);
 const [searching,setSearching]=useState(false);
 const [selected,setSelected]=useState<Customer|null>(null);
 const [creating,setCreating]=useState(false);
 const [name,setName]=useState("");
 const [phone,setPhone]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [mayBeTruncated,setMayBeTruncated]=useState(false);
 const retry=useRef<string|null>(null);
 const endpoint=apiRoot+"/customers";

 const select=(c:Customer)=>{
  setSelected(c);onSelect(c.customerId);setQuery("");setResults([]);
  retry.current=null;setMessage("");setCreating(false);
 };
 const clear=()=>{setSelected(null);onSelect("");setMessage("");};

 useEffect(()=>{
  if(!customerId){setSelected(null);return;}
  if(selected?.customerId===customerId)return;
  // Keep selection label if present in last results; otherwise show id until next search.
  const hit=results.find(c=>c.customerId===customerId);
  if(hit)setSelected(hit);
 },[customerId,results,selected]);

 useEffect(()=>{
  const q=query.trim();
  if(q.length<1){setResults([]);setMayBeTruncated(false);setSearching(false);return;}
  let cancelled=false;
  const timer=setTimeout(async()=>{
   setSearching(true);setMessage("");
   try{
    const r=await fetch(endpoint+"?q="+encodeURIComponent(q),
     {credentials:"same-origin",cache:"no-store"});
    if(cancelled)return;
    if(r.status===401){router.replace("/sign-in");setStatus("denied");return;}
    if(!r.ok){setResults([]);setStatus("denied");return;}
    const data=await r.json() as {customers?:Customer[];mayBeTruncated?:boolean;searchScope?:string};
    if(!Array.isArray(data.customers)||data.customers.length>20
     ||data.customers.some(c=>!validCustomer(c))
     ||data.searchScope!=="BUSINESS"){
     setResults([]);setStatus("denied");return;
    }
    setResults(data.customers.filter(c=>c.isActive));
    setMayBeTruncated(Boolean(data.mayBeTruncated));
    setStatus("ready");
   }catch{if(!cancelled){setResults([]);setStatus("denied");}}
   finally{if(!cancelled)setSearching(false);}
  },250);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[query,endpoint,router]);

 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||status!=="ready")return;
  const displayName=name.trim(),phoneE164=canonicalizeEgyptPhoneE164(phone);
  if(!displayName||displayName.length>160||!phoneE164){
   setMessage("اكتب اسم ورقم صحيحين، مثال 010 أو +20.");return;
  }
  if(!retry.current)retry.current=crypto.randomUUID();
  setBusy(true);setMessage("");
  try{
   const r=await fetch(endpoint,{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":retry.current},
    body:JSON.stringify({displayName,phoneE164})});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setStatus("denied");return;}
   if(r.status===409){
    const body=await r.json().catch(()=>({})) as {
     code?:string;existingCustomerId?:string;
     message?:string|{code?:string;existingCustomerId?:string};
    };
    const detail=typeof body.message==="object"&&body.message?body.message:body;
    if(detail.code==="CUSTOMER_PHONE_EXISTS"&&detail.existingCustomerId
     &&GUID.test(detail.existingCustomerId)){
     retry.current=null;
     const existing:Customer={
      customerId:detail.existingCustomerId,displayName,phoneE164,isActive:true,
     };
     select(existing);
     setMessage("الرقم مسجّل لنفس الـBusiness؛ تم اختيار العميل الموجود (منع تكرار).");
     return;
    }
    retry.current=null;setMessage("الطلب اتغير؛ راجع البيانات.");return;
   }
   if(!r.ok){setMessage("الحفظ غير مؤكد؛ أعد المحاولة بنفس البيانات بدون تكرار.");return;}
   const created=await r.json() as {id:string;created:boolean};
   if(!GUID.test(created.id)||typeof created.created!=="boolean"){
    setMessage("استجابة غير صالحة.");return;
   }
   retry.current=null;setCreating(false);setName("");setPhone("");
   select({customerId:created.id,displayName,phoneE164,isActive:true});
   onCreated();
   setMessage("اتسجل العميل في Customers Core واتحدد داخل POS DRAFT.");
  }catch{setMessage("الاتصال غير متاح. أعد المحاولة بنفس بيانات الطلب.");}
  finally{setBusy(false);}
 }

 return <section className="k5-admin-card" aria-label="اختيار عميل حقيقي لنقطة البيع"
  data-customer-search="business-server">
  <div className="k5-admin-summary"><h2>العميل — بحث بالاسم والموبايل (Business كامل)</h2></div>
  {status==="denied"&&<p role="alert" className="k5-error">الـCustomers API غير متاح بالصلاحيات الحالية.</p>}
  {status==="ready"&&<>
   <div className="catalog-form">
    <label>بحث عن عميل<input type="search" autoComplete="off" maxLength={80}
     value={query} onChange={e=>setQuery(e.target.value)}
     placeholder="اسم العميل أو رقم الموبايل"/></label>
    <label>العميل المختار
     <div className="k5-booking-actions">
      {selected
       ?<button type="button" className="k5-save" disabled>{selected.displayName}
         {" · "}{selected.phoneE164??"بدون رقم"}</button>
       :<span className="k5-muted">بدون عميل / Walk-in</span>}
      {selected&&<button type="button" onClick={clear}>مسح</button>}
     </div>
    </label>
   </div>
   {query.trim()&&<div className="k5-booking-actions" aria-label="نتائج البحث على السيرفر">
    {searching&&<p role="status" className="k5-muted">جاري البحث على السيرفر…</p>}
    {!searching&&results.map(c=><button key={c.customerId} type="button"
     onClick={()=>select(c)}>{c.displayName} — {c.phoneE164??""}</button>)}
    {!searching&&results.length===0&&<p className="k5-muted">
     مفيش تطابق في دليل الـBusiness. تقدر تسجّل عميل جديد.</p>}
    {mayBeTruncated&&<p className="k5-muted">ظهرت أول 20 نتيجة؛ ضيّق البحث لو محتاج أدق.</p>}
   </div>}
   <button type="button" className="k5-salon-refresh" onClick={()=>{
    const phonePrefill=canonicalizeEgyptPhoneE164(query);
    setName(phonePrefill?"":query.trim());
    setPhone(phonePrefill?query:"");
    setCreating(true);setQuery("");retry.current=null;
   }}>＋ تسجيل عميل حقيقي من POS</button>
   {creating&&<form className="catalog-form" onSubmit={create}>
    <label>اسم العميل<input required maxLength={160} value={name}
     onChange={e=>{setName(e.target.value);retry.current=null;}}/></label>
    <label>الموبايل (01 أو +20)<input required dir="ltr" type="tel" value={phone}
     onChange={e=>{setPhone(e.target.value);retry.current=null;}}/></label>
    <button className="k5-save" type="submit" disabled={busy}>حفظ واختيار العميل</button>
    <button type="button" disabled={busy} onClick={()=>setCreating(false)}>إلغاء</button>
   </form>}
   <p className="k5-muted">البحث صار سيرفر-سايد على كل عملاء الـBusiness المصرّح بهم (مش أول 200 فقط). تكرار نفس الموبايل بيرجع العميل الموجود بدل إنشاء مزدوج. ده Private POS، مش Demo. مفيش دفع/ترحيل مالي.</p>
  </>}
  {message&&<p role="status" className="k5-notice">{message}</p>}
 </section>;
}
