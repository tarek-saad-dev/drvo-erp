"use client";
/**
 * Cashier-adapted Packages section for private nonposting POS.
 * Source UX: casher@046bf19 PackagesSection — expand to DRAFT cart lines only.
 * Live Catalog offering prices apply on quote/save; package PriceMinor is display.
 * No redemption, payment, stock, or booking handoff in this slice.
 */
import {useCallback,useEffect,useState} from "react";
import type {CatalogOffering} from "./cashier-catalog-browser";
import type {CartLine} from "./cashier-cart-panel";

export type CatalogPackage={
 packageId:string;kind:"REGULAR"|"GROOM";displayName:string;
 description:string|null;priceMinor:number;currency:string;
 durationMinutes:number|null;isPopular:boolean;isActive:boolean;
 items:Array<{offeringId:string;sortOrder:number;isRequired:boolean}>;
};

function money(minor:number,currency:string):string{
 return (minor/100).toFixed(2)+" "+currency;
}

/** Expand required package services into cart lines (unique offeringId, qty 1). */
export function expandPackageToDraftLines(args:{
 pkg:CatalogPackage;offerings:CatalogOffering[];lines:CartLine[];maxLines?:number;
}):{ok:true;lines:CartLine[];added:number}|{ok:false;reason:string}{
 const max=args.maxLines??20;
 if(!args.pkg.isActive)return{ok:false,reason:"الباقة غير نشطة."};
 const required=args.pkg.items
  .filter(i=>i.isRequired)
  .slice()
  .sort((a,b)=>a.sortOrder-b.sortOrder||a.offeringId.localeCompare(b.offeringId));
 if(required.length===0)return{ok:false,reason:"الباقة مفيش فيها خدمات إلزامية."};
 const next=args.lines.map(l=>({...l}));
 let added=0;
 for(const item of required){
  const offering=args.offerings.find(o=>o.offeringId===item.offeringId);
  if(!offering||!offering.isActive||offering.kind!=="SERVICE"){
   return{ok:false,reason:"خدمة داخل الباقة مش متاحة في الكتالوج الحالي."};
  }
  const existing=next.find(l=>l.offeringId===item.offeringId);
  if(existing)continue;
  if(next.length>=max)return{ok:false,reason:"السلة ممتلئة (حد أقصى 20 سطر)."};
  next.push({offeringId:item.offeringId,quantity:1});
  added++;
 }
 if(added===0)return{ok:false,reason:"خدمات الباقة موجودة بالفعل في السلة."};
 return{ok:true,lines:next,added};
}

export default function CashierPackagesSection({apiRoot,offerings,lines,disabled,selectedBarberId,onExpand}:{
 apiRoot:string;offerings:CatalogOffering[];lines:CartLine[];disabled:boolean;
 selectedBarberId:string;onExpand:(next:CartLine[])=>void;
}){
 const [packages,setPackages]=useState<CatalogPackage[]>([]);
 const [state,setState]=useState<"loading"|"ready"|"denied"|"empty">("loading");
 const [message,setMessage]=useState("");
 const [error,setError]=useState(false);
 const load=useCallback(async()=>{
  try{
   const r=await fetch(apiRoot+"/catalog/packages",{cache:"no-store",credentials:"same-origin"});
   if(!r.ok){setState("denied");return;}
   const data=await r.json() as {packages:CatalogPackage[]};
   if(!Array.isArray(data.packages)){setState("denied");return;}
   const active=data.packages.filter(p=>p.isActive&&Array.isArray(p.items)&&p.items.length>0);
   setPackages(active);
   setState(active.length===0?"empty":"ready");
  }catch{setState("denied");}
 },[apiRoot]);
 useEffect(()=>{void load();},[load]);
 function addPackage(pkg:CatalogPackage){
  if(disabled)return;
  const result=expandPackageToDraftLines({pkg,offerings,lines});
  if(!result.ok){setError(true);setMessage(result.reason);return;}
  onExpand(result.lines);
  setError(false);
  setMessage(selectedBarberId
   ?"اتوسّعت الباقة لمسودة خدمات؛ المنفذ المختار هيتمرّر للسطور عند الحفظ الغني. مفيش تحصيل."
   :"اتوسّعت الباقة لمسودة خدمات بأسعار الكتالوج الحي. اختَر منفذًا لو حابب تربط السطور. مفيش تحصيل.");
 }
 return <section className="k5-admin-card" aria-label="باقات Cashier للمسودة"
  data-cashier-pos="packages-section">
  <div className="k5-admin-summary"><h2>الباقات — توسيع لمسودة فقط</h2>
   <p className="k5-muted">زي Cashier: الباقة بتتوسّع لخدمات كتالوج. السعر النهائي من الكتالوج الحي؛
    مفيش استرداد باقة ولا دفع ولا مخزون.</p>
  </div>
  {state==="loading"&&<p role="status">جاري تحميل الباقات…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">
   قراءة الباقات محتاجة catalog.read وMigration 025 داخل الفرع.</p>}
  {state==="empty"&&<p className="k5-muted">مفيش باقات نشطة لهذا العمل حاليًا.</p>}
  {state==="ready"&&<div className="k5-salon-steps" aria-label="قائمة الباقات">
   {packages.map(p=>{
    const kindLabel=p.kind==="GROOM"?"عريس":"عرض";
    const includes=p.items.filter(i=>i.isRequired).length;
    return <button key={p.packageId} type="button" className="k5-salon-refresh"
     disabled={disabled} onClick={()=>addPackage(p)}
     data-cashier-package={p.packageId}>
     <span>{kindLabel}{p.isPopular?" · شائع":""} · {p.displayName}
      {" "}({includes} خدمة)</span>
     <span dir="ltr"> {money(p.priceMinor,p.currency)}</span>
    </button>;
   })}
  </div>}
  {message&&<p role={error?"alert":"status"} className={error?"k5-error":"k5-notice"}>{message}</p>}
 </section>;
}
