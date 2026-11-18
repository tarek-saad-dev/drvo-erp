"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {findAuthorizedCustomers} from "../booking/customer-finder.mjs";

type Customer={customerId:string;displayName:string;phoneE164:string|null;isActive:boolean};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function normalizeEgyptPhone(raw:string):string|null{
 const digit=raw.trim().replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-1776))
  .replace(/[\s()-]/g,"");
 const intl=/^01[0-9]{9}$/.test(digit)?"+20"+digit.slice(1):
  digit.startsWith("0020")?"+20"+digit.slice(4):digit;
 return /^\+[1-9][0-9]{6,14}$/.test(intl)?intl:null;
}
export default function PosCustomerOperator({apiRoot,customerId,onSelect,onCreated}:{
 apiRoot:string;customerId:string;onSelect:(id:string)=>void;onCreated:()=>void;
}){
 const router=useRouter();
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [status,setStatus]=useState<"loading"|"ready"|"denied">("loading");
 const [query,setQuery]=useState("");
 const [creating,setCreating]=useState(false);
 const [name,setName]=useState("");
 const [phone,setPhone]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const retry=useRef<string|null>(null);
 const endpoint=apiRoot+"/customers";
 const load=useCallback(async()=>{
  try{
   const r=await fetch(endpoint,{credentials:"same-origin",cache:"no-store"});
   if(r.status===401){router.replace("/sign-in");setCustomers([]);setStatus("denied");return;}
   if(!r.ok){setCustomers([]);setStatus("denied");return;}
   const result=await r.json() as {customers?:Customer[]};
   if(!Array.isArray(result.customers)||result.customers.length>200||
      result.customers.some(c=>!GUID.test(c.customerId)||typeof c.displayName!=="string"||
       typeof c.isActive!=="boolean"||(c.phoneE164!==null&&typeof c.phoneE164!=="string"))){
    setCustomers([]);setStatus("denied");return;
   }
   setCustomers(result.customers.filter(x=>x.isActive));setStatus("ready");
  }catch{setCustomers([]);setStatus("denied");}
 },[endpoint,router]);
 useEffect(()=>{void load();},[load]);
 const results=query.trim()?findAuthorizedCustomers(customers,query).slice(0,20):[];
 const select=(id:string)=>{onSelect(id);setQuery("");retry.current=null;setMessage("");};
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||status!=="ready"||customers.length>=200)return;
  const displayName=name.trim(),phoneE164=normalizeEgyptPhone(phone);
  if(!displayName||displayName.length>160||!phoneE164){setMessage("اكتب اسم ورقم صحيحين، مثال 010 أو +20.");return;}
  if(customers.some(c=>c.phoneE164===phoneE164)){
   setMessage("الرقم موجود في النتائج المحمّلة؛ اختار العميل الحالي.");return;
  }
  if(!retry.current)retry.current=crypto.randomUUID();
  setBusy(true);setMessage("");
  try{
   const r=await fetch(endpoint,{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":retry.current},
    body:JSON.stringify({displayName,phoneE164})});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setStatus("denied");setCustomers([]);return;}
   if(r.status===409){retry.current=null;setMessage("الطلب اتغير؛ راجع البيانات.");return;}
   if(!r.ok){setMessage("الحفظ غير مؤكد؛ أعد المحاولة بنفس البيانات بدون تكرار.");return;}
   const created=await r.json() as {id:string;created:boolean};
   if(!GUID.test(created.id)||typeof created.created!=="boolean"){setMessage("استجابة غير صالحة.");return;}
   retry.current=null;setCreating(false);setName("");setPhone("");
   await load();
   onSelect(created.id);onCreated();
   setMessage("اتسجل العميل في Customers Core واتحدد داخل POS DRAFT.");
  }catch{setMessage("الاتصال غير متاح. أعد المحاولة بنفس بيانات الطلب.");}
  finally{setBusy(false);}
 }
 const selected=customers.find(x=>x.customerId===customerId);
 return <section className="k5-admin-card" aria-label="اختيار عميل حقيقي لنقطة البيع">
  <div className="k5-admin-summary"><h2>العميل — بحث بالاسم والموبايل</h2></div>
  {status==="loading"&&<p role="status">جاري تحميل دليل العملاء المصرّح به…</p>}
  {status==="denied"&&<p role="alert" className="k5-error">الـCustomers API غير متاح بالصلاحيات الحالية.</p>}
  {status==="ready"&&<>
   <div className="catalog-form">
    <label>بحث عن عميل<input type="search" autoComplete="off" maxLength={80}
     value={query} onChange={e=>setQuery(e.target.value)}
     placeholder="اسم العميل أو رقم الموبايل"/></label>
    <label>العميل المختار<select value={selected?.customerId??""}
     onChange={e=>select(e.target.value)}>
     <option value="">بدون عميل / Walk-in</option>
     {customers.map(c=><option key={c.customerId} value={c.customerId}>
      {c.displayName} · {c.phoneE164??"بدون رقم"}</option>)}
    </select></label>
   </div>
   {query.trim()&&<div className="k5-booking-actions" aria-label="نتائج البحث">
    {results.map(c=><button key={c.customerId} type="button" onClick={()=>select(c.customerId)}>
     {c.displayName} — {c.phoneE164??""}</button>)}
    {results.length===0&&<p className="k5-muted">مفيش تطابق ضمن أول 200 عميل؛ ده مش دليل إن الرقم غير موجود في الـBusiness.</p>}
   </div>}
   <button type="button" className="k5-salon-refresh" onClick={()=>{
    setName(normalizeEgyptPhone(query)?"":query.trim());
    setPhone(normalizeEgyptPhone(query)?query:"");
    setCreating(true);setQuery("");retry.current=null;
   }} disabled={customers.length>=200}>＋ تسجيل عميل حقيقي من POS</button>
   {creating&&<form className="catalog-form" onSubmit={create}>
    <label>اسم العميل<input required maxLength={160} value={name}
     onChange={e=>{setName(e.target.value);retry.current=null;}}/></label>
    <label>الموبايل (01 أو +20)<input required dir="ltr" type="tel" value={phone}
     onChange={e=>{setPhone(e.target.value);retry.current=null;}}/></label>
    <button className="k5-save" type="submit" disabled={busy}>حفظ واختيار العميل</button>
    <button type="button" disabled={busy} onClick={()=>setCreating(false)}>إلغاء</button>
   </form>}
   <p className="k5-muted">البحث الحالي داخل أول 200 عميل مُصرّح بهم فقط. لو العدد وصل 200 التسجيل السريع بيتوقف حتى ما نعمل بحث شامل ومنع تكرار الـPhone على السيرفر. ده خاص بالـPrivate POS، مش Demo.</p>
  </>}
  {message&&<p role="status" className="k5-notice">{message}</p>}
 </section>;
}
