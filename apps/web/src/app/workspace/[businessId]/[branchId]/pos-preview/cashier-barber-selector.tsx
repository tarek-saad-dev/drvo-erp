"use client";
/**
 * Cashier-adapted Barber/HR executor picker for private POS (nonposting).
 * Source UX: casher@046bf19 BarberCarousel / NonBarberEmployeeModal.
 * Reads authorized HR Branch roster only; no payroll or finance side effects.
 */
import {useCallback,useEffect,useState} from "react";

export type BarberEmployee={
 employeeId:string;displayName:string;isActive:boolean;branchActive:boolean;
 isBookable:boolean;resourceId:string|null;resourceName:string|null;
};

export default function CashierBarberSelector({apiRoot,selectedId,onSelect,onRoster}:{
 apiRoot:string;selectedId:string;onSelect:(employeeId:string)=>void;
 /** Read-only roster hand-off (names for nonposting tip preview labels). */
 onRoster?:(employees:BarberEmployee[])=>void;
}){
 const [status,setStatus]=useState<"loading"|"ready"|"denied">("loading");
 const [employees,setEmployees]=useState<BarberEmployee[]>([]);
 const load=useCallback(async()=>{
  try{
   const r=await fetch(apiRoot+"/hr/employees",{credentials:"same-origin",cache:"no-store"});
   if(!r.ok){setEmployees([]);setStatus("denied");return;}
   const data=await r.json() as {employees?:BarberEmployee[]};
   if(!Array.isArray(data.employees)){setEmployees([]);setStatus("denied");return;}
   const active=data.employees.filter(e=>e.isActive&&e.branchActive);
   setEmployees(active);onRoster?.(active);
   setStatus("ready");
  }catch{setEmployees([]);setStatus("denied");}
 },[apiRoot,onRoster]);
 useEffect(()=>{void load();},[load]);
 const barbers=employees.filter(e=>e.isBookable);
 const others=employees.filter(e=>!e.isBookable);
 return <section className="k5-admin-card" aria-label="اختيار الحلاق / المنفذ"
  data-cashier-pos="barber-selector">
  <div className="k5-admin-summary"><h2>الحلاق / منفذ الخدمة</h2>
   <p className="k5-muted">من قائمة HR المصرّح بها للفرع. الاختيار للمسودة فقط — مفيش عمولة أو صرف.</p>
  </div>
  {status==="loading"&&<p role="status">جاري تحميل فريق الفرع…</p>}
  {status==="denied"&&<p role="alert" className="k5-error">HR غير متاح بالصلاحيات الحالية (hr.read).</p>}
  {status==="ready"&&<>
   <div className="k5-booking-actions" aria-label="حلاقون قابلون للحجز">
    <button type="button" className={!selectedId?"k5-save":"k5-salon-refresh"}
     onClick={()=>onSelect("")}>بدون تعيين</button>
    {barbers.map(e=><button key={e.employeeId} type="button"
     className={selectedId===e.employeeId?"k5-save":"k5-salon-refresh"}
     onClick={()=>onSelect(e.employeeId)}>
     ✂ {e.displayName}{e.resourceName?` · ${e.resourceName}`:""}
    </button>)}
   </div>
   {others.length>0&&<>
    <p className="k5-muted">موظفون غير حلاقين (Cashier NonBarber)</p>
    <div className="k5-booking-actions" aria-label="موظفون آخرون">
     {others.map(e=><button key={e.employeeId} type="button"
      className={selectedId===e.employeeId?"k5-save":"k5-salon-refresh"}
      onClick={()=>onSelect(e.employeeId)}>{e.displayName}</button>)}
    </div>
   </>}
   {employees.length===0&&<p className="k5-muted">مفيش موظفين نشطين في الفرع.</p>}
  </>}
 </section>;
}
