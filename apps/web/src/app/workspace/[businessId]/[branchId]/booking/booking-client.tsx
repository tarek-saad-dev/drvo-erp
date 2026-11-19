"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {suggestBookingStarts} from "./booking-availability-preview.mjs";
import {toLocalMinute,windowCorrectionStage} from "./window-correction.mjs";
import {useRouter} from "next/navigation";

type Resource={resourceId:string;displayName:string;kind:"PERSON"|"CHAIR"|"ROOM"|"EQUIPMENT";isActive:boolean};
type Appointment={
  bookingId:string;customerId:string;offeringId:string;resourceId:string;
  customerName:string;offeringName:string;resourceName:string;
  startsAtUtc:string;endsAtUtc:string;status:"BOOKED"|"CANCELLED"|"COMPLETED";
};
type BookingRead={resources:Resource[];appointments:Appointment[]};
type BookingWindow={windowId:string;resourceId:string;startsAtUtc:string;endsAtUtc:string;state:"OPEN"|"CLOSED"};
type Customer={customerId:string;displayName:string;phoneE164?:string|null;isActive:boolean};
type Offering={offeringId:string;displayName:string;kind:string;durationMinutes:number|null;isActive:boolean};
const GUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Status="loading"|"ready"|"denied"|"unavailable"|"prerequisites";

