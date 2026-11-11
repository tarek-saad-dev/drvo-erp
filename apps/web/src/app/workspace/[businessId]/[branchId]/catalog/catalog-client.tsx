"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {categoryId:string;displayName:string;isActive:boolean};
type Offering = {offeringId:string;categoryId:string|null;kind:"SERVICE"|"PRODUCT";
  displayName:string;priceMinor:number;currency:string;durationMinutes:number|null;isActive:boolean};
type Data = {categories:Category[];offerings:Offering[]};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CatalogClient({businessId,branchId}:{businessId:string;branchId:string}){
  const router=useRouter();
  const [data,setData]=useState<Data>({categories:[],offerings:[]});
  const [status,setStatus]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [categoryName,setCategoryName]=useState("");
  const [kind,setKind]=useState<"SERVICE"|"PRODUCT">("SERVICE");
  const [offeringName,setOfferingName]=useState("");
  const [categoryId,setCategoryId]=useState("");
  const [amount,setAmount]=useState("");
  const [currency,setCurrency]=useState("EGP");
  const [minutes,setMinutes]=useState("30");
  const categoryRequest=useRef<string|null>(null);
  const offeringRequest=useRef<string|null>(null);
  const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
  const api="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+encodeURIComponent(branchId)+"/catalog";

  const load=useCallback(async()=>{
    if(!GUID.test(businessId)||!GUID.test(branchId)){setStatus("denied");return;}
    try{
      const r=await fetch(api,{credentials:"same-origin",cache:"no-store"});
      if(r.status===401){router.replace("/sign-in");return;}
      if(r.status===403||r.status===404){setStatus("denied");return;}
      if(!r.ok){setStatus("unavailable");return;}
      const value=await r.json() as Data;
      if(!Array.isArray(value.categories)||!Array.isArray(value.offerings)){
        setStatus("unavailable");return;
      }
      setData(value);setStatus("ready");
    }catch{setStatus("unavailable");}
  },[api,businessId,branchId,router]);
  useEffect(()=>{void load();},[load]);

  async function send(path:string,body:unknown,ref:React.MutableRefObject<string|null>){
    if(busy)return;
    setBusy(true);setNotice("");
    if(!ref.current)ref.current=crypto.randomUUID();
    try{
      const r=await fetch(api+path,{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json","Idempotency-Key":ref.current},
        body:JSON.stringify(body),
      });
      if(r.status===401){router.replace("/sign-in");return;}
      if(r.status===404||r.status===403){setStatus("denied");return;}
      if(r.status===409){ref.current=null;setNotice("طلب مكرر ببيانات مختلفة. راجع البيانات وأعد المحاولة.");return;}
      if(!r.ok){setNotice("فشل الحفظ. جرّب مرة تانية بنفس البيانات.");return;}
      ref.current=null;setNotice("تم الحفظ بنجاح.");await load();
    }catch{setNotice("تعذر الاتصال. يمكن إعادة المحاولة بدون تكرار العملية.");}
    finally{setBusy(false);}
  }
  async function addCategory(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    await send("/categories",{displayName:categoryName},categoryRequest);
    if(categoryRequest.current===null)setCategoryName("");
  }
  async function addOffering(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const value=Number(amount);
    // Every currency in this starter UI has exactly two decimal minor units.
    if(!/^\d+(\.\d{1,2})?$/.test(amount)||
      !Number.isSafeInteger(Math.round(value*100))){
      setNotice("السعر لازم يكون رقم موجب بحد أقصى خانتين عشريتين.");return;
    }
    const duration=Number(minutes);
    if(kind==="SERVICE"&&(!Number.isInteger(duration)||duration<1||duration>1440)){
      setNotice("مدة الخدمة لازم تكون من 1 لـ1440 دقيقة.");return;
    }
    await send("/offerings",{
      kind,displayName:offeringName,categoryId:categoryId||null,
      priceMinor:Math.round(value*100),currency,
      durationMinutes:kind==="SERVICE"?duration:null,
    },offeringRequest);
    if(offeringRequest.current===null){setOfferingName("");setAmount("");}
  }
  const onCategoryChange=(value:string)=>{setCategoryName(value);categoryRequest.current=null;};
  const onOfferingEdit=()=>{offeringRequest.current=null;};
  return <main className="k5-workspace">
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <nav className="k5-head-actions"><Link href={home}>مساحة الفرع</Link></nav>
    </header>
    <div className="k5-page-title"><div>
      <span className="k5-eyebrow">SHARED CATALOG</span>
      <h1>المنتجات والخدمات</h1>
      <p className="k5-muted">الكتالوج مشترك لكل فروع نفس الـBusiness. الأسعار هنا استرشادية؛ مش فواتير أو مدفوعات.</p>
    </div></div>
    {status==="loading"&&<p role="status" className="k5-table-state">جاري تحميل البيانات…</p>}
    {status==="denied"&&<p role="alert" className="k5-error">مش مصرح لك بعرض الكتالوج.</p>}
    {status==="unavailable"&&<p role="alert" className="k5-error">الكتالوج غير متاح حاليًا.</p>}
    {status==="ready"&&<>
      {notice&&<p role="status" className="k5-notice">{notice}</p>}
      <section className="k5-admin-card k5-invite-card">
        <h2>تصنيف جديد</h2>
        <form className="catalog-form" onSubmit={addCategory}>
          <label>اسم التصنيف<input required maxLength={100} value={categoryName}
            onChange={e=>onCategoryChange(e.target.value)} placeholder="مثال: العناية بالشعر"/></label>
          <button className="k5-save" disabled={busy}>إضافة التصنيف</button>
        </form>
      </section>
      <section className="k5-admin-card k5-invite-card">
        <h2>خدمة أو منتج جديد</h2>
        <form className="catalog-form" onSubmit={addOffering}>
          <label>النوع<select value={kind} onChange={e=>{setKind(e.target.value as typeof kind);onOfferingEdit();}}>
            <option value="SERVICE">خدمة</option><option value="PRODUCT">منتج</option></select></label>
          <label>الاسم<input required maxLength={160} value={offeringName}
            onChange={e=>{setOfferingName(e.target.value);onOfferingEdit();}}/></label>
          <label>التصنيف<select value={categoryId} onChange={e=>{setCategoryId(e.target.value);onOfferingEdit();}}>
            <option value="">بدون تصنيف</option>
            {data.categories.filter(c=>c.isActive).map(c=><option key={c.categoryId} value={c.categoryId}>{c.displayName}</option>)}
          </select></label>
          <label>السعر الأساسي<input required inputMode="decimal" value={amount} placeholder="125.00"
            onChange={e=>{setAmount(e.target.value);onOfferingEdit();}}/></label>
          <label>العملة<select value={currency} onChange={e=>{setCurrency(e.target.value);onOfferingEdit();}}>
            <option value="EGP">EGP</option><option value="SAR">SAR</option>
            <option value="AED">AED</option><option value="USD">USD</option>
          </select></label>
          {kind==="SERVICE"&&<label>المدة بالدقائق<input required type="number" min={1} max={1440}
            value={minutes} onChange={e=>{setMinutes(e.target.value);onOfferingEdit();}}/></label>}
          <button className="k5-save" disabled={busy}>إضافة {kind==="SERVICE"?"الخدمة":"المنتج"}</button>
        </form>
      </section>
      <section className="k5-admin-card">
        <div className="k5-admin-summary"><h2>العناصر المسجلة</h2>
          <span className="k5-count">{data.offerings.length} عنصر</span></div>
        <div className="k5-table-wrap"><table className="k5-table">
          <thead><tr><th>الاسم</th><th>النوع</th><th>التصنيف</th><th>السعر</th><th>المدة</th></tr></thead>
          <tbody>{data.offerings.length===0?
            <tr><td colSpan={5} className="k5-empty">لسه مفيش خدمات أو منتجات.</td></tr>:
            data.offerings.map(item=><tr key={item.offeringId}>
              <td>{item.displayName}</td><td>{item.kind==="SERVICE"?"خدمة":"منتج"}</td>
              <td>{data.categories.find(c=>c.categoryId===item.categoryId)?.displayName??"—"}</td>
              <td dir="ltr">{(item.priceMinor/100).toFixed(2)} {item.currency}</td>
              <td>{item.durationMinutes??"—"}</td>
            </tr>)}</tbody>
        </table></div>
      </section>
    </>}
  </main>;
}
