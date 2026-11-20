"use client";
/**
 * Cashier-adapted Packages section for private nonposting POS.
 * Source UX: casher@046bf19 PackagesSection — commercial resolve + exclusive home-visit.
 * Draft SQL022 still Catalog-reprices; package group keys are client/resolve only (SQL026 OPEN).
 * No redemption, payment, stock, or financial posting.
 */
import {useCallback,useEffect,useMemo,useState} from "react";
import type {CatalogOffering} from "./cashier-catalog-browser";
import {
  expandPackageToDraftLines,
  findOverlappingRequiredCartItems,
  findReusableAddonOfferingIds,
  type PackageAwareCartLine,
  type PackageCartMeta,
} from "./cashier-package-cart";

export type CatalogPackage={
 packageId:string;kind:"REGULAR"|"GROOM";displayName:string;
 description:string|null;priceMinor:number;currency:string;
 durationMinutes:number|null;isPopular:boolean;isActive:boolean;
 items:Array<{offeringId:string;sortOrder:number;isRequired:boolean}>;
};

type OptionalGroup={
 key:"groom_addons"|"home_visit";
 labelEn:string;labelAr:string;
 multiSelect:boolean;mutuallyExclusive:boolean;
 offeringIds:string[];
};

type ResolveResult={
 ok:true;
 packageId:string;name:string;packagePriceMinor:number;currency:string;
 packageDurationMinutes:number;totalDurationMinutes:number;totalPriceMinor:number;
 requiredOfferingIds:string[];addonOfferingIds:string[];
 services:Array<{offeringId:string;displayName:string;priceMinor:number;durationMinutes:number}>;
 optionalGroups:OptionalGroup[];
 cartLines:Array<{
  id:string;offeringId:string;displayName:string;unitPriceMinor:number;quantity:number;
  packageMeta:PackageCartMeta;
 }>;
 draftGroupPersistence:"OPEN";
};

function money(minor:number,currency:string):string{
 return (minor/100).toFixed(2)+" "+currency;
}

/** Expand required (+ selected optional) package services into cart lines. */
export {expandPackageToDraftLines};

