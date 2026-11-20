"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type TransferLine={lineNo:number;offeringId:string;offeringName:string;qtyMilli:number};
type StockTransfer={
 transferId:string;fromBranchId:string;fromBranchName:string;toBranchId:string;
 toBranchName:string;direction:"IN"|"OUT";transferNote:string;
 status:"APPLIED"|"CANCELLED";createdAtUtc:string;cancelledAtUtc:string|null;
 lineCount:number;lines:TransferLine[];
};
type TransferWorkspace={
 state:"NONPOSTING_BRANCH_TRANSFERS";posting:"NOT_POSTED";adr031:"NOT_IN_SCOPE";
 treasuryState:"NOT_PAID";accountingState:"NOT_POSTED";
 transferModel:"ATOMIC_APPLY_CANCEL_REVERSE";sourceStock:"ENFORCED";
 transfers:StockTransfer[];
 destinations:Array<{branchId:string;displayName:string}>;
 items:Array<{offeringId:string;displayName:string;qtyMilli:number}>;
 limitPerSource:50;mayBeTruncated:boolean;
};
type Row={rowId:string;offeringId:string;qty:string};
type UiState="loading"|"ready"|"denied"|"unavailable";
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const qty=(milli:number)=>(milli/1000).toFixed(3);
function parseQtyMilli(raw:string):number|null{
 if(!/^\d{1,10}(?:\.\d{1,3})?$/.test(raw))return null;
 const [major,fraction=""]=raw.split(".");
 const milli=Number(major)*1000+Number(fraction.padEnd(3,"0"));
 return Number.isSafeInteger(milli)&&milli>=1&&milli<=9000000000000?milli:null;
}
const newRow=():Row=>({rowId:crypto.randomUUID(),offeringId:"",qty:""});

