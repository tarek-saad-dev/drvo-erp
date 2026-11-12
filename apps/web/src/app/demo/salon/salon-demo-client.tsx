"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {
 DEMO_CUSTOMERS,DEMO_SERVICES,DEMO_STAFF,DEMO_TIMES,
 addDemoCartLine,bookDemoAppointment,demoCustomer,demoMoney,demoService,demoStaff,
 demoSubtotal,initialDemo,removeDemoCartLine,saveDemoDraft,updateDemoAppointment,
 type DemoAppointment,type DemoCartLine,type DemoSection,
} from "./demo-model";

const tabs:{id:DemoSection;label:string;icon:string}[]=[
 {id:"overview",label:"نظرة عامة",icon:"▦"},
 {id:"appointments",label:"المواعيد",icon:"▣"},
 {id:"pos",label:"نقطة البيع",icon:"◫"},
];

function statusText(status:DemoAppointment["status"]){
 return status==="confirmed"?"مؤكد":status==="completed"?"مكتمل":"ملغي";
}
export default function SalonDemoClient(){
 const [tab,setTab]=useState<DemoSection>("overview");
 const [data,setData]=useState(initialDemo);
 const [cart,setCart]=useState<DemoCartLine[]>([]);
 const [customerId,setCustomerId]=useState("guest");
 const [staffId,setStaffId]=useState("mostafa");
 const [serviceId,setServiceId]=useState("cut");
 const [time,setTime]=useState("16:00");
 const [notice,setNotice]=useState("");
 const [noticeError,setNoticeError]=useState(false);

 const confirmed=data.appointments.filter(x=>x.status==="confirmed").length;
 const completed=data.appointments.filter(x=>x.status==="completed").length;
 const booked=data.appointments.filter(x=>x.status!=="cancelled").length;
 const bookedValue=data.appointments.filter(x=>x.status==="completed")
  .reduce((sum,a)=>sum+demoService(a.serviceId).priceMinor,0);
 const total=useMemo(()=>cart.length?demoSubtotal(cart):0,[cart]);
 const appointments=useMemo(()=>[...data.appointments].sort((a,b)=>
  a.time.localeCompare(b.time)||a.id-b.id),[data.appointments]);

 function message(text:string,error=false){setNotice(text);setNoticeError(error)}
 function switchTab(next:DemoSection){setTab(next);setNotice("")}
 function book(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  try{
   setData(current=>bookDemoAppointment(current,{customerId,staffId,serviceId,time}));
   message("تم إضافة الموعد في السيناريو التجريبي ✓");
  }catch(error){message(error instanceof Error?error.message:"تعذر إضافة الموعد",true)}
 }
 function updateAppointment(id:number,status:"completed"|"cancelled"){
  try{setData(current=>updateDemoAppointment(current,id,status));
   message(status==="completed"?"اتسجل الموعد مكتمل (تجريبي)":"اتلغى الموعد التجريبي");
  }catch(e){message(e instanceof Error?e.message:"تعذر التحديث",true)}
 }
 function addService(id:string){
  try{setCart(current=>addDemoCartLine(current,id));
   message("اتضافت الخدمة لمسودة البيع");}
  catch(e){message(e instanceof Error?e.message:"تعذر الإضافة",true)}
 }
 function fromAppointment(a:DemoAppointment){
  try{setCart(current=>addDemoCartLine(current,a.serviceId));
   setTab("pos");message("أضفنا خدمة الموعد إلى مسودة البيع؛ لم يتم تحصيل أي مبلغ");}
  catch(e){message(e instanceof Error?e.message:"تعذر الإضافة",true)}
 }
 function saveDraft(){
  try{setData(current=>saveDemoDraft(current,cart));setCart([]);
   message("المسودة اتحفظت في جلسة الديمو فقط، من غير فاتورة أو دفع ✓");}
  catch(e){message(e instanceof Error?e.message:"تعذر حفظ المسودة",true)}
 }
 function resetDemo(){
  setData(initialDemo());setCart([]);setTab("overview");setNotice("");
  setCustomerId("guest");setStaffId("mostafa");setServiceId("cut");setTime("16:00");
 }

 return <main className="sd-root" dir="rtl">
  <aside className="sd-sidebar" aria-label="قائمة لوحة تحكم الديمو">
   <div className="sd-brand"><span className="sd-brand-icon">D</span><div>DRVO <b>ERP</b><small>SALON WORKSPACE</small></div></div>
   <div className="sd-workspace"><span className="sd-workspace-icon">✦</span><div><strong>Studio One</strong><small>صالون تجريبي · فرع المعاينة</small></div><span className="sd-chevron">⌄</span></div>
   <div className="sd-nav-title">إدارة النشاط</div>
   <nav className="sd-nav" aria-label="أقسام الديمو">
    {tabs.map(t=><button key={t.id} type="button" onClick={()=>switchTab(t.id)}
      className={"sd-nav-btn"+(tab===t.id?" sd-selected":"")} aria-current={tab===t.id?"page":undefined}>
      <span aria-hidden="true" className="sd-nav-icon">{t.icon}</span><span>{t.label}</span>
      {t.id==="appointments"&&<span className="sd-count">{confirmed}</span>}
    </button>)}
   </nav>
   <div className="sd-sidebar-bottom">
    <div className="sd-sandbox"><span className="sd-live-dot"/><div><strong>Demo Sandbox</strong><small>بيانات وهمية · بدون سيرفر</small></div></div>
    <Link className="sd-back" href="/">↗ الرجوع للموقع الرئيسي</Link>
   </div>
  </aside>

  <div className="sd-page">
   <header className="sd-topbar">
    <div className="sd-topbar-title"><span>مساحة العمل</span><span className="sd-crumb">/</span><strong>{tabs.find(t=>t.id===tab)?.label}</strong></div>
    <div className="sd-topbar-actions"><span className="sd-chip">● معاينة تفاعلية</span><span className="sd-avatar" aria-label="حساب تجريبي">DR</span></div>
   </header>

   <div className="sd-content">
    <div className="sd-disclaimer"><span className="sd-disclaimer-icon">ⓘ</span><span><strong>نسخة تجريبية تفاعلية</strong> — كل الأسماء والأرقام وهمية. المواعيد والمسودات موجودة في الصفحة دي فقط، وهتتمسح مع التحديث. مفيش تسجيل دخول أو حجز فعلي أو تحصيل أو فواتير.</span></div>
    {notice&&<div role="status" className={"sd-toast"+(noticeError?" sd-toast-error":"")}><span>{noticeError?"!":"✓"}</span>{notice}<button type="button" onClick={()=>setNotice("")} aria-label="إغلاق الرسالة">×</button></div>}

    {tab==="overview"&&<>
     <div className="sd-heading-row"><div><div className="sd-kicker">SALON MANAGEMENT / OVERVIEW</div><h1>صباح الشغل الحلو <span>✳</span></h1><p>نظرة سريعة على حركة الصالون في يوم تجريبي</p></div><button className="sd-primary" type="button" onClick={()=>switchTab("appointments")}><span>＋</span> حجز موعد جديد</button></div>
     <div className="sd-stats">
      <article className="sd-stat"><span className="sd-stat-top"><span>إجمالي المواعيد</span><span className="sd-stat-icon">▣</span></span><strong>{booked.toString().padStart(2,"0")}</strong><small>خلال اليوم التجريبي</small></article>
      <article className="sd-stat"><span className="sd-stat-top"><span>مواعيد في الانتظار</span><span className="sd-stat-icon sd-icon-violet">◷</span></span><strong>{confirmed.toString().padStart(2,"0")}</strong><small>مواعيد مؤكدة</small></article>
      <article className="sd-stat"><span className="sd-stat-top"><span>خدمات مكتملة</span><span className="sd-stat-icon sd-icon-blue">✓</span></span><strong>{completed.toString().padStart(2,"0")}</strong><small>تم تغيير حالتها داخل الديمو</small></article>
      <article className="sd-stat"><span className="sd-stat-top"><span>قيمة الخدمات المكتملة</span><span className="sd-stat-icon sd-icon-amber">◈</span></span><strong className="sd-stat-money">{demoMoney(bookedValue)}</strong><small>قيمة استرشادية · ليست تحصيلًا</small></article>
     </div>
     <div className="sd-panels">
      <section className="sd-panel sd-main-panel"><div className="sd-panel-header"><div><span className="sd-panel-eyebrow">TODAY'S SCHEDULE</span><h2>مواعيد اليوم</h2></div><button className="sd-text-button" type="button" onClick={()=>switchTab("appointments")}>عرض كل المواعيد ←</button></div>
      <div className="sd-appointment-list">
       {appointments.filter(a=>a.status!=="cancelled").slice(0,5).map(a=><AppointmentRow key={a.id} row={a} compact onSelect={()=>fromAppointment(a)}/>)}
      </div></section>
      <section className="sd-panel sd-aside-panel"><div className="sd-panel-header"><div><span className="sd-panel-eyebrow">QUICK ACTIONS</span><h2>ابدأ من هنا</h2></div></div>
       <button className="sd-quick" type="button" onClick={()=>switchTab("appointments")}><span className="sd-quick-icon">▣</span><span><strong>حجز موعد</strong><small>اختر خدمة وحلاق ووقت</small></span><span className="sd-quick-arrow">←</span></button>
       <button className="sd-quick" type="button" onClick={()=>switchTab("pos")}><span className="sd-quick-icon sd-q-violet">◫</span><span><strong>مسودة بيع</strong><small>اختار خدمات واحسب الإجمالي</small></span><span className="sd-quick-arrow">←</span></button>
       <div className="sd-team"><h3>فريق العمل</h3>{DEMO_STAFF.map((s,i)=><div key={s.id} className="sd-team-row"><span className={"sd-staff-avatar sd-staff-"+i}>{s.initials}</span><div><strong>{s.name}</strong><small>{s.role}</small></div><span className="sd-available">متاح</span></div>)}</div>
      </section>
     </div>
    </>}

    {tab==="appointments"&&<>
     <div className="sd-heading-row"><div><div className="sd-kicker">BOOKING / DEMO DAY</div><h1>إدارة المواعيد</h1><p>أضف موعد، جرّب منع التعارض، وغيّر حالته بنفسك</p></div><span className="sd-date">◷ الخميس 12 نوفمبر 2026 · يوم تجريبي</span></div>
     <div className="sd-panels sd-booking-layout">
      <section className="sd-panel"><div className="sd-panel-header"><div><span className="sd-panel-eyebrow">CREATE APPOINTMENT</span><h2>حجز جديد</h2></div></div>
       <form className="sd-book-form" onSubmit={book}>
        <label>العميل التجريبي<select value={customerId} onChange={e=>setCustomerId(e.target.value)}>{DEMO_CUSTOMERS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>الخدمة<select value={serviceId} onChange={e=>setServiceId(e.target.value)}>{DEMO_SERVICES.map(s=><option key={s.id} value={s.id}>{s.name} — {demoMoney(s.priceMinor)}</option>)}</select></label>
        <label>الحلاق<select value={staffId} onChange={e=>setStaffId(e.target.value)}>{DEMO_STAFF.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>الساعة<select value={time} onChange={e=>setTime(e.target.value)}>{DEMO_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
        <div className="sd-price-hint"><span>السعر الاسترشادي</span><strong>{demoMoney(demoService(serviceId).priceMinor)}</strong><small>{demoService(serviceId).duration} دقيقة</small></div>
        <button className="sd-primary sd-full" type="submit">＋ تأكيد الموعد التجريبي</button>
       </form>
      </section>
      <section className="sd-panel"><div className="sd-panel-header"><div><span className="sd-panel-eyebrow">APPOINTMENT LIST</span><h2>جدول المواعيد <span className="sd-number">{data.appointments.length}</span></h2></div></div>
       <div className="sd-appointment-list sd-booking-list">{appointments.map(a=><AppointmentRow key={a.id} row={a}
        onSelect={()=>fromAppointment(a)} onComplete={()=>updateAppointment(a.id,"completed")}
        onCancel={()=>updateAppointment(a.id,"cancelled")}/>)}</div>
      </section>
     </div>
    </>}

    {tab==="pos"&&<>
     <div className="sd-heading-row"><div><div className="sd-kicker">POS / DRAFT MODE</div><h1>نقطة البيع <span>↗</span></h1><p>اختار خدمات من الكتالوج، احسب الإجمالي، واحفظ مسودة تجريبية</p></div><span className="sd-date">وضع المسودة فقط · بدون تحصيل</span></div>
     <div className="sd-pos-layout">
      <section className="sd-panel"><div className="sd-panel-header"><div><span className="sd-panel-eyebrow">SERVICE CATALOG</span><h2>كتالوج الخدمات</h2></div><span className="sd-number">{DEMO_SERVICES.length} خدمات</span></div>
       <div className="sd-service-grid">{DEMO_SERVICES.map((s,i)=><button key={s.id} type="button" className="sd-service-card" onClick={()=>addService(s.id)}>
        <span className={"sd-service-graphic sd-service-"+i}>{["✂","◈","✦","◉","⌁","❋"][i]}</span>
        <small>{s.category} · {s.duration} دقيقة</small><strong>{s.name}</strong>
        <span className="sd-service-bottom"><span>{demoMoney(s.priceMinor)}</span><span className="sd-service-add">＋</span></span>
       </button>)}</div>
      </section>
      <aside className="sd-panel sd-checkout"><div className="sd-panel-header"><div><span className="sd-panel-eyebrow">DRAFT SUMMARY</span><h2>مسودة البيع</h2></div><span className="sd-number">{cart.reduce((n,x)=>n+x.quantity,0)} عناصر</span></div>
       {cart.length===0?<div className="sd-empty"><span>◫</span><strong>المسودة فاضية</strong><p>اضغط على أي خدمة لإضافتها للمسودة</p></div>:
        <div className="sd-cart-items">{cart.map(line=><div key={line.serviceId} className="sd-cart-row"><div><strong>{demoService(line.serviceId).name}</strong><small>الكمية: {line.quantity}</small></div><span>{demoMoney(demoService(line.serviceId).priceMinor*line.quantity)}</span><button type="button" aria-label={"إزالة "+demoService(line.serviceId).name} onClick={()=>{setCart(current=>removeDemoCartLine(current,line.serviceId));message("")}}>×</button></div>)}</div>}
       <div className="sd-checkout-bottom"><div className="sd-subtotal"><span>إجمالي قائمة الأسعار</span><strong>{demoMoney(total)}</strong></div><p>لا يشمل ضرائب أو خصومات. ليس فاتورة أو مبلغًا مستحقًا.</p><button className="sd-primary sd-full" type="button" disabled={cart.length===0} onClick={saveDraft}>حفظ مسودة تجريبية <span>←</span></button></div>
       <div className="sd-saved"><div className="sd-saved-title">المسودات المحفوظة داخل الصفحة <span>{data.drafts.length}</span></div>
        {data.drafts.length===0?<p>لسه مفيش مسودات. جرّب تضيف خدمة وتحفظها.</p>:
         data.drafts.map(d=><div key={d.id} className="sd-draft-row"><span>مسودة #{String(d.id).padStart(3,"0")} <small>غير مدفوعة</small></span><strong>{demoMoney(d.subtotalMinor)}</strong></div>)}
       </div>
      </aside>
     </div>
    </>}
    <div className="sd-demo-footer"><span>DRVO ERP · Interactive Salon Demo · No real transactions</span><button type="button" onClick={resetDemo}>↺ إعادة ضبط الديمو</button></div>
   </div>
  </div>
 </main>;
}

function AppointmentRow({row,compact=false,onSelect,onComplete,onCancel}:{
 row:DemoAppointment;compact?:boolean;onSelect:()=>void;onComplete?:()=>void;onCancel?:()=>void;
}){
 const staff=demoStaff(row.staffId);
 const service=demoService(row.serviceId);
 return <article className={"sd-appointment"+(row.status==="cancelled"?" sd-appt-cancelled":"")}>
  <span className="sd-appt-time">{row.time}</span>
  <span className="sd-appt-avatar">{staff.initials}</span>
  <div className="sd-appt-info"><strong>{demoCustomer(row.customerId).name}</strong><small>{service.name} · {staff.name}</small></div>
  <span className={"sd-status sd-status-"+row.status}>{statusText(row.status)}</span>
  <div className="sd-appt-actions">
   {row.status!=="cancelled"&&<button type="button" onClick={onSelect} title="إضافة الخدمة لمسودة البيع">{compact?"مسودة":"أضف للبيع"}</button>}
   {!compact&&row.status==="confirmed"&&<><button type="button" onClick={onComplete}>مكتمل</button><button type="button" onClick={onCancel}>إلغاء</button></>}
  </div>
 </article>;
}
