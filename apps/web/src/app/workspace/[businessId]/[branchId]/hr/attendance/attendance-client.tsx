"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Employee={employeeId:string;displayName:string;isActive:boolean;branchActive:boolean};
type Session={attendanceId:string;employeeId:string;employeeName:string;
 checkedInAtUtc:string;checkedOutAtUtc:string|null;status:"OPEN"|"CLOSED"};
type Attendance={state:"UTC_PUNCH_SESSIONS_ONLY";sessions:Session[];limit:200;
 mayBeTruncated:boolean;payrollState:"NOT_CALCULATED";businessDayState:"NOT_LINKED"};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function time(value:string|null){
 if(value===null)return "—";
 const parsed=new Date(value);
 return Number.isNaN(parsed.getTime())?"—":new Intl.DateTimeFormat("ar-EG",{
  dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Cairo",
 }).format(parsed);
}
export default function AttendanceClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const root="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/hr";
 const [status,setStatus]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
 const [data,setData]=useState<Attendance|null>(null);
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [employeeId,setEmployeeId]=useState("");
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const requests=useRef<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
  try{
   const [att,hr]=await Promise.all([
    fetch(api+"/attendance",{credentials:"same-origin",cache:"no-store"}),
    fetch(api+"/employees",{credentials:"same-origin",cache:"no-store"}),
   ]);
   if(att.status===401||hr.status===401){router.replace("/sign-in");return;}
   if([att.status,hr.status].some(n=>n===403||n===404)){setStatus("denied");return;}
   if(!att.ok||!hr.ok){setStatus("unavailable");return;}
   const current=await att.json() as Attendance;
   const roster=await hr.json() as {employees?:Employee[]};
   if(current.state!=="UTC_PUNCH_SESSIONS_ONLY"||current.limit!==200||
     current.payrollState!=="NOT_CALCULATED"||current.businessDayState!=="NOT_LINKED"||
     !Array.isArray(current.sessions)||!Array.isArray(roster.employees)){
    setStatus("unavailable");return;
   }
   const active=roster.employees.filter(e=>e.isActive&&e.branchActive);
   setData(current);setEmployees(active);
   setEmployeeId(id=>active.some(e=>e.employeeId===id)?id:(active[0]?.employeeId??""));
   setStatus("ready");
  }catch{setStatus("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 async function punch(action:"IN"|"OUT",id:string,sessionId:string|null){
  if(busy||!GUID.test(id)||(action==="OUT"&&!sessionId))return;
  const requestKey=action+":"+(sessionId??id);
  if(!requests.current[requestKey])requests.current[requestKey]=crypto.randomUUID();
  setBusy(requestKey);setNotice("");setError(false);
  try{
   const resp=await fetch(api+"/attendance",{method:"POST",
    credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":requests.current[requestKey]},
    body:JSON.stringify({employeeId:id,action,attendanceId:sessionId})});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){
    setError(true);setNotice("الحضور غير متاح لحسابك أو الموظف مش في الفرع.");return;
   }
   if(resp.status===409){delete requests.current[requestKey];
    setError(true);setNotice("فيه جلسة حضور مفتوحة أو الطلب متعارض. حدّث القائمة.");return;}
   if(!resp.ok){setError(true);setNotice("تعذر حفظ حضور الموظف؛ جرّب نفس الطلب.");return;}
   delete requests.current[requestKey];
   await load();
   setNotice(action==="IN"?"اتسجل الحضور بوقت السيرفر. مفيش حساب رواتب.":"اتسجل الانصراف بوقت السيرفر.");
  }catch{setError(true);setNotice("الاتصال انقطع؛ إعادة نفس الطلب آمنة ضد التكرار.");}
  finally{setBusy("");}
 }
 const activeOpen=data?.sessions.find(s=>s.employeeId.toLowerCase()===employeeId.toLowerCase()&&s.status==="OPEN");
 return <main className="k5-workspace" dir="rtl">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={root+"/hr"}>الموظفون والحلاقون</Link>
    <Link href={root}>مساحة الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">HR CORE / SERVER-SIDE ATTENDANCE</span>
   <h1>الحضور والانصراف</h1>
   <p className="k5-muted">نبدأ بحضور وانصراف فعليين بوقت من SQL Server، مش بوقت يحدده المتصفح.
    عرض الوقت بتوقيت القاهرة، من غير تقفيل BusinessDay أو راتب أو خصومات تأخير.</p>
  </div></div>
  {status==="loading"&&<p className="k5-table-state" role="status">جاري تحميل جلسات الحضور…</p>}
  {status==="denied"&&<p className="k5-error" role="alert">مش مصرح لك بحضور موظفي الفرع.</p>}
  {status==="unavailable"&&<p className="k5-error" role="alert">الحضور غير متاح أو SQL020 لسه مش مطبّقة.</p>}
  {status==="ready"&&data&&<>
   <div className="drvo-expenses-banner"><strong>حضور فعلي · بدون Payroll</strong>
    <span>UTC SERVER TIME · NOT LINKED TO BUSINESS DAY · NOT CALCULATED</span>
   </div>
   {notice&&<p className={error?"k5-error":"k5-notice"} role={error?"alert":"status"}>{notice}</p>}
   <section className="k5-admin-card k5-invite-card">
    <h2>سجّل حضور الموظف</h2>
    <div className="drvo-attendance-controls">
     <label>الموظف
      <select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>
       {employees.length===0&&<option value="">مفيش موظفين نشطين</option>}
       {employees.map(e=><option key={e.employeeId} value={e.employeeId}>{e.displayName}</option>)}
      </select></label>
     <button className="k5-save" type="button" disabled={!!busy||!employeeId||!!activeOpen}
      onClick={()=>void punch("IN",employeeId,null)}>
      {busy.startsWith("IN:")?"جاري تسجيل الحضور…":"تسجيل حضور"}
     </button>
     {activeOpen&&<span className="k5-muted">الموظف عنده جلسة مفتوحة منذ {time(activeOpen.checkedInAtUtc)}</span>}
    </div>
    <p className="k5-muted">مفيش تصحيح تواريخ أو قفل يوم من الواجهة دي؛ الجلسة المفتوحة القديمة لازم تتقفل بإجراء مصرح به.</p>
   </section>
   <section className="k5-admin-card drvo-expenses-list">
    <div className="k5-admin-summary"><div>
     <h2>آخر جلسات الحضور</h2>
     <p className="k5-muted">آخر {data.sessions.length} جلسة في الفرع، مش كشف راتب أو تقرير ساعات نهائي</p>
    </div><button className="k5-salon-refresh" type="button" onClick={()=>void load()}>تحديث</button></div>
    {data.mayBeTruncated&&<p className="k5-notice">العرض محدود بآخر 200 جلسة.</p>}
    {data.sessions.length===0?<p className="k5-table-state">لسه مفيش حضور مسجل في الفرع.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>الموظف</th><th>الحضور (القاهرة)</th><th>الانصراف</th>
       <th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody>{data.sessions.map(s=><tr key={s.attendanceId}>
       <td>{s.employeeName}</td><td>{time(s.checkedInAtUtc)}</td>
       <td>{time(s.checkedOutAtUtc)}</td><td>{s.status==="OPEN"?"مفتوحة":"مقفولة"}</td>
       <td>{s.status==="OPEN"&&<button type="button" className="drvo-attendance-out"
        disabled={!!busy} onClick={()=>void punch("OUT",s.employeeId,s.attendanceId)}>
        {busy==="OUT:"+s.attendanceId?"جاري الانصراف…":"تسجيل انصراف"}
       </button>}</td>
      </tr>)}</tbody>
     </table></div>}
    <p className="k5-muted drvo-expenses-foot">جلسات UTC فقط، بدون BusinessDay/Payroll وبدون تحويل التوقيت تلقائيًا لكشف الأجور.</p>
   </section>
  </>}
 </main>;
}
