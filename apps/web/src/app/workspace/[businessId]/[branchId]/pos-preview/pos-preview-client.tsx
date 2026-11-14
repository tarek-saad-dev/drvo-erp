"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Offering = {offeringId:string;kind:"SERVICE"|"PRODUCT";displayName:string;
  priceMinor:number;currency:string;isActive:boolean};
type Line = {offeringId:string;quantity:number};
type Preview = {state:"DRAFT_PREVIEW_ONLY";persisted:false;accountingState:"NOT_POSTED";
  paymentState:"NOT_COLLECTED";currency:string;taxComputed:false;
  lines:Array<{offeringId:string;displayName:string;quantity:number;unitPriceMinor:number;lineSubtotalMinor:number}>;
  listPriceSubtotalMinor:number};
type SavedDraft={draftId:string;status:"DRAFT";version:number;currency:string;subtotalMinor:number;createdAtUtc:string;lines:Array<{offeringId:string;displayName:string;quantity:number}>};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function money(minor:number,currency:string):string {
  return (minor/100).toFixed(2)+" "+currency;
}
export default function PosPreviewClient({businessId,branchId,draftsEnabled,initialOfferingId}:{
  businessId:string;branchId:string;draftsEnabled:boolean;initialOfferingId:string|null;
}) {
  const router=useRouter();
  const [status,setStatus]=useState<"loading"|"ready"|"denied"|"error">("loading");
  const [offerings,setOfferings]=useState<Offering[]>([]);
  const [offeringId,setOfferingId]=useState("");
  const [catalogSearch,setCatalogSearch]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [lines,setLines]=useState<Line[]>([]);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [draftStatus,setDraftStatus]=useState<"loading"|"ready"|"denied">("loading");
  const [savedDrafts,setSavedDrafts]=useState<SavedDraft[]>([]);
  const [draftBusy,setDraftBusy]=useState(false);
  const retryKey=useRef<string|null>(null);
  const handoffApplied=useRef(false);
  const matchingOfferings=offerings.filter(o=>o.isActive&&
    o.displayName.toLocaleLowerCase().includes(catalogSearch.trim().toLocaleLowerCase()));
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
      retryKey.current=null;setLines([]);setPreview(null);
      setMessage("المسودة اتحفظت. لم يتم تسجيل بيع أو تحصيل.");
      await loadDrafts();
    }catch{setMessage("اتصال غير متاح. أعد المحاولة بنفس البيانات للتأكد من عدم التكرار.");}
    finally{setDraftBusy(false);}
  }
  function quickAdd(offering:Offering){
    if(busy||draftBusy||!offering.isActive||lines.length>=20||
       lines.some(x=>x.offeringId===offering.offeringId))return;
    retryKey.current=null;setPreview(null);setMessage("");
    setLines(current=>[...current,{offeringId:offering.offeringId,quantity:1}]);
  }
  function adjustLineQuantity(selectedOfferingId:string,delta:-1|1){
    if(busy||draftBusy)return;
    const existing=lines.find(l=>l.offeringId===selectedOfferingId);
    if(!existing||existing.quantity+delta<1||existing.quantity+delta>20)return;
    // A changed cart must never replay a pending immutable DRAFT request or
    // retain a server-priced preview for different quantities.
    retryKey.current=null;setPreview(null);setMessage("");
    setLines(current=>current.map(l=>{
      if(l.offeringId!==selectedOfferingId)return l;
      const next=l.quantity+delta;
      return next>=1&&next<=20?{...l,quantity:next}:l;
    }));
  }
  function createNewFromDraft(d:SavedDraft){
    if(busy||draftBusy)return;
    // A saved DRAFT is IMMUTABLE. Preparing a new cart always uses currently
    // authorized active Catalog references and requires fresh server pricing.
    if(!d.lines.length||d.lines.length>20||
      d.lines.some(x=>!GUID.test(x.offeringId)||x.quantity<1||x.quantity>20||
        !offerings.some(o=>o.offeringId===x.offeringId&&o.isActive))||
      new Set(d.lines.map(x=>x.offeringId)).size!==d.lines.length){
      setMessage("فيه عناصر قديمة أو غير متاحة. لازم تعمل مسودة جديدة من الكتالوج.");return;
    }
    retryKey.current=null;setPreview(null);
    setLines(d.lines.map(x=>({offeringId:x.offeringId,quantity:x.quantity})));
    setMessage("تم تجهيز سلة جديدة من المسودة القديمة. راجع الأسعار الحالية قبل الحفظ؛ المسودة الأصلية لم تتغير.");
  }
  function addLine(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy||draftBusy)return;
    setPreview(null);setMessage("");
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
    setBusy(true);setPreview(null);setMessage("");
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
  return <main className="k5-workspace"
    data-scope-uuid-valid={GUID.test(businessId)&&GUID.test(branchId)?"yes":"no"}>
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
    </header>
    <div className="k5-page-title"><div>
      <span className="k5-eyebrow">POS / REVIEW-ONLY</span>
      <h1>مسودة بيع — معاينة الأسعار</h1>
      <p className="k5-muted">دي معاينة من كتالوج النشاط، مش فاتورة أو أمر دفع أو حجز مخزون.
        العناصر الحالية مؤقتة في المتصفح؛ والحفظ (لو مسموح) بيعمل DRAFT فقط، مش فاتورة أو عملية دفع. الضرائب والخصومات لسه مش محسوبين.</p>
    </div></div>
    {status==="loading"&&<p role="status">جاري التحقق من صلاحيات الفرع…</p>}
    {status==="denied"&&<p role="alert" className="k5-error">المعاينة غير متاحة لحسابك أو للفرع.</p>}
    {status==="error"&&<p role="alert" className="k5-error">المعاينة غير متاحة حاليًا.</p>}
    {status==="ready"&&<>
      <section className="k5-admin-card k5-invite-card">
        <h2>إضافة عنصر للمسودة</h2>
        <p className="k5-muted">اختار عنصر من القائمة أو اضغط إضافة سريعة. كل الأسعار استرشادية، والسلة مش فاتورة.</p>
        <label>ابحث عن خدمة أو منتج للإضافة السريعة
          <input type="search" maxLength={100} value={catalogSearch}
            placeholder="اكتب اسم العنصر" onChange={e=>setCatalogSearch(e.target.value)}/>
        </label>
        <div className="k5-salon-steps" aria-label="إضافة سريعة من الكتالوج">
          {matchingOfferings.filter(o=>
            !lines.some(l=>l.offeringId===o.offeringId)).slice(0,8).map(o=><button
            key={o.offeringId} type="button" className="k5-salon-refresh"
            disabled={busy||draftBusy||lines.length>=20} onClick={()=>quickAdd(o)}>
            + {o.displayName} — {money(o.priceMinor,o.currency)}
          </button>)}
        </div>
        {matchingOfferings.length===0&&<p className="k5-muted">مفيش عناصر نشطة مطابقة للبحث الحالي.</p>}
        <form className="catalog-form" onSubmit={addLine}>
          <label>الخدمة أو المنتج<select value={offeringId} required
            onChange={e=>setOfferingId(e.target.value)}>
            <option value="">اختر من الكتالوج</option>
            {offerings.filter(o=>o.isActive).map(o=>
              <option key={o.offeringId} value={o.offeringId}>{o.displayName} — {money(o.priceMinor,o.currency)}</option>)}
          </select></label>
          <label>الكمية<input type="number" min={1} max={20} required
            value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
          <button className="k5-save" type="submit" disabled={busy||draftBusy}>أضف للمسودة</button>
        </form>
      </section>
      <section className="k5-admin-card">
        <h2>عناصر المسودة (غير محفوظة)</h2>
        {lines.length===0?<p className="k5-muted">لسه مفيش عناصر.</p>:
          <div className="k5-table-wrap"><table className="k5-table">
            <thead><tr><th>العنصر</th><th>الكمية</th><th>إزالة</th></tr></thead><tbody>
              {lines.map(l=><tr key={l.offeringId}>
                <td>{offerings.find(o=>o.offeringId===l.offeringId)?.displayName??"—"}</td>
                <td><div className="k5-booking-actions">
                  <button type="button" disabled={busy||draftBusy||l.quantity<=1}
                    aria-label={"تقليل كمية "+(offerings.find(o=>o.offeringId===l.offeringId)?.displayName??"العنصر")}
                    onClick={()=>adjustLineQuantity(l.offeringId,-1)}>−</button>
                  <span>{l.quantity}</span>
                  <button type="button" disabled={busy||draftBusy||l.quantity>=20}
                    aria-label={"زيادة كمية "+(offerings.find(o=>o.offeringId===l.offeringId)?.displayName??"العنصر")}
                    onClick={()=>adjustLineQuantity(l.offeringId,1)}>+</button>
                </div></td>
                <td><button type="button" disabled={busy||draftBusy} onClick={()=>{
                  setLines(s=>s.filter(x=>x.offeringId!==l.offeringId));setPreview(null);retryKey.current=null;
                }}>حذف</button></td>
              </tr>)}
            </tbody>
          </table></div>}
        <button className="k5-save" type="button" disabled={busy||draftBusy||lines.length===0} onClick={()=>void calculate()}>
          {busy?"جاري الحساب…":"احسب معاينة الأسعار"}
        </button>
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
