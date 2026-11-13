"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";

type Booking={bookingId:string;customerName:string;offeringName:string;
 resourceName:string;startsAtUtc:string;status:"BOOKED"|"CANCELLED"|"COMPLETED"};
type Overview={branchName:string;businessName:string;bookings:Booking[];
 customersCount:number;offeringsCount:number;draftCount:number|null};
type Status="loading"|"ready"|"denied"|"unavailable";
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function SalonOverview({businessId,branchId,draftsAvailable}:{
 businessId:string;branchId:string;draftsAvailable:boolean;
}){
 const router=useRouter();
 const [status,setStatus]=useState<Status>("loading");
 const [overview,setOverview]=useState<Overview|null>(null);
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
   if(draftsAvailable){
    const drafts=await fetch(root+"/pos-drafts",{
      credentials:"same-origin",cache:"no-store",
    });
    if(drafts.status===401){router.replace("/sign-in");return;}
    if(drafts.ok){
      const body=await drafts.json() as {drafts?:unknown[]};
      if(Array.isArray(body.drafts))draftCount=body.drafts.length;
    }
   }
   setOverview({branchName:branchData.branchName,businessName:matching.businessName,
    bookings:bookingData.appointments,customersCount:customerData.customers.length,
    offeringsCount:catalogData.offerings.filter(x=>x.isActive).length,draftCount});
   setStatus("ready");
  }catch{setStatus("unavailable");}
 },[businessId,branchId,root,draftsAvailable,router]);
 useEffect(()=>{void load();},[load]);
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
    <h2>آخر الحجوزات الظاهرة</h2>
    <div className="k5-table-wrap"><table className="k5-table">
     <thead><tr><th>العميل</th><th>الخدمة</th><th>المورد</th><th>الموعد</th><th>الحالة</th></tr></thead>
     <tbody>{overview.bookings.length===0?
       <tr><td colSpan={5} className="k5-empty">لا توجد حجوزات.</td></tr>:
       overview.bookings.slice(0,10).map(b=><tr key={b.bookingId}>
        <td>{b.customerName}</td><td>{b.offeringName}</td><td>{b.resourceName}</td>
        <td dir="ltr">{new Date(b.startsAtUtc).toLocaleString("ar-EG")}</td>
        <td>{b.status==="BOOKED"?"محجوز":b.status==="COMPLETED"?"مكتمل":"ملغي"}</td>
       </tr>)}</tbody>
    </table></div>
   </section>
  </>}
 </main>;
}