export default function BookingClient({businessId,branchId,posWebEnabled,draftsWebEnabled,queueWebEnabled}:{
  businessId:string;branchId:string;posWebEnabled:boolean;draftsWebEnabled:boolean;queueWebEnabled:boolean;
}){
  const router=useRouter();
  const [status,setStatus]=useState<Status>("loading");
  const [data,setData]=useState<BookingRead>({resources:[],appointments:[]});
  const [windows,setWindows]=useState<BookingWindow[]>([]);
  const [windowResourceId,setWindowResourceId]=useState("");
  const [windowLocalStart,setWindowLocalStart]=useState("");
  const [windowLocalEnd,setWindowLocalEnd]=useState("");
  const [replacementWindowId,setReplacementWindowId]=useState<string|null>(null);
  const [customerResults,setCustomerResults]=useState<Customer[]>([]);
  const [customerQuery,setCustomerQuery]=useState("");
  const [customerSearching,setCustomerSearching]=useState(false);
  const [customersReady,setCustomersReady]=useState(false);
  const [services,setServices]=useState<Offering[]>([]);
  const [canOpenPos,setCanOpenPos]=useState(false);
  const [canPrepareDraft,setCanPrepareDraft]=useState(false);
  const [canQueueHandoff,setCanQueueHandoff]=useState(false);
  const [calendarDay,setCalendarDay]=useState(()=>new Date().toISOString().slice(0,10));
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const handoffKeys=useRef<Map<string,string>>(new Map());
  const [resourceName,setResourceName]=useState("");
  const [resourceKind,setResourceKind]=useState<Resource["kind"]>("PERSON");
  const [customerId,setCustomerId]=useState("");
  const [selectedCustomer,setSelectedCustomer]=useState<Customer|null>(null);
  const [offeringId,setOfferingId]=useState("");
  const [resourceId,setResourceId]=useState("");
  const [localStart,setLocalStart]=useState("");
  const [slotDay,setSlotDay]=useState("");
  const resourceRequest=useRef<string|null>(null);
  const bookingRequest=useRef<string|null>(null);
  const windowRequest=useRef<string|null>(null);
  const closeWindowKeys=useRef<Map<string,string>>(new Map());
  const statusKeys=useRef<Map<string,string>>(new Map());
  const scope="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+encodeURIComponent(branchId);
  const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
  const correctionStage=windowCorrectionStage(replacementWindowId,windowResourceId,windows);
  const slotPreview=useMemo(()=>suggestBookingStarts({
    resourceId,dayLocal:slotDay,
    durationMinutes:services.find(s=>s.offeringId===offeringId)?.durationMinutes,
    windows,appointments:data.appointments,
  }),[resourceId,slotDay,offeringId,services,windows,data.appointments]);

  const load=useCallback(async()=>{
    if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
    try{
      // Booking may present Customer/Service labels only if independently
      // permitted to read those owning Modules; never bypass their scopes.
      const [booking,customerProbe,category,windowResult]=await Promise.all([
        fetch(scope+"/booking",{credentials:"same-origin",cache:"no-store"}),
        // Prerequisites prove customers.read via browse list; Business ?q= search
        // is a separate SQL024 capability used only after the operator types.
        fetch(scope+"/customers",{credentials:"same-origin",cache:"no-store"}),
        fetch(scope+"/catalog",{credentials:"same-origin",cache:"no-store"}),
        fetch(scope+"/booking/windows",{credentials:"same-origin",cache:"no-store"}),
      ]);
      if([booking,customerProbe,category,windowResult].some(r=>r.status===401)){router.replace("/sign-in");return;}
      if(booking.status===403||booking.status===404){setStatus("denied");return;}
      if(!booking.ok){setStatus("unavailable");return;}
      if(!customerProbe.ok||!category.ok){setStatus("prerequisites");return;}
      if(!windowResult.ok){setStatus("unavailable");return;}
      const [book,cat,availability]=await Promise.all([
        booking.json() as Promise<BookingRead>,
        category.json() as Promise<{offerings:Offering[]}>,
        windowResult.json() as Promise<{windows:BookingWindow[]}>,
      ]);
      if(!Array.isArray(book.resources)||!Array.isArray(book.appointments)||
          !Array.isArray(cat.offerings)||
          !Array.isArray(availability.windows)){
        setStatus("unavailable");return;
      }
      setData(book);
      setWindows(availability.windows);
      setCustomersReady(true);
      setServices(cat.offerings.filter(s=>s.isActive&&s.kind==="SERVICE"&&
        typeof s.durationMinutes==="number"&&s.durationMinutes>0));
      // Booking Core is ready once its own reads succeed. POS/Queue probes are
      // independently authorized owners — never block resource/appointment UI.
      setCanOpenPos(false);
      setCanPrepareDraft(false);
      setCanQueueHandoff(false);
      setStatus("ready");
      if(posWebEnabled){
        const preview=await fetch(scope+"/pos-preview",{
          credentials:"same-origin",cache:"no-store",
        });
        if(preview.status===401){router.replace("/sign-in");return;}
        setCanOpenPos(preview.ok);
        if(preview.ok&&draftsWebEnabled){
          const drafts=await fetch(scope+"/pos-drafts",{
            credentials:"same-origin",cache:"no-store",
          });
          if(drafts.status===401){router.replace("/sign-in");return;}
          setCanPrepareDraft(drafts.ok);
        }
      }
      if(queueWebEnabled){
        const queue=await fetch(scope+"/queue",{credentials:"same-origin",cache:"no-store"});
        if(queue.status===401){router.replace("/sign-in");return;}
        setCanQueueHandoff(queue.ok);
      }
    }catch{setStatus("unavailable");}
  },[businessId,branchId,scope,router,posWebEnabled,draftsWebEnabled,queueWebEnabled]);
  useEffect(()=>{void load();},[load]);
  const calendarBoard=useMemo(()=>{
    const day=calendarDay;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return [] as Array<{resourceId:string;resourceName:string;items:Appointment[]}>;
    const byResource=new Map<string,{resourceId:string;resourceName:string;items:Appointment[]}>();
    for(const r of data.resources.filter(x=>x.isActive)){
      byResource.set(r.resourceId,{resourceId:r.resourceId,resourceName:r.displayName,items:[]});
    }
    for(const a of data.appointments){
      const local=toLocalMinute(a.startsAtUtc);
      if(!local.startsWith(day)||a.status==="CANCELLED")continue;
      const bucket=byResource.get(a.resourceId)??{
        resourceId:a.resourceId,resourceName:a.resourceName,items:[],
      };
      bucket.items.push(a);
      byResource.set(a.resourceId,bucket);
    }
    return [...byResource.values()].map(col=>({
      ...col,items:[...col.items].sort((a,b)=>a.startsAtUtc.localeCompare(b.startsAtUtc)),
    }));
  },[calendarDay,data.appointments,data.resources]);

  useEffect(()=>{
    const q=customerQuery.trim();
    if(!customersReady||q.length<1){
      setCustomerResults([]);setCustomerSearching(false);return;
    }
    let cancelled=false;
    const timer=setTimeout(async()=>{
      setCustomerSearching(true);
      try{
        const r=await fetch(scope+"/customers?q="+encodeURIComponent(q),
          {credentials:"same-origin",cache:"no-store"});
        if(cancelled)return;
        if(r.status===401){router.replace("/sign-in");return;}
        if(!r.ok){setCustomerResults([]);return;}
        const data=await r.json() as {customers?:Customer[];searchScope?:string};
        if(!Array.isArray(data.customers)||data.searchScope!=="BUSINESS"){
          setCustomerResults([]);return;
        }
        setCustomerResults(data.customers.filter(c=>c.isActive!==false));
      }catch{if(!cancelled)setCustomerResults([]);}
      finally{if(!cancelled)setCustomerSearching(false);}
    },250);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[customerQuery,customersReady,scope,router]);

  async function submit(path:string,body:unknown,id:React.MutableRefObject<string|null>){
    if(busy)return false;
    setBusy(true);setNotice("");
    if(!id.current)id.current=crypto.randomUUID();
    try{
      const response=await fetch(scope+"/booking"+path,{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json","Idempotency-Key":id.current},
        body:JSON.stringify(body),
      });
      if(response.status===401){router.replace("/sign-in");return false;}
      if(response.status===403||response.status===404){setStatus("denied");return false;}
      if(response.status===409){
        // Conflict may be same-slot competition or stale idempotency payload.
        id.current=null;setNotice("المورد مشغول في الميعاد ده، أو طلب قديم اختلف. اختار وقت تاني وراجع البيانات.");
        await load();return false;
      }
      if(response.status===400){
        id.current=null;setNotice("بيانات الحجز أو أحد المراجع مش صحيحة. راجع العميل والخدمة والموعد.");
        return false;
      }
      if(!response.ok){setNotice("الحفظ غير متاح. أعد المحاولة بنفس البيانات لتجنب التكرار.");return false;}
      id.current=null;setNotice("تم تسجيل البيانات بنجاح.");await load();return true;
    }catch{
      setNotice("تعذر الاتصال؛ أعد المحاولة بنفس البيانات لتجنب تكرار العملية.");return false;
    }finally{setBusy(false);}
  }
  async function addResource(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const created=await submit("/resources",{displayName:resourceName,kind:resourceKind},resourceRequest);
    if(created)setResourceName("");
  }
  function prepareWindowCorrection(w:BookingWindow){
    if(busy||w.state!=="OPEN"||!GUID.test(w.windowId)||!GUID.test(w.resourceId))return;
    // The correction is deliberately NOT an atomic close+replace operation.
    setReplacementWindowId(w.windowId);
    setWindowResourceId(w.resourceId);
    setWindowLocalStart(toLocalMinute(w.startsAtUtc));
    setWindowLocalEnd(toLocalMinute(w.endsAtUtc));
    windowRequest.current=null;
    setNotice("تعديل الفترة خطوتين: اقفل القديمة أولًا بعد مراجعة الحجوزات، ثم انشر البديل.");
  }
  function cancelWindowCorrection(){
    setReplacementWindowId(null);
    setWindowResourceId("");
    setWindowLocalStart("");
    setWindowLocalEnd("");
    windowRequest.current=null;
    setNotice("");
  }
  async function addAvailability(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(correctionStage!=="NO_CORRECTION"&&correctionStage!=="READY_TO_PUBLISH"){
      setNotice("أولًا اقفل الفترة القديمة بنجاح، أو حدّث البيانات لو الفترة مش ظاهرة.");
      return;
    }
    if(!GUID.test(windowResourceId)||!windowLocalStart||!windowLocalEnd){
      setNotice("اختار مورد وبداية ونهاية نافذة التوافر.");return;
    }
    const start=new Date(windowLocalStart),end=new Date(windowLocalEnd);
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||
       start.getSeconds()!==0||end.getSeconds()!==0||
       start.getTime()<Date.now()+5*60000||end<=start||
       end.getTime()-start.getTime()>86400000){
      setNotice("لازم تحدد نافذة مستقبلية من دقيقة إلى 24 ساعة.");return;
    }
    const saved=await submit("/windows",{
      resourceId:windowResourceId,
      startsAtUtc:start.toISOString(),endsAtUtc:end.toISOString(),
    },windowRequest);
    if(saved){setWindowLocalStart("");setWindowLocalEnd("");setReplacementWindowId(null);}
  }
  async function closeAvailability(windowId:string){
    if(busy||!GUID.test(windowId))return;
    const existing=windows.find(w=>w.windowId===windowId);
    if(!existing||existing.state!=="OPEN")return;
    // A failed network attempt retains the request UUID for safe replay.
    if(!closeWindowKeys.current.has(windowId))
      closeWindowKeys.current.set(windowId,crypto.randomUUID());
    setBusy(true);setNotice("");
    try{
      const response=await fetch(scope+"/booking/windows/"+
        encodeURIComponent(windowId)+"/close",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json",
          "Idempotency-Key":closeWindowKeys.current.get(windowId)!},
        body:JSON.stringify({}),
      });
      if(response.status===401){router.replace("/sign-in");return;}
      if(response.status===403||response.status===404){setStatus("denied");return;}
      if(response.status===409){
        closeWindowKeys.current.delete(windowId);
        setNotice("مينفعش تقفل الفترة دي وفيها حجز مؤكد لسه قائم، أو هي اتقفلت بالفعل.");
        await load();return;
      }
      if(response.status===400){closeWindowKeys.current.delete(windowId);
        setNotice("طلب إغلاق الفترة غير صحيح.");return;}
      if(!response.ok){setNotice("تعذر حفظ الإغلاق. أعد المحاولة بدون تغيير الطلب.");return;}
      const result=await response.json() as {id:string;state:string};
      if(result.id.toLowerCase()!==windowId.toLowerCase()||result.state!=="CLOSED"){
        setNotice("استجابة الإغلاق غير صالحة.");return;
      }
      closeWindowKeys.current.delete(windowId);
      setNotice("الفترة اتقفلت، والمورد لسه مقيد بفترات التوافر المنشورة فقط.");
      await load();
    }catch{setNotice("تعذر الاتصال. أعد المحاولة بنفس الطلب.");}
    finally{setBusy(false);}
  }
  async function addBooking(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!GUID.test(customerId)||!GUID.test(offeringId)||!GUID.test(resourceId)){
      setNotice("اختار عميل وخدمة ومورد حجز.");return;
    }
    // datetime-local means device local time; normalize to an exact UTC minute.
    const date=new Date(localStart);
    if(!localStart||!Number.isFinite(date.getTime())||date.getSeconds()!==0||
        date.getMilliseconds()!==0||date.getTime()<Date.now()+5*60*1000){
      setNotice("حدد موعد صالح في المستقبل بفاصل 5 دقايق على الأقل.");return;
    }
    const created=await submit("/appointments",{
      customerId,offeringId,resourceId,startsAtUtc:date.toISOString(),
    },bookingRequest);
    if(created)setLocalStart("");
  }
  async function changeStatus(bookingId:string,next:"CANCELLED"|"COMPLETED"){
    if(busy||!GUID.test(bookingId))return;
    setBusy(true);setNotice("");
    const retryId=bookingId+":"+next;
    if(!statusKeys.current.has(retryId))statusKeys.current.set(retryId,crypto.randomUUID());
    try{
      const response=await fetch(scope+"/booking/appointments/"+encodeURIComponent(bookingId)+"/status",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json",
          "Idempotency-Key":statusKeys.current.get(retryId)!},
        body:JSON.stringify({status:next}),
      });
      if(response.status===401){router.replace("/sign-in");return;}
      if(response.status===403||response.status===404){setStatus("denied");return;}
      if(response.status===409){statusKeys.current.delete(retryId);
        setNotice("الحجز اتغيّر بالفعل، أو لسه ما بدأش. راجع الحالة قبل المحاولة.");
        await load();return;
      }
      if(response.status===400){statusKeys.current.delete(retryId);
        setNotice("الحالة المطلوبة غير صالحة.");return;}
      if(!response.ok){setNotice("تعذر تحديث الحجز. أعد المحاولة بنفس الطلب.");return;}
      const result=await response.json() as {id:string;status:string};
      if(result.id.toLowerCase()!==bookingId.toLowerCase()||result.status!==next){
        setNotice("استجابة تحديث غير صحيحة.");return;
      }
      statusKeys.current.delete(retryId);
      setNotice(next==="CANCELLED"?"تم إلغاء الحجز وتحرير الموعد.":"تم إتمام الموعد. لا يوجد بيع أو تحصيل تلقائي.");
      await load();
    }catch{setNotice("تعذر الاتصال. أعد المحاولة بنفس الطلب لتفادي التكرار.");}
    finally{setBusy(false);}
  }
  async function handoffToQueue(bookingId:string){
    if(busy||!canQueueHandoff||!GUID.test(bookingId))return;
    if(!handoffKeys.current.has(bookingId))handoffKeys.current.set(bookingId,crypto.randomUUID());
    setBusy(true);setNotice("");
    try{
      const response=await fetch(scope+"/queue/from-booking",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json",
          "Idempotency-Key":handoffKeys.current.get(bookingId)!},
        body:JSON.stringify({bookingId}),
      });
      if(response.status===401){router.replace("/sign-in");return;}
      if(response.status===403||response.status===404){
        setNotice("تسليم الطابور غير مصرح أو الحجز غير متاح.");return;
      }
      if(response.status===409){handoffKeys.current.delete(bookingId);
        setNotice("الحجز اتسَلِّم للطابور قبل كده، أو فيه تعارض على المورد.");
        await load();return;}
      if(!response.ok){setNotice("تعذر تسليم الحجز للطابور. أعد بنفس الطلب.");return;}
      handoffKeys.current.delete(bookingId);
      setNotice("اتعمل تذكرة طابور من الحجز. مفيش بيع أو تحصيل (ADR-031 خارج النطاق).");
    }catch{setNotice("تعذر الاتصال أثناء تسليم الطابور.");}
    finally{setBusy(false);}
  }
  return <main className="k5-workspace">
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <nav className="k5-head-actions">
        <Link href={home}>مساحة الفرع</Link>
        {canQueueHandoff&&<Link href={home+"/queue"}>الطابور</Link>}
      </nav>
    </header>
    <div className="k5-page-title"><div>
      <span className="k5-eyebrow">SHARED BOOKING</span>
      <h1>المواعيد والحجوزات</h1>
      <p className="k5-muted">مواعيد الفرع حسب المورد، مع ربط العميل والخدمة بنفس الـBusiness. يمنع الحجز المتداخل.</p>
    </div></div>
    {status==="ready"&&<section className="k5-admin-card" aria-label="خطوات تشغيل الصالون التجريبي">
      <h2>تجربة الصالون خطوة بخطوة</h2>
      <p className="k5-muted">البيانات هنا بتتحفظ في قاعدة SQL الخاصة بالفرع المصرّح لك بيه.
      ده مسار خاص؛ مش الديمو العام، ومفيش فاتورة أو تحصيل.</p>
      <nav className="k5-salon-steps" aria-label="رحلة إدارة الصالون">
        <Link href={home+"/customers"}>١. إضافة عميل</Link>
        <Link href={home+"/catalog"}>٢. إضافة خدمة</Link>
        <a href="#new-appointment">٣. تسجيل موعد</a>
        {canOpenPos&&<Link href={home+"/pos-preview"}>٤. مسودة بيع (بدون دفع)</Link>}
      </nav>
    </section>}
    {status==="loading"&&<p role="status" className="k5-table-state">جاري التحقق وتحميل الحجوزات…</p>}
    {status==="denied"&&<p role="alert" className="k5-error">الحجوزات مش متاحة لحسابك أو الفرع ده.</p>}
    {status==="unavailable"&&<p role="alert" className="k5-error">تعذر تحميل الحجوزات. حاول مرة تانية.</p>}
    {status==="prerequisites"&&<p role="alert" className="k5-error">
      لازم يكون عندك صلاحية قراءة الـCatalog والعملاء قبل إدارة الحجز. مفيش صلاحيات بتتمنح تلقائيًا.
    </p>}
    {status==="ready"&&<>
      {notice&&<p role="status" className="k5-notice">{notice}</p>}
      <section className="k5-admin-card k5-invite-card">
        <h2>إضافة مورد حجز</h2>
        <p className="k5-muted">المورد ممكن يكون شخص أو كرسي أو غرفة أو جهاز. ده مش سجل HR للموظف.</p>
        <form className="catalog-form" onSubmit={addResource}>
          <label>اسم المورد<input required maxLength={100} value={resourceName}
            onChange={e=>{setResourceName(e.target.value);resourceRequest.current=null;}}/></label>
          <label>نوع المورد<select value={resourceKind} onChange={e=>{
            setResourceKind(e.target.value as Resource["kind"]);resourceRequest.current=null;
          }}>
            <option value="PERSON">شخص</option><option value="CHAIR">كرسي</option>
            <option value="ROOM">غرفة</option><option value="EQUIPMENT">جهاز</option>
          </select></label>
          <button className="k5-save" disabled={busy}>إضافة المورد</button>
        </form>
      </section>
      <section className="k5-admin-card k5-invite-card" id="window-correction" aria-label="توافر المورد بالتاريخ">
        <h2>ساعات العمل والتوافر لمورد حجز</h2>
        <p className="k5-muted">حدد فترة بتاريخ ووقت واضحين (حسب جهازك، والحفظ UTC).
          لو نشرت أول فترة لمورد، الحجوزات الجديدة ليه هتحتاج تقع بالكامل داخل فترة منشورة.
          الأيام من غير فترات بعد أول نشر تعتبر غير متاحة. التاريخ الأقصى 90 يوم.
          الفترة الحالية لا تمثل جدول أسبوعي متكرر أو حضور موظف HR.</p>
        {replacementWindowId&&<div className="k5-notice" role="status">
          <strong>تصحيح فترة منشورة — خطوتين مستقلتين</strong>
          <p>تاريخ البديل قابل للتعديل؛ لا يوجد تعديل تلقائي أو تراجع تلقائي.
            لو الإغلاق نجح والنشر فشل، المورد هيفضل غير متاح في الفترة دي لحد ما تنشر فترة جديدة.</p>
          {correctionStage==="NEED_CLOSE"&&<>
            <p>أولًا اقفل الفترة القديمة. SQL هيرفض الإغلاق لو حجز مؤكد بيعتمد عليها.</p>
            <button type="button" className="k5-salon-refresh" disabled={busy}
              onClick={()=>void closeAvailability(replacementWindowId)}>١. اقفل الفترة القديمة</button>
          </>}
          {correctionStage==="READY_TO_PUBLISH"&&
            <p>اتأكدنا إن الفترة القديمة CLOSED من الـAPI. عدّل موعد البديل واضغط نشر الفترة الجديدة كخطوة تانية.</p>}
          {correctionStage==="STALE_OR_MISSING"&&
            <p>الفترة مش ظاهرة في آخر البيانات، فالنشر متوقف. حدّث من SQL أو الغِ التصحيح.</p>}
          <button type="button" className="k5-salon-refresh"
            disabled={busy} onClick={cancelWindowCorrection}>إلغاء خطوات التصحيح</button>
        </div>}
        <form className="catalog-form" onSubmit={addAvailability}>
          <label>المورد<select required disabled={replacementWindowId!==null} value={windowResourceId}
            onChange={e=>{setWindowResourceId(e.target.value);windowRequest.current=null;}}>
            <option value="">اختر موردًا</option>
            {data.resources.filter(r=>r.isActive).map(r=>
              <option key={r.resourceId} value={r.resourceId}>{r.displayName}</option>)}
          </select></label>
          <label>بداية الفترة المحلية<input type="datetime-local" step={60} required
            value={windowLocalStart}
            onChange={e=>{setWindowLocalStart(e.target.value);windowRequest.current=null;}}/></label>
          <label>نهاية الفترة المحلية<input type="datetime-local" step={60} required
            value={windowLocalEnd}
            onChange={e=>{setWindowLocalEnd(e.target.value);windowRequest.current=null;}}/></label>
          <button className="k5-save" disabled={busy||!data.resources.some(r=>r.isActive)||
            (correctionStage!=="NO_CORRECTION"&&correctionStage!=="READY_TO_PUBLISH")}>
            نشر فترة التوافر
          </button>
        </form>
        <div className="k5-table-wrap"><table className="k5-table">
          <thead><tr><th>المورد</th><th>من</th><th>إلى</th><th>الحالة</th><th>تصحيح</th></tr></thead>
          <tbody>{windows.length===0?<tr><td colSpan={5} className="k5-empty">
            مفيش فترات منشورة حاليًا؛ الموارد دي بتتبع نظام الحجز السابق.
          </td></tr>:windows.map(w=><tr key={w.windowId}>
            <td>{data.resources.find(r=>r.resourceId===w.resourceId)?.displayName??"—"}</td>
            <td dir="ltr">{new Date(w.startsAtUtc).toLocaleString("ar-EG")}</td>
            <td dir="ltr">{new Date(w.endsAtUtc).toLocaleString("ar-EG")}</td>
            <td>{w.state==="OPEN"?"متاحة":"مقفولة"}</td>
            <td>{w.state==="OPEN"?<div className="k5-booking-actions">
              <a href="#window-correction" className="k5-salon-refresh"
                onClick={()=>prepareWindowCorrection(w)}>جهّز تعديل</a>
              <button type="button" className="k5-salon-refresh"
                disabled={busy} onClick={()=>void closeAvailability(w.windowId)}>إغلاق الفترة</button>
            </div>:<span>—</span>}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <section className="k5-admin-card k5-invite-card" id="new-appointment">
        <h2>حجز موعد جديد</h2>
        <p className="k5-muted">اختار عميل وخدمة ومورد. المدة بتتحدد من الخدمة في Catalog، والتوقيت المعروض حسب جهازك.</p>
        <form className="catalog-form" onSubmit={addBooking}>
          <label>ابحث عن العميل (Business كامل على السيرفر)
            <input type="search" maxLength={80} value={customerQuery}
              placeholder="الاسم أو رقم الموبايل"
              data-customer-search="business-server"
              onChange={e=>{setCustomerQuery(e.target.value);
                setCustomerId("");setSelectedCustomer(null);bookingRequest.current=null;}}/>
          </label>
          <p className="k5-muted" role="status">
            {customerSearching?"جاري البحث على السيرفر…":
              customerQuery.trim()?`نتائج السيرفر: ${customerResults.length} (حد 20)`:
              "اكتب اسم أو موبايل للبحث في كل عملاء الـBusiness المصرّح بهم."}
            {" "}<Link href={home+"/customers"}>دليل العملاء</Link>
          </p>
          {selectedCustomer&&<p className="k5-notice">المختار: {selectedCustomer.displayName}
            {" · "}{selectedCustomer.phoneE164??"بدون رقم"}</p>}
          <div className="k5-booking-actions" aria-label="نتائج بحث العملاء">
            {customerResults.map(c=><button key={c.customerId} type="button"
              className={customerId===c.customerId?"k5-save":"k5-salon-refresh"}
              onClick={()=>{
                setCustomerId(c.customerId);setSelectedCustomer(c);
                bookingRequest.current=null;
              }}>{c.displayName} — {c.phoneE164??""}</button>)}
          </div>
          <input type="hidden" value={customerId} readOnly required/>
          <label>الخدمة<select required value={offeringId} onChange={e=>{
            setOfferingId(e.target.value);bookingRequest.current=null;
          }}><option value="">اختر خدمة</option>
            {services.map(s=><option key={s.offeringId} value={s.offeringId}>{s.displayName} ({s.durationMinutes} دقيقة)</option>)}
          </select></label>
          <label>المورد<select required value={resourceId} onChange={e=>{
            setResourceId(e.target.value);bookingRequest.current=null;
          }}><option value="">اختر موردًا</option>
            {data.resources.filter(r=>r.isActive).map(r=><option key={r.resourceId} value={r.resourceId}>{r.displayName}</option>)}
          </select></label>
          <label>الموعد المحلي<input type="datetime-local" required step={60} value={localStart}
            onChange={e=>{setLocalStart(e.target.value);bookingRequest.current=null;}}/></label>
          <button className="k5-save" disabled={busy||!customersReady||!customerId||!services.length||
            !data.resources.some(r=>r.isActive)}>تأكيد الحجز</button>
        </form>
        <div className="k5-salon-suggestions" aria-label="مواعيد مرشحة للحجز">
          <h3>أوقات مرشحة فقط — مش تأكيد توافر</h3>
          <p className="k5-muted">اختار المورد والخدمة واليوم لعرض اقتراحات من آخر البيانات المصرّح بيها.
            القائمة قد تكون ناقصة (آخر 200 حجز / 300 فترة توافر). لازم تضغط تأكيد الحجز
            علشان SQL يراجع التوافر والتعارض من جديد.</p>
          <label>يوم الاقتراحات حسب جهازك
            <input type="date" value={slotDay} onChange={e=>setSlotDay(e.target.value)}/>
          </label>
          {slotPreview.status==="NEED_SELECTION"?
            <p className="k5-muted">حدد المورد والخدمة وتاريخ صالح لعرض الأوقات.</p>:
           slotPreview.status==="NO_OPEN_WINDOWS_RETURNED"?
            <p className="k5-muted">مفيش فترات OPEN ظاهرة للمورد في البيانات المحملة؛
              ده مش دليل إن المورد متاح بدون قيود، وممكن القائمة تكون محدودة.</p>:
           slotPreview.status==="NO_VISIBLE_CANDIDATES"?
            <p className="k5-muted">مفيش وقت مرشح ظاهر لليوم ده؛ جرب يوم تاني أو حدث البيانات من SQL.</p>:
            <div className="k5-salon-steps">
              {slotPreview.slots.map(slot=><button key={slot.startsAtUtc} type="button"
                className="k5-salon-refresh" disabled={busy}
                onClick={()=>{setLocalStart(slot.localInput);bookingRequest.current=null;}}>
                {slot.localLabel} — اختيار الوقت
              </button>)}
            </div>}
        </div>
        {!customersReady||!services.length||!data.resources.some(r=>r.isActive)?
          <p className="k5-footnote">لتسجيل حجز لازم Customers search + خدمة نشطة ومورد حجز أولًا.</p>:null}
      </section>
      <section className="k5-admin-card drvo-booking-calendar" aria-label="لوحة يوم الموارد">
        <div className="k5-admin-summary"><h2>تقويم اليوم حسب المورد</h2>
          <label className="drvo-booking-calendar-day">اليوم المحلي
            <input type="date" value={calendarDay} onChange={e=>setCalendarDay(e.target.value)}/>
          </label>
        </div>
        <p className="k5-muted">عرض إسقاطي من آخر 200 حجز محملة؛ مش محرك DST كامل ولا سحب لإعادة الجدولة.</p>
        <div className="drvo-booking-calendar-grid">
          {calendarBoard.length===0?<p className="k5-muted">مفيش موارد نشطة.</p>:
            calendarBoard.map(col=><div key={col.resourceId} className="drvo-booking-calendar-col">
              <strong>{col.resourceName}</strong>
              {col.items.length===0?<span className="k5-muted">فاضي</span>:
                col.items.map(a=><article key={a.bookingId}>
                  <span dir="ltr">{new Date(a.startsAtUtc).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</span>
                  <span>{a.customerName}</span>
                  <span className="k5-muted">{a.offeringName} · {a.status==="BOOKED"?"محجوز":"مكتمل"}</span>
                </article>)}
            </div>)}
        </div>
      </section>
      <section className="k5-admin-card">
        <div className="k5-admin-summary"><h2>حجوزات الفرع</h2>
          <div className="k5-booking-actions">
            <span className="k5-count">{data.appointments.length} حجز (آخر 200)</span>
            <button type="button" className="k5-salon-refresh" disabled={busy}
              onClick={()=>{void load();}}>تحديث من SQL ↻</button>
          </div></div>
        <div className="k5-table-wrap"><table className="k5-table">
          <thead><tr><th>العميل</th><th>الخدمة</th><th>المورد</th><th>البداية</th><th>النهاية</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
          <tbody>{data.appointments.length===0?
            <tr><td colSpan={7} className="k5-empty">لا توجد حجوزات مسجلة.</td></tr>:
            data.appointments.map(b=><tr key={b.bookingId}>
              <td>{b.customerName}</td><td>{b.offeringName}</td><td>{b.resourceName}</td>
              <td dir="ltr">{new Date(b.startsAtUtc).toLocaleString("ar-EG")}</td>
              <td dir="ltr">{new Date(b.endsAtUtc).toLocaleString("ar-EG")}</td>
              <td>{b.status==="BOOKED"?"محجوز":b.status==="CANCELLED"?"ملغي":"مكتمل"}</td>
              <td>{b.status==="COMPLETED"&&canPrepareDraft&&GUID.test(b.offeringId)&&GUID.test(b.customerId)?
                <Link href={home+"/pos-preview?customerId="+encodeURIComponent(b.customerId)+
                  "&offeringId="+encodeURIComponent(b.offeringId)}
                  className="k5-salon-refresh">جهّز POS Draft من الخدمة</Link>:
                b.status==="BOOKED"?<div className="k5-booking-actions">
                {canQueueHandoff&&
                  <button type="button" className="k5-salon-refresh" disabled={busy}
                    onClick={()=>void handoffToQueue(b.bookingId)}>إلى الطابور</button>}
                <button type="button" disabled={busy} onClick={()=>void changeStatus(b.bookingId,"CANCELLED")}>
                  إلغاء الحجز
                </button>
                <button type="button" disabled={busy||Date.parse(b.startsAtUtc)>Date.now()}
                  title="الإتمام متاح بعد بداية الموعد فقط"
                  onClick={()=>void changeStatus(b.bookingId,"COMPLETED")}>
                  إتمام الموعد
                </button>
              </div>:<span>—</span>}</td>
            </tr>)}</tbody>
        </table></div>
      </section>
    </>}
  </main>;
}
