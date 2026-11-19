"use client";
/**
 * Cashier-adapted Packages section for private nonposting POS.
 * Source UX: casher@046bf19 PackagesSection — expand required + optional extras to DRAFT.
 * Live Catalog offering prices apply on quote/save; package PriceMinor is display.
 * No redemption, payment, stock, mutually-exclusive groom groups, or booking package identity yet.
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

/** Expand required (+ selected optional) package services into cart lines. */
export function expandPackageToDraftLines(args:{
 pkg:CatalogPackage;offerings:CatalogOffering[];lines:CartLine[];
 optionalOfferingIds?:string[];maxLines?:number;
}):{ok:true;lines:CartLine[];added:number}|{ok:false;reason:string}{
 const max=args.maxLines??20;
 if(!args.pkg.isActive)return{ok:false,reason:"الباقة غير نشطة."};
 const optionalSet=new Set((args.optionalOfferingIds??[]).map(id=>id.toLowerCase()));
 const allowedOptional=new Set(
  args.pkg.items.filter(i=>!i.isRequired).map(i=>i.offeringId.toLowerCase()));
 for(const id of optionalSet){
  if(!allowedOptional.has(id))return{ok:false,reason:"إضافة اختيارية مش تابعة للباقة."};
 }
 const selected=args.pkg.items
  .filter(i=>i.isRequired||optionalSet.has(i.offeringId.toLowerCase()))
  .slice()
  .sort((a,b)=>a.sortOrder-b.sortOrder||a.offeringId.localeCompare(b.offeringId));
 if(!selected.some(i=>i.isRequired))return{ok:false,reason:"الباقة مفيش فيها خدمات إلزامية."};
 const next=args.lines.map(l=>({...l}));
 let added=0;
 for(const item of selected){
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
 const [openId,setOpenId]=useState("");
 const [extras,setExtras]=useState<Record<string,boolean>>({});
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
 function toggleOpen(pkg:CatalogPackage){
  if(disabled)return;
  if(openId===pkg.packageId){setOpenId("");return;}
  setOpenId(pkg.packageId);
  setExtras({});
  setMessage("");setError(false);
 }
 function addPackage(pkg:CatalogPackage){
  if(disabled)return;
  const optionalOfferingIds=pkg.items
   .filter(i=>!i.isRequired&&extras[i.offeringId])
   .map(i=>i.offeringId);
  const result=expandPackageToDraftLines({pkg,offerings,lines,optionalOfferingIds});
  if(!result.ok){setError(true);setMessage(result.reason);return;}
  onExpand(result.lines);
  setError(false);
  setOpenId("");
  setExtras({});
  setMessage(selectedBarberId
   ?"اتوسّعت الباقة (+اختياري) لمسودة خدمات؛ المنفذ المختار هيتمرّر للسطور عند الحفظ الغني. مفيش تحصيل."
   :"اتوسّعت الباقة (+اختياري) لمسودة خدمات بأسعار الكتالوج الحي. مفيش تحصيل.");
 }
 return <section className="k5-admin-card" aria-label="باقات Cashier للمسودة"
  data-cashier-pos="packages-section">
  <div className="k5-admin-summary"><h2>الباقات — توسيع لمسودة فقط</h2>
   <p className="k5-muted">زي Cashier: إلزامي + إضافات اختيارية للمسودة. السعر من الكتالوج الحي؛
    مفيش استرداد باقة ولا دفع ولا مجموعات حصرية للعريس بعد.</p>
  </div>
  {state==="loading"&&<p role="status">جاري تحميل الباقات…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">
   قراءة الباقات محتاجة catalog.read وMigration 025 داخل الفرع.</p>}
  {state==="empty"&&<p className="k5-muted">مفيش باقات نشطة لهذا العمل حاليًا.</p>}
  {state==="ready"&&<div className="k5-salon-steps" aria-label="قائمة الباقات">
   {packages.map(p=>{
    const kindLabel=p.kind==="GROOM"?"عريس":"عرض";
    const required=p.items.filter(i=>i.isRequired);
    const optional=p.items.filter(i=>!i.isRequired);
    const open=openId===p.packageId;
    return <div key={p.packageId} data-cashier-package={p.packageId}>
     <button type="button" className={open?"k5-save":"k5-salon-refresh"}
      disabled={disabled} onClick={()=>toggleOpen(p)}>
      <span>{kindLabel}{p.isPopular?" · شائع":""} · {p.displayName}
       {" "}({required.length} إلزامي{optional.length?` + ${optional.length} اختياري`:""})</span>
      <span dir="ltr"> {money(p.priceMinor,p.currency)}</span>
     </button>
     {open&&<div className="catalog-form" data-cashier-pos="package-extras">
      <p className="k5-muted">الخدمات الإلزامية هتتضاف تلقائيًا. اختَر الإضافات الاختيارية قبل التوسيع.</p>
      {optional.length===0?<p className="k5-muted">مفيش إضافات اختيارية لهذه الباقة.</p>:
       optional.map(item=>{
        const o=offerings.find(x=>x.offeringId===item.offeringId);
        const label=o?.displayName??item.offeringId.slice(0,8)+"…";
        const unavailable=!o||!o.isActive||o.kind!=="SERVICE";
        return <label key={item.offeringId}>
         <input type="checkbox" disabled={disabled||unavailable}
          checked={!!extras[item.offeringId]}
          onChange={e=>setExtras(v=>({...v,[item.offeringId]:e.target.checked}))}/>
         {" "}{label}{unavailable?" (غير متاحة)":""}
        </label>;
       })}
      <button type="button" className="k5-save" disabled={disabled}
       onClick={()=>addPackage(p)}>وسّع للمسودة بدون دفع</button>
     </div>}
    </div>;
   })}
  </div>}
  {message&&<p role={error?"alert":"status"} className={error?"k5-error":"k5-notice"}>{message}</p>}
 </section>;
}
