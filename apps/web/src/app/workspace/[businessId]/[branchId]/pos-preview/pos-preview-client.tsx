"use client";
import Link from "next/link";
import CashierPricingPanel from "./cashier-pricing-panel";
import CashierDraftHistory from "./cashier-draft-history";
import PosCustomerOperator from "./pos-customer-operator";
import CashierCatalogBrowser from "./cashier-catalog-browser";
import CashierCartPanel from "./cashier-cart-panel";
import CashierQuickActions from "./cashier-quick-actions";
import CashierBarberSelector from "./cashier-barber-selector";
import CashierPackagesSection from "./cashier-packages-section";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Offering = {offeringId:string;kind:"SERVICE"|"PRODUCT";displayName:string;
  priceMinor:number;currency:string;isActive:boolean};
type Line = {offeringId:string;quantity:number};
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
export default function PosPreviewClient({businessId,branchId,draftsEnabled,richEnabled,initialOfferingId}:{
  businessId:string;branchId:string;draftsEnabled:boolean;richEnabled:boolean;initialOfferingId:string|null;
}) {
  const router=useRouter();
  const [status,setStatus]=useState<"loading"|"ready"|"denied"|"error">("loading");
  const [offerings,setOfferings]=useState<Offering[]>([]);
  const [offeringId,setOfferingId]=useState("");
  const [quantity,setQuantity]=useState(1);
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
  const retryKey=useRef<string|null>(null);
  const handoffApplied=useRef(false);
  const selectedCurrency=offerings.find(o=>lines.some(l=>l.offeringId===o.offeringId))?.currency??"EGP";
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
      // The query is NEVER an authority, price, sale or booked-status proof.
      // Only the independently permitted POS/Catalog response can validate it.
      if(!handoffApplied.current&&initialOfferingId!==null){
        handoffApplied.current=true;
        const offering=data.offerings.find(o=>
          o.offeringId===initialOfferingId&&GUID.test(o.offeringId)&&
          o.isActive&&o.kind==="SERVICE");
        if(offering){
          setLines(current=>current.length===0?
            [{offeringId:offering.offeringId,quantity:1}]:current);
          setMessage("اتجهزت سلة مسودة جديدة من خدمة الحجز. راجع الأسعار، ولا يوجد بيع أو تحصيل.");
        }else{
          setMessage("الخدمة مش متاحة في الكتالوج الحالي. اختار خدمة من القائمة.");
        }
      }
      setStatus("ready");
    } catch {setStatus("error");}
  },[api,businessId,branchId,router,initialOfferingId]);
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
  function createNewFromDraft(d:{lines:Array<{offeringId:string;quantity:number}>}){
    if(busy||draftBusy)return;
    // A saved DRAFT is IMMUTABLE. Preparing a new cart always uses currently
    // authorized active Catalog references and requires fresh server pricing.
    if(!d.lines.length||d.lines.length>20||
      d.lines.some(x=>!GUID.test(x.offeringId)||!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>20||
        !offerings.some(o=>o.offeringId===x.offeringId&&o.isActive))||
      new Set(d.lines.map(x=>x.offeringId)).size!==d.lines.length){
      setMessage("فيه عناصر قديمة أو غير متاحة. لازم تعمل مسودة جديدة من الكتالوج.");return;
    }
    retryKey.current=null;setPreview(null);setAdjustment(null);
    setCartRevision(v=>v+1);
    setLines(d.lines.map(x=>({offeringId:x.offeringId,quantity:x.quantity})));
    setMessage("تم تجهيز سلة جديدة من المسودة القديمة. راجع الأسعار الحالية قبل الحفظ؛ المسودة الأصلية لم تتغير.");
  }
  function addLine(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy||draftBusy)return;
    setPreview(null);setAdjustment(null);setMessage("");
    if(!GUID.test(offeringId)||!Number.isSafeInteger(quantity)||quantity<1||quantity>20||
        !offerings.some(o=>o.offeringId===offeringId)||
        lines.some(l=>l.offeringId===offeringId)||lines.length>=20) {
      setMessage("اختار عنصر صالح بكمية من 1 إلى 20، من غير تكرار.");return;
    }
    retryKey.current=null;
    setLines(current=>[...current,{offeringId,quantity}]);
  }
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
      <span className="k5-eyebrow">POS / CASHIER UX · NONPOSTING</span>
      <h1>نقطة البيع — مسودة تشغيل</h1>
      <p className="k5-muted">واجهة Cashier مكيّفة على Light الخاص: عميل + كتالوج + سلة على APIs DRVO.
        مفيش تحصيل أو فاتورة أو مخزون أو ترحيل — أي زر مالي ظاهر ومقفول بصراحة.</p>
    </div></div>
    {status==="loading"&&<p role="status">جاري التحقق من صلاحيات الفرع…</p>}
    {status==="denied"&&<p role="alert" className="k5-error">المعاينة غير متاحة لحسابك أو للفرع.</p>}
    {status==="error"&&<p role="alert" className="k5-error">المعاينة غير متاحة حاليًا.</p>}
    {status==="ready"&&<>
      {draftsEnabled&&richEnabled&&<PosCustomerOperator
        apiRoot={api.replace(/\/pos-preview$/,"")} customerId={selectedCustomerId}
        onSelect={setSelectedCustomerId} onCreated={()=>setCustomerRevision(v=>v+1)}/>}
      <CashierBarberSelector apiRoot={api.replace(/\/pos-preview$/,"")}
       selectedId={selectedBarberId} onSelect={setSelectedBarberId}/>
      <CashierCatalogBrowser offerings={offerings} disabled={busy||draftBusy||lines.length>=20}
       onAdd={o=>quickAdd(o)}/>
      <CashierPackagesSection
       apiRoot={api.replace(/\/pos-preview$/,"")}
       offerings={offerings} lines={lines} disabled={busy||draftBusy||lines.length>=20}
       selectedBarberId={selectedBarberId}
       onExpand={next=>{
        setLines(next);setPreview(null);setAdjustment(null);retryKey.current=null;setCartRevision(v=>v+1);
       }}/>
      <CashierCartPanel lines={lines} offerings={offerings} disabled={busy||draftBusy}
       selectedExecutorEmployeeId={selectedBarberId}
       onAdjust={adjustLineQuantity}
       onRemove={id=>{
        setLines(s=>s.filter(x=>x.offeringId!==id));setPreview(null);setAdjustment(null);retryKey.current=null;
       }}/>
      {selectedBarberId&&<p className="k5-muted" data-cashier-pos="barber-context">
       المنفذ المختار للمسودة: {selectedBarberId} — يُمرَّر افتراضيًا لسطور الخدمة في الحفظ الغني؛ المنتجات بدون منفذ؛ مفيش عمولة.</p>}
      <CashierQuickActions/>
      <section className="k5-admin-card">
        <h2>حساب المعاينة وحفظ المسودة</h2>
        <form className="catalog-form" onSubmit={addLine}>
          <label>إضافة يدوية<select value={offeringId}
            onChange={e=>setOfferingId(e.target.value)}>
            <option value="">اختر من الكتالوج</option>
            {offerings.filter(o=>o.isActive).map(o=>
              <option key={o.offeringId} value={o.offeringId}>{o.displayName} — {money(o.priceMinor,o.currency)}</option>)}
          </select></label>
          <label>الكمية<input type="number" min={1} max={20} required
            value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
          <button className="k5-save" type="submit" disabled={busy||draftBusy||!offeringId}>أضف للمسودة</button>
        </form>
        <button className="k5-save" type="button" disabled={busy||draftBusy||lines.length===0} onClick={()=>void calculate()}>
          {busy?"جاري الحساب…":"احسب معاينة الأسعار"}
        </button>
        <div className="catalog-form" aria-label="معاينة خصم وإكرامية غير مدفوعة">
          <label>خصم استرشادي ({selectedCurrency})
            <input type="text" inputMode="decimal" value={discountText} maxLength={14}
              onChange={e=>{setDiscountText(e.target.value);setAdjustment(null);}} disabled={busy||draftBusy}/>
          </label>
          <label>مبلغ العميل المفترض ({selectedCurrency}) — لم يُحصَّل
            <input type="text" inputMode="decimal" value={presentedText} maxLength={14}
              onChange={e=>{setPresentedText(e.target.value);setAdjustment(null);}} disabled={busy||draftBusy}/>
          </label>
          <button className="k5-save" type="button" disabled={busy||draftBusy||lines.length===0}
            onClick={()=>void previewAdjustments()}>معاينة الخصم وفرق المبلغ</button>
        </div>
        {draftsEnabled&&draftStatus==="ready"&&
          <button className="k5-save" type="button" disabled={draftBusy||busy||lines.length===0}
            onClick={()=>void saveDraft()}>
            {draftBusy?"جاري حفظ المسودة…":"حفظ مسودة فقط (بدون بيع)"}
          </button>}
        {message&&<p role="status" className="k5-notice">{message}</p>}
      </section>
      {draftsEnabled&&draftStatus==="denied"&&
        <p className="k5-muted">حفظ المسودات مش متاح بصلاحيات الحساب الحالية.</p>}
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
      {draftsEnabled&&richEnabled&&<CashierDraftHistory
        apiRoot={api.replace(/\/pos-preview$/,"")} draftApi={draftApi}
        revision={richHistoryRevision} disabled={busy||draftBusy}
        onUseDraft={savedLines=>createNewFromDraft({lines:savedLines})}/>}
      {lines.length>0&&<CashierPricingPanel key={JSON.stringify(lines)+"-"+cartRevision+"-"+selectedBarberId} api={api} draftApi={draftApi}
  richEnabled={draftsEnabled&&richEnabled} afterSaved={()=>{void loadDrafts();setRichHistoryRevision(v=>v+1);}}
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
        <div className="k5-table-wrap"><table className="k5-table">
          <thead><tr><th>العنصر</th><th>الكمية</th><th>سعر القائمة</th><th>الإجمالي</th></tr></thead>
          <tbody>{preview.lines.map(item=><tr key={item.offeringId}>
            <td>{item.displayName}</td><td>{item.quantity}</td>
            <td dir="ltr">{money(item.unitPriceMinor,preview.currency)}</td>
            <td dir="ltr">{money(item.lineSubtotalMinor,preview.currency)}</td>
          </tr>)}</tbody>
        </table></div>
        <p><strong>الإجمالي الاسترشادي: {money(preview.listPriceSubtotalMinor,preview.currency)}</strong></p>
        <p className="k5-muted">لم تُحصَّل أي مبالغ، ولم تُرحَّل قيود، ولم تُحسب ضرائب.
          الأسعار قابلة للتغيير، وتُراجع من جديد قبل أي بيع حقيقي.</p>
      </section>}
    </>}
  </main>;
}
