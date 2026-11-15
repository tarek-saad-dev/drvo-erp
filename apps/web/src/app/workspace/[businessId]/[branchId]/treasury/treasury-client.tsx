"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type CountDraft={countId:string;countedMinor:number;currency:"EGP"|"SAR"|"AED"|"USD";
 note:string;status:"DRAFT"|"CANCELLED";createdAtUtc:string;cancelledAtUtc:string|null};
type Counts={state:"NONPOSTING_PHYSICAL_CASH_COUNTS_ONLY";drafts:CountDraft[];
 limit:200;mayBeTruncated:boolean;balanceState:"NOT_COMPUTED";
 settlementState:"NO_SETTLEMENT";accountingState:"NOT_POSTED";
 reconciliationState:"NOT_PERFORMED"};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function minor(raw:string):number|null{
 if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw))return null;
 const [major,frac=""]=raw.split(".");
 const value=Number(major)*100+Number(frac.padEnd(2,"0"));
 return Number.isSafeInteger(value)&&value>=0&&value<=9000000000000?value:null;
}
export default function TreasuryClient({businessId,branchId}:{businessId:string;branchId:string}){
 const router=useRouter();
 const root="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/treasury/counts";
 const [state,setState]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
 const [data,setData]=useState<Counts|null>(null);
 const [amount,setAmount]=useState("");
 const [currency,setCurrency]=useState<CountDraft["currency"]>("EGP");
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const createKey=useRef<string|null>(null);
 const cancelKeys=useRef<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const response=await fetch(api,{cache:"no-store",credentials:"same-origin"});
   if(response.status===401){router.replace("/sign-in");return;}
   if(response.status===403||response.status===404){setState("denied");return;}
   if(!response.ok){setState("unavailable");return;}
   const payload=await response.json() as Counts;
   if(payload.state!=="NONPOSTING_PHYSICAL_CASH_COUNTS_ONLY"||
      payload.settlementState!=="NO_SETTLEMENT"||
      payload.accountingState!=="NOT_POSTED"||
      payload.balanceState!=="NOT_COMPUTED"||
      payload.reconciliationState!=="NOT_PERFORMED"||
      payload.limit!==200||!Array.isArray(payload.drafts)){
    setState("unavailable");return;
   }
   setData(payload);setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 async function send(endpoint:string,key:string,body:unknown){
  return fetch(endpoint,{method:"POST",cache:"no-store",credentials:"same-origin",
   headers:{"Content-Type":"application/json","Idempotency-Key":key},
   body:JSON.stringify(body)});
 }
 async function create(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const countedMinor=minor(amount);
  if(countedMinor===null||note.trim()!==note||note.length>240){
   setError(true);setNotice("راجع القيمة والوصف؛ حتى الصفر مقبول، والمبلغ بدقة قرشين.");return;
  }
  setBusy("create");setNotice("");setError(false);
  if(!createKey.current)createKey.current=crypto.randomUUID();
  try{
   const r=await send(api,createKey.current,{countedMinor,currency,note});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح لك بتسجيل جرد الفرع.");return;}
   if(r.status===409){createKey.current=null;setError(true);setNotice("تعارض في طلب الجرد؛ حدّث القائمة.");return;}
   if(!r.ok){setError(true);setNotice("تعذر حفظ الملاحظة. أعد نفس الطلب.");return;}
   createKey.current=null;setAmount("");setNote("");
   await load();setNotice("اتحفظت ملاحظة العد فقط؛ لم يتغير رصيد الخزنة.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس الطلب لتجنب التكرار.");}
  finally{setBusy("");}
 }
 async function cancel(countId:string){
  if(busy||!GUID.test(countId))return;
  setBusy(countId);setNotice("");setError(false);
  if(!cancelKeys.current[countId])cancelKeys.current[countId]=crypto.randomUUID();
  try{
   const r=await send(api+"/"+encodeURIComponent(countId)+"/cancel",cancelKeys.current[countId],{});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بإلغاء هذه المسودة.");return;}
   if(r.status===409){delete cancelKeys.current[countId];setError(true);
    setNotice("المسودة اتلغت بطلب مختلف؛ حدّث القائمة.");return;}
   if(!r.ok){setError(true);setNotice("تعذر الإلغاء؛ أعد نفس الطلب.");return;}
   delete cancelKeys.current[countId];
   await load();setNotice("اتلغت ملاحظة العد بدون أي تأثير محاسبي.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس طلب الإلغاء.");}
  finally{setBusy("");}
 }
 const money=(v:number,c:string)=>(v/100).toFixed(2)+" "+c;
 return <main className="k5-workspace" dir="rtl">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={root}>مساحة الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">TREASURY CORE / CASH COUNT OBSERVATIONS</span>
   <h1>الخزنة — جرد نقدي تجريبي</h1>
   <p className="k5-muted">سجّل المبلغ النقدي الموجود فعليًا في الدرج لمراجعة لاحقة.
    دي مسودة عد فقط، مش رصيد الخزنة أو قفل يوم أو إثبات تحصيل أو صرف.</p>
  </div></div>
  {state==="loading"&&<p className="k5-table-state" role="status">جاري تحميل سجلات العد…</p>}
  {state==="denied"&&<p className="k5-error" role="alert">مش مسموح لك بعرض جرد الفرع.</p>}
  {state==="unavailable"&&<p className="k5-error" role="alert">موديول الجرد غير متاح أو SQL021 لسه مش مطبّقة.</p>}
  {state==="ready"&&data&&<>
   <div className="drvo-expenses-banner" role="status">
    <strong>Count Draft · ليس رصيد خزنة</strong>
    <span>NOT COMPUTED · NOT RECONCILED · NO SETTLEMENT · NOT POSTED</span>
   </div>
   {notice&&<p className={error?"k5-error":"k5-notice"} role={error?"alert":"status"}>{notice}</p>}
   <section className="k5-admin-card k5-invite-card">
    <h2>إضافة ملاحظة جرد نقدي</h2>
    <form className="catalog-form" onSubmit={create}>
     <label>القيمة المعدودة
      <input type="text" inputMode="decimal" required placeholder="0.00" value={amount}
       onChange={e=>{setAmount(e.target.value);createKey.current=null;}}/></label>
     <label>العملة
      <select value={currency} onChange={e=>{
       setCurrency(e.target.value as CountDraft["currency"]);createKey.current=null;}}>
       <option value="EGP">EGP</option><option value="SAR">SAR</option>
       <option value="AED">AED</option><option value="USD">USD</option>
      </select></label>
     <label>ملاحظات الجرد
      <input maxLength={240} value={note} placeholder="مثلاً عدّ درج الكاش"
       onChange={e=>{setNote(e.target.value);createKey.current=null;}}/></label>
     <button className="k5-save" type="submit" disabled={!!busy}>
      {busy==="create"?"جاري الحفظ…":"حفظ مسودة العد"}
     </button>
    </form>
    <p className="k5-muted">الوقت بييجي من SQL Server، ومفيش BusinessDay أو Shift أو مصاريف متأثرة بهذه العملية.</p>
   </section>
   <section className="k5-admin-card drvo-expenses-list">
    <div className="k5-admin-summary"><div>
     <h2>آخر ملاحظات العد</h2>
     <p className="k5-muted">آخر {data.drafts.length} مستند في الفرع — لا يمثل إجمالي الرصيد</p>
    </div><button type="button" className="k5-salon-refresh" onClick={()=>void load()}>تحديث</button></div>
    {data.mayBeTruncated&&<p className="k5-notice">القائمة محدودة بآخر 200 ملاحظة.</p>}
    {data.drafts.length===0?<p className="k5-table-state">لسه مفيش ملاحظات جرد.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>العدّ</th><th>ملاحظة</th><th>الحالة</th><th>إجراء</th></tr></thead>
      <tbody>{data.drafts.map(d=><tr key={d.countId}>
       <td dir="ltr">{money(d.countedMinor,d.currency)}</td>
       <td>{d.note||"—"}</td><td>{d.status==="DRAFT"?"مسودة عد":"ملغاة"}</td>
       <td>{d.status==="DRAFT"&&<button type="button" className="drvo-expenses-cancel"
        disabled={!!busy} onClick={()=>void cancel(d.countId)}>
        {busy===d.countId?"جاري الإلغاء…":"إلغاء المسودة"}
       </button>}</td>
      </tr>)}</tbody>
     </table></div>}
   </section>
  </>}
 </main>;
}
