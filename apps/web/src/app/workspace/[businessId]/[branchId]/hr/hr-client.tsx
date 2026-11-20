"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Employee={employeeId:string;employeeCode:string;displayName:string;
 employmentType:"full_time"|"part_time"|"freelance";
 payrollMethod:"hourly"|"daily"|"monthly";isActive:boolean;branchActive:boolean;
 isBookable:boolean;resourceId:string|null;resourceName:string|null};
type Resource={resourceId:string;displayName:string;kind:string;isActive:boolean};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// HR and Booking remain separate data owners; binding uses Booking Resource ID only.
export default function HrClient({businessId,branchId,attendanceWebEnabled}:{businessId:string;branchId:string;attendanceWebEnabled:boolean}){
 const router=useRouter();
 const [state,setState]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [resources,setResources]=useState<Resource[]>([]);
 const [code,setCode]=useState("");
 const [name,setName]=useState("");
 const [employmentType,setEmploymentType]=useState<Employee["employmentType"]>("full_time");
 const [payrollMethod,setPayrollMethod]=useState<Employee["payrollMethod"]>("daily");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [configBusy,setConfigBusy]=useState("");
 const [selectedResources,setSelectedResources]=useState<Record<string,string>>({});
 const requestId=useRef<string|null>(null);
 const configIds=useRef<Record<string,string>>({});
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+
   encodeURIComponent(branchId)+"/hr/employees";
 const booking="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+
   encodeURIComponent(branchId)+"/booking";
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const r=await fetch(api,{credentials:"same-origin",cache:"no-store"});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setState("denied");return;}
   if(!r.ok){setState("unavailable");return;}
   const data=await r.json() as {employees?:Employee[]};
   const employees=data.employees;
   if(!Array.isArray(employees)){setState("unavailable");return;}
   setEmployees(employees);
   setSelectedResources(current=>{
    const next={...current};
    for(const e of employees)if(!(e.employeeId in next))next[e.employeeId]=e.resourceId??"";
    return next;
   });
   setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
  let live=true;
  if(!GUID.test(businessId)||!GUID.test(branchId))return;
  void fetch(booking,{credentials:"same-origin",cache:"no-store"})
   .then(async r=>{
    if(!r.ok||!live)return;
    const data=await r.json() as {resources?:Resource[]};
    if(live&&Array.isArray(data.resources))
     setResources(data.resources.filter(x=>x.kind==="PERSON"&&x.isActive));
   }).catch(()=>{});
  return ()=>{live=false;};
 },[booking,businessId,branchId]);
 async function createEmployee(){
  if(busy||configBusy)return;
  if(!/^[A-Z0-9_-]{2,32}$/.test(code)||!name.trim()||
     name.trim()!==name||(employmentType==="freelance"&&payrollMethod==="monthly")){
   setNotice("راجع كود الموظف واسمه ونظام المرتب؛ الفري لانس لا يقبل شهري.");return;
  }
  setBusy(true);setNotice("");
  if(!requestId.current)requestId.current=crypto.randomUUID();
  try{
   const r=await fetch(api,{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":requestId.current},
    body:JSON.stringify({employeeCode:code,displayName:name,employmentType,payrollMethod})});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setNotice("غير مصرح بإضافة موظف.");return;}
   if(r.status===409){requestId.current=null;setNotice("الكود مستخدم أو الطلب اتغير.");return;}
   if(!r.ok){setNotice("تعذر حفظ الموظف. جرّب نفس البيانات بدون تكرار.");return;}
   requestId.current=null;setCode("");setName("");
   setNotice("اتسجل الموظف في فرعك بنجاح، بدون صرف مرتب أو قيود مالية.");
   await load();
  }catch{setNotice("اتصال غير متاح؛ أعد نفس الطلب بدون تكرار.");}
  finally{setBusy(false);}
 }
 function create(event:React.FormEvent<HTMLFormElement>){
  // Keep Enter-in-field submit, but the primary button is type=button so Chromium
  // automation never waits on native form navigation after type=submit click.
  event.preventDefault();
  void createEmployee();
 }
 async function setBarber(e:Employee,bookable:boolean){
  if(configBusy||busy)return;
  const resourceId=bookable?(selectedResources[e.employeeId]||null):null;
  if(bookable&&(!resourceId||!GUID.test(resourceId)||
     !resources.some(x=>x.resourceId===resourceId))){
   setNotice("اختار مورد حجز PERSON نشط من الفرع قبل تفعيل الحلاق.");return;
  }
  setConfigBusy(e.employeeId);setNotice("");
  if(!configIds.current[e.employeeId])configIds.current[e.employeeId]=crypto.randomUUID();
  try{
   const r=await fetch(api+"/"+encodeURIComponent(e.employeeId)+"/barber",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":configIds.current[e.employeeId]},
    body:JSON.stringify({resourceId,isBookable:bookable})});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setNotice("مش مسموح بتعديل الحلاق أو الموظف/المورد مش موجود في الفرع.");return;}
   if(r.status===409){delete configIds.current[e.employeeId];setNotice("تعارض في ربط المورد أو مفتاح الطلب.");return;}
   if(!r.ok){setNotice("تعذر تحديث الحلاق. أعد المحاولة بنفس البيانات.");return;}
   delete configIds.current[e.employeeId];
   setNotice(bookable?"تم ربط الحلاق بمورد الحجز.":"تم إيقاف تفعيل الحلاق في الفرع.");
   await load();
  }catch{setNotice("الاتصال غير متاح؛ أعد المحاولة بدون تغيير الاختيار.");}
  finally{setConfigBusy("");}
 }
 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">HR CORE + SALON BARBER EXTENSION</span>
   <h1>الموظفون والحلاقون</h1>
   <p className="k5-muted">الموظف مملوك للـBusiness، وتخصيصه للحلاقة مربوط بالفرع ومورد Booking.
    المرتبات والعمولات هنا تصنيفات فقط؛ لا يوجد Payroll أو تحصيل أو خصومات مالية.</p>
  </div></div>
  {state==="loading"&&<p role="status">جاري تحميل موظفي الفرع…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">مش مصرح لك بعرض HR لهذا الفرع.</p>}
  {state==="unavailable"&&<p role="alert" className="k5-error">HR مش متاح حاليًا أو Migration 018 غير مطبّقة.</p>}
  {state==="ready"&&<>
   {attendanceWebEnabled&&<Link className="k5-verify-link" href={home+"/hr/attendance"}>الحضور والانصراف (HR)</Link>}
   {notice&&<p role="status" className="k5-notice">{notice}</p>}
   <section className="k5-admin-card k5-invite-card">
    <h2>إضافة موظف للفرع</h2>
    <form className="catalog-form" onSubmit={create}>
     <label>كود الموظف (حروف إنجليزية كبيرة وأرقام)
      <input required value={code} maxLength={32} pattern="[A-Z0-9_-]{2,32}"
       onChange={e=>{setCode(e.target.value);requestId.current=null;}}/>
     </label>
     <label>اسم الموظف
      <input required value={name} maxLength={160}
       onChange={e=>{setName(e.target.value);requestId.current=null;}}/>
     </label>
     <label>نوع التوظيف
      <select value={employmentType} onChange={e=>{
       setEmploymentType(e.target.value as Employee["employmentType"]);requestId.current=null;
      }}>
       <option value="full_time">دوام كامل</option>
       <option value="part_time">دوام جزئي</option>
       <option value="freelance">فري لانس</option>
      </select>
     </label>
     <label>نظام احتساب الأجر (بدون تفعيل Payroll)
      <select value={payrollMethod} onChange={e=>{
       setPayrollMethod(e.target.value as Employee["payrollMethod"]);requestId.current=null;
      }}>
       <option value="hourly">بالساعة</option>
       <option value="daily">يومية</option>
       <option value="monthly">شهري</option>
      </select>
     </label>
     <button className="k5-save" type="button" disabled={busy||!!configBusy}
      onClick={()=>void createEmployee()}>
      {busy?"جاري الحفظ…":"إضافة موظف"}
     </button>
    </form>
   </section>
   <section className="k5-admin-card">
    <h2>موظفو الفرع ({employees.length})</h2>
    <p className="k5-muted">ربط الموظف بالحلاق لا ينشئ مورد Booking جديد؛ اختار مورد PERSON موجود من المواعيد.
     المستخدم اللي معندوش صلاحية Booking مش هيشوف الموارد.</p>
    {employees.length===0?<p>مفيش موظفين مسجلين للفرع.</p>:
    <div className="k5-table-wrap"><table className="k5-table">
     <thead><tr><th>الكود</th><th>الموظف</th><th>التوظيف</th><th>الأجر</th><th>الحلاق</th><th>مورد الحجز</th><th>الإجراء</th></tr></thead>
     <tbody>{employees.map(e=><tr key={e.employeeId}>
      <td dir="ltr">{e.employeeCode}</td><td>{e.displayName}</td>
      <td>{e.employmentType==="full_time"?"دوام كامل":e.employmentType==="part_time"?"جزئي":"فري لانس"}</td>
      <td>{e.payrollMethod==="hourly"?"بالساعة":e.payrollMethod==="daily"?"يومية":"شهري"}</td>
      <td>{e.isBookable?"حلاق نشط":"غير مفعّل"}</td>
      <td><select aria-label={"مورد حجز "+e.displayName}
       value={selectedResources[e.employeeId]??""} disabled={!!configBusy||busy||resources.length===0}
       onChange={ev=>{
        setSelectedResources(current=>({...current,[e.employeeId]:ev.target.value}));
        delete configIds.current[e.employeeId];
       }}>
       <option value="">اختار مورد PERSON</option>
       {resources.map(resource=><option value={resource.resourceId} key={resource.resourceId}>{resource.displayName}</option>)}
      </select></td>
      <td>{e.isBookable?
       <button type="button" disabled={!!configBusy||busy} onClick={()=>void setBarber(e,false)}>إيقاف الحلاق</button>:
       <button type="button" disabled={!!configBusy||busy||resources.length===0}
        onClick={()=>void setBarber(e,true)}>تفعيل كحلاق</button>}</td>
     </tr>)}</tbody>
    </table></div>}
    <p className="k5-muted">كل العمليات بتستخدم Idempotency-Key وK5 Tenant/Business/Branch authorization.
     مفيش حساب مستخدم أو رواتب متدفعة بتتعمل ضمن إنشاء الموظف.</p>
   </section>
  </>}
 </main>;
}
