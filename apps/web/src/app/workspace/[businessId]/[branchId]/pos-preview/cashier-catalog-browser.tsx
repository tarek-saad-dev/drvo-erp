"use client";
/**
 * Cashier-adapted Catalog browser for private POS (nonposting).
 * Source UX: casher@046bf19 ServiceCatalog / ProductCatalog / ServiceSearchInput.
 * Prices come only from authorized DRVO Catalog/POS preview offerings — never client-authored.
 * PRODUCT search uses displayName + offeringId prefix (first 8) only — CatalogOffering has no barcode/stock.
 */
import {useEffect,useRef,useState} from "react";

export type CatalogOffering={offeringId:string;kind:"SERVICE"|"PRODUCT";displayName:string;
 priceMinor:number;currency:string;isActive:boolean};

function money(minor:number,currency:string):string{
 return (minor/100).toFixed(2)+" "+currency;
}

function matchesQuery(o:CatalogOffering,q:string):boolean{
 if(!q)return true;
 const name=o.displayName.toLocaleLowerCase("en");
 const idPrefix=o.offeringId.slice(0,8).toLocaleLowerCase("en");
 return name.includes(q)||idPrefix.includes(q);
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
  return matchesQuery(o,q);
 });
 const productTab=tab==="PRODUCT";
 const heading=productTab?"اختر المنتج":tab==="SERVICE"?"اختر الخدمة":"الخدمات والمنتجات";
 const searchLabel=productTab?"بحث المنتجات":"بحث سريع";
 const searchPlaceholder=productTab
  ?"اسم المنتج أو بادئة المعرّف (8) — اضغط / للتركيز (لا باركود/مخزون في الكتالوج)"
  :"اسم الخدمة أو المنتج أو بادئة المعرّف — اضغط / للتركيز";
 const emptyCopy=productTab
  ?(query.trim()?"لم نجد منتجًا مطابقًا":"لا توجد منتجات نشطة في كتالوج الفرع")
  :"مفيش عناصر مطابقة.";
 return <section className="k5-admin-card" aria-label="كتالوج Cashier للمسودة"
  data-cashier-pos="catalog-browser">
  <div className="k5-admin-summary"><h2>{heading}</h2>
   <p className="k5-muted">{productTab
    ?"بحث Cashier للمنتجات على displayName + بادئة offeringId فقط. الإضافة مسودة — مش بيع، ومفيش باركود أو عدّ مخزون من CatalogOffering."
    :"بحث Cashier (`/`) على كتالوج الفرع المصرّح. الإضافة للمسودة فقط — مش بيع."}</p>
  </div>
  <div className="k5-booking-actions" role="tablist" aria-label="تصفية الكتالوج">
   {([["ALL","الكل"],["SERVICE","خدمات"],["PRODUCT","منتجات"]] as const).map(([id,label])=>
    <button key={id} type="button" role="tab" aria-selected={tab===id}
     className={tab===id?"k5-save":"k5-salon-refresh"} onClick={()=>setTab(id)}>{label}</button>)}
  </div>
  <label>{searchLabel}<input ref={searchRef} type="search" maxLength={100} value={query}
   placeholder={searchPlaceholder}
   aria-label={productTab?"بحث في المنتجات بالاسم أو بادئة المعرّف":"بحث سريع في الكتالوج"}
   onChange={e=>setQuery(e.target.value)}/></label>
  <div className="k5-salon-steps" aria-label="نتائج الكتالوج">
   {rows.slice(0,40).map(o=>{
    const idPrefix=o.offeringId.slice(0,8);
    const kindLabel=o.kind==="SERVICE"?"خدمة":"منتج";
    return <button key={o.offeringId} type="button"
     className="k5-salon-refresh" disabled={disabled}
     onClick={()=>onAdd(o)}>
     <span>{kindLabel} · {o.displayName}</span>
     <span dir="ltr" className="k5-muted" title="بادئة Catalog offeringId — ليست باركود"> كود:{idPrefix}</span>
     {o.kind==="PRODUCT"&&<span className="k5-muted"> · بيع تجزئة (بدون حلاق)</span>}
     <span dir="ltr"> {money(o.priceMinor,o.currency)}</span>
    </button>;
   })}
   {rows.length===0&&<p className="k5-muted">{emptyCopy}</p>}
   {rows.length>40&&<p className="k5-muted">ظاهرة أول 40 نتيجة؛ ضيّق البحث.</p>}
  </div>
 </section>;
}
