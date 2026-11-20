"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {buildDraftStockPreview,type BalanceInput} from "./inventory-stock-preview";

type InventoryItem={
 offeringId:string;displayName:string;categoryId:string|null;categoryName:string|null;
 priceMinor:number;currency:string;isActive:boolean;qtyMilli:number;
 reorderLevelMilli:number|null;stockStatus:"OK"|"LOW"|"OUT";
};
type StockReceive={
 receiveId:string;sourceType:"OPENING"|"PURCHASE";supplierNote:string;
 status:"APPLIED"|"CANCELLED";createdAtUtc:string;lineCount:number;
};
type StockAdjust={
 adjustId:string;offeringId:string;offeringName:string;deltaMilli:number;
 reason:string;status:"APPLIED"|"CANCELLED";createdAtUtc:string;
};
type InventoryWorkspace={
 state:"NONPOSTING_BRANCH_STOCK_BALANCES";verification:"BALANCES_OWNED";
 posting:"NOT_POSTED";stockLedger:"BRANCH_BALANCE_TABLE";
 purchasingPosts:"RECEIVE_DRAFTS_ONLY";adr031:"NOT_IN_SCOPE";
 treasuryState:"NOT_PAID";accountingState:"NOT_POSTED";
 policy:{allowNegativeStock:boolean;notes:string;updatedAtUtc:string};
 items:InventoryItem[];receives:StockReceive[];adjusts:StockAdjust[];
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

export default function InventoryClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/inventory";
 const [state,setState]=useState<UiState>("loading");
 const [data,setData]=useState<InventoryWorkspace|null>(null);
 const [query,setQuery]=useState("");
 const [allowNeg,setAllowNeg]=useState(true);
 const [policyNotes,setPolicyNotes]=useState("");
 const [sourceType,setSourceType]=useState<"OPENING"|"PURCHASE">("PURCHASE");
 const [supplierNote,setSupplierNote]=useState("");
 const [receiveOfferingId,setReceiveOfferingId]=useState("");
 const [receiveQty,setReceiveQty]=useState("");
 const [receiveCost,setReceiveCost]=useState("0");
 const [adjustOfferingId,setAdjustOfferingId]=useState("");
 const [adjustQty,setAdjustQty]=useState("");
 const [adjustSign,setAdjustSign]=useState<"IN"|"OUT">("IN");
 const [adjustReason,setAdjustReason]=useState("");
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const policyKey=useRef<string|null>(null);
 const receiveKey=useRef<string|null>(null);
 const adjustKey=useRef<string|null>(null);
 const cancelReceiveKeys=useRef<Record<string,string>>({});
 const cancelAdjustKeys=useRef<Record<string,string>>({});

 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const resp=await fetch(api,{credentials:"same-origin",cache:"no-store"});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){setState("denied");return;}
   if(!resp.ok){setState("unavailable");return;}
   const workspace=await resp.json() as InventoryWorkspace;
   if(workspace.state!=="NONPOSTING_BRANCH_STOCK_BALANCES"||
      workspace.posting!=="NOT_POSTED"||workspace.adr031!=="NOT_IN_SCOPE"||
      workspace.treasuryState!=="NOT_PAID"||workspace.accountingState!=="NOT_POSTED"||
      !Array.isArray(workspace.items)){setState("unavailable");return;}
   setData(workspace);
   setAllowNeg(workspace.policy.allowNegativeStock);
   setPolicyNotes(workspace.policy.notes);
   const first=workspace.items.find(i=>i.isActive)?.offeringId??"";
   setReceiveOfferingId(cur=>workspace.items.some(i=>i.offeringId===cur)?cur:first);
   setAdjustOfferingId(cur=>workspace.items.some(i=>i.offeringId===cur)?cur:first);
   setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);

 useEffect(()=>{void load();},[load]);

 const preview=useMemo(()=>{
  if(!data)return null;
  try{
   const offerings=data.items.map(i=>({
    offeringId:i.offeringId,kind:"PRODUCT",displayName:i.displayName,
    priceMinor:i.priceMinor,currency:i.currency,isActive:i.isActive,
    categoryId:i.categoryId,categoryName:i.categoryName,
   }));
   const balances:BalanceInput[]=data.items.map(i=>({
    offeringId:i.offeringId,qtyMilli:i.qtyMilli,
    reorderLevelMilli:i.reorderLevelMilli,stockStatus:i.stockStatus,
   }));
   return buildDraftStockPreview(offerings,query,balances);
  }catch{return null;}
 },[data,query]);

 function message(value:string,isErr=false){setNotice(value);setError(isErr);}
 async function send(path:string,key:string,body:unknown){
  return fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":"application/json","Idempotency-Key":key},
   body:JSON.stringify(body)});
 }

 async function savePolicy(event:React.FormEvent){
  event.preventDefault();if(busy||!data)return;
  if(policyNotes.length>240){message("ملاحظات السياسة أطول من الحد.",true);return;}
  setBusy("policy");setNotice("");setError(false);
  if(!policyKey.current)policyKey.current=crypto.randomUUID();
  try{
   const resp=await send(api+"/policy",policyKey.current,
    {allowNegativeStock:allowNeg,notes:policyNotes});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(!resp.ok){message("تعذر حفظ سياسة المخزون.",true);return;}
   policyKey.current=null;await load();message("تم حفظ سياسة المخزون بدون GL.");
  }catch{message("تعذر الاتصال. أعد المحاولة بنفس البيانات.",true);}
  finally{setBusy("");}
 }

 async function createReceive(event:React.FormEvent){
  event.preventDefault();if(busy||!data)return;
  const qtyMilli=parseQtyMilli(receiveQty);
  const unitCostMinor=parseCostMinor(receiveCost);
  if(!GUID.test(receiveOfferingId)||qtyMilli===null||unitCostMinor===null||
     supplierNote.length>160){
   message("راجع المنتج والكمية وتكلفة الوحدة (معلوماتية فقط).",true);return;
  }
  setBusy("receive");setNotice("");setError(false);
  if(!receiveKey.current)receiveKey.current=crypto.randomUUID();
  try{
   const resp=await send(api+"/receives",receiveKey.current,{
    sourceType,supplierNote,
    lines:[{lineNo:1,offeringId:receiveOfferingId,qtyMilli,unitCostMinor}],
   });
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("مش مصرح بالمشتريات/الاستلام.",true);return;}
   if(resp.status===409){receiveKey.current=null;message("تعارض استلام أو رصيد سالب ممنوع.",true);return;}
   if(!resp.ok){message("تعذر تسجيل الاستلام.",true);return;}
   receiveKey.current=null;setReceiveQty("");setSupplierNote("");
   await load();message("تم استلام الكمية للفرع — بدون AP/Treasury/GL.");
  }catch{message("تعذر الاتصال. أعد المحاولة بنفس المفتاح.",true);}
  finally{setBusy("");}
 }

 async function createAdjust(event:React.FormEvent){
  event.preventDefault();if(busy||!data)return;
  const qtyMilli=parseQtyMilli(adjustQty);
  if(!GUID.test(adjustOfferingId)||qtyMilli===null||
     adjustReason!==adjustReason.trim()||adjustReason.trim().length<1||
     adjustReason.length>240){
   message("راجع التعديل والسبب.",true);return;
  }
  const deltaMilli=adjustSign==="IN"?qtyMilli:-qtyMilli;
  setBusy("adjust");setNotice("");setError(false);
  if(!adjustKey.current)adjustKey.current=crypto.randomUUID();
  try{
   const resp=await send(api+"/adjusts",adjustKey.current,
    {offeringId:adjustOfferingId,deltaMilli,reason:adjustReason});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===409){adjustKey.current=null;message("تعارض تعديل أو رصيد سالب ممنوع.",true);return;}
   if(!resp.ok){message("تعذر حفظ التعديل.",true);return;}
   adjustKey.current=null;setAdjustQty("");setAdjustReason("");
   await load();message("تم تعديل الرصيد بدون قيود محاسبية.");
  }catch{message("تعذر الاتصال. أعد المحاولة بنفس البيانات.",true);}
  finally{setBusy("");}
 }

 async function cancelReceive(receiveId:string){
  if(busy)return;
  setBusy("cancel-receive-"+receiveId);
  if(!cancelReceiveKeys.current[receiveId])cancelReceiveKeys.current[receiveId]=crypto.randomUUID();
  try{
   const resp=await send(api+"/receives/"+encodeURIComponent(receiveId)+"/cancel",
    cancelReceiveKeys.current[receiveId],{});
   if(!resp.ok){message("تعذر إلغاء الاستلام.",true);return;}
   delete cancelReceiveKeys.current[receiveId];await load();message("أُلغي الاستلام وعُكس الرصيد.");
  }catch{message("تعذر الاتصال.",true);}
  finally{setBusy("");}
 }

 async function cancelAdjust(adjustId:string){
  if(busy)return;
  setBusy("cancel-adjust-"+adjustId);
  if(!cancelAdjustKeys.current[adjustId])cancelAdjustKeys.current[adjustId]=crypto.randomUUID();
  try{
   const resp=await send(api+"/adjusts/"+encodeURIComponent(adjustId)+"/cancel",
    cancelAdjustKeys.current[adjustId],{});
   if(!resp.ok){message("تعذر إلغاء التعديل.",true);return;}
   delete cancelAdjustKeys.current[adjustId];await load();message("أُلغي التعديل وعُكس الرصيد.");
  }catch{message("تعذر الاتصال.",true);}
  finally{setBusy("");}
 }

 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions">
    <Link href={home}>مساحة الفرع</Link>
    <Link href={home+"/inventory/transfers"}>تحويل بين الفروع</Link>
    <Link href={home+"/catalog"}>الكتالوج</Link>
   </nav>
  </header>

  {state==="loading"&&<p className="k5-table-state" role="status">جاري تحميل أرصدة المخزون…</p>}
  {state==="denied"&&<p className="k5-error" role="alert">المخزون غير متاح لحسابك في هذا الفرع.</p>}
  {state==="unavailable"&&<p className="k5-error" role="alert">تعذر قراءة مخزون الفرع. حاول مرة أخرى.</p>}

  {state==="ready"&&data&&preview&&<>
   <div className="k5-page-title drvo-workspace-title">
    <div>
     <span className="k5-eyebrow">INVENTORY + PURCHASING · SHARED</span>
     <h1>مخزون الفرع (غير مرحّل)</h1>
     <p className="k5-muted">
      أرصدة SQL027 + استلام مشتريات/افتتاح بدون AP أو Treasury أو ADR-031.
     </p>
    </div>
   </div>

   <div className="drvo-inventory-banner" role="status">
    <strong>NONPOSTING · BALANCES OWNED</strong>
    <span>stockLedger=BRANCH_BALANCE_TABLE · cost=UNKNOWN · posting=NOT_POSTED · adr031=NOT_IN_SCOPE</span>
   </div>
   {notice&&<p className={error?"k5-error":"k5-notice"} role="status">{notice}</p>}

   <section className="k5-admin-card drvo-inventory-kpis" aria-label="مؤشرات المخزون">
    <div><span className="k5-muted">منتجات نشطة</span><strong>{preview.kpis.activeProducts}</strong></div>
    <div><span className="k5-muted">وحدات متاحة</span><strong dir="ltr">{String(preview.kpis.unitsAvailable)}</strong></div>
    <div><span className="k5-muted">قيمة التكلفة</span><strong>UNKNOWN</strong></div>
    <div><span className="k5-muted">منخفض / نافد</span>
     <strong>{String(preview.kpis.lowStock)} / {String(preview.kpis.outOfStock)}</strong></div>
   </section>

   <section className="k5-admin-card">
    <h2>سياسة المخزون</h2>
    <form className="drvo-inventory-toolbar" onSubmit={savePolicy}>
     <label><input type="checkbox" checked={allowNeg}
      onChange={e=>setAllowNeg(e.target.checked)}/> السماح بالرصيد السالب (تنبيه)</label>
     <label>ملاحظات
      <input value={policyNotes} onChange={e=>setPolicyNotes(e.target.value)} maxLength={240}/>
     </label>
     <button type="submit" disabled={!!busy}>حفظ السياسة</button>
    </form>
   </section>

   <section className="k5-admin-card">
    <h2>استلام مشتريات / افتتاح (PUR)</h2>
    <form className="drvo-expenses-grid" onSubmit={createReceive}>
     <label>النوع
      <select value={sourceType} onChange={e=>setSourceType(e.target.value as typeof sourceType)}>
       <option value="PURCHASE">مشتريات</option>
       <option value="OPENING">افتتاح</option>
      </select>
     </label>
     <label>المنتج
      <select value={receiveOfferingId} onChange={e=>setReceiveOfferingId(e.target.value)}>
       {data.items.filter(i=>i.isActive).map(i=>
        <option key={i.offeringId} value={i.offeringId}>{i.displayName}</option>)}
      </select>
     </label>
     <label>الكمية
      <input value={receiveQty} onChange={e=>setReceiveQty(e.target.value)}
       placeholder="1.000" inputMode="decimal" dir="ltr"/>
     </label>
     <label>تكلفة الوحدة (معلوماتية)
      <input value={receiveCost} onChange={e=>setReceiveCost(e.target.value)}
       placeholder="0.00" inputMode="decimal" dir="ltr"/>
     </label>
     <label>ملاحظة المورد
      <input value={supplierNote} onChange={e=>setSupplierNote(e.target.value)} maxLength={160}/>
     </label>
     <button type="submit" disabled={!!busy||!receiveOfferingId}>تسجيل الاستلام</button>
    </form>
   </section>

   <section className="k5-admin-card">
    <h2>تعديل رصيد يدوي</h2>
    <form className="drvo-expenses-grid" onSubmit={createAdjust}>
     <label>المنتج
      <select value={adjustOfferingId} onChange={e=>setAdjustOfferingId(e.target.value)}>
       {data.items.map(i=>
        <option key={i.offeringId} value={i.offeringId}>{i.displayName}</option>)}
      </select>
     </label>
     <label>الاتجاه
      <select value={adjustSign} onChange={e=>setAdjustSign(e.target.value as typeof adjustSign)}>
       <option value="IN">زيادة</option><option value="OUT">نقص</option>
      </select>
     </label>
     <label>الكمية
      <input value={adjustQty} onChange={e=>setAdjustQty(e.target.value)}
       placeholder="1.000" inputMode="decimal" dir="ltr"/>
     </label>
     <label>السبب
      <input value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} maxLength={240}/>
     </label>
     <button type="submit" disabled={!!busy||!adjustOfferingId}>حفظ التعديل</button>
    </form>
   </section>

   <section className="k5-admin-card">
    <div className="drvo-inventory-toolbar">
     <label>بحث المنتجات
      <input value={query} onChange={e=>setQuery(e.target.value)}
       placeholder="اسم المنتج أو بادئة offeringId" maxLength={200} autoComplete="off"/>
     </label>
    </div>
    {preview.items.length===0?
     <p className="k5-table-state">لا توجد منتجات. أضف PRODUCT من الكتالوج أولاً.</p>:
     <div className="k5-table-wrap">
      <table className="k5-table">
       <thead><tr><th>المنتج</th><th>التصنيف</th><th>السعر</th><th>الرصيد</th><th>الحالة</th></tr></thead>
       <tbody>{preview.items.map(row=>(
        <tr key={row.offeringId}>
         <td>{row.displayName}{!row.isActive&&<span className="k5-muted"> · غير نشط</span>}</td>
         <td>{row.categoryName??"—"}</td>
         <td dir="ltr">{money(row.priceMinor,row.currency)}</td>
         <td dir="ltr">{typeof row.qtyMilli==="number"?qty(row.qtyMilli):"UNKNOWN"}</td>
         <td>{row.stockStatus}</td>
        </tr>
       ))}</tbody>
      </table>
     </div>}
   </section>

   <section className="k5-admin-card drvo-expenses-list">
    <h2>آخر الاستلامات</h2>
    {data.receives.length===0?<p className="k5-muted">لا استلامات بعد.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>النوع</th><th>ملاحظة</th><th>بنود</th><th>الحالة</th><th></th></tr></thead>
      <tbody>{data.receives.map(r=>(
       <tr key={r.receiveId}>
        <td>{r.sourceType}</td><td>{r.supplierNote||"—"}</td>
        <td>{r.lineCount}</td><td>{r.status}</td>
        <td>{r.status==="APPLIED"&&
         <button type="button" className="drvo-expenses-cancel"
          disabled={!!busy} onClick={()=>void cancelReceive(r.receiveId)}>إلغاء</button>}</td>
       </tr>
      ))}</tbody>
     </table></div>}
   </section>

   <section className="k5-admin-card drvo-expenses-list">
    <h2>آخر التعديلات</h2>
    {data.adjusts.length===0?<p className="k5-muted">لا تعديلات بعد.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>المنتج</th><th>Δ</th><th>السبب</th><th>الحالة</th><th></th></tr></thead>
      <tbody>{data.adjusts.map(a=>(
       <tr key={a.adjustId}>
        <td>{a.offeringName}</td><td dir="ltr">{qty(a.deltaMilli)}</td>
        <td>{a.reason}</td><td>{a.status}</td>
        <td>{a.status==="APPLIED"&&
         <button type="button" className="drvo-expenses-cancel"
          disabled={!!busy} onClick={()=>void cancelAdjust(a.adjustId)}>إلغاء</button>}</td>
       </tr>
      ))}</tbody>
     </table></div>}
   </section>

   <p className="drvo-workspace-note">
    state={data.state} · verification={data.verification} ·
    purchasingPosts={data.purchasingPosts} · adr031={data.adr031}
   </p>
  </>}
 </main>;
}
