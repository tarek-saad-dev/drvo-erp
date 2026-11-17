"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import type {Dispatch,SetStateAction} from "react";
import {
 DEMO_CUSTOMERS,DEMO_PRODUCTS,DEMO_SERVICES,DEMO_STAFF,
 addDemoCartLine,changeDemoCartQuantity,demoDraftTotals,demoMoney,
 demoPosItem,demoSplitPreview,removeDemoCartLine,
 type DemoCartLine,type DemoData,type DemoDiscount,type DemoDraftOptions,
} from "./demo-model";

type Props={
 cart:DemoCartLine[];setCart:Dispatch<SetStateAction<DemoCartLine[]>>;
 data:DemoData;customerId:string;setCustomerId:(v:string)=>void;
 staffId:string;setStaffId:(v:string)=>void;
 saveDraft:(options:DemoDraftOptions)=>boolean;
 message:(text:string,error?:boolean)=>void;
};
type Category="all"|"services"|"packages"|"products";
type DiscountMode=DemoDiscount["mode"];
const inventory=[...DEMO_SERVICES,...DEMO_PRODUCTS];
function parseMinor(raw:string):number|null{
 if(raw==="")return 0;
 if(!/^(0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(raw))return null;
 const [major,fraction=""]=raw.split(".");
 const minor=Number(major)*100+Number(fraction.padEnd(2,"0"));
 return Number.isSafeInteger(minor)&&minor<=9_000_000_000_000?minor:null;
}
function toDiscount(mode:DiscountMode,raw:string):DemoDiscount|null{
 if(mode==="none")return {mode:"none",value:0};
 if(mode==="percent"){
  if(!/^(0|[1-9]\d{0,2})$/.test(raw||"0"))return null;
  const value=Number(raw||"0");
  return value<=100?{mode,value}:null;
 }
 const value=parseMinor(raw);
 return value===null?null:{mode,value};
}
export default function SalonPosWorkspace({
 cart,setCart,data,customerId,setCustomerId,staffId,setStaffId,saveDraft,message,
}:Props){
 const [category,setCategory]=useState<Category>("all");
 const [search,setSearch]=useState("");
 const [discountMode,setDiscountMode]=useState<DiscountMode>("none");
 const [discountText,setDiscountText]=useState("");
 const [split,setSplit]=useState(false);
 const [cashText,setCashText]=useState("");
 const [notes,setNotes]=useState("");
 const [expandedDraft,setExpandedDraft]=useState<number|null>(null);
 const searchRef=useRef<HTMLInputElement>(null);
 const displayed=useMemo(()=>inventory.filter(item=>{
  const byType=category==="all"||
   (category==="products"&&"stock" in item)||
   (category==="services"&&!("stock" in item)&&item.category!=="باكدجات")||
   (category==="packages"&&!("stock" in item)&&item.category==="باكدجات");
  return byType&&(!search.trim()||
   (item.name+" "+item.category).toLocaleLowerCase("ar-EG")
    .includes(search.trim().toLocaleLowerCase("ar-EG")));
 }),[category,search]);
 const discount=toDiscount(discountMode,discountText);
 const price=useMemo(()=>{
  if(!cart.length||!discount)return null;
  try{return demoDraftTotals(cart,discount)}catch{return null;}
 },[cart,discountMode,discountText,discount?.mode,discount?.value]);
 const splitMinor=parseMinor(cashText);
 const splitResult=useMemo(()=>{
  if(!split||!price||splitMinor===null)return null;
  try{return demoSplitPreview(price.totalMinor,splitMinor)}
  catch{return null;}
 },[split,price,splitMinor]);
 const ready=cart.length>0&&price!==null&&(!split||splitResult!==null);
 function addItem(id:string){
  try{setCart(addDemoCartLine(cart,id));message("أضفت صنف للفاتورة التجريبية (مسودة فقط).");}
  catch(e){message(e instanceof Error?e.message:"الصنف غير متاح",true);}
 }
 function adjust(id:string,delta:1|-1){
  try{setCart(changeDemoCartQuantity(cart,id,delta));message("");}
  catch(e){message(e instanceof Error?e.message:"الكمية غير متاحة",true);}
 }
 function remove(id:string){setCart(removeDemoCartLine(cart,id));message("");}
 function save(){
  if(!ready||!discount){message("راجع السعر والخصم وتقسيم الدفع التجريبي.",true);return;}
  // Split values are a visual NOT_COLLECTED preview, never persisted as real payment.
  if(saveDraft({customerId,staffId,discount,note:notes})){
   setDiscountMode("none");setDiscountText("");setCashText("");
   setSplit(false);setNotes("");setExpandedDraft(null);
  }
 }
 useEffect(()=>{
  function onKey(e:KeyboardEvent){
   const target=e.target as HTMLElement|null;
   const editable=target?.isContentEditable||
    ["INPUT","TEXTAREA","SELECT"].includes(target?.tagName??"");
   if(e.key==="/"&&!editable){
    e.preventDefault();searchRef.current?.focus();
   }
   if(e.key==="F9"){
    e.preventDefault();
    if(!editable&&ready)save();
   }
  }
  window.addEventListener("keydown",onKey);
  return ()=>window.removeEventListener("keydown",onKey);
 });
 return <>
  <div className="sd-heading-row sd-pos-heading"><div>
   <div className="sd-kicker">POS / CASHIER-INSPIRED OPERATOR WORKSPACE</div>
   <h1>نقطة البيع</h1>
   <p>اختار العميل والحلاق، أضف خدمات أو منتجات، راجع الخصم والدفع، واحفظ مسودة فقط.</p>
  </div><span className="sd-date">تجربة واجهة · لا يوجد بيع أو تحصيل فعلي</span></div>
  <div className="sd-pos-toolbar" aria-label="بيانات المسودة">
   <label>العميل
    <select value={customerId} onChange={e=>setCustomerId(e.target.value)}>
     {DEMO_CUSTOMERS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
   </label>
   <label>الحلاق / منفذ الخدمة (تجريبي)
    <select value={staffId} onChange={e=>setStaffId(e.target.value)}>
     {DEMO_STAFF.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
   </label>
   <div className="sd-pos-toolbar-note">مسودة داخل الصفحة فقط<br/>لا فواتير أو مخزون مخصوم</div>
  </div>
  <div className="sd-pos-layout sd-pos-pro">
   <section className="sd-panel sd-pos-catalog">
    <div className="sd-panel-header"><div>
     <span className="sd-panel-eyebrow">CATALOG / SERVICES · PACKAGES · PRODUCTS</span>
     <h2>الكتالوج</h2>
    </div><span className="sd-number">{displayed.length} صنف</span></div>
    <div className="sd-pos-catalog-controls">
     <div className="sd-pos-category-tabs" role="group" aria-label="تصنيف الكتالوج">
      {([{id:"all",name:"الكل"},{id:"services",name:"الخدمات"},
        {id:"packages",name:"الباكدجات"},{id:"products",name:"المنتجات"}] as const)
       .map(tab=><button key={tab.id} type="button"
        className={category===tab.id?"sd-category-current":""}
        aria-pressed={category===tab.id} onClick={()=>setCategory(tab.id)}>
        {tab.name}
       </button>)}
     </div>
     <label className="sd-pos-search"><span>بحث سريع <kbd>/</kbd></span>
      <input ref={searchRef} type="search" value={search} onChange={e=>setSearch(e.target.value)}
       placeholder="اسم الخدمة أو المنتج…" aria-label="البحث في الكتالوج"/>
     </label>
    </div>
    {displayed.length===0?<div className="sd-pos-no-results">مفيش أصناف مطابقة للبحث.</div>:
     <div className="sd-service-grid sd-service-grid-compact">
      {displayed.map((item,i)=><button key={item.id} type="button"
       className="sd-service-card sd-service-card-compact" onClick={()=>addItem(item.id)}>
       <span className={"sd-service-graphic sd-service-"+(i%6)}>
        {"stock" in item?"▣":item.category==="باكدجات"?"✦":"✂"}
       </span>
       <small>{item.category} · {"stock" in item?"متاح "+item.stock+" قطع":item.duration+" دقيقة"}</small>
       <strong>{item.name}</strong>
       <span className="sd-service-bottom"><span>{demoMoney(item.priceMinor)}</span>
        <span className="sd-service-add">＋</span></span>
      </button>)}
     </div>}
   </section>
   <aside className="sd-panel sd-checkout sd-checkout-pro">
    <div className="sd-panel-header"><div>
     <span className="sd-panel-eyebrow">INVOICE DRAFT / NOT POSTED</span>
     <h2>مسودة البيع</h2>
    </div><span className="sd-number">{cart.reduce((n,x)=>n+x.quantity,0)} عناصر</span></div>
    {cart.length===0?<div className="sd-empty sd-pos-empty">
     <span>◫</span><strong>السلة فاضية</strong><p>اختار خدمات أو منتجات من الكتالوج.</p>
    </div>:<div className="sd-cart-items">
     {cart.map(line=><div key={line.serviceId} className="sd-cart-row sd-cart-pro-row">
      <div><strong>{demoPosItem(line.serviceId).name}</strong>
       <small>{demoMoney(demoPosItem(line.serviceId).priceMinor)} للوحدة</small>
       <div className="sd-pos-qty" role="group" aria-label={"كمية "+demoPosItem(line.serviceId).name}>
        <button type="button" aria-label={"تقليل "+demoPosItem(line.serviceId).name}
         onClick={()=>adjust(line.serviceId,-1)}>−</button>
        <b>{line.quantity}</b>
        <button type="button" aria-label={"زيادة "+demoPosItem(line.serviceId).name}
         onClick={()=>adjust(line.serviceId,1)}>＋</button>
       </div>
      </div>
      <span>{demoMoney(demoPosItem(line.serviceId).priceMinor*line.quantity)}</span>
      <button type="button" className="sd-cart-delete"
       aria-label={"إزالة "+demoPosItem(line.serviceId).name}
       onClick={()=>remove(line.serviceId)}>×</button>
     </div>)}
    </div>}
    <div className="sd-pos-finance-preview">
     <h3>ملخص الأسعار <small>حساب تجريبي فقط</small></h3>
     <div className="sd-pos-value-line"><span>الإجمالي قبل الخصم</span>
      <b>{cart.length?demoMoney(price?.subtotalMinor??cart.reduce((sum,r)=>
       sum+demoPosItem(r.serviceId).priceMinor*r.quantity,0)):demoMoney(0)}</b></div>
     <div className="sd-pos-discount">
      <label>نوع الخصم
       <select value={discountMode} onChange={e=>{
        setDiscountMode(e.target.value as DiscountMode);setDiscountText("");
       }}>
        <option value="none">بدون خصم</option><option value="fixed">قيمة ثابتة</option>
        <option value="percent">نسبة مئوية %</option>
       </select>
      </label>
      {discountMode!=="none"&&<label>{discountMode==="fixed"?"المبلغ (ج.م)":"النسبة %"}
       <input type="text" inputMode="decimal" value={discountText} placeholder="0"
        onChange={e=>setDiscountText(e.target.value)}/>
      </label>}
     </div>
     {cart.length>0&&!price&&<p className="sd-pos-inline-error" role="alert">الخصم غير صالح أو أكبر من قيمة المسودة.</p>}
     <div className="sd-pos-value-line"><span>الخصم</span><b>{demoMoney(price?.discountMinor??0)}</b></div>
     <div className="sd-pos-value-line sd-pos-total"><span>الإجمالي بعد الخصم</span>
      <strong>{demoMoney(price?.totalMinor??0)}</strong></div>
     <div className="sd-pos-tender">
      <div className="sd-pos-tender-heading"><span>معاينة تقسيم المبلغ</span>
       <label className="sd-pos-split-toggle">
        <input type="checkbox" checked={split} onChange={e=>setSplit(e.target.checked)}/>
        نقدي + إلكتروني
       </label>
      </div>
      {split?<div className="sd-pos-split">
       <label>المقترح نقدي (ج.م)
        <input type="text" inputMode="decimal" placeholder="0.00" value={cashText}
         onChange={e=>setCashText(e.target.value)}/>
       </label>
       {splitResult&&<div className="sd-pos-split-amounts">
        <span>نقدي: <b>{demoMoney(splitResult.cashMinor)}</b></span>
        <span>إلكتروني: <b>{demoMoney(splitResult.electronicMinor)}</b></span>
       </div>}
       {price&&!splitResult&&<p role="alert" className="sd-pos-inline-error">المبلغ النقدي مينفعش يتجاوز الإجمالي.</p>}
      </div>:<p>المعاينة الافتراضية نقدي بالكامل — لم يتم استلام أي مبلغ.</p>}
      <span className="sd-pos-not-paid">NOT COLLECTED · NO PAYMENT OR JOURNAL</span>
     </div>
     <label className="sd-pos-notes">ملاحظات المسودة
      <textarea rows={2} maxLength={240} value={notes}
       onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات داخل الديمو فقط…"/>
     </label>
     <button className="sd-primary sd-full" type="button" disabled={!ready}
      onClick={save}>حفظ مسودة تجريبية فقط <kbd>F9</kbd></button>
     <p className="sd-pos-legal">لا فواتير أو ضرائب أو خصم مخزون أو رصيد خزنة أو تحصيل حقيقي.</p>
    </div>
    <div className="sd-saved sd-pos-history">
     <div className="sd-saved-title">آخر مسودات الجلسة <span>{data.drafts.length}</span></div>
     {data.drafts.length===0?<p>مفيش مسودات محفوظة لسه.</p>:
      data.drafts.map(d=><div key={d.id}>
       <button className="sd-pos-draft-toggle" type="button"
        aria-expanded={expandedDraft===d.id}
        onClick={()=>setExpandedDraft(expandedDraft===d.id?null:d.id)}>
        <span>مسودة #{String(d.id).padStart(3,"0")} · غير مدفوعة</span>
        <strong>{demoMoney(d.totalMinor)}</strong>
        <span aria-hidden="true">{expandedDraft===d.id?"▴":"▾"}</span>
       </button>
       {expandedDraft===d.id&&<div className="sd-pos-draft-details">
        <span>العميل: {DEMO_CUSTOMERS.find(c=>c.id===d.customerId)?.name}</span>
        <span>الحلاق: {DEMO_STAFF.find(s=>s.id===d.staffId)?.name}</span>
        <span>الخصم: {demoMoney(d.discountMinor)}</span>
        {d.lines.map(line=><span key={line.serviceId}>
         {demoPosItem(line.serviceId).name} × {line.quantity}
        </span>)}
        {d.note&&<span>ملاحظات: {d.note}</span>}
       </div>}
      </div>)}
    </div>
   </aside>
  </div>
 </>;
}
