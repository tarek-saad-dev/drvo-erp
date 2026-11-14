"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";

type Booking={bookingId:string;offeringId:string;resourceId:string;customerName:string;offeringName:string;
 resourceName:string;startsAtUtc:string;status:"BOOKED"|"CANCELLED"|"COMPLETED"};
type Overview={branchName:string;businessName:string;bookings:Booking[];
 customersCount:number;offeringsCount:number;draftCount:number|null;posPreviewAllowed:boolean};
type Status="loading"|"ready"|"denied"|"unavailable";
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function SalonOverview({businessId,branchId,draftsAvailable}:{
 businessId:string;branchId:string;draftsAvailable:boolean;
}){
 const router=useRouter();
 const [status,setStatus]=useState<Status>("loading");
 const [overview,setOverview]=useState<Overview|null>(null);
 const [filter,setFilter]=useState<"TODAY"|"UPCOMING"|"ALL">("TODAY");
 const [resourceFilter,setResourceFilter]=useState("");
 const [statusFilter,setStatusFilter]=useState<"ALL"|"BOOKED"|"COMPLETED"|"CANCELLED">("ALL");
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const root="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId);
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
  setStatus("loading");
  try{
   // No dashboard fetch or business count is visible before verifying the
   // authenticated Session's independently authorized Branch assignment.
   const [me,workspaces,branch]=await Promise.all([
    fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"}),
    fetch("/api/auth/workspaces",{credentials:"same-origin",cache:"no-store"}),
    fetch(root,{credentials:"same-origin",cache:"no-store"}),
   ]);
   if([me,workspaces,branch].some(x=>x.status===401)){
    router.replace("/sign-in");return;
   }
   if(!me.ok||!workspaces.ok||!branch.ok){setStatus("denied");return;}
   const [account,assigned,branchData]=await Promise.all([
    me.json() as Promise<{mustChangePassword:boolean}>,
    workspaces.json() as Promise<{workspaces?:Array<{
      businessId:string;branchId:string;businessName:string}>}>,
    branch.json() as Promise<{businessId:string;branchId:string;branchName:string}>,
   ]);
   if(account.mustChangePassword){router.replace("/change-password");return;}
   const matching=assigned.workspaces?.find(x=>x.businessId===businessId&&
      x.branchId===branchId);
   if(!matching||branchData.businessId!==businessId||branchData.branchId!==branchId){
    setStatus("denied");return;
   }
   const [book,customers,catalog]=await Promise.all([
    fetch(root+"/booking",{credentials:"same-origin",cache:"no-store"}),
    fetch(root+"/customers",{credentials:"same-origin",cache:"no-store"}),
    fetch(root+"/catalog",{credentials:"same-origin",cache:"no-store"}),
   ]);
   if([book,customers,catalog].some(x=>x.status===401)){
    router.replace("/sign-in");return;
   }
   if(!book.ok||!customers.ok||!catalog.ok){setStatus("denied");return;}
   const [bookingData,customerData,catalogData]=await Promise.all([
    book.json() as Promise<{appointments?:Booking[]}>,
    customers.json() as Promise<{customers?:Array<{customerId:string}>}>,
    catalog.json() as Promise<{offerings?:Array<{offeringId:string;isActive:boolean}>}>,
   ]);
   if(!Array.isArray(bookingData.appointments)||
      !Array.isArray(customerData.customers)||
      !Array.isArray(catalogData.offerings)){setStatus("unavailable");return;}
   // The POS draft owner authorizes separately. A denied result never reveals
   // counts or saves; no ability to post sales or payments is implied.
   let draftCount:number|null=null;
   let posPreviewAllowed=false;
   if(draftsAvailable){
    const drafts=await fetch(root+"/pos-drafts",{
      credentials:"same-origin",cache:"no-store",
    });
    if(drafts.status===401){router.replace("/sign-in");return;}
    if(drafts.ok){
      const body=await drafts.json() as {drafts?:unknown[]};
      if(Array.isArray(body.drafts))draftCount=body.drafts.length;
      // POS preview is independently authorized and must not be inferred from
      // POS DRAFT read, Booking status, or Web flags alone.
      const preview=await fetch(root+"/pos-preview",{
        credentials:"same-origin",cache:"no-store",
      });
      if(preview.status===401){router.replace("/sign-in");return;}
      posPreviewAllowed=preview.ok;
    }
   }
   setOverview({branchName:branchData.branchName,businessName:matching.businessName,
    bookings:bookingData.appointments,customersCount:customerData.customers.length,
    offeringsCount:catalogData.offerings.filter(x=>x.isActive).length,
    draftCount,posPreviewAllowed});
   setStatus("ready");
  }catch{setStatus("unavailable");}
 },[businessId,branchId,root,draftsAvailable,router]);
 useEffect(()=>{void load();},[load]);
 const now=new Date();
 const localToday=(d:Date)=>d.getFullYear()===now.getFullYear()&&
  d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();
 const filtered=(overview?.bookings??[]).filter(b=>{
  const when=new Date(b.startsAtUtc);
  if(filter==="TODAY")return localToday(when);
  if(filter==="UPCOMING")return b.status==="BOOKED"&&when.getTime()>=now.getTime();
  return true;
 }).filter(b=>!resourceFilter||b.resourceId===resourceFilter)
   .filter(b=>statusFilter==="ALL"||b.status===statusFilter)
   .sort((a,b)=>filter==="UPCOMING"?
  Date.parse(a.startsAtUtc)-Date.parse(b.startsAtUtc):
  Date.parse(b.startsAtUtc)-Date.parse(a.startsAtUtc));
 const today=(overview?.bookings??[]).filter(b=>localToday(new Date(b.startsAtUtc)));
 const resourceOptions=Array.from(new Map((overview?.bookings??[]).map(b=>
  [b.resourceId,b.resourceName])).entries()).filter(([id])=>GUID.test(id))
  .sort((a,b)=>a[1].localeCompare(b[1],"ar"));

 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
    <span className="k5-eyebrow">SALON / PRIVATE OPERATIONS</span>
    <h1>لوحة تشغيل الصالون</h1>
    <p className="k5-muted">قراءات من الـ Shared Modules المصرح لك بها فقط، بدون مبيعات أو تحصيل.</p>
  </div></div>
  {status==="loading"&&<p role="status">جاري التحقق من الفرع وتحميل البيانات…</p>}
  {status==="denied"&&<p role="alert" className="k5-error">مش مسموح بعرض لوحة الصالون لهذا الفرع.</p>}
  {status==="unavailable"&&<p role="alert" className="k5-error">تعذر تحميل اللوحة. حاول مرة تانية.</p>}
  {status==="ready"&&overview&&<>
   <section className="k5-admin-card">
    <div className="k5-admin-summary">
     <h2>{overview.businessName} · {overview.branchName}</h2>
     <button type="button" className="k5-salon-refresh" onClick={()=>void load()}>
      تحديث البيانات من SQL ↻
     </button>
    </div>
    <p className="k5-muted">الأرقام بعدد السجلات الظاهرة في الـ API (آخر 200 حجز، والعملاء والكتالوج لهم حدود عرض). ليست إحصائيات شاملة أو إيرادات.</p>
    <div className="k5-salon-steps" aria-label="ملخص الصالون">
     <span className="k5-count">الحجوزات المعروضة: {overview.bookings.length}</span>
     <span className="k5-count">المؤكدة: {overview.bookings.filter(x=>x.status==="BOOKED").length}</span>
     <span className="k5-count">حجوزات النهارده (المعروضة): {today.length}</span>
     <span className="k5-count">مواعيد اليوم المتبقية: {today.filter(x=>
      x.status==="BOOKED"&&Date.parse(x.startsAtUtc)>=now.getTime()).length}</span>
     <span className="k5-count">المكتملة: {overview.bookings.filter(x=>x.status==="COMPLETED").length}</span>
     <span className="k5-count">الملغاة: {overview.bookings.filter(x=>x.status==="CANCELLED").length}</span>
     <span className="k5-count">العملاء المعروضون: {overview.customersCount}</span>
     <span className="k5-count">الخدمات والمنتجات النشطة المعروضة: {overview.offeringsCount}</span>
     {overview.draftCount!==null&&<span className="k5-count">مسودات POS المعروضة: {overview.draftCount}</span>}
    </div>
    <nav className="k5-salon-steps" aria-label="مهام الصالون">
     <Link href={home+"/customers"}>العملاء</Link>
     <Link href={home+"/catalog"}>الخدمات والأسعار</Link>
     <Link href={home+"/booking"}>المواعيد</Link>
     {overview.draftCount!==null&&<Link href={home+"/pos-preview"}>مسودات POS</Link>}
    </nav>
   </section>
   <section className="k5-admin-card">
    <div className="k5-admin-summary">
     <h2>متابعة المواعيد اليومية</h2>
     <div className="k5-booking-actions">
       <label htmlFor="k5-salon-day-filter">اعرض</label>
       <select id="k5-salon-day-filter" value={filter}
        onChange={e=>setFilter(e.target.value as "TODAY"|"UPCOMING"|"ALL")}>
        <option value="TODAY">مواعيد اليوم المحلي</option>
        <option value="UPCOMING">مواعيد قادمة مؤكدة</option>
        <option value="ALL">آخر 200 حجز من API</option>
       </select>
       <label htmlFor="k5-salon-resource-filter">المورد</label>
       <select id="k5-salon-resource-filter" value={resourceFilter}
         onChange={e=>setResourceFilter(e.target.value)}>
         <option value="">كل الموارد الظاهرة</option>
         {resourceOptions.map(([id,name])=>
           <option value={id} key={id}>{name}</option>)}
       </select>
       <label htmlFor="k5-salon-status-filter">الحالة</label>
       <select id="k5-salon-status-filter" value={statusFilter}
         onChange={e=>setStatusFilter(e.target.value as
           "ALL"|"BOOKED"|"COMPLETED"|"CANCELLED")}>
         <option value="ALL">كل الحالات</option>
         <option value="BOOKED">محجوز</option>
         <option value="COMPLETED">مكتمل</option>
         <option value="CANCELLED">ملغي</option>
       </select>
     </div>
    </div>
    <p className="k5-muted">الفلاتر بتشتغل على آخر 200 حجز مسموح بعرضهم، بتوقيت جهازك؛
      مفيش تقويم دوام أو تقرير إيرادات أو حجز جديد ضمن الفلترة.</p>
    <p className="k5-muted" role="status">نتائج الفلترة من السجلات المسموح بعرضها: {filtered.length}</p>
    <div className="k5-table-wrap"><table className="k5-table">
     <thead><tr><th>العميل</th><th>الخدمة</th><th>المورد</th><th>الموعد</th><th>الحالة</th><th>التالي</th></tr></thead>
     <tbody>{filtered.length===0?
       <tr><td colSpan={6} className="k5-empty">مفيش حجوزات في الفترة المعروضة.</td></tr>:
       filtered.slice(0,30).map(b=><tr key={b.bookingId}>
        <td>{b.customerName}</td><td>{b.offeringName}</td><td>{b.resourceName}</td>
        <td dir="ltr">{new Date(b.startsAtUtc).toLocaleString("ar-EG")}</td>
        <td>{b.status==="BOOKED"?"محجوز":b.status==="COMPLETED"?"مكتمل":"ملغي"}</td>
        <td>{overview.posPreviewAllowed&&b.status==="COMPLETED"&&GUID.test(b.offeringId)?
         <Link href={home+"/pos-preview?offeringId="+encodeURIComponent(b.offeringId)}>
           جهّز مسودة من الخدمة
         </Link>:
         b.status==="BOOKED"?<Link href={home+"/booking"}>إدارة الحجز</Link>:<span>—</span>}</td>
       </tr>)}</tbody>
    </table></div>
   </section>
  </>}
 </main>;
}
