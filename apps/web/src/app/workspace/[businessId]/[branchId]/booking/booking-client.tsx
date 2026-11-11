"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Resource={resourceId:string;displayName:string;kind:"PERSON"|"CHAIR"|"ROOM"|"EQUIPMENT";isActive:boolean};
type Appointment={
  bookingId:string;customerId:string;offeringId:string;resourceId:string;
  customerName:string;offeringName:string;resourceName:string;
  startsAtUtc:string;endsAtUtc:string;status:"BOOKED";
};
type BookingRead={resources:Resource[];appointments:Appointment[]};
type Customer={customerId:string;displayName:string;isActive:boolean};
type Offering={offeringId:string;displayName:string;kind:string;durationMinutes:number|null;isActive:boolean};
const GUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Status="loading"|"ready"|"denied"|"unavailable"|"prerequisites";

export default function BookingClient({businessId,branchId}:{businessId:string;branchId:string}){
  const router=useRouter();
  const [status,setStatus]=useState<Status>("loading");
  const [data,setData]=useState<BookingRead>({resources:[],appointments:[]});
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [services,setServices]=useState<Offering[]>([]);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [resourceName,setResourceName]=useState("");
  const [resourceKind,setResourceKind]=useState<Resource["kind"]>("PERSON");
  const [customerId,setCustomerId]=useState("");
  const [offeringId,setOfferingId]=useState("");
  const [resourceId,setResourceId]=useState("");
  const [localStart,setLocalStart]=useState("");
  const resourceRequest=useRef<string|null>(null);
  const bookingRequest=useRef<string|null>(null);
  const scope="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+encodeURIComponent(branchId);
  const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);

  const load=useCallback(async()=>{
    if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
    try{
      // Booking may present Customer/Service labels only if independently
      // permitted to read those owning Modules; never bypass their scopes.
      const [booking,customer,category]=await Promise.all([
        fetch(scope+"/booking",{credentials:"same-origin",cache:"no-store"}),
        fetch(scope+"/customers",{credentials:"same-origin",cache:"no-store"}),
        fetch(scope+"/catalog",{credentials:"same-origin",cache:"no-store"}),
      ]);
      if([booking,customer,category].some(r=>r.status===401)){router.replace("/sign-in");return;}
      if(booking.status===403||booking.status===404){setStatus("denied");return;}
      if(!booking.ok){setStatus("unavailable");return;}
      if(!customer.ok||!category.ok){setStatus("prerequisites");return;}
      const [book,cs,cat]=await Promise.all([
        booking.json() as Promise<BookingRead>,
        customer.json() as Promise<{customers:Customer[]}>,
        category.json() as Promise<{offerings:Offering[]}>,
      ]);
      if(!Array.isArray(book.resources)||!Array.isArray(book.appointments)||
          !Array.isArray(cs.customers)||!Array.isArray(cat.offerings)){
        setStatus("unavailable");return;
      }
      setData(book);
      setCustomers(cs.customers.filter(c=>c.isActive));
      setServices(cat.offerings.filter(s=>s.isActive&&s.kind==="SERVICE"&&
        typeof s.durationMinutes==="number"&&s.durationMinutes>0));
      setStatus("ready");
    }catch{setStatus("unavailable");}
  },[businessId,branchId,scope,router]);
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
      <section className="k5-admin-card k5-invite-card">
        <h2>حجز موعد جديد</h2>
        <p className="k5-muted">اختار عميل وخدمة ومورد. المدة بتتحدد من الخدمة في Catalog، والتوقيت المعروض حسب جهازك.</p>
        <form className="catalog-form" onSubmit={addBooking}>
          <label>العميل<select required value={customerId} onChange={e=>{
            setCustomerId(e.target.value);bookingRequest.current=null;
          }}><option value="">اختر عميلًا</option>
            {customers.map(c=><option key={c.customerId} value={c.customerId}>{c.displayName}</option>)}
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
        {!customers.length||!services.length||!data.resources.some(r=>r.isActive)?
          <p className="k5-footnote">لتسجيل حجز لازم يكون فيه عميل وخدمة نشطة ومورد حجز أولًا.</p>:null}
      </section>
      <section className="k5-admin-card">
        <div className="k5-admin-summary"><h2>حجوزات الفرع</h2>
          <span className="k5-count">{data.appointments.length} حجز (آخر 200)</span></div>
        <div className="k5-table-wrap"><table className="k5-table">
          <thead><tr><th>العميل</th><th>الخدمة</th><th>المورد</th><th>البداية</th><th>النهاية</th></tr></thead>
          <tbody>{data.appointments.length===0?
            <tr><td colSpan={5} className="k5-empty">لا توجد حجوزات مسجلة.</td></tr>:
            data.appointments.map(b=><tr key={b.bookingId}>
              <td>{b.customerName}</td><td>{b.offeringName}</td><td>{b.resourceName}</td>
              <td dir="ltr">{new Date(b.startsAtUtc).toLocaleString("ar-EG")}</td>
              <td dir="ltr">{new Date(b.endsAtUtc).toLocaleString("ar-EG")}</td>
            </tr>)}</tbody>
        </table></div>
      </section>
    </>}
  </main>;
}
