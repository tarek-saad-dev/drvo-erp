"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
type BarberRow={
 employeeId:string;employeeCode:string;displayName:string;resourceId:string;
 resourceName:string;booked:number;completed:number;cancelled:number;total:number;
};
type Report={state:"READ_ONLY_BOOKING_SAMPLE";businessId:string;branchId:string;
 limitPerSource:200;mayBeTruncated:boolean;employeesRead:number;
 appointmentsRead:number;unassignedBookings:number;
 booked:number;completed:number;cancelled:number;barbers:BarberRow[]};
type AuthWorkspace={businessId:string;branchId:string;businessName:string};
type State="loading"|"ready"|"denied"|"unavailable";
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const matchingGuid=(a:unknown,b:unknown)=>
 typeof a==="string"&&typeof b==="string"&&GUID.test(a)&&GUID.test(b)&&
 a.toLowerCase()===b.toLowerCase();
export default function ReportsClient({businessId,branchId}:{businessId:string;branchId:string}){
 const router=useRouter();
 const [status,setStatus]=useState<State>("loading");
 const [report,setReport]=useState<Report|null>(null);
 const [branchName,setBranchName]=useState("");
 const [businessName,setBusinessName]=useState("");
 const [filter,setFilter]=useState<"ALL"|"BOOKED"|"COMPLETED"|"CANCELLED">("ALL");
 const root="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId);
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
  setStatus("loading");
  try{
   const [me,ws,branch]=await Promise.all([
    fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"}),
    fetch("/api/auth/workspaces",{credentials:"same-origin",cache:"no-store"}),
    fetch(root,{credentials:"same-origin",cache:"no-store"}),
   ]);
   if([me,ws,branch].some(r=>r.status===401)){router.replace("/sign-in");return;}
   if(!me.ok||!ws.ok||!branch.ok){setStatus("denied");return;}
   const [acct,all,meta]=await Promise.all([
    me.json() as Promise<{mustChangePassword:boolean}>,
    ws.json() as Promise<{workspaces?:AuthWorkspace[]}>,
    branch.json() as Promise<{businessId:string;branchId:string;branchName:string}>,
   ]);
   if(acct.mustChangePassword){router.replace("/change-password");return;}
   const authorized=all.workspaces?.find(x=>matchingGuid(x.businessId,businessId)&&
     matchingGuid(x.branchId,branchId));
   if(!authorized||!matchingGuid(meta.businessId,businessId)||
      !matchingGuid(meta.branchId,branchId)){setStatus("denied");return;}
   const response=await fetch(root+"/reports/barber-operations",{
    credentials:"same-origin",cache:"no-store",
   });
   if(response.status===401){router.replace("/sign-in");return;}
   if(response.status===403||response.status===404){setStatus("denied");return;}
   if(!response.ok){setStatus("unavailable");return;}
   const data=await response.json() as Report;
   if(data.state!=="READ_ONLY_BOOKING_SAMPLE"||
      !matchingGuid(data.businessId,businessId)||
      !matchingGuid(data.branchId,branchId)||!Array.isArray(data.barbers)||
      data.limitPerSource!==200){setStatus("unavailable");return;}
   setBusinessName(authorized.businessName);
   setBranchName(meta.branchName);
   setReport(data);setStatus("ready");
  }catch{setStatus("unavailable");}
 },[root,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 const barbers=(report?.barbers??[]).filter(b=>
  filter==="ALL"||filter==="BOOKED"&&b.booked>0||
  filter==="COMPLETED"&&b.completed>0||filter==="CANCELLED"&&b.cancelled>0);
 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">REPORTS / SCOPED READ-ONLY</span>
   <h1>تقرير تشغيل الحلاقين</h1>
   <p className="k5-muted">تقرير من البيانات المصرّح بها في HR وBooking فقط.
    الأعداد تخص أحدث 200 حجز معروض، وليست إجمالي تاريخ الصالون أو إيرادات أو أرباح.</p>
  </div></div>
  {status==="loading"&&<p role="status">جاري التحقق من الصلاحيات وتجميع التقرير…</p>}
  {status==="denied"&&<p role="alert" className="k5-error">مش مسموح بعرض التقرير؛ لازم صلاحية قراءة HR وBooking في نفس الفرع.</p>}
  {status==="unavailable"&&<p role="alert" className="k5-error">التقرير مش متاح حاليًا.</p>}
  {status==="ready"&&report&&<>
   <section className="k5-admin-card">
    <h2>{businessName} · {branchName}</h2>
    <p className="k5-muted">آخر {report.appointmentsRead} حجز في عينة العرض · {report.employeesRead} موظف في عينة HR</p>
    {report.mayBeTruncated&&<p role="status" className="k5-notice">
     تنبيه: البيانات المعروضة ممكن تكون غير مكتملة لأن الـAPI بيرجع آخر 200 سجل فقط.
    </p>}
    <div className="k5-salon-steps">
     <div><strong>مؤكدة</strong><p>{report.booked}</p></div>
     <div><strong>مكتملة</strong><p>{report.completed}</p></div>
     <div><strong>ملغية</strong><p>{report.cancelled}</p></div>
     <div><strong>غير مرتبطة بحلاق نشط</strong><p>{report.unassignedBookings}</p></div>
    </div>
    <button className="k5-salon-refresh" type="button" onClick={()=>void load()}>
     تحديث بيانات التقرير
    </button>
   </section>
   <section className="k5-admin-card">
    <h2>أداء الحلاقين — عدد المواعيد في العينة</h2>
    <label>تصفية الحلاقين حسب حالة الحجز
     <select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}>
      <option value="ALL">الكل</option><option value="BOOKED">عندهم حجوزات مؤكدة</option>
      <option value="COMPLETED">عندهم حجوزات مكتملة</option>
      <option value="CANCELLED">عندهم حجوزات ملغية</option>
     </select>
    </label>
    {barbers.length===0?<p>مفيش حلاقين مطابقين لبيانات العرض.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>الموظف</th><th>الكود</th><th>مورد الحجز</th>
       <th>مؤكدة</th><th>مكتملة</th><th>ملغية</th><th>الإجمالي</th></tr></thead>
      <tbody>{barbers.map(row=><tr key={row.employeeId}>
       <td>{row.displayName}</td><td dir="ltr">{row.employeeCode}</td>
       <td>{row.resourceName}</td><td>{row.booked}</td>
       <td>{row.completed}</td><td>{row.cancelled}</td><td>{row.total}</td>
      </tr>)}</tbody>
     </table></div>}
    <p className="k5-muted">مفيش مبالغ محصلة أو مبيعات POSTED أو عمولات محسوبة في التقرير ده.
     Booking وHR هما المصدر؛ Reports ما بيكتبش أي سجلات مالية.</p>
   </section>
  </>}
 </main>;
}