export default function CashierPackagesSection({apiRoot,offerings,lines,disabled,selectedBarberId,onExpand}:{
 apiRoot:string;offerings:CatalogOffering[];lines:PackageAwareCartLine[];disabled:boolean;
 selectedBarberId:string;onExpand:(next:PackageAwareCartLine[])=>void;
}){
 const [packages,setPackages]=useState<CatalogPackage[]>([]);
 const [state,setState]=useState<"loading"|"ready"|"denied"|"empty">("loading");
 const [openId,setOpenId]=useState("");
 const [optionalGroups,setOptionalGroups]=useState<OptionalGroup[]>([]);
 const [selectedAddonIds,setSelectedAddonIds]=useState<string[]>([]);
 const [homeVisitId,setHomeVisitId]=useState<string|null>(null);
 const [submitting,setSubmitting]=useState(false);
 const [overlapConfirm,setOverlapConfirm]=useState<{
  names:string[];removeOfferingIds:string[];
 }|null>(null);
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

 const active=useMemo(
  ()=>packages.find(p=>p.packageId===openId)??null,[packages,openId]);

 const addonGroup=useMemo(
  ()=>optionalGroups.find(g=>g.key==="groom_addons")??null,[optionalGroups]);
 const homeVisitGroup=useMemo(
  ()=>optionalGroups.find(g=>g.key==="home_visit")??null,[optionalGroups]);

 const liveTotal=useMemo(()=>{
  if(!active)return{price:0,duration:0};
  let price=active.priceMinor;
  const duration=active.durationMinutes??0;
  for(const id of selectedAddonIds){
   const o=offerings.find(x=>x.offeringId===id);
   if(o)price+=o.priceMinor;
  }
  if(homeVisitId){
   const o=offerings.find(x=>x.offeringId===homeVisitId);
   if(o)price+=o.priceMinor;
  }
  return{price,duration};
 },[active,selectedAddonIds,homeVisitId,offerings]);

 async function openPackage(pkg:CatalogPackage){
  if(disabled)return;
  if(openId===pkg.packageId){setOpenId("");setOptionalGroups([]);return;}
  setOpenId(pkg.packageId);
  setSelectedAddonIds([]);
  setHomeVisitId(null);
  setOverlapConfirm(null);
  setMessage("");setError(false);
  try{
   const r=await fetch(apiRoot+"/catalog/packages/"+encodeURIComponent(pkg.packageId)+"/resolve",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({}),
   });
   if(!r.ok){setOptionalGroups([]);return;}
   const data=await r.json() as ResolveResult;
   const groups=Array.isArray(data.optionalGroups)?data.optionalGroups:[];
   setOptionalGroups(groups);
   const allOptional=groups.flatMap(g=>g.offeringIds);
   const reusable=findReusableAddonOfferingIds(lines,allOptional);
   const homeIds=new Set((groups.find(g=>g.key==="home_visit")?.offeringIds??[])
    .map(id=>id.toLowerCase()));
   const home=reusable.find(id=>homeIds.has(id.toLowerCase()))??null;
   setHomeVisitId(home);
   setSelectedAddonIds(reusable.filter(id=>!homeIds.has(id.toLowerCase())));
  }catch{setOptionalGroups([]);}
 }

 function toggleAddon(offeringId:string){
  setSelectedAddonIds(prev=>
   prev.some(id=>id.toLowerCase()===offeringId.toLowerCase())
    ?prev.filter(id=>id.toLowerCase()!==offeringId.toLowerCase())
    :[...prev,offeringId]);
 }

 async function commitResolved(removeOfferingIds:string[]=[]){
  if(!active||disabled||submitting)return;
  setSubmitting(true);setMessage("");setError(false);
  try{
   const addonOfferingIds=[
    ...selectedAddonIds,
    ...(homeVisitId? [homeVisitId]:[]),
   ];
   const r=await fetch(
    apiRoot+"/catalog/packages/"+encodeURIComponent(active.packageId)+"/resolve",{
     method:"POST",credentials:"same-origin",cache:"no-store",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({addonOfferingIds}),
    });
   const data=await r.json() as ResolveResult & {message?:string};
   if(!r.ok||!data.ok||!Array.isArray(data.cartLines)){
    setError(true);
    setMessage(typeof data.message==="string"?data.message:"تعذر حل الباقة تجاريًا.");
    return;
   }
   const drop=new Set(removeOfferingIds.map(id=>id.toLowerCase()));
   const reusable=findReusableAddonOfferingIds(lines,addonOfferingIds);
   for(const id of reusable)drop.add(id.toLowerCase());
   const kept=lines.filter(l=>!drop.has(l.offeringId.toLowerCase())&&
    !data.cartLines.some(c=>c.offeringId.toLowerCase()===l.offeringId.toLowerCase()));
   if(kept.length+data.cartLines.length>20){
    setError(true);setMessage("السلة ممتلئة (حد أقصى 20 سطر).");return;
   }
   const next:PackageAwareCartLine[]=[
    ...kept,
    ...data.cartLines.map(c=>({
     offeringId:c.offeringId,
     quantity:1,
     lineId:c.id,
     displayName:c.displayName,
     displayUnitPriceMinor:c.unitPriceMinor,
     packageMeta:c.packageMeta,
    })),
   ];
   onExpand(next);
   setOpenId("");
   setOptionalGroups([]);
   setSelectedAddonIds([]);
   setHomeVisitId(null);
   setOverlapConfirm(null);
   setError(false);
   setMessage(selectedBarberId
    ?`اتوسّعت ${data.name} تجاريًا للمجموعة في السلة (+إضافات). لقطات الباقة تتحفظ مع المسودة الغنية (SQL038)؛ التسعير وقت الحفظ من الكتالوج. مفيش تحصيل.`
    :`اتوسّعت ${data.name} تجاريًا للمجموعة في السلة. لقطات الباقة تتحفظ مع المسودة الغنية (SQL038)؛ التسعير وقت الحفظ من الكتالوج. مفيش تحصيل.`);
  }catch{
   setError(true);setMessage("تعذر الاتصال بحل الباقة.");
  }finally{setSubmitting(false);}
 }

 function addPackage(){
  if(!active||disabled)return;
  const overlaps=findOverlappingRequiredCartItems(lines,active.items
   .filter(i=>i.isRequired).map(i=>i.offeringId));
  if(overlaps.length>0){
   setOverlapConfirm({
    names:overlaps.map(o=>{
     const off=offerings.find(x=>x.offeringId===o.offeringId);
     return off?.displayName??o.offeringId.slice(0,8)+"…";
    }),
    removeOfferingIds:overlaps.map(o=>o.offeringId),
   });
   return;
  }
  void commitResolved([]);
 }

 return <section className="k5-admin-card" aria-label="باقات Cashier للمسودة"
  data-cashier-pos="packages-section">
  <div className="k5-admin-summary"><h2>الباقات — توسيع تجاري لمسودة فقط</h2>
   <p className="k5-muted">زي Cashier: سعر الباقة على السطر الأساسي، المشمول مجاني،
    والإضافات الاختيارية + زيارة العريس الحصرية. مفيش دفع ولا استرداد.</p>
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
      disabled={disabled} onClick={()=>void openPackage(p)}>
      <span>{kindLabel}{p.isPopular?" · شائع":""} · {p.displayName}
       {" "}({required.length} إلزامي{optional.length?` + ${optional.length} اختياري`:""})</span>
      <span dir="ltr"> {money(p.priceMinor,p.currency)}</span>
     </button>
     {open&&active&&<div className="catalog-form" data-cashier-pos="package-extras">
      <p className="k5-muted">الخدمات الإلزامية هتتضاف بالسعر التجاري للباقة.
       اختَر الإضافات؛ زيارة العريس اختيار واحد فقط.</p>
      {addonGroup&&addonGroup.offeringIds.length>0&&<>
       <p><strong>{addonGroup.labelAr}</strong></p>
       {addonGroup.offeringIds.map(id=>{
        const o=offerings.find(x=>x.offeringId===id);
        const label=o?.displayName??id.slice(0,8)+"…";
        const unavailable=!o||!o.isActive||o.kind!=="SERVICE";
        const checked=selectedAddonIds.some(x=>x.toLowerCase()===id.toLowerCase());
        return <label key={id}>
         <input type="checkbox" disabled={disabled||unavailable||submitting}
          checked={checked}
          onChange={()=>toggleAddon(id)}/>
         {" "}{label}{unavailable?" (غير متاحة)":o?` (+${money(o.priceMinor,p.currency)})`:""}
        </label>;
       })}
      </>}
      {homeVisitGroup&&homeVisitGroup.offeringIds.length>0&&
       <div data-cashier-pos="package-home-visit">
        <p><strong>{homeVisitGroup.labelAr}</strong> — اختيار واحد</p>
        <label>
         <input type="radio" name={"hv-"+p.packageId} disabled={disabled||submitting}
          checked={homeVisitId==null}
          onChange={()=>setHomeVisitId(null)}/>
         {" "}بدون زيارة خارجية
        </label>
        {homeVisitGroup.offeringIds.map(id=>{
         const o=offerings.find(x=>x.offeringId===id);
         const label=o?.displayName??id.slice(0,8)+"…";
         const unavailable=!o||!o.isActive||o.kind!=="SERVICE";
         return <label key={id}>
          <input type="radio" name={"hv-"+p.packageId}
           disabled={disabled||unavailable||submitting}
           checked={!!homeVisitId&&homeVisitId.toLowerCase()===id.toLowerCase()}
           onChange={()=>setHomeVisitId(id)}/>
          {" "}{label}{unavailable?" (غير متاحة)":o?` (${money(o.priceMinor,p.currency)})`:""}
         </label>;
        })}
       </div>}
      {!addonGroup&&!homeVisitGroup&&optional.length>0&&
       <p className="k5-muted">إضافات اختيارية بلا تصنيف فئة — هتتضاف كـ groom_addons عند الحل.</p>}
      {optional.length===0&&<p className="k5-muted">مفيش إضافات اختيارية لهذه الباقة.</p>}
      <p className="k5-muted" dir="ltr">Live total ≈ {money(liveTotal.price,p.currency)}
       {liveTotal.duration>0?` · ${liveTotal.duration} min`:""}</p>
      {overlapConfirm&&<div className="k5-notice" role="alertdialog"
        data-cashier-pos="package-overlap">
        <p>خدمات موجودة مسبقاً ومشمولة في الباقة:</p>
        <ul>{overlapConfirm.names.map(n=><li key={n}>{n}</li>)}</ul>
        <p className="k5-muted">هل تريد إزالة الخدمة المنفردة وإضافة الباقة؟</p>
        <button type="button" className="k5-salon-refresh" disabled={submitting}
         onClick={()=>setOverlapConfirm(null)}>إلغاء</button>
        <button type="button" className="k5-save" disabled={submitting}
         onClick={()=>void commitResolved(overlapConfirm.removeOfferingIds)}>
         استبدال ومتابعة</button>
       </div>}
      <button type="button" className="k5-save"
       disabled={disabled||submitting||!!overlapConfirm}
       onClick={()=>addPackage()}>
       {submitting?"جاري الحل…":"وسّع للمسودة بدون دفع"}</button>
     </div>}
    </div>;
   })}
  </div>}
  {message&&<p role={error?"alert":"status"} className={error?"k5-error":"k5-notice"}>{message}</p>}
 </section>;
}
