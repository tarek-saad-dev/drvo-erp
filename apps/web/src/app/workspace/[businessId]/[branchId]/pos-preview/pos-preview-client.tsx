"use client";
import Link from "next/link";
import CashierWorkstationShell from "../../../../../components/cashier-pos/cashier-workstation-shell";
import CashierPricingPanel from "./cashier-pricing-panel";
import CashierDraftHistory from "./cashier-draft-history";
import PosCustomerOperator from "./pos-customer-operator";
import CashierCatalogBrowser,{type ProductStockHint} from "./cashier-catalog-browser";
import CashierCartPanel from "./cashier-cart-panel";
import CashierQuickActions from "./cashier-quick-actions";
import CashierBarberSelector,{type BarberEmployee} from "./cashier-barber-selector";
import CashierTipsPreview from "./cashier-tips-preview";
import CashierReturnsPreview from "./cashier-returns-preview";
import CashierPackagesSection,{expandPackageToDraftLines,type CatalogPackage} from "./cashier-packages-section";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {parseVerifiedBookingHandoff} from "./booking-pos-handoff.mjs";

type Offering = {offeringId:string;kind:"SERVICE"|"PRODUCT";displayName:string;
  priceMinor:number;currency:string;isActive:boolean};
type Line = {offeringId:string;quantity:number;lineId?:string;displayName?:string;
  displayUnitPriceMinor?:number;packageMeta?:{
    packageId:string;packageName:string;role:"anchor"|"included"|"addon";
    groupKey:string;includedCount:number;commercialPackagePriceMinor:number;
    optionalGroup?:"groom_addons"|"home_visit"|null;
  }};
type Preview = {state:"DRAFT_PREVIEW_ONLY";persisted:false;accountingState:"NOT_POSTED";
  paymentState:"NOT_COLLECTED";currency:string;taxComputed:false;
  lines:Array<{offeringId:string;displayName:string;quantity:number;unitPriceMinor:number;lineSubtotalMinor:number}>;
  listPriceSubtotalMinor:number};
type Adjustment={state:"DRAFT_ADJUSTMENT_PREVIEW_ONLY";persisted:false;accountingState:"NOT_POSTED";
  paymentState:"NOT_COLLECTED";taxComputed:false;discountRecorded:false;currency:string;
  listPriceSubtotalMinor:number;headerDiscountMinor:number;afterDiscountMinor:number;
  customerPresentedMinor:number;possibleTipMinor:number;shortfallMinor:number};
