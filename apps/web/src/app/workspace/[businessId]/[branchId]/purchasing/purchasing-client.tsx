"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Supplier={supplierId:string;displayName:string;phoneNote:string;notes:string;isActive:boolean};
type Product={offeringId:string;displayName:string;isActive:boolean;qtyMilli:number};
type Receive={
 receiveId:string;supplierId:string|null;supplierName:string|null;supplierNote:string;
 currency:"EGP"|"SAR"|"AED"|"USD";status:"APPLIED"|"CANCELLED";createdAtUtc:string;
 lineCount:number;apTotalMinor:number;
};
type PurchasingWorkspace={
 state:"NONPOSTING_PURCHASE_RECEIVES_AP_PREVIEW";
 purchasingPosts:"RECEIVE_DRAFTS_ONLY";adr031:"NOT_IN_SCOPE";
 treasuryState:"NOT_PAID";accountingState:"NOT_POSTED";
 apPreview:{state:"AP_PREVIEW_ONLY";openApMinor:number;lifetimeApMinor:number;openReceiveCount:number};
 suppliers:Supplier[];products:Product[];receives:Receive[];
 limitPerSource:200;mayBeTruncated:boolean;
};
type UiState="loading"|"ready"|"denied"|"unavailable";
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money=(minor:number,currency:string)=>(minor/100).toFixed(2)+" "+currency;
const qty=(milli:number)=>(milli/1000).toFixed(3);
function parseQtyMilli(raw:string):number|null{
 if(!/^\d{1,10}(?:\.\d{1,3})?$/.test(raw))return null;
 const [major,fraction=""]=raw.split(".");
 const milli=Number(major)*1000+Number(fraction.padEnd(3,"0"));
 return Number.isSafeInteger(milli)&&milli>=1&&milli<=9000000000000?milli:null;
}
function parseCostMinor(raw:string):number|null{
 if(raw.trim()==="")return 0;
 if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw))return null;
 const [major,fraction=""]=raw.split(".");
 const minor=Number(major)*100+Number(fraction.padEnd(2,"0"));
 return Number.isSafeInteger(minor)&&minor>=0&&minor<=9000000000000?minor:null;
}

