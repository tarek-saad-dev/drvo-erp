"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {suggestBookingStarts} from "./booking-availability-preview.mjs";
import {findAuthorizedCustomers} from "./customer-finder.mjs";
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

export default function BookingClient({businessId,branchId,posWebEnabled,draftsWebEnabled}:{
  businessId:string;branchId:string;posWebEnabled:boolean;draftsWebEnabled:boolean;
}){
  const router=useRouter();
  const [status,setStatus]=useState<Status>("loading");
  const [data,setData]=useState<BookingRead>({resources:[],appointments:[]});
  const [windows,setWindows]=useState<BookingWindow[]>([]);
  const [windowResourceId,setWindowResourceId]=useState("");
  const [windowLocalStart,setWindowLocalStart]=useState("");
  const [windowLocalEnd,setWindowLocalEnd]=useState("");
  const [replacementWindowId,setReplacementWindowId]=useState<string|null>(null);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [customerQuery,setCustomerQuery]=useState("");
  const [services,setServices]=useState<Offering[]>([]);
  const [canOpenPos,setCanOpenPos]=useState(false);
  const [canPrepareDraft,setCanPrepareDraft]=useState(false);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [resourceName,setResourceName]=useState("");
  const [resourceKind,setResourceKind]=useState<Resource["kind"]>("PERSON");
  const [customerId,setCustomerId]=useState("");
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
  const filteredCustomers=useMemo(()=>findAuthorizedCustomers(customers,customerQuery),[customers,customerQuery]);
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
      const [booking,customer,category,windowResult]=await Promise.all([
        fetch(scope+"/booking",{credentials:"same-origin",cache:"no-store"}),
        fetch(scope+"/customers",{credentials:"same-origin",cache:"no-store"}),
        fetch(scope+"/catalog",{credentials:"same-origin",cache:"no-store"}),
        fetch(scope+"/booking/windows",{credentials:"same-origin",cache:"no-store"}),
      ]);
      if([booking,customer,category,windowResult].some(r=>r.status===401)){router.replace("/sign-in");return;}
      if(booking.status===403||booking.status===404){setStatus("denied");return;}
      if(!booking.ok){setStatus("unavailable");return;}
      if(!customer.ok||!category.ok){setStatus("prerequisites");return;}
      if(!windowResult.ok){setStatus("unavailable");return;}
      const [book,cs,cat,availability]=await Promise.all([
        booking.json() as Promise<BookingRead>,
        customer.json() as Promise<{customers:Customer[]}>,
        category.json() as Promise<{offerings:Offering[]}>,
        windowResult.json() as Promise<{windows:BookingWindow[]}>,
      ]);
      if(!Array.isArray(book.resources)||!Array.isArray(book.appointments)||
          !Array.isArray(cs.customers)||!Array.isArray(cat.offerings)||
          !Array.isArray(availability.windows)){
        setStatus("unavailable");return;
      }
      setData(book);
      setWindows(availability.windows);
      setCustomers(cs.customers.filter(c=>c.isActive));
      setServices(cat.offerings.filter(s=>s.isActive&&s.kind==="SERVICE"&&
        typeof s.durationMinutes==="number"&&s.durationMinutes>0));
      // POS preview is a distinct protected owner, never assumed from Booking
      // read or from a Next.js feature flag alone.
      setCanOpenPos(false);
      setCanPrepareDraft(false);
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
      setStatus("ready");
    }catch{setStatus("unavailable");}
  },[businessId,branchId,scope,router,posWebEnabled,draftsWebEnabled]);
  useEffect(()=>{void load();},[load]);

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
  return <main className="k5-workspace">
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
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
          <label>ابحث عن العميل في القائمة المصرّح بيها
            <input type="search" maxLength={80} value={customerQuery}
              placeholder="الاسم أو رقم الموبايل الدولي"
              onChange={e=>{setCustomerQuery(e.target.value);
                setCustomerId("");bookingRequest.current=null;}}/>
          </label>
          <p className="k5-muted" role="status">ظاهر {filteredCustomers.length} من {customers.length} عميل
            (أول 200 عميل في الـ API فقط). البحث محلي ومش بيشمل كل العملاء.
            {filteredCustomers.length===0&&customers.length>0?
              " مفيش نتيجة ظاهرة؛ جرّب البحث بطريقة تانية.":""}
            <Link href={home+"/customers"}> دليل العملاء</Link>
          </p>
          <label>العميل<select required value={customerId} onChange={e=>{
            setCustomerId(e.target.value);bookingRequest.current=null;
          }}><option value="">اختر عميلًا</option>
            {filteredCustomers.map(c=><option key={c.customerId} value={c.customerId}>{c.displayName}</option>)}
          </select></label>
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
          <button className="k5-save" disabled={busy||!customers.length||!services.length||
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
        {!customers.length||!services.length||!data.resources.some(r=>r.isActive)?
          <p className="k5-footnote">لتسجيل حجز لازم يكون فيه عميل وخدمة نشطة ومورد حجز أولًا.</p>:null}
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
              <td>{b.status==="COMPLETED"&&canPrepareDraft&&GUID.test(b.offeringId)?
                <Link href={home+"/pos-preview?offeringId="+encodeURIComponent(b.offeringId)}
                  className="k5-salon-refresh">جهّز POS Draft من الخدمة</Link>:
                b.status==="BOOKED"?<div className="k5-booking-actions">
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