export default function TransfersClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/inventory/transfers";
 const [state,setState]=useState<UiState>("loading");
 const [data,setData]=useState<TransferWorkspace|null>(null);
 const [toBranchId,setToBranchId]=useState("");
 const [note,setNote]=useState("");
 const [rows,setRows]=useState<Row[]>([newRow()]);
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const createKey=useRef<string|null>(null);
 const cancelKeys=useRef<Record<string,string>>({});

 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const resp=await fetch(api,{credentials:"same-origin",cache:"no-store"});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){setState("denied");return;}
   if(!resp.ok){setState("unavailable");return;}
   const workspace=await resp.json() as TransferWorkspace;
   if(workspace.state!=="NONPOSTING_BRANCH_TRANSFERS"||workspace.posting!=="NOT_POSTED"||
      workspace.adr031!=="NOT_IN_SCOPE"||workspace.treasuryState!=="NOT_PAID"||
      workspace.accountingState!=="NOT_POSTED"||!Array.isArray(workspace.transfers)){
    setState("unavailable");return;
   }
   setData(workspace);
   setToBranchId(cur=>workspace.destinations.some(d=>d.branchId===cur)?cur:
    (workspace.destinations[0]?.branchId??""));
   setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);

 useEffect(()=>{void load();},[load]);

 function message(value:string,isErr=false){setNotice(value);setError(isErr);}
 function patchRow(rowId:string,patch:Partial<Row>){
  createKey.current=null;
  setRows(cur=>cur.map(r=>r.rowId===rowId?{...r,...patch}:r));
 }
 async function send(path:string,key:string,body:unknown){
  return fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":"application/json","Idempotency-Key":key},
   body:JSON.stringify(body)});
 }

 async function createTransfer(event:React.FormEvent){
  event.preventDefault();if(busy||!data)return;
  const lines:Array<{lineNo:number;offeringId:string;qtyMilli:number}>=[];
  const seen=new Set<string>();
  for(const [index,row] of rows.entries()){
   const qtyMilli=parseQtyMilli(row.qty);
   const item=data.items.find(i=>i.offeringId===row.offeringId);
   if(!GUID.test(row.offeringId)||!item||qtyMilli===null||seen.has(row.offeringId)){
    message("راجع بنود النقل: منتج وكمية أكبر من صفر بدون تكرار.",true);return;
   }
   if(qtyMilli>item.qtyMilli){
    message("الكمية أكبر من رصيد الفرع المصدر ("+item.displayName+").",true);return;
   }
   seen.add(row.offeringId);
   lines.push({lineNo:index+1,offeringId:row.offeringId,qtyMilli});
  }
  if(!GUID.test(toBranchId)||toBranchId.toLowerCase()===branchId.toLowerCase()||
     note.length>160||lines.length<1||lines.length>50){
   message("اختر فرعاً وجهة مختلفاً وراجع الملاحظة.",true);return;
  }
  setBusy("create");setNotice("");setError(false);
  if(!createKey.current)createKey.current=crypto.randomUUID();
  try{
   const resp=await send(api,createKey.current,{toBranchId,note,lines});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("غير مصرح بالنقل بين هذين الفرعين.",true);return;}
   if(resp.status===409){createKey.current=null;message("رصيد المصدر غير كافٍ أو تعارض في الطلب.",true);return;}
   if(!resp.ok){message("تعذر تنفيذ النقل.",true);return;}
   createKey.current=null;setRows([newRow()]);setNote("");
   await load();message("تم نقل المخزون بين الفرعين — بدون GL/COGS/AP.");
  }catch{message("تعذر الاتصال. أعد المحاولة بنفس البيانات.",true);}
  finally{setBusy("");}
 }

 async function cancelTransfer(transferId:string){
  if(busy)return;
  setBusy("cancel-"+transferId);setNotice("");setError(false);
  if(!cancelKeys.current[transferId])cancelKeys.current[transferId]=crypto.randomUUID();
  try{
   const resp=await send(api+"/"+encodeURIComponent(transferId)+"/cancel",
    cancelKeys.current[transferId],{});
   if(resp.status===409){delete cancelKeys.current[transferId];
    message("لا يمكن الإلغاء: رصيد الفرع الوجهة استُهلك بعد النقل.",true);return;}
   if(!resp.ok){message("تعذر إلغاء النقل.",true);return;}
   delete cancelKeys.current[transferId];await load();
   message("أُلغي النقل وعُكس الرصيد في الفرعين.");
  }catch{message("تعذر الاتصال.",true);}
  finally{setBusy("");}
 }

 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions">
    <Link href={home}>مساحة الفرع</Link>
    <Link href={home+"/inventory"}>المخزون</Link>
   </nav>
  </header>

  {state==="loading"&&<p className="k5-table-state" role="status">جاري تحميل تحويلات المخزون…</p>}
  {state==="denied"&&<p className="k5-error" role="alert">تحويل المخزون غير متاح لحسابك في هذا الفرع.</p>}
  {state==="unavailable"&&<p className="k5-error" role="alert">تعذر قراءة التحويلات. حاول مرة أخرى.</p>}

  {state==="ready"&&data&&<>
   <div className="k5-page-title drvo-workspace-title">
    <div>
     <span className="k5-eyebrow">INVENTORY · BRANCH TRANSFERS · INV-03</span>
     <h1>تحويل مخزون بين الفروع (غير مرحّل)</h1>
     <p className="k5-muted">
      النقل ينفَّذ كمستند واحد: خصم من هذا الفرع وإضافة للفرع الوجهة، والإلغاء يعكس الحركتين.
      بدون GL أو COGS أو AP (ADR-031).
     </p>
    </div>
   </div>

   <div className="drvo-inventory-banner" role="status">
    <strong>NONPOSTING · TRANSFERS OWNED</strong>
    <span>transferModel={data.transferModel} · sourceStock={data.sourceStock} · posting={data.posting} · adr031={data.adr031}</span>
   </div>
   {notice&&<p className={error?"k5-error":"k5-notice"} role="status">{notice}</p>}

   <section className="k5-admin-card">
    <h2>نقل جديد من هذا الفرع</h2>
    {data.destinations.length===0?
     <p className="k5-muted">لا يوجد فرع وجهة مصرح لك بإدارة مخزونه في هذا النشاط.</p>:
     <form className="drvo-expenses-grid" onSubmit={createTransfer}>
      <label>الفرع الوجهة
       <select value={toBranchId} onChange={e=>{createKey.current=null;setToBranchId(e.target.value);}}>
        {data.destinations.map(d=>
         <option key={d.branchId} value={d.branchId}>{d.displayName}</option>)}
       </select>
      </label>
      <label>ملاحظة
       <input value={note} maxLength={160}
        onChange={e=>{createKey.current=null;setNote(e.target.value);}}/>
      </label>
      {rows.map((row,index)=>{
       const item=data.items.find(i=>i.offeringId===row.offeringId);
       return <div key={row.rowId} className="drvo-inventory-toolbar">
        <label>المنتج {index+1}
         <select value={row.offeringId}
          onChange={e=>patchRow(row.rowId,{offeringId:e.target.value})}>
          <option value="">—</option>
          {data.items.map(i=>
           <option key={i.offeringId} value={i.offeringId}>
            {i.displayName} ({qty(i.qtyMilli)})
           </option>)}
         </select>
        </label>
        <label>الكمية
         <input value={row.qty} onChange={e=>patchRow(row.rowId,{qty:e.target.value})}
          placeholder="1.000" inputMode="decimal" dir="ltr"/>
        </label>
        <span className="k5-muted" dir="ltr">
         {item?"رصيد المصدر "+qty(item.qtyMilli):"—"}
        </span>
        {rows.length>1&&<button type="button" className="drvo-expenses-cancel"
         disabled={!!busy} onClick={()=>{createKey.current=null;
          setRows(cur=>cur.filter(r=>r.rowId!==row.rowId));}}>حذف</button>}
       </div>;
      })}
      <div className="drvo-inventory-toolbar">
       <button type="button" disabled={!!busy||rows.length>=50}
        onClick={()=>{createKey.current=null;setRows(cur=>[...cur,newRow()]);}}>
        إضافة بند
       </button>
       <button type="submit" disabled={!!busy||data.items.length===0}>تنفيذ النقل</button>
      </div>
     </form>}
   </section>

   <section className="k5-admin-card drvo-expenses-list">
    <h2>آخر التحويلات</h2>
    {data.transfers.length===0?<p className="k5-muted">لا تحويلات بعد.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>الاتجاه</th><th>من</th><th>إلى</th><th>البنود</th><th>ملاحظة</th><th>الحالة</th><th></th></tr></thead>
      <tbody>{data.transfers.map(t=>(
       <tr key={t.transferId}>
        <td>{t.direction==="OUT"?"صادر":"وارد"}</td>
        <td>{t.fromBranchName}</td><td>{t.toBranchName}</td>
        <td dir="ltr">{t.lines.map(l=>l.offeringName+" × "+qty(l.qtyMilli)).join(" · ")||String(t.lineCount)}</td>
        <td>{t.transferNote||"—"}</td><td>{t.status}</td>
        <td>{t.status==="APPLIED"&&t.direction==="OUT"&&
         <button type="button" className="drvo-expenses-cancel"
          disabled={!!busy} onClick={()=>void cancelTransfer(t.transferId)}>إلغاء</button>}</td>
       </tr>
      ))}</tbody>
     </table></div>}
   </section>

   <p className="drvo-workspace-note">
    state={data.state} · transferModel={data.transferModel} ·
    treasuryState={data.treasuryState} · accountingState={data.accountingState}
   </p>
  </>}
 </main>;
}