export default function PurchasingClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/purchasing";
 const [state,setState]=useState<UiState>("loading");
 const [data,setData]=useState<PurchasingWorkspace|null>(null);
 const [supplierName,setSupplierName]=useState("");
 const [supplierPhone,setSupplierPhone]=useState("");
 const [supplierNotes,setSupplierNotes]=useState("");
 const [supplierId,setSupplierId]=useState("");
 const [supplierNote,setSupplierNote]=useState("");
 const [currency,setCurrency]=useState<Receive["currency"]>("EGP");
 const [offeringId,setOfferingId]=useState("");
 const [receiveQty,setReceiveQty]=useState("");
 const [receiveCost,setReceiveCost]=useState("0");
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const supplierKey=useRef<string|null>(null);
 const receiveKey=useRef<string|null>(null);
 const cancelKeys=useRef<Record<string,string>>({});

 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const resp=await fetch(api,{credentials:"same-origin",cache:"no-store"});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){setState("denied");return;}
   if(!resp.ok){setState("unavailable");return;}
   const workspace=await resp.json() as PurchasingWorkspace;
   if(workspace.state!=="NONPOSTING_PURCHASE_RECEIVES_AP_PREVIEW"||
      workspace.purchasingPosts!=="RECEIVE_DRAFTS_ONLY"||
      workspace.adr031!=="NOT_IN_SCOPE"||
      workspace.treasuryState!=="NOT_PAID"||workspace.accountingState!=="NOT_POSTED"||
      workspace.apPreview?.state!=="AP_PREVIEW_ONLY"||
      !Array.isArray(workspace.suppliers)||!Array.isArray(workspace.products)||
      !Array.isArray(workspace.receives)){setState("unavailable");return;}
   setData(workspace);
   const firstSupplier=workspace.suppliers.find(s=>s.isActive)?.supplierId??"";
   setSupplierId(cur=>workspace.suppliers.some(s=>s.supplierId===cur&&s.isActive)?cur:firstSupplier);
   const firstProduct=workspace.products.find(p=>p.isActive)?.offeringId??"";
   setOfferingId(cur=>workspace.products.some(p=>p.offeringId===cur&&p.isActive)?cur:firstProduct);
   setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);

 useEffect(()=>{void load();},[load]);
 function message(value:string,isError=false){setNotice(value);setError(isError);}
 async function send(path:string,key:string,body:unknown){
  return fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":"application/json","Idempotency-Key":key},
   body:JSON.stringify(body)});
 }
 async function createSupplier(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  if(!supplierName.trim()||supplierName!==supplierName.trim()||supplierName.length>120||
     supplierPhone.length>40||supplierNotes.length>240){
   message("اسم المورد مطلوب بدون مسافات زائدة؛ الهاتف والملاحظات اختيارية.",true);return;
  }
  setBusy("supplier");setNotice("");setError(false);
  if(!supplierKey.current)supplierKey.current=crypto.randomUUID();
  try{
   const resp=await send(api+"/suppliers",supplierKey.current,
    {displayName:supplierName,phoneNote:supplierPhone,notes:supplierNotes});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("مش مصرح لك بإدارة الموردين.",true);return;}
   if(resp.status===409){supplierKey.current=null;message("المورد موجود أو الطلب متعارض.",true);return;}
   if(!resp.ok){message("تعذر حفظ المورد. أعد المحاولة بنفس البيانات.",true);return;}
   supplierKey.current=null;setSupplierName("");setSupplierPhone("");setSupplierNotes("");
   await load();message("المورد اتحفظ على مستوى الـBusiness (مشترك بين الفروع).");
  }catch{message("الاتصال تعذر. أعد نفس الطلب.",true);}
  finally{setBusy("");}
 }
 async function createReceive(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const qtyMilli=parseQtyMilli(receiveQty);
  const unitCostMinor=parseCostMinor(receiveCost);
  const selectedSupplier=supplierId===""?null:supplierId;
  if((selectedSupplier!==null&&!GUID.test(selectedSupplier))||!GUID.test(offeringId)||
     qtyMilli===null||unitCostMinor===null||supplierNote.length>160){
   message("راجع المورد والمنتج والكمية وتكلفة الوحدة.",true);return;
  }
  setBusy("receive");setNotice("");setError(false);
  if(!receiveKey.current)receiveKey.current=crypto.randomUUID();
  try{
   const resp=await send(api+"/receives",receiveKey.current,{
    supplierId:selectedSupplier,supplierNote,currency,
    lines:[{offeringId,qtyMilli,unitCostMinor}],
   });
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("مش مسموح باستلام مشتريات على الفرع ده.",true);return;}
   if(resp.status===409){receiveKey.current=null;message("استلام متعارض؛ راجع الكمية أو الطلب.",true);return;}
   if(!resp.ok){message("تعذر حفظ الاستلام. أعد نفس الطلب.",true);return;}
   const result=await resp.json() as {apTotalMinor?:number};
   receiveKey.current=null;setReceiveQty("");setReceiveCost("0");
   await load();
   message("الاستلام اتعمل وزاد المخزون. معاينة ذمم (AP) = "+
    money(Number(result.apTotalMinor??0),currency)+" — بدون دفع أو قيد.");
  }catch{message("انقطع الاتصال؛ إعادة نفس الطلب آمنة.",true);}
  finally{setBusy("");}
 }
 async function cancel(receiveId:string){
  if(busy||!GUID.test(receiveId))return;
  setBusy(receiveId);setNotice("");setError(false);
  if(!cancelKeys.current[receiveId])cancelKeys.current[receiveId]=crypto.randomUUID();
  try{
   const resp=await send(api+"/receives/"+encodeURIComponent(receiveId)+"/cancel",
    cancelKeys.current[receiveId],{});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("مش مسموح بإلغاء الاستلام.",true);return;}
   if(resp.status===409){message("الاستلام اتلغى بطلب مختلف؛ حدّث القائمة.",true);return;}
   if(!resp.ok){message("تعذر الإلغاء؛ أعد نفس الطلب.",true);return;}
   delete cancelKeys.current[receiveId];
   await load();message("الاستلام اتلغى ورجع المخزون. مفيش دفع ولا قيد محاسبي.");
  }catch{message("انقطع الاتصال؛ إعادة نفس الطلب آمنة.",true);}
  finally{setBusy("");}
 }
 const suppliers=data?.suppliers.filter(s=>s.isActive)??[];
 const products=data?.products.filter(p=>p.isActive)??[];
 return <main className="k5-workspace" dir="rtl">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={home}>تطبيقات الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">PURCHASING / RECEIVE + AP PREVIEW</span>
   <h1>المشتريات والاستلام</h1>
   <p className="k5-muted">موردين على مستوى الـBusiness + استلام منتجات للفرع مع معاينة ذمم غير مدفوعة.
    مفيش دفع خزنة ولا قيد GL (ADR-031).</p>
  </div></div>
  {state==="loading"&&<p role="status" className="k5-table-state">جاري تحميل المشتريات…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">مش مصرح لك بعرض المشتريات.</p>}
  {state==="unavailable"&&<p role="alert" className="k5-error">الموديول مش متاح أو Migration 037 لسه مش مطبّقة.</p>}
  {state==="ready"&&data&&<>
   <div className="drvo-expenses-banner" role="status">
    <strong>استلام مخزون + معاينة ذمم فقط</strong>
    <span>RECEIVE_DRAFTS_ONLY · AP_PREVIEW_ONLY · NOT PAID · NOT POSTED · adr031={data.adr031}</span>
   </div>
   <p className="k5-muted" role="status">
    ذمم مفتوحة (معاينة): {money(data.apPreview.openApMinor,currency)} ·
    عدد الاستلامات المفتوحة: {data.apPreview.openReceiveCount} ·
    إجمالي تاريخي: {money(data.apPreview.lifetimeApMinor,currency)}
   </p>
   {notice&&<p className={error?"k5-error":"k5-notice"} role={error?"alert":"status"}>{notice}</p>}
   <div className="drvo-expenses-grid">
    <section className="k5-admin-card k5-invite-card">
     <h2>مورد جديد (Business)</h2>
     <form className="catalog-form" onSubmit={createSupplier}>
      <label>اسم المورد
       <input required maxLength={120} value={supplierName}
        onChange={e=>{setSupplierName(e.target.value);supplierKey.current=null;}}/></label>
      <label>هاتف / ملاحظة اتصال
       <input maxLength={40} value={supplierPhone}
        onChange={e=>{setSupplierPhone(e.target.value);supplierKey.current=null;}}/></label>
      <label>ملاحظات
       <input maxLength={240} value={supplierNotes}
        onChange={e=>{setSupplierNotes(e.target.value);supplierKey.current=null;}}/></label>
      <button className="k5-save" type="submit" disabled={!!busy}>
       {busy==="supplier"?"جاري الحفظ…":"حفظ المورد"}
      </button>
     </form>
    </section>
    <section className="k5-admin-card k5-invite-card">
     <h2>استلام مشتريات (يزيد المخزون)</h2>
     <form className="catalog-form" onSubmit={createReceive}>
      <label>المورد (اختياري)
       <select value={supplierId} onChange={e=>{setSupplierId(e.target.value);receiveKey.current=null;}}>
        <option value="">بدون مورد مسجّل</option>
        {suppliers.map(s=><option key={s.supplierId} value={s.supplierId}>{s.displayName}</option>)}
       </select></label>
      <label>مرجع / ملاحظة فاتورة
       <input maxLength={160} value={supplierNote}
        onChange={e=>{setSupplierNote(e.target.value);receiveKey.current=null;}}
        placeholder="رقم فاتورة المورد (اختياري)"/></label>
      <label>العملة
       <select value={currency} onChange={e=>{
        setCurrency(e.target.value as Receive["currency"]);receiveKey.current=null;}}>
        <option value="EGP">EGP</option><option value="SAR">SAR</option>
        <option value="AED">AED</option><option value="USD">USD</option>
       </select></label>
      <label>المنتج
       <select required value={offeringId} onChange={e=>{
        setOfferingId(e.target.value);receiveKey.current=null;}}>
        {products.length===0&&<option value="">أضف منتج PRODUCT في الكتالوج أولًا</option>}
        {products.map(p=><option key={p.offeringId} value={p.offeringId}>
         {p.displayName} · رصيد {qty(p.qtyMilli)}
        </option>)}
       </select></label>
      <label>الكمية
       <input required inputMode="decimal" value={receiveQty} placeholder="1.000"
        onChange={e=>{setReceiveQty(e.target.value);receiveKey.current=null;}}/></label>
      <label>تكلفة الوحدة
       <input required inputMode="decimal" value={receiveCost} placeholder="0.00"
        onChange={e=>{setReceiveCost(e.target.value);receiveKey.current=null;}}/></label>
      <button className="k5-save" type="submit" disabled={!!busy||products.length===0}>
       {busy==="receive"?"جاري الاستلام…":"استلام + معاينة ذمم"}
      </button>
     </form>
    </section>
   </div>
   <section className="k5-admin-card">
    <h2>استلامات الفرع</h2>
    {data.receives.length===0?
     <p className="k5-muted">لا توجد استلامات مشتريات بعد.</p>:
     <table className="k5-table"><thead><tr>
      <th>المورد</th><th>ملاحظة</th><th>الذمم (معاينة)</th><th>الحالة</th><th></th>
     </tr></thead><tbody>
      {data.receives.map(r=><tr key={r.receiveId}>
       <td>{r.supplierName??"—"}</td>
       <td>{r.supplierNote||"—"} · {r.lineCount} بند</td>
       <td dir="ltr">{money(r.apTotalMinor,r.currency)}</td>
       <td>{r.status}</td>
       <td>{r.status==="APPLIED"&&
        <button type="button" className="k5-secondary" disabled={!!busy}
         onClick={()=>void cancel(r.receiveId)}>
         {busy===r.receiveId?"جاري الإلغاء…":"إلغاء وعكس الكمية"}
        </button>}</td>
      </tr>)}
     </tbody></table>}
   </section>
   <section className="k5-admin-card">
    <h2>الموردون ({data.suppliers.length})</h2>
    {data.suppliers.length===0?
     <p className="k5-muted">أضف موردًا أولًا أو استلم بدون مورد مسجّل.</p>:
     <ul className="k5-muted">{data.suppliers.map(s=>
      <li key={s.supplierId}>{s.displayName}{s.isActive?"":" (موقوف)"}
       {s.phoneNote?" · "+s.phoneNote:""}</li>)}</ul>}
   </section>
  </>}
 </main>;
}
