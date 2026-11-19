"use client";
/**
 * Cashier-adapted Catalog browser for private POS (nonposting).
 * Source UX: casher@046bf19 ServiceCatalog / ProductCatalog / ServiceSearchInput.
 * Prices come only from authorized DRVO Catalog/POS preview offerings — never client-authored.
 */
import {useEffect,useRef,useState} from "react";

export type CatalogOffering={offeringId:string;kind:"SERVICE"|"PRODUCT";displayName:string;
 priceMinor:number;currency:string;isActive:boolean};

function money(minor:number,currency:string):string{
 return (minor/100).toFixed(2)+" "+currency;
}

export default function CashierCatalogBrowser({offerings,disabled,onAdd}:{
 offerings:CatalogOffering[];disabled:boolean;
 onAdd:(offering:CatalogOffering)=>void;
}){
 const [tab,setTab]=useState<"SERVICE"|"PRODUCT"|"ALL">("ALL");
 const [query,setQuery]=useState("");
 const searchRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  function onKey(e:KeyboardEvent){
   if(e.key==="/"&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)
    &&!(e.target instanceof HTMLSelectElement)){
    e.preventDefault();searchRef.current?.focus();
   }
  }
  window.addEventListener("keydown",onKey);
  return ()=>window.removeEventListener("keydown",onKey);
 },[]);
 const rows=offerings.filter(o=>{
  if(!o.isActive)return false;
  if(tab!=="ALL"&&o.kind!==tab)return false;
  const q=query.trim().toLocaleLowerCase("en");
  return !q||o.displayName.toLocaleLowerCase("en").includes(q);
 });
 return <section className="k5-admin-card" aria-label="كتالوج Cashier للمسودة"
  data-cashier-pos="catalog-browser">
  <div className="k5-admin-summary"><h2>الخدمات والمنتجات</h2>
   <p className="k5-muted">بحث Cashier (`/`) على كتالوج الفرع المصرّح. الإضافة للمسودة فقط — مش بيع.</p>
  </div>
  <div className="k5-booking-actions" role="tablist" aria-label="تصفية الكتالوج">
   {([["ALL","الكل"],["SERVICE","خدمات"],["PRODUCT","منتجات"]] as const).map(([id,label])=>
    <button key={id} type="button" role="tab" aria-selected={tab===id}
     className={tab===id?"k5-save":"k5-salon-refresh"} onClick={()=>setTab(id)}>{label}</button>)}
  </div>
  <label>بحث سريع<input ref={searchRef} type="search" maxLength={100} value={query}
   placeholder="اسم الخدمة أو المنتج — اضغط / للتركيز"
   onChange={e=>setQuery(e.target.value)}/></label>
  <div className="k5-salon-steps" aria-label="نتائج الكتالوج">
   {rows.slice(0,40).map(o=><button key={o.offeringId} type="button"
    className="k5-salon-refresh" disabled={disabled}
    onClick={()=>onAdd(o)}>
    <span>{o.kind==="SERVICE"?"خدمة":"منتج"} · {o.displayName}</span>
    <span dir="ltr"> {money(o.priceMinor,o.currency)}</span>
   </button>)}
   {rows.length===0&&<p className="k5-muted">مفيش عناصر مطابقة.</p>}
   {rows.length>40&&<p className="k5-muted">ظاهرة أول 40 نتيجة؛ ضيّق البحث.</p>}
  </div>
 </section>;
}
