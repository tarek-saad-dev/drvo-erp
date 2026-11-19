"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Ticket={
 ticketId:string;ticketCode:string;customerId:string|null;resourceId:string|null;
 offeringId:string|null;bookingId:string|null;customerName:string;resourceName:string;
 offeringName:string;durationMinutes:number;expectedStartAtUtc:string;expectedEndAtUtc:string;
 status:"WAITING"|"CALLED"|"IN_SERVICE"|"DONE"|"CANCELLED"|"NO_SHOW";
 source:"WALK_IN"|"BOOKING_HANDOFF";createdAtUtc:string;
};
type QueueRead={
 state:"NONPOSTING_QUEUE_TICKETS_ONLY";tickets:Ticket[];limit:200;mayBeTruncated:boolean;
 treasuryState:"NOT_PAID";accountingState:"NOT_POSTED";
};
type Resource={resourceId:string;displayName:string;kind:string;isActive:boolean};
type Customer={customerId:string;displayName:string;phoneE164?:string|null;isActive:boolean};
type Offering={offeringId:string;displayName:string;kind:string;durationMinutes:number|null;isActive:boolean};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE=new Set(["WAITING","CALLED","IN_SERVICE"]);
const label:Record<Ticket["status"],string>={
 WAITING:"انتظار",CALLED:"تم النداء",IN_SERVICE:"قيد الخدمة",
 DONE:"منتهي",CANCELLED:"ملغي",NO_SHOW:"لم يحضر",
};
function when(value:string){
 const d=new Date(value);
 return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("ar-EG",{
  dateStyle:"short",timeStyle:"short",timeZone:"Africa/Cairo",
 }).format(d);
}
export default function QueueClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId);
 const [status,setStatus]=useState<"loading"|"ready"|"denied"|"unavailable"|"prerequisites">("loading");
 const [data,setData]=useState<QueueRead|null>(null);
 const [resources,setResources]=useState<Resource[]>([]);
 const [services,setServices]=useState<Offering[]>([]);
 const [customerResults,setCustomerResults]=useState<Customer[]>([]);
 const [customerQuery,setCustomerQuery]=useState("");
 const [customerId,setCustomerId]=useState<string|null>(null);
 const [resourceId,setResourceId]=useState("");
 const [offeringId,setOfferingId]=useState<string|null>(null);
 const [durationMinutes,setDurationMinutes]=useState(30);
 const [localStart,setLocalStart]=useState("");
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const createKey=useRef<string|null>(null);
 const statusKeys=useRef<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
  try{
   const [queue,booking,catalog]=await Promise.all([
    fetch(api+"/queue",{credentials:"same-origin",cache:"no-store"}),
    fetch(api+"/booking",{credentials:"same-origin",cache:"no-store"}),
    fetch(api+"/catalog",{credentials:"same-origin",cache:"no-store"}),
   ]);
   if([queue,booking,catalog].some(r=>r.status===401)){router.replace("/sign-in");return;}
   if(queue.status===403||queue.status===404){setStatus("denied");return;}
   if(!queue.ok){setStatus("unavailable");return;}
   if(!booking.ok||!catalog.ok){setStatus("prerequisites");return;}
   const board=await queue.json() as QueueRead;
   const book=await booking.json() as {resources?:Resource[]};
   const cat=await catalog.json() as {offerings?:Offering[]};
   if(board.state!=="NONPOSTING_QUEUE_TICKETS_ONLY"||board.treasuryState!=="NOT_PAID"||
    board.accountingState!=="NOT_POSTED"||board.limit!==200||
    !Array.isArray(board.tickets)||!Array.isArray(book.resources)||!Array.isArray(cat.offerings)){
    setStatus("unavailable");return;
   }
   const activeResources=book.resources.filter(r=>r.isActive);
   const activeServices=cat.offerings.filter(s=>s.isActive&&s.kind==="SERVICE"&&
    typeof s.durationMinutes==="number"&&s.durationMinutes>0);
   setData(board);setResources(activeResources);setServices(activeServices);
   setResourceId(id=>activeResources.some(r=>r.resourceId===id)?id:(activeResources[0]?.resourceId??""));
   setStatus("ready");
  }catch{setStatus("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
  const q=customerQuery.trim();
  if(q.length<1){setCustomerResults([]);return;}
  let cancelled=false;
  const timer=setTimeout(async()=>{
   try{
    const r=await fetch(api+"/customers?q="+encodeURIComponent(q),
     {credentials:"same-origin",cache:"no-store"});
    if(cancelled)return;
    if(r.status===401){router.replace("/sign-in");return;}
    if(!r.ok){setCustomerResults([]);return;}
    const body=await r.json() as {customers?:Customer[]};
    setCustomerResults(Array.isArray(body.customers)?body.customers.filter(c=>c.isActive!==false):[]);
   }catch{if(!cancelled)setCustomerResults([]);}
  },250);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[customerQuery,api,router]);
 const live=useMemo(()=>data?.tickets.filter(t=>ACTIVE.has(t.status))??[],[data]);
 async function createWalkIn(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const start=new Date(localStart);
  if(!GUID.test(resourceId)||!localStart||!Number.isFinite(start.getTime())||
   start.getSeconds()!==0||durationMinutes<5||durationMinutes>480){
   setError(true);setNotice("راجع المورد والمدة ووقت البداية (دقيقة كاملة).");return;
  }
  setBusy("create");setNotice("");setError(false);
  if(!createKey.current)createKey.current=crypto.randomUUID();
  try{
   const resp=await fetch(api+"/queue/tickets",{method:"POST",
    credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":createKey.current},
    body:JSON.stringify({customerId,resourceId,offeringId,durationMinutes,
     expectedStartAtUtc:start.toISOString()})});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){setError(true);setNotice("الطابور غير متاح لحسابك.");return;}
   if(resp.status===409){createKey.current=null;setError(true);
    setNotice("تعارض في المورد أو الطلب. حدّث القائمة واختر وقتًا آخر.");return;}
   if(!resp.ok){setError(true);setNotice("تعذر إنشاء التذكرة. أعد المحاولة بنفس البيانات.");return;}
   createKey.current=null;setLocalStart("");setCustomerId(null);setCustomerQuery("");
   await load();setNotice("تذكرة طابور اتحفظت. لا بيع ولا تحصيل (ADR-031 خارج النطاق).");
  }catch{setError(true);setNotice("تعذر الاتصال. أعد المحاولة بنفس الطلب.");}
  finally{setBusy("");}
 }
 async function transition(ticketId:string,next:Ticket["status"]){
  if(busy||!GUID.test(ticketId))return;
  const key=ticketId+":"+next;
  if(!statusKeys.current[key])statusKeys.current[key]=crypto.randomUUID();
  setBusy(key);setNotice("");setError(false);
  try{
   const resp=await fetch(api+"/queue/tickets/"+encodeURIComponent(ticketId)+"/status",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":statusKeys.current[key]},
    body:JSON.stringify({status:next}),
   });
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){setError(true);setNotice("تحديث الطابور غير مصرح.");return;}
   if(resp.status===409){delete statusKeys.current[key];setError(true);
    setNotice("التذكرة نهائية أو الانتقال غير صالح. حدّث القائمة.");await load();return;}
   if(!resp.ok){setError(true);setNotice("تعذر تحديث التذكرة. أعد بنفس الطلب.");return;}
   delete statusKeys.current[key];await load();
   setNotice("تم تحديث حالة الطابور بدون أي أثر مالي.");
  }catch{setError(true);setNotice("تعذر الاتصال. أعد بنفس الطلب.");}
  finally{setBusy("");}
 }
 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions">
    <Link href={home}>مساحة الفرع</Link>
    <Link href={home+"/booking"}>الحجوزات</Link>
   </nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">SALON QUEUE</span>
   <h1>طابور الفرع</h1>
   <p className="k5-muted">تذاكر انتظار وWalk-in مرتبطة بمورد الحجز. مفيش بيع أو قيد مالي من الشاشة دي.</p>
  </div></div>
  {status==="loading"&&<p role="status" className="k5-table-state">جاري تحميل الطابور…</p>}
  {status==="denied"&&<p role="alert" className="k5-error">الطابور مش متاح لحسابك أو الفرع ده.</p>}
  {status==="unavailable"&&<p role="alert" className="k5-error">تعذر تحميل الطابور.</p>}
  {status==="prerequisites"&&<p role="alert" className="k5-error">
   لازم صلاحية قراءة Booking وCatalog قبل إدارة الطابور.
  </p>}
  {status==="ready"&&data&&<>
   <p role="status" className={error?"k5-error":"k5-notice"}>{notice||
    "حالة مالية: NOT_PAID / NOT_POSTED — ADR-031 OUT OF SCOPE."}</p>
   <section className="k5-admin-card drvo-queue-live" aria-label="التذاكر النشطة">
    <div className="k5-admin-summary"><h2>اللوحة الحية</h2>
     <span className="k5-count">{live.length} نشطة / {data.tickets.length} معروضة</span></div>
    <ul className="drvo-queue-columns">
     {live.length===0?<li className="k5-muted">مفيش تذاكر نشطة حاليًا.</li>:
      live.map(t=><li key={t.ticketId}>
       <strong>{t.ticketCode}</strong>
       <span>{t.customerName||"بدون عميل"} · {t.resourceName||"—"}</span>
       <span className="k5-muted">{label[t.status]} · {when(t.expectedStartAtUtc)} · {t.durationMinutes}د</span>
       <div className="k5-booking-actions">
        {t.status==="WAITING"&&<>
         <button type="button" className="k5-salon-refresh" disabled={!!busy}
          onClick={()=>void transition(t.ticketId,"CALLED")}>نداء</button>
         <button type="button" className="k5-salon-refresh" disabled={!!busy}
          onClick={()=>void transition(t.ticketId,"IN_SERVICE")}>بدء الخدمة</button>
        </>}
        {t.status==="CALLED"&&<button type="button" className="k5-salon-refresh" disabled={!!busy}
         onClick={()=>void transition(t.ticketId,"IN_SERVICE")}>بدء الخدمة</button>}
        {t.status==="IN_SERVICE"&&<button type="button" className="k5-save" disabled={!!busy}
         onClick={()=>void transition(t.ticketId,"DONE")}>إنهاء</button>}
        {ACTIVE.has(t.status)&&<>
         <button type="button" disabled={!!busy}
          onClick={()=>void transition(t.ticketId,"CANCELLED")}>إلغاء</button>
         <button type="button" disabled={!!busy}
          onClick={()=>void transition(t.ticketId,"NO_SHOW")}>لم يحضر</button>
        </>}
       </div>
      </li>)}
    </ul>
   </section>
   <section className="k5-admin-card k5-invite-card" aria-label="إنشاء تذكرة walk-in">
    <h2>تذكرة Walk-in</h2>
    <p className="k5-muted">إنشاء تذكرة على مورد حجز مع مدة متوقعة. الصوت/الطباعة والـsettle-expired لسه OPEN.</p>
    <form className="catalog-form" onSubmit={createWalkIn}>
     <label>بحث عميل (اختياري)
      <input type="search" maxLength={80} value={customerQuery}
       onChange={e=>{setCustomerQuery(e.target.value);setCustomerId(null);createKey.current=null;}}/>
     </label>
     <div className="k5-booking-actions">
      {customerResults.map(c=><button key={c.customerId} type="button"
       className={customerId===c.customerId?"k5-save":"k5-salon-refresh"}
       onClick={()=>{setCustomerId(c.customerId);createKey.current=null;}}>
       {c.displayName}
      </button>)}
      {customerId&&<button type="button" className="k5-salon-refresh"
       onClick={()=>{setCustomerId(null);createKey.current=null;}}>بدون عميل</button>}
     </div>
     <label>المورد<select required value={resourceId}
      onChange={e=>{setResourceId(e.target.value);createKey.current=null;}}>
      {resources.map(r=><option key={r.resourceId} value={r.resourceId}>{r.displayName}</option>)}
     </select></label>
     <label>الخدمة (اختياري)<select value={offeringId??""}
      onChange={e=>{
       const id=e.target.value||null;setOfferingId(id);createKey.current=null;
       const svc=services.find(s=>s.offeringId===id);
       if(svc?.durationMinutes)setDurationMinutes(svc.durationMinutes);
      }}>
      <option value="">بدون خدمة</option>
      {services.map(s=><option key={s.offeringId} value={s.offeringId}>
       {s.displayName} ({s.durationMinutes}د)
      </option>)}
     </select></label>
     <label>المدة بالدقائق<input type="number" min={5} max={480} required value={durationMinutes}
      onChange={e=>{setDurationMinutes(Number(e.target.value)||30);createKey.current=null;}}/></label>
     <label>البداية المحلية<input type="datetime-local" step={60} required value={localStart}
      onChange={e=>{setLocalStart(e.target.value);createKey.current=null;}}/></label>
     <button className="k5-save" disabled={!!busy||!resources.length}>إنشاء تذكرة</button>
    </form>
   </section>
   <section className="k5-admin-card">
    <div className="k5-admin-summary"><h2>آخر التذاكر</h2>
     <button type="button" className="k5-salon-refresh" disabled={!!busy}
      onClick={()=>{void load();}}>تحديث ↻</button></div>
    <div className="k5-table-wrap"><table className="k5-table">
     <thead><tr><th>الكود</th><th>العميل</th><th>المورد</th><th>البداية</th><th>الحالة</th><th>المصدر</th></tr></thead>
     <tbody>{data.tickets.length===0?
      <tr><td colSpan={6} className="k5-empty">لا توجد تذاكر.</td></tr>:
      data.tickets.map(t=><tr key={t.ticketId}>
       <td dir="ltr">{t.ticketCode}</td>
       <td>{t.customerName||"—"}</td>
       <td>{t.resourceName||"—"}</td>
       <td dir="ltr">{when(t.expectedStartAtUtc)}</td>
       <td>{label[t.status]}</td>
       <td>{t.source==="BOOKING_HANDOFF"?"من حجز":"Walk-in"}</td>
      </tr>)}</tbody>
    </table></div>
   </section>
  </>}
 </main>;
}
