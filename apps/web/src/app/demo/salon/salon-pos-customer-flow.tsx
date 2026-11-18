"use client";
import {useMemo,useState} from "react";
import {demoCustomer,demoCustomerVisits,demoMoney,demoPosItem,demoStaff,searchDemoCustomers,type DemoData} from "./demo-model";

export default function SalonPosCustomerFlow({data,customerId,onSelect,onCreate,onRepeat,hasCart}:{
 data:DemoData;customerId:string;onSelect:(id:string)=>void;
 onCreate:(name:string,phone:string)=>boolean;onRepeat:()=>void;hasCart:boolean;
}){
 const [query,setQuery]=useState("");
 const [creating,setCreating]=useState(false);
 const [name,setName]=useState("");
 const [phone,setPhone]=useState("");
 const [confirmReplace,setConfirmReplace]=useState(false);
 const matched=useMemo(()=>searchDemoCustomers(data,query),[data,query]);
 const customer=demoCustomer(customerId,data);
 const visits=useMemo(()=>demoCustomerVisits(data,customerId),[data,customerId]);
 const last=visits[0];
 function openCreate(prefill=""){
  const phoneLike=/^[\d٠-٩۰-۹+\s-]{6,}$/.test(prefill.trim());
  setPhone(phoneLike?prefill.trim():"");
  setName(phoneLike?"":prefill.trim());
  setCreating(true);setQuery("");
 }
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(onCreate(name,phone)){setCreating(false);setName("");setPhone("");}
 }
 return <>
  <div className="sd-pos-customer-picker">
   <label htmlFor="sd-demo-customer-search">العميل · بحث بالاسم أو رقم الموبايل</label>
   <input id="sd-demo-customer-search" type="search" autoComplete="off" maxLength={80}
    placeholder="ابحث عن اسم أو رقم…" value={query} onChange={e=>setQuery(e.target.value)}/>
   {query.trim()&&<div className="sd-pos-customer-results" aria-label="نتائج بحث العملاء التجريبية">
    {matched.map(c=><button key={c.id} type="button" onClick={()=>{
     onSelect(c.id);setQuery("");setConfirmReplace(false);
    }}><strong>{c.name}</strong><span dir="ltr">{c.phone??"بدون رقم"}</span></button>)}
    {matched.length===0&&<p>العميل مش موجود في القائمة التجريبية.</p>}
    <button type="button" className="sd-pos-create-link" onClick={()=>openCreate(query)}>
     ＋ {matched.length?"تسجيل عميل جديد":"تسجيل هذا العميل"}
    </button>
   </div>}
   <div className="sd-pos-picked"><span>المختار: <strong>{customer.name}</strong>
    {customer.phone&&<small dir="ltr">{customer.phone}</small>}</span>
    <button type="button" onClick={()=>openCreate()}>＋ تسجيل عميل</button>
   </div>
  </div>
  <section className="sd-pos-customer-visit" aria-label="آخر زيارات العميل التجريبية">
   <div className="sd-pos-visit-title"><strong>آخر زيارة للعميل</strong>
    <span>نماذج افتراضية ومسودات الجلسة فقط، ليست فواتير مدفوعة</span></div>
   {last?<div className="sd-pos-visit-row">
    <div><strong>{last.kind==="SAMPLE"?"زيارة نموذجية (افتراضية)":"مسودة محفوظة داخل الديمو"}</strong>
     <span>{demoStaff(last.staffId).name} · {last.lines.map(x=>demoPosItem(x.serviceId).name+" × "+x.quantity).join("، ")}</span>
     <small>إجمالي السجل التجريبي: {demoMoney(last.totalMinor)} · NOT COLLECTED</small>
    </div>
    <button type="button" onClick={()=>hasCart?setConfirmReplace(true):onRepeat()}>
     ↶ تطبيق آخر زيارة في السلة</button>
   </div>:<p>مفيش زيارة سابقة في الديمو. جرّب العميل «عمر»، أو احفظ مسودة جديدة.</p>}
   {confirmReplace&&<div className="sd-pos-visit-confirm" role="group" aria-label="تأكيد استبدال السلة">
    <span>عندك أصناف في السلة. تستبدلها بمحتويات آخر زيارة تجريبية؟</span>
    <button type="button" onClick={()=>{onRepeat();setConfirmReplace(false)}}>استبدال السلة</button>
    <button type="button" onClick={()=>setConfirmReplace(false)}>إلغاء</button>
   </div>}
  </section>
  {creating&&<div className="sd-pos-create-overlay">
   <div className="sd-pos-create-dialog" role="dialog" aria-modal="true" aria-labelledby="sd-pos-create-title">
    <h2 id="sd-pos-create-title">تسجيل عميل جديد · Demo</h2>
    <p>التسجيل داخل الصفحة فقط. البيانات مش هتترفع للسيرفر وهتتمسح لما تعمل Refresh.</p>
    <form onSubmit={submit}>
     <label>اسم العميل<input autoFocus required type="text" maxLength={80} minLength={2}
      value={name} onChange={e=>setName(e.target.value)} placeholder="اسم عميل تجريبي"/></label>
     <label>رقم الموبايل<input required type="tel" maxLength={20} inputMode="tel" dir="ltr"
      value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01000000005"/></label>
     <div className="sd-pos-create-buttons">
      <button type="button" onClick={()=>setCreating(false)}>إلغاء</button>
      <button type="submit">حفظ واختيار العميل</button>
     </div>
    </form>
   </div>
  </div>}
 </>;
}