type SavedDraft={draftId:string;status:"DRAFT";version:number;currency:string;subtotalMinor:number;createdAtUtc:string;lines:Array<{offeringId:string;displayName:string;quantity:number}>};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function money(minor:number,currency:string):string {
  return (minor/100).toFixed(2)+" "+currency;
}
// Minor-unit conversion without binary floating point rounding or a fake payment.
function readMoneyMinor(value:string):number|null {
  if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(value))return null;
  const [major,decimal=""]=value.split(".");
  const minor=Number(major)*100+Number(decimal.padEnd(2,"0"));
  return Number.isSafeInteger(minor)&&minor<=9_000_000_000_000?minor:null;
}
export default function PosPreviewClient({businessId,branchId,draftsEnabled,richEnabled,
  initialOfferingId,initialCustomerId,initialPackageId,initialBookingId}:{
  businessId:string;branchId:string;draftsEnabled:boolean;richEnabled:boolean;
  initialOfferingId:string|null;initialCustomerId:string|null;initialPackageId:string|null;
  initialBookingId:string|null;
}) {
  const router=useRouter();
  const [status,setStatus]=useState<"loading"|"ready"|"denied"|"error">("loading");
  const [offerings,setOfferings]=useState<Offering[]>([]);
  const [lines,setLines]=useState<Line[]>([]);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [adjustment,setAdjustment]=useState<Adjustment|null>(null);
  const [discountText,setDiscountText]=useState("0");
  const [presentedText,setPresentedText]=useState("0");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [draftStatus,setDraftStatus]=useState<"loading"|"ready"|"denied">("loading");
  const [savedDrafts,setSavedDrafts]=useState<SavedDraft[]>([]);
  const [draftBusy,setDraftBusy]=useState(false);
  const [richHistoryRevision,setRichHistoryRevision]=useState(0);
  const [cartRevision,setCartRevision]=useState(0);
  const [selectedCustomerId,setSelectedCustomerId]=useState("");
  const [customerRevision,setCustomerRevision]=useState(0);
  const [selectedBarberId,setSelectedBarberId]=useState("");
  const [rosterNames,setRosterNames]=useState<Record<string,string>>({});
  const [productStock,setProductStock]=useState<Record<string,ProductStockHint>>({});
  const onRoster=useCallback((employees:BarberEmployee[])=>{
    const names:Record<string,string>={};
    for(const e of employees)names[e.employeeId.toLowerCase()]=e.displayName;
    setRosterNames(names);
  },[]);
  const retryKey=useRef<string|null>(null);
  const handoffApplied=useRef(false);
  const selectedCurrency=offerings.find(o=>lines.some(l=>l.offeringId===o.offeringId))?.currency??"EGP";
  // Tip preview basis: server-priced total + SERVICE lines stamped with the selected executor
  // (Cashier groups only lines that carry an EmpID; PRODUCT lines never do).
  const tipTotalDueMinor=adjustment?adjustment.afterDiscountMinor:preview?preview.listPriceSubtotalMinor:null;
  const tipExecutorLines=useMemo(()=>{
    if(!preview||!GUID.test(selectedBarberId))return [];
    return preview.lines.filter(l=>offerings.some(o=>o.offeringId===l.offeringId&&o.kind==="SERVICE"))
      .map(l=>({employeeId:selectedBarberId,lineSubtotalMinor:l.lineSubtotalMinor}));
  },[preview,offerings,selectedBarberId]);
  const tipCurrency=adjustment?adjustment.currency:preview?preview.currency:selectedCurrency;
  const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
  const api="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+
    encodeURIComponent(branchId)+"/pos-preview";
  const draftApi="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+
    encodeURIComponent(branchId)+"/pos-drafts";

  const load=useCallback(async()=>{
    if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
    try {
      const response=await fetch(api,{credentials:"same-origin",cache:"no-store"});
      if(response.status===401){router.replace("/sign-in");return;}
      if(response.status===403||response.status===404){setStatus("denied");return;}
      if(!response.ok){setStatus("error");return;}
      const data=await response.json() as {state:string;persisted:boolean;offerings:Offering[]};
      if(data.state!=="DRAFT_PREVIEW_ONLY"||data.persisted!==false||!Array.isArray(data.offerings)){
        setStatus("error");return;
      }
      setOfferings(data.offerings);
      // Optional SQL027 branch stock overlay for PRODUCT draft gating (never posts / decrements).
      try{
        const invApi=api.replace(/\/pos-preview$/,"")+"/inventory";
        const invRes=await fetch(invApi,{credentials:"same-origin",cache:"no-store"});
        if(invRes.ok){
          const inv=await invRes.json() as {
            items?:Array<{offeringId:string;qtyMilli:number;stockStatus:string}>;
          };
          const map:Record<string,ProductStockHint>={};
          if(Array.isArray(inv.items)){
            for(const item of inv.items){
              if(!item||typeof item.offeringId!=="string"||!GUID.test(item.offeringId))continue;
              if(!Number.isSafeInteger(item.qtyMilli))continue;
              if(item.stockStatus!=="OK"&&item.stockStatus!=="LOW"&&item.stockStatus!=="OUT")continue;
              map[item.offeringId.toLowerCase()]={
                qtyMilli:item.qtyMilli,stockStatus:item.stockStatus,
              };
            }
          }
          setProductStock(map);
        }else{
          setProductStock({});
        }
      }catch{
        setProductStock({});
      }
      // bookingId from a URL is just a lookup hint; Booking Core verifies COMPLETED.
      // POS/Catalog is authorized separately above, and the cart is still unposted.
      if(!handoffApplied.current&&(initialOfferingId!==null||initialCustomerId!==null||
         initialPackageId!==null||initialBookingId!==null)){
        handoffApplied.current=true;
        let customerHint=initialBookingId===null?initialCustomerId:null;
        let offeringHint=initialBookingId===null?initialOfferingId:null;
        let packageHint=initialBookingId===null?initialPackageId:null;
        if(initialBookingId!==null){
          if(!GUID.test(initialBookingId)){
            setMessage("معرّف الحجز غير صالح؛ لم تُجهَّز مسودة من الحجز.");
            setStatus("ready");return;
          }
          try{
            const bookingApi=api.replace(/\/pos-preview$/,"")+
              "/booking/appointments/"+encodeURIComponent(initialBookingId)+"/pos-handoff";
            const bookingRes=await fetch(bookingApi,{credentials:"same-origin",cache:"no-store"});
            if(bookingRes.status===401){router.replace("/sign-in");return;}
            if(!bookingRes.ok){
              setMessage("الحجز مش مكتمل أو مش متاح في الفرع. لم تُجهَّز مسودة.");
              setStatus("ready");return;
            }
            const verified=parseVerifiedBookingHandoff(await bookingRes.json(),initialBookingId);
            if(!verified){
              setMessage("نتيجة التحقق من الحجز غير صحيحة. لم تُجهَّز مسودة.");
              setStatus("ready");return;
            }
            customerHint=verified.customerId;
            offeringHint=verified.offeringId;
          }catch{
            setMessage("تعذر الاتصال للتحقق من الحجز. لم تُجهَّز مسودة.");
            setStatus("ready");return;
          }
        }
        if(customerHint!==null&&GUID.test(customerHint)){
          setSelectedCustomerId(customerHint);
          setCustomerRevision(v=>v+1);
        }
        let packageLines:Line[]|null=null;
        if(packageHint!==null&&GUID.test(packageHint)){
          try{
            const packagesApi=api.replace(/\/pos-preview$/,"")+"/catalog/packages";
            const pkgRes=await fetch(packagesApi,{credentials:"same-origin",cache:"no-store"});
            if(pkgRes.ok){
              const pkgBody=await pkgRes.json() as {packages?:CatalogPackage[]};
              const pkg=Array.isArray(pkgBody.packages)?
                pkgBody.packages.find(p=>p.packageId===packageHint):undefined;
              if(pkg){
                const expanded=expandPackageToDraftLines({
                  pkg,offerings:data.offerings,lines:[],
                });
                if(expanded.ok)packageLines=expanded.lines;
              }
            }
          }catch{/* fall back to offeringId */}
        }
        const offering=offeringHint!==null?data.offerings.find(o=>
          GUID.test(o.offeringId)&&o.offeringId.toLowerCase()===offeringHint.toLowerCase()&&
          o.isActive&&o.kind==="SERVICE"):undefined;
        // Package expand only when cart empty; otherwise (or on expand miss) offeringId.
        // Compute seed outside setState so TypeScript sees the branch result.
        let seeded:"package"|"offering"|"none"="none";
        let handoffLines:Line[]|null=null;
        if(packageLines){seeded="package";handoffLines=packageLines;}
        else if(offering){
          seeded="offering";
          handoffLines=[{offeringId:offering.offeringId,quantity:1}];
        }
        setLines(current=>current.length!==0||!handoffLines?current:handoffLines);
        if(seeded==="package"){
          setMessage("اتوسّعت باقة الحجز لمسودة خدمات. راجع الأسعار، ولا يوجد بيع أو تحصيل.");
        }else if(seeded==="offering"){
          setMessage("اتجهزت سلة مسودة جديدة من خدمة الحجز. راجع الأسعار، ولا يوجد بيع أو تحصيل.");
        }else if(offeringHint!==null||packageHint!==null){
          setMessage("الخدمة مش متاحة في الكتالوج الحالي. اختار خدمة من القائمة.");
        }
      }
      setStatus("ready");
    } catch {setStatus("error");}
  },[api,businessId,branchId,router,initialOfferingId,initialCustomerId,initialPackageId,initialBookingId]);
  useEffect(()=>{void load();},[load]);

  const loadDrafts=useCallback(async()=>{
    if(!draftsEnabled)return;
    try{
      const response=await fetch(draftApi,{credentials:"same-origin",cache:"no-store"});
      if(!response.ok){setDraftStatus("denied");return;}
      const data=await response.json() as {drafts:SavedDraft[]};
      if(!Array.isArray(data.drafts)){setDraftStatus("denied");return;}
      setSavedDrafts(data.drafts);setDraftStatus("ready");
    }catch{setDraftStatus("denied");}
  },[draftApi,draftsEnabled]);
  useEffect(()=>{void loadDrafts();},[loadDrafts]);

  async function saveDraft(){
    if(!draftsEnabled||draftStatus!=="ready"||draftBusy||lines.length===0)return;
    setDraftBusy(true);setMessage("");
    if(!retryKey.current)retryKey.current=crypto.randomUUID();
    try{
      const r=await fetch(draftApi,{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json","Idempotency-Key":retryKey.current},
        body:JSON.stringify({lines}),
      });
      if(r.status===409){retryKey.current=null;setMessage("مفتاح طلب مكرر ببيانات مختلفة. أعد المحاولة.");return;}
      if(r.status===403||r.status===404){setDraftStatus("denied");setMessage("مش مسموح بحفظ المسودة.");return;}
      if(!r.ok){setMessage("تعذر الحفظ؛ أعد المحاولة بنفس العناصر بدون تكرار.");return;}
      const saved=await r.json() as {status:string;posted:boolean;id:string};
      if(saved.status!=="DRAFT"||saved.posted!==false){setMessage("استجابة الحفظ غير صحيحة.");return;}
      retryKey.current=null;setLines([]);setPreview(null);setAdjustment(null);
      setMessage("المسودة اتحفظت. لم يتم تسجيل بيع أو تحصيل.");
      await loadDrafts();
    }catch{setMessage("اتصال غير متاح. أعد المحاولة بنفس البيانات للتأكد من عدم التكرار.");}
    finally{setDraftBusy(false);}
  }
  function quickAdd(offering:Offering){
    if(busy||draftBusy||!offering.isActive||lines.length>=20||
       lines.some(x=>x.offeringId===offering.offeringId))return;
    retryKey.current=null;setPreview(null);setAdjustment(null);setMessage("");
    setLines(current=>[...current,{offeringId:offering.offeringId,quantity:1}]);
  }
  function adjustLineQuantity(selectedOfferingId:string,delta:-1|1){
    if(busy||draftBusy)return;
    const existing=lines.find(l=>l.offeringId===selectedOfferingId);
    if(!existing||existing.quantity+delta<1||existing.quantity+delta>20)return;
    // A changed cart must never replay a pending immutable DRAFT request or
    // retain a server-priced preview for different quantities.
    retryKey.current=null;setPreview(null);setAdjustment(null);setMessage("");
    setLines(current=>current.map(l=>{
      if(l.offeringId!==selectedOfferingId)return l;
      const next=l.quantity+delta;
      return next>=1&&next<=20?{...l,quantity:next}:l;
    }));
  }
  function createNewFromDraft(d:{lines:Line[]}){
    if(busy||draftBusy)return;
    // A saved DRAFT is IMMUTABLE. Preparing a new cart always uses currently
    // authorized active Catalog references and requires fresh server pricing.
    // SQL038 package snapshots restore grouping only; Catalog still reprices.
    if(!d.lines.length||d.lines.length>20||
      d.lines.some(x=>!GUID.test(x.offeringId)||!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>20||
        !offerings.some(o=>o.offeringId===x.offeringId&&o.isActive))||
      new Set(d.lines.map(x=>x.offeringId)).size!==d.lines.length){
      setMessage("فيه عناصر قديمة أو غير متاحة. لازم تعمل مسودة جديدة من الكتالوج.");return;
    }
    retryKey.current=null;setPreview(null);setAdjustment(null);
    setCartRevision(v=>v+1);
    setLines(d.lines.map(x=>({
      offeringId:x.offeringId,quantity:x.quantity,
      displayName:x.displayName,displayUnitPriceMinor:x.displayUnitPriceMinor,
      packageMeta:x.packageMeta,
    })));
    setMessage(d.lines.some(x=>x.packageMeta)
      ?"تم تجهيز سلة جديدة مع تجميع الباقة من لقطات SQL038. راجع الأسعار الحالية قبل الحفظ؛ المسودة الأصلية لم تتغير."
      :"تم تجهيز سلة جديدة من المسودة القديمة. راجع الأسعار الحالية قبل الحفظ؛ المسودة الأصلية لم تتغير.");
  }
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      const target=e.target as HTMLElement|null;
      const editable=target?.isContentEditable||
        ["INPUT","TEXTAREA","SELECT"].includes(target?.tagName??"");
      if(e.key==="F9"&&!editable&&draftsEnabled&&draftStatus==="ready"&&lines.length>0){
        e.preventDefault();
        void saveDraft();
      }
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  });
  async function calculate() {
    if(busy||draftBusy||lines.length===0)return;
    setBusy(true);setPreview(null);setAdjustment(null);setMessage("");
    try{
      const response=await fetch(api+"/checkout-preview",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({lines}),
      });
      if(response.status===401){router.replace("/sign-in");return;}
      if(response.status===403||response.status===404){setStatus("denied");return;}
      if(!response.ok){setMessage("تعذر حساب معاينة الأسعار. تأكد من العناصر والعملة والصلاحيات.");return;}
      const result=await response.json() as Preview;
      if(result.state!=="DRAFT_PREVIEW_ONLY"||result.persisted!==false||
          result.accountingState!=="NOT_POSTED"||result.paymentState!=="NOT_COLLECTED"||
          !Array.isArray(result.lines)){setMessage("استجابة غير صالحة.");return;}
      setPreview(result);
    }catch{setMessage("تعذر الاتصال بالخادم.");}
    finally{setBusy(false);}
  }
  async function previewAdjustments(){
    if(busy||draftBusy||lines.length===0)return;
    const headerDiscountMinor=readMoneyMinor(discountText);
    const customerPresentedMinor=readMoneyMinor(presentedText);
    if(headerDiscountMinor===null||customerPresentedMinor===null){
      setAdjustment(null);setMessage("اكتب مبلغين صالحين بالعملة (بحد أقصى رقمين بعد العلامة).");return;
    }
    setBusy(true);setAdjustment(null);setMessage("");
    try{
      const response=await fetch(api+"/adjustments-preview",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({lines,headerDiscountMinor,customerPresentedMinor}),
      });
      if(response.status===401){router.replace("/sign-in");return;}
      if(response.status===403||response.status===404){setStatus("denied");return;}
      if(!response.ok){setMessage("الخصم غير صالح أو أكبر من إجمالي القائمة، أو الخدمة غير متاحة.");return;}
      const result=await response.json() as Adjustment;
      if(result.state!=="DRAFT_ADJUSTMENT_PREVIEW_ONLY"||result.persisted!==false||
          result.discountRecorded!==false||result.accountingState!=="NOT_POSTED"||
          result.paymentState!=="NOT_COLLECTED"||result.taxComputed!==false){
        setMessage("استجابة المعاينة غير صحيحة.");return;
      }
      setAdjustment(result);
    }catch{setMessage("تعذر الاتصال بالخادم لحساب الخصم والإكرامية الاسترشادية.");}
    finally{setBusy(false);}
  }
  return <main className="k5-workspace" data-cashier-pos="private-workstation-v1">
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
    </header>
    <div className="k5-page-title"><div>
      <span className="k5-eyebrow">POS / CASHIER WORKSTATION · NONPOSTING</span>
      <h1>نقطة البيع — مسودة تشغيل</h1>
      <p className="k5-muted">تخطيط Cashier الثلاثي (عميل · حلاق/كتالوج · مسودة) على Light المضغوط مع APIs الفرع.
        التحصيل والترحيل مقفولان بـ ADR-031 — الأزرار المالية ظاهرة ومقفولة بصراحة.</p>
    </div></div>
    {status==="loading"&&<p role="status">جاري التحقق من صلاحيات الفرع…</p>}
    {status==="denied"&&<p role="alert" className="k5-error">المعاينة غير متاحة لحسابك أو للفرع.</p>}
    {status==="error"&&<p role="alert" className="k5-error">المعاينة غير متاحة حاليًا.</p>}
    {status==="ready"&&<CashierWorkstationShell
      mode="private"
      customerPane={<>
        {draftsEnabled&&richEnabled&&<PosCustomerOperator
          apiRoot={api.replace(/\/pos-preview$/,"")} customerId={selectedCustomerId}
          onSelect={setSelectedCustomerId} onCreated={()=>setCustomerRevision(v=>v+1)}/>}
        {!(draftsEnabled&&richEnabled)&&
          <p className="k5-muted">تشغيل العميل الغني يحتاج أعلام المسودات + POS الغني.</p>}
        {draftsEnabled&&richEnabled&&<CashierDraftHistory
            apiRoot={api.replace(/\/pos-preview$/,"")} draftApi={draftApi}
            revision={richHistoryRevision} disabled={busy||draftBusy}
            printBasePath={home+"/pos-preview"}
            onUseDraft={savedLines=>createNewFromDraft({lines:savedLines as Line[]})}/>}
      </>}
      catalogPane={<>
        <CashierQuickActions/>
        <CashierBarberSelector apiRoot={api.replace(/\/pos-preview$/,"")}
         selectedId={selectedBarberId} onSelect={setSelectedBarberId} onRoster={onRoster}/>
        {selectedBarberId&&<p className="k5-muted" data-cashier-pos="barber-context">
         المنفذ المختار: {selectedBarberId} — لسطور الخدمة في الحفظ الغني؛ مفيش عمولة.</p>}
        <CashierCatalogBrowser offerings={offerings} disabled={busy||draftBusy||lines.length>=20}
         productStock={productStock} onAdd={o=>quickAdd(o)}/>
        <CashierPackagesSection
         apiRoot={api.replace(/\/pos-preview$/,"")}
         offerings={offerings} lines={lines} disabled={busy||draftBusy||lines.length>=20}
         selectedBarberId={selectedBarberId}
         onExpand={next=>{
          setLines(next);setPreview(null);setAdjustment(null);retryKey.current=null;setCartRevision(v=>v+1);
         }}/>
      </>}
      invoicePane={<>
        <CashierCartPanel lines={lines} offerings={offerings} disabled={busy||draftBusy}
         selectedExecutorEmployeeId={selectedBarberId}
         onAdjust={adjustLineQuantity}
         onRemove={id=>{
          setLines(s=>{
           const target=s.find(x=>x.offeringId===id);
           if(target?.packageMeta){
            return s.filter(x=>x.packageMeta?.groupKey!==target.packageMeta!.groupKey);
           }
           return s.filter(x=>x.offeringId!==id);
          });
          setPreview(null);setAdjustment(null);retryKey.current=null;
         }}/>
        <div className="catalog-form" aria-label="معاينة خصم وإكرامية غير مدفوعة">
          <label>خصم استرشادي ({selectedCurrency})
            <input type="text" inputMode="decimal" value={discountText} maxLength={14}
              onChange={e=>{setDiscountText(e.target.value);setAdjustment(null);}} disabled={busy||draftBusy}/>
          </label>
          <label>مبلغ العميل المفترض ({selectedCurrency})
            <input type="text" inputMode="decimal" value={presentedText} maxLength={14}
              onChange={e=>{setPresentedText(e.target.value);setAdjustment(null);}} disabled={busy||draftBusy}/>
          </label>
          <button className="k5-save" type="button" disabled={busy||draftBusy||lines.length===0}
            onClick={()=>void previewAdjustments()}>معاينة الخصم وفرق المبلغ</button>
          <button className="k5-save" type="button" disabled={busy||draftBusy||lines.length===0}
            onClick={()=>void calculate()}>
            {busy?"جاري الحساب…":"احسب معاينة الأسعار"}
          </button>
          {draftsEnabled&&draftStatus==="ready"&&
            <button className="k5-save" type="button" disabled={draftBusy||busy||lines.length===0}
              onClick={()=>void saveDraft()}>
              {draftBusy?"جاري حفظ المسودة…":"حفظ مسودة فقط (بدون بيع) · F9"}
            </button>}
          {message&&<p role="status" className="k5-notice">{message}</p>}
        </div>
        {lines.length>0&&<CashierPricingPanel key={JSON.stringify(lines)+"-"+cartRevision+"-"+selectedBarberId}
          api={api} draftApi={draftApi}
          richEnabled={draftsEnabled&&richEnabled}
          afterSaved={()=>{void loadDrafts();setRichHistoryRevision(v=>v+1);}}
          lines={lines} offerings={offerings} customerId={selectedCustomerId}
          onCustomerIdChange={setSelectedCustomerId} customerRevision={customerRevision}
          defaultExecutorEmployeeId={selectedBarberId||undefined}/>}
        {adjustment&&<section className="k5-admin-card">
          <h2>خصم وإكرامية محتملة — معاينة فقط</h2>
          <p>إجمالي القائمة: <strong>{money(adjustment.listPriceSubtotalMinor,adjustment.currency)}</strong></p>
          <p>خصم استرشادي غير محفوظ: <strong>{money(adjustment.headerDiscountMinor,adjustment.currency)}</strong></p>
          <p>بعد الخصم وقبل الضرائب: <strong>{money(adjustment.afterDiscountMinor,adjustment.currency)}</strong></p>
          <p>المبلغ المفترض من العميل: {money(adjustment.customerPresentedMinor,adjustment.currency)}</p>
          <p>فرق إيجابي / إكرامية محتملة: {money(adjustment.possibleTipMinor,adjustment.currency)}</p>
          <p>المبلغ الناقص: {money(adjustment.shortfallMinor,adjustment.currency)}</p>
          <p className="k5-muted">لا يوجد تحصيل أو إكرامية موزعة أو خصم محفوظ أو فاتورة أو قيد. حفظ المسودة يحفظ العناصر فقط؛ هذه الأرقام مؤقتة ولا تشمل ضريبة.</p>
        </section>}
        {preview&&<section className="k5-admin-card">
          <h2>نتيجة المعاينة — ليست فاتورة</h2>
          <p><strong>{money(preview.listPriceSubtotalMinor,preview.currency)}</strong></p>
          <p className="k5-muted">NOT_POSTED · NOT_COLLECTED</p>
        </section>}
        {draftsEnabled&&draftStatus==="ready"&&<section className="k5-admin-card">
          <h2>مسودات محفوظة — مش فواتير</h2>
          {savedDrafts.length===0?<p className="k5-muted">مفيش مسودات محفوظة للفرع.</p>:
            <div className="k5-table-wrap"><table className="k5-table">
              <thead><tr><th>تاريخ الحفظ</th><th>العناصر</th><th>إجمالي القائمة وقت الحفظ</th><th>الحالة</th><th>استخدام كقالب</th></tr></thead>
              <tbody>{savedDrafts.map(d=><tr key={d.draftId}>
                <td>{new Date(d.createdAtUtc).toLocaleString("ar-EG")}</td>
                <td>{d.lines.map(l=>l.displayName+" × "+l.quantity).join("، ")}</td>
                <td dir="ltr">{money(d.subtotalMinor,d.currency)}</td><td>مسودة فقط</td>
                <td><button className="k5-salon-refresh" type="button" disabled={busy||draftBusy}
                  onClick={()=>createNewFromDraft(d)}>جهّز سلة جديدة</button></td>
              </tr>)}</tbody>
            </table></div>}
        </section>}
      </>}
      footer={<>
        {lines.length>0&&<CashierTipsPreview totalDueMinor={tipTotalDueMinor} currency={tipCurrency}
         executorLines={tipExecutorLines} executorNames={rosterNames} disabled={busy||draftBusy}/>}
        <CashierReturnsPreview disabled={busy||draftBusy}/>
      </>}
    />}
  </main>;
}
