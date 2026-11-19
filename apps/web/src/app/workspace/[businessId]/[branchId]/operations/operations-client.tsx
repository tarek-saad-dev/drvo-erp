"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Day={dayId:string;businessDate:string;status:"OPEN"|"CLOSED";
 openedByAccountId:string;openedAtUtc:string;closedAtUtc:string|null};
type Shift={shiftId:string;dayId:string;actorAccountId:string;status:"OPEN"|"CLOSED";
 openedAtUtc:string;closedAtUtc:string|null};
type OpsRead={
 state:"NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY";
 openDay:Day|null;shifts:Shift[];
 planAction:"NO_OP"|"ROLLED_OVER"|"OPENED_MISSING_DAY";
 readiness:{state:"READY_FOR_NONFINANCIAL_WORK"|"BLOCKED";reasons:string[];
  financialPostingState:"NOT_AUTHORIZED"};
 accountingState:"NOT_POSTED";glPostState:"GATED";
};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function utcToday(){return new Date().toISOString().slice(0,10);}
export default function OperationsClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/operations";
 const [state,setState]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
 const [data,setData]=useState<OpsRead|null>(null);
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const openDayKey=useRef<string|null>(null);
 const closeDayKey=useRef<string|null>(null);
 const openShiftKey=useRef<string|null>(null);
 const closeShiftKeys=useRef<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const response=await fetch(api,{cache:"no-store",credentials:"same-origin"});
   if(response.status===401){router.replace("/sign-in");return;}
   if(response.status===403||response.status===404){setState("denied");return;}
   if(!response.ok){setState("unavailable");return;}
   const payload=await response.json() as OpsRead;
   if(payload.state!=="NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY"||
      payload.accountingState!=="NOT_POSTED"||payload.glPostState!=="GATED"||
      !payload.readiness||payload.readiness.financialPostingState!=="NOT_AUTHORIZED"||
      !Array.isArray(payload.shifts)){setState("unavailable");return;}
   setData(payload);setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 async function send(endpoint:string,key:string,body:unknown){
  return fetch(endpoint,{method:"POST",cache:"no-store",credentials:"same-origin",
   headers:{"Content-Type":"application/json","Idempotency-Key":key},
   body:JSON.stringify(body)});
 }
 async function openDay(){
  if(busy)return;
  setBusy("open-day");setNotice("");setError(false);
  if(!openDayKey.current)openDayKey.current=crypto.randomUUID();
  try{
   const r=await send(api+"/days",openDayKey.current,{businessDate:utcToday()});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بفتح يوم العمل.");return;}
   if(r.status===409){openDayKey.current=null;setError(true);
    setNotice("يوجد يوم مفتوح بالفعل أو تعارض في الطلب.");return;}
   if(!r.ok){setError(true);setNotice("تعذر فتح اليوم؛ أعد نفس الطلب.");return;}
   openDayKey.current=null;await load();
   setNotice("اتفتح يوم العمل التشغيلي — بدون أي ترحيل محاسبي.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس طلب فتح اليوم.");}
  finally{setBusy("");}
 }
 async function closeDay(forceCloseShifts:boolean){
  if(busy||!data?.openDay)return;
  setBusy(forceCloseShifts?"force-close-day":"close-day");setNotice("");setError(false);
  if(!closeDayKey.current)closeDayKey.current=crypto.randomUUID();
  try{
   const r=await send(api+"/days/"+encodeURIComponent(data.openDay.dayId)+"/close",
    closeDayKey.current,{forceCloseShifts});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بإغلاق اليوم.");return;}
   if(r.status===409){closeDayKey.current=null;setError(true);
    setNotice("لا يمكن الإغلاق ووجود ورديات مفتوحة، أو تعارض طلب.");return;}
   if(!r.ok){setError(true);setNotice("تعذر إغلاق اليوم؛ أعد نفس الطلب.");return;}
   closeDayKey.current=null;await load();
   setNotice(forceCloseShifts?
    "اتقفل اليوم مع إغلاق الورديات المفتوحة قسريًا — GL ما زال GATED.":
    "اتقفل يوم العمل التشغيلي — بدون ترحيل محاسبي.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس طلب الإغلاق.");}
  finally{setBusy("");}
 }
 async function openShift(){
  if(busy||!data?.openDay)return;
  setBusy("open-shift");setNotice("");setError(false);
  if(!openShiftKey.current)openShiftKey.current=crypto.randomUUID();
  try{
   const r=await send(api+"/shifts",openShiftKey.current,{dayId:data.openDay.dayId});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بفتح وردية.");return;}
   if(r.status===409){openShiftKey.current=null;setError(true);
    setNotice("لديك وردية مفتوحة بالفعل أو اليوم غير مفتوح.");return;}
   if(!r.ok){setError(true);setNotice("تعذر فتح الوردية؛ أعد نفس الطلب.");return;}
   openShiftKey.current=null;await load();
   setNotice("اتفتحت وردية تشغيلية — جاهزة لحركات الخزنة غير المرحّلة.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس طلب فتح الوردية.");}
  finally{setBusy("");}
 }
 async function closeShift(shiftId:string){
  if(busy||!GUID.test(shiftId))return;
  setBusy(shiftId);setNotice("");setError(false);
  if(!closeShiftKeys.current[shiftId])closeShiftKeys.current[shiftId]=crypto.randomUUID();
  try{
   const r=await send(api+"/shifts/"+encodeURIComponent(shiftId)+"/close",
    closeShiftKeys.current[shiftId],{});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بإغلاق هذه الوردية.");return;}
   if(r.status===409){delete closeShiftKeys.current[shiftId];setError(true);
    setNotice("الوردية مغلقة بطلب مختلف؛ حدّث القائمة.");return;}
   if(!r.ok){setError(true);setNotice("تعذر إغلاق الوردية؛ أعد نفس الطلب.");return;}
   delete closeShiftKeys.current[shiftId];await load();
   setNotice("اتقفلت الوردية بدون ترحيل محاسبي. للتسوية مع العد استخدم شاشة الخزنة.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس طلب الإغلاق.");}
  finally{setBusy("");}
 }
 const planLabel=data?.planAction==="NO_OP"?"اليوم متوافق":
  data?.planAction==="ROLLED_OVER"?"مطلوب تدوير يوم":"مطلوب فتح يوم مفقود";
 return <main className="k5-workspace" dir="rtl">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link>
    <Link href={home+"/treasury"}>الخزنة</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">OPERATIONS · BUSINESS DAY / SHIFT</span>
   <h1>تشغيل اليوم والورديات</h1>
   <p className="k5-muted">فتح وإغلاق يوم العمل والوردية حسب عقد Cashier — بدون ترحيل محاسبي (ADR-031 GATED).</p>
  </div></div>
  {state==="loading"&&<p className="k5-table-state" role="status">جاري تحميل حالة التشغيل…</p>}
  {state==="denied"&&<p className="k5-error" role="alert">مش مسموح لك بعرض تشغيل الفرع.</p>}
  {state==="unavailable"&&<p className="k5-error" role="alert">موديول التشغيل غير متاح أو SQL029 لسه مش مطبّقة.</p>}
  {state==="ready"&&data&&<>
   <div className="drvo-expenses-banner" role="status">
    <strong>Operations · Non-posting</strong>
    <span>GL {data.glPostState} · Accounting {data.accountingState} · Finance {data.readiness.financialPostingState}</span>
   </div>
   {notice&&<p className={error?"k5-error":"k5-notice"} role={error?"alert":"status"}>{notice}</p>}
   <section className="k5-admin-card k5-invite-card">
    <h2>يوم العمل</h2>
    <p className="k5-muted">المتوقع (UTC مؤقتًا): <span dir="ltr">{utcToday()}</span> · خطة: {planLabel}</p>
    {data.openDay?
     <div className="k5-admin-summary"><div>
      <p><strong>مفتوح:</strong> <span dir="ltr">{data.openDay.businessDate}</span></p>
      <p className="k5-muted">DayId <span dir="ltr">{data.openDay.dayId}</span></p>
     </div>
      <div className="k5-head-actions">
       <button type="button" className="k5-save" disabled={!!busy}
        onClick={()=>void closeDay(false)}>{busy==="close-day"?"جاري الإغلاق…":"إغلاق اليوم"}</button>
       <button type="button" className="drvo-expenses-cancel" disabled={!!busy}
        onClick={()=>void closeDay(true)}>
        {busy==="force-close-day"?"جاري الإغلاق القسري…":"إغلاق قسري مع الورديات"}
       </button>
      </div></div>:
     <button type="button" className="k5-save" disabled={!!busy} onClick={()=>void openDay()}>
      {busy==="open-day"?"جاري الفتح…":"فتح يوم العمل لليوم المتوقع"}
     </button>}
   </section>
   <section className="k5-admin-card k5-invite-card">
    <h2>الوردية</h2>
    <p className="k5-muted">الجاهزية غير المالية: {data.readiness.state==="READY_FOR_NONFINANCIAL_WORK"?
     "جاهز للعمل غير المالي":"محظور — "+data.readiness.reasons.join(", ")}</p>
    {data.openDay&&<button type="button" className="k5-save" disabled={!!busy}
     onClick={()=>void openShift()}>
     {busy==="open-shift"?"جاري فتح الوردية…":"فتح ورديتي على اليوم المفتوح"}
    </button>}
   </section>
   <section className="k5-admin-card drvo-expenses-list">
    <div className="k5-admin-summary"><div>
     <h2>آخر الورديات</h2>
     <p className="k5-muted">{data.shifts.length} سجلًا حديثًا في الفرع</p>
    </div><button type="button" className="k5-salon-refresh" onClick={()=>void load()}>تحديث</button></div>
    {data.shifts.length===0?<p className="k5-table-state">لسه مفيش ورديات.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>الوردية</th><th>اليوم</th><th>الحالة</th><th>إجراء</th></tr></thead>
      <tbody>{data.shifts.map(s=><tr key={s.shiftId}>
       <td dir="ltr">{s.shiftId.slice(0,8)}…</td>
       <td dir="ltr">{s.dayId.slice(0,8)}…</td>
       <td>{s.status==="OPEN"?"مفتوحة":"مغلقة"}</td>
       <td>{s.status==="OPEN"&&<button type="button" className="drvo-expenses-cancel"
        disabled={!!busy} onClick={()=>void closeShift(s.shiftId)}>
        {busy===s.shiftId?"جاري الإغلاق…":"إغلاق"}
       </button>}</td>
      </tr>)}</tbody>
     </table></div>}
   </section>
  </>}
 </main>;
}
