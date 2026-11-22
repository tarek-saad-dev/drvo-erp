"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import BookingQuickCustomer from "../booking-quick-customer";
import {parseWebsiteSlots} from "./website-slots.mjs";

type Customer={customerId:string;displayName:string;phoneE164?:string|null;isActive:boolean};
type Offering={offeringId:string;displayName:string;kind:string;durationMinutes:number|null;isActive:boolean};
type Resource={resourceId:string;displayName:string;kind:string;isActive:boolean};
type Slot={startsAtUtc:string;endsAtUtc:string};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function WebsiteBookingPreviewClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const [status,setStatus]=useState<"loading"|"ready"|"denied"|"error">("loading");
 const [resources,setResources]=useState<Resource[]>([]);
 const [services,setServices]=useState<Offering[]>([]);
 const [resourceId,setResourceId]=useState("");
 const [offeringId,setOfferingId]=useState("");
 const [dayUtc,setDayUtc]=useState(()=>new Date().toISOString().slice(0,10));
 const [slots,setSlots]=useState<Slot[]>([]);
 const [slotStatus,setSlotStatus]=useState<"idle"|"loading"|"ready"|"error">("idle");
 const [selectedStart,setSelectedStart]=useState("");
 const [customerId,setCustomerId]=useState("");
 const [selectedCustomer,setSelectedCustomer]=useState<Customer|null>(null);
 const [customerQuery,setCustomerQuery]=useState("");
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const requestKey=useRef<string|null>(null);
 const scope="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+encodeURIComponent(branchId);
 const booking=scope+"/booking";
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const selected=slots.some(x=>x.startsAtUtc===selectedStart);

 const refresh=useCallback(async()=>{
  try{
   const [b,c,customer]=await Promise.all([
    fetch(booking,{credentials:"same-origin",cache:"no-store"}),
    fetch(scope+"/catalog",{credentials:"same-origin",cache:"no-store"}),
    fetch(scope+"/customers",{credentials:"same-origin",cache:"no-store"}),
   ]);
   if([b,c,customer].some(r=>r.status===401)){router.replace("/sign-in");return;}
   if(!b.ok||!c.ok||!customer.ok){setStatus("denied");return;}
   const book=await b.json() as {resources?:Resource[]};
   const cat=await c.json() as {offerings?:Offering[]};
   if(!Array.isArray(book.resources)||!Array.isArray(cat.offerings)){
    setStatus("error");return;
   }
   setResources(book.resources.filter(x=>x.isActive&&GUID.test(x.resourceId)));
   setServices(cat.offerings.filter(x=>x.isActive&&x.kind==="SERVICE"&&GUID.test(x.offeringId)&&
     typeof x.durationMinutes==="number"&&x.durationMinutes>0));
   setStatus("ready");
  }catch{setStatus("error");}
 },[booking,scope,router]);
 useEffect(()=>{void refresh();},[refresh]);

 useEffect(()=>{
  const query=customerQuery.trim();
  if(status!=="ready"||query.length===0){setCustomers([]);return;}
  let cancelled=false;
  const timeout=setTimeout(async()=>{
   try{
    const r=await fetch(scope+"/customers?q="+encodeURIComponent(query),
      {credentials:"same-origin",cache:"no-store"});
    if(cancelled)return;
    if(r.status===401){router.replace("/sign-in");return;}
    if(!r.ok){setCustomers([]);return;}
    const data=await r.json() as {customers?:Customer[];searchScope?:string};
    setCustomers(Array.isArray(data.customers)&&data.searchScope==="BUSINESS"?
      data.customers.filter(c=>c.isActive&&GUID.test(c.customerId)).slice(0,20):[]);
   }catch{if(!cancelled)setCustomers([]);}
  },250);
  return ()=>{cancelled=true;clearTimeout(timeout);};
 },[status,customerQuery,scope,router]);

 const loadSlots=useCallback(async()=>{
  if(!GUID.test(resourceId)||!GUID.test(offeringId)||!/^\d{4}-\d{2}-\d{2}$/.test(dayUtc)){
   setSlots([]);setSlotStatus("idle");return;
  }
  setSlotStatus("loading");setSlots([]);
  try{
   const query=new URLSearchParams({resourceId,offeringId,dayUtc});
   const r=await fetch(booking+"/website-preview/slots?"+query.toString(),{
    credentials:"same-origin",cache:"no-store",
   });
   if(r.status===401){router.replace("/sign-in");return;}
   if(!r.ok){setSlotStatus("error");return;}
   const parsed=parseWebsiteSlots(await r.json(),resourceId,offeringId,dayUtc);
   if(!parsed){setSlotStatus("error");return;}
   setSlots(parsed.slots);setSlotStatus("ready");
  }catch{setSlotStatus("error");}
 },[resourceId,offeringId,dayUtc,booking,router]);
 useEffect(()=>{void loadSlots();},[loadSlots]);

 async function reserve(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy||status!=="ready"||slotStatus!=="ready"||!selected||
    !GUID.test(customerId)||!GUID.test(resourceId)||!GUID.test(offeringId))return;
  setBusy(true);setNotice("");
  if(!requestKey.current)requestKey.current=crypto.randomUUID();
  try{
   const r=await fetch(booking+"/appointments",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":requestKey.current},
    body:JSON.stringify({customerId,offeringId,resourceId,startsAtUtc:selectedStart}),
   });
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setNotice("الصلاحيات اتغيرت؛ راجع حسابك.");return;}
   if(r.status===409||r.status===400){
    requestKey.current=null;setSelectedStart("");
    setNotice("الوقت اتغير أو الحجز اتعارض؛ اختار وقت متاح بعد التحديث.");
    await loadSlots();return;
   }
   if(!r.ok){setNotice("نتيجة الحجز غير مؤكدة؛ أعد المحاولة بنفس البيانات لتجنب التكرار.");return;}
   const response=await r.json() as {id?:string;created?:boolean};
   if(!response.id||!GUID.test(response.id)||typeof response.created!=="boolean"){
    setNotice("استجابة غير صالحة؛ راجع الحجوزات قبل المحاولة.");return;
   }
   requestKey.current=null;setSelectedStart("");
   setNotice(response.created?"اتسجل الحجز فعلًا في Booking Core (بدون بيع أو دفع).":
     "الطلب اتسجل قبل كده؛ لم يتكرر الحجز.");
   await loadSlots();
  }catch{
   setNotice("اتصال غير متاح؛ أعد المحاولة بنفس البيانات للتأكد من عدم تكرار الحجز.");
  }finally{setBusy(false);}
 }
 const clearChoice=()=>{setSelectedStart("");requestKey.current=null;setNotice("");};
 return <main className="k5-salon-page shell" dir="rtl" data-drvo-ui="light-v1"
   data-website-booking-preview="private-k5-nonpublic">
  <header className="k5-admin-summary">
   <div><h1>حجز الموقع — تجربة خاصة مرتبطة بقاعدة البيانات</h1>
    <p className="k5-muted">ده مسار تجربة للـOwner مش رابط عام للعميل. الفرع والصلاحيات من الجلسة؛
      اختيار الوقت استرشادي وSQL بيحسم الحجز وقت التأكيد.</p></div>
   <Link href={home+"/booking"}>إدارة الحجوزات</Link>
  </header>
  {status==="loading"?<p role="status">جاري الاتصال بالـBooking والـCatalog والـCustomers…</p>:
   status!=="ready"?<p role="alert" className="k5-error">غير متاح بالصلاحيات الحالية أو الخدمة غير مفعلة.</p>:
  <section className="k5-admin-card">
   <h2>1. اختر الخدمة والمورد واليوم (UTC)</h2>
   <p className="k5-muted">لحد اعتماد Business timezone، اليوم المدخل UTC؛ المواعيد المعروضة بتوقيت جهازك.
     مفيش جدول أسبوعي أو Plan/Hold أو إشعارات لسه.</p>
   <div className="catalog-form">
    <label>الخدمة<select value={offeringId} disabled={busy} onChange={e=>{setOfferingId(e.target.value);clearChoice();}}>
     <option value="">اختر خدمة</option>
     {services.map(s=><option key={s.offeringId} value={s.offeringId}>
       {s.displayName} · {s.durationMinutes} دقيقة</option>)}
    </select></label>
    <label>المورد<select value={resourceId} disabled={busy} onChange={e=>{setResourceId(e.target.value);clearChoice();}}>
     <option value="">اختر المورد</option>
     {resources.map(r=><option key={r.resourceId} value={r.resourceId}>{r.displayName}</option>)}
    </select></label>
    <label>اليوم بالتوقيت العالمي UTC
     <input type="date" value={dayUtc} disabled={busy}
      onChange={e=>{setDayUtc(e.target.value);clearChoice();}}/>
    </label>
   </div>
   <h2>2. اختر ميعاد من فترات OPEN المنشورة</h2>
   {slotStatus==="idle"?<p className="k5-muted">حدد الخدمة والمورد واليوم.</p>:
    slotStatus==="loading"?<p role="status">جاري قراءة التوافر من SQL…</p>:
    slotStatus==="error"?<p role="alert">تعذر قراءة التوافر المصرح به.</p>:
    slots.length===0?<p className="k5-muted">مفيش مواعيد متاحة ضمن الفترات المنشورة.</p>:
    <div className="k5-salon-steps" aria-label="أوقات مرشحة من SQL">
     {slots.map(s=><button key={s.startsAtUtc} type="button" disabled={busy}
      className={s.startsAtUtc===selectedStart?"k5-save":"k5-salon-refresh"}
      onClick={()=>{setSelectedStart(s.startsAtUtc);requestKey.current=null;setNotice("");}}>
      {new Date(s.startsAtUtc).toLocaleString("ar-EG",{hour:"2-digit",minute:"2-digit"})}
     </button>)}
    </div>}
   <p className="k5-muted">الأوقات من SQL043 بدون حدّ آخر 200 حجز، لكن العرض لأول 24 فقط.
     حتى لو الموعد ظاهر ممكن حد يسبقه؛ SQL013 بيعيد التحقق وقت الحفظ.</p>
   <h2>3. عميل موجود أو تسجيل عميل جديد (Operator-only)</h2>
   <label>بحث آمن في عملاء الـBusiness
    <input type="search" maxLength={80} value={customerQuery} disabled={busy}
     onChange={e=>{setCustomerQuery(e.target.value);setCustomerId("");setSelectedCustomer(null);requestKey.current=null;}}
     placeholder="اسم العميل أو الموبايل"/>
   </label>
   {selectedCustomer&&<p className="k5-notice">العميل: {selectedCustomer.displayName}</p>}
   <div className="k5-booking-actions">
    {customers.map(c=><button key={c.customerId} type="button" disabled={busy}
     onClick={()=>{setCustomerId(c.customerId);setSelectedCustomer(c);setCustomers([]);
      setCustomerQuery("");requestKey.current=null;}}>{c.displayName}</button>)}
   </div>
   <BookingQuickCustomer apiRoot={scope} disabled={busy}
    onSelected={c=>{setCustomerId(c.customerId);setSelectedCustomer(c);
      setCustomerQuery("");setCustomers([]);requestKey.current=null;}}/>
   <form onSubmit={reserve}>
    <p className="k5-muted">{selectedStart?
     "الموعد المختار: "+new Date(selectedStart).toLocaleString("ar-EG"):
     "اختار موعدًا من الأوقات أعلاه."}</p>
    <button type="submit" className="k5-save"
     disabled={busy||!selected||!GUID.test(customerId)||slotStatus!=="ready"}>
     تأكيد الحجز في Booking Core
    </button>
   </form>
   {notice&&<p className="k5-notice" role="status">{notice}</p>}
  </section>}
 </main>;
}
