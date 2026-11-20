"use client";
/**
 * Cashier PrintInvoiceModal UX adapted for DRVO POS DRAFT only (NONPOSTING).
 * Fetches authorized Nest print-preview (POST + labels, Origin gate), shows Arabic draft
 * banner, browser window.print(). No thermal agent, no POSTED sale reprint, no payment/GL/stock.
 */
import {useCallback,useEffect,useState} from "react";
import {assertDraftPrintReceipt,DRAFT_PRINT_BANNER_AR,openDraftBrowserPrint,
  type DraftPrintReceipt} from "./cashier-draft-print";

const money=(n:number,c:string)=>(n/100).toFixed(2)+" "+c;

export default function CashierDraftPrintView({apiRoot,draftApi,draftId,disabled}:{
 apiRoot:string;draftApi:string;draftId:string;disabled?:boolean;
}){
 const [state,setState]=useState<"loading"|"ready"|"denied">("loading");
 const [receipt,setReceipt]=useState<DraftPrintReceipt|null>(null);
 const [html,setHtml]=useState<string|null>(null);
 const [printNote,setPrintNote]=useState<string|null>(null);

 useEffect(()=>{
  let cancelled=false;
  async function load(){
   setState("loading");setPrintNote(null);
   try{
    const [c,h]=await Promise.all([
     fetch(apiRoot+"/customers",{credentials:"same-origin",cache:"no-store"}),
     fetch(apiRoot+"/hr/employees",{credentials:"same-origin",cache:"no-store"}),
    ]);
    if(!c.ok||!h.ok)throw Error("scope denied");
    const cx=await c.json() as {customers:Array<{customerId:string;displayName:string;
     phone?:string|null}>};
    const hx=await h.json() as {employees:Array<{employeeId:string;displayName:string}>};
    if(!Array.isArray(cx.customers)||!Array.isArray(hx.employees))throw Error("bad roster");
    const draftList=await fetch(draftApi+"/cashier",{credentials:"same-origin",cache:"no-store"});
    if(!draftList.ok)throw Error("draft list denied");
    const listed=await draftList.json() as {drafts:Array<{draftId:string;customerId:string|null;
     lines:Array<{executorEmployeeId:string|null}>}>;
     state:string;paymentState:string;accountingState:string};
    if(listed.state!=="CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY"||
       listed.paymentState!=="NOT_COLLECTED"||listed.accountingState!=="NOT_POSTED")
     throw Error("unexpected drafts");
    const draft=listed.drafts.find(x=>x.draftId.toLowerCase()===draftId.toLowerCase());
    if(!draft)throw Error("draft missing");
    const customer=draft.customerId?
     cx.customers.find(x=>x.customerId.toLowerCase()===draft.customerId!.toLowerCase()):null;
    const executorNames:Record<string,string>={};
    for(const line of draft.lines){
     const id=line.executorEmployeeId;
     if(!id)continue;
     const emp=hx.employees.find(e=>e.employeeId.toLowerCase()===id.toLowerCase());
     if(emp)executorNames[id.toLowerCase()]=emp.displayName;
    }
    const previewRes=await fetch(
     draftApi+"/cashier/"+encodeURIComponent(draftId)+"/print-preview",{
      method:"POST",credentials:"same-origin",cache:"no-store",
      headers:{"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({
       customerDisplayName:customer?.displayName??null,
       customerPhone:customer?.phone??null,
       executorNames,
       businessLabel:"DRVO POS",
       branchLabel:null,
      }),
     });
    if(!previewRes.ok)throw Error("print preview denied");
    const payload=await previewRes.json() as {
     state:string;receipt:unknown;html:string;
     paymentState:string;accountingState:string;inventoryState:string;
    };
    if(payload.state!=="POS_DRAFT_PRINT_PREVIEW"||
       payload.paymentState!=="NOT_COLLECTED"||
       payload.accountingState!=="NOT_POSTED"||
       payload.inventoryState!=="NOT_DECREMENTED"||
       typeof payload.html!=="string")
     throw Error("unexpected print preview");
    const parsed=assertDraftPrintReceipt(payload.receipt);
    if(cancelled)return;
    setReceipt(parsed);setHtml(payload.html);setState("ready");
   }catch{
    if(cancelled)return;
    setReceipt(null);setHtml(null);setState("denied");
   }
  }
  void load();
  return ()=>{cancelled=true;};
 },[apiRoot,draftApi,draftId]);

 const onPrint=useCallback(()=>{
  if(!html||disabled)return;
  const result=openDraftBrowserPrint(html);
  setPrintNote(result.ok?
   "تم فتح نافذة الطباعة — مسودة غير محصّلة / غير مرحّلة.":
   "تعذر فتح الطباعة ("+result.reason+"). استخدم طباعة المتصفح يدويًا من المعاينة.");
 },[html,disabled]);

 return <section className="k5-admin-card" dir="rtl" aria-label="طباعة مسودة POS"
  data-cashier-pos="draft-print-view">
  <div className="k5-admin-summary">
   <h2>طباعة مسودة POS</h2>
   <p className="k5-muted" role="status" data-cashier-pos="draft-print-banner">
    {DRAFT_PRINT_BANNER_AR}. مفيش تحصيل ولا ترحيل ولا خصم مخزون ولا خزينة —
    وكيل الطباعة الحرارية وطباعة فاتورة مرحّلة لسه OPEN (POS-07 / ADR-031).
   </p>
  </div>
  {state==="loading"&&<p role="status">جاري تحميل معاينة المسودة المصرّح بها…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">
   معاينة الطباعة غير متاحة: راجع تفعيل POS V2 وصلاحيات الفرع وOrigin.</p>}
  {state==="ready"&&receipt&&<>
   <p data-cashier-pos="draft-print-kind">
    {receipt.documentKind} · {receipt.paymentState} · {receipt.posting}
   </p>
   <p>مسودة <strong dir="ltr">#{receipt.draftId.slice(0,8)}</strong>
    {" · "}{money(receipt.grandTotalMinor,receipt.currency)}
    {" · "}{receipt.customerDisplayName??"بدون عميل"}</p>
   <ul className="k5-muted">
    {receipt.lines.map(l=><li key={l.offeringId+"-"+l.lineNo}>
     {l.displayName} × {l.quantity}
     {" — "}{l.executorDisplayName??"بدون منفّذ"}
     {" — "}{money(l.netMinor,receipt.currency)}
    </li>)}
   </ul>
   <div className="k5-booking-actions">
    <button type="button" className="k5-save" data-cashier-pos="draft-print-action"
     disabled={disabled===true||!html} onClick={onPrint}>
     طباعة المسودة (متصفح)
    </button>
   </div>
   {printNote&&<p className="k5-muted" role="status">{printNote}</p>}
   <iframe title="معاينة إيصال المسودة" data-cashier-pos="draft-print-iframe"
    srcDoc={html??undefined} style={{width:"100%",minHeight:420,border:"1px solid #ccc",
     background:"#fff"}}/>
  </>}
 </section>;
}
