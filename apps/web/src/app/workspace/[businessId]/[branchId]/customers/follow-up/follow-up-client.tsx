"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Filter="ALL"|"INCOMPLETE"|"NO_PHONE"|"NO_CONSENT"|"HAS_NOTES"|"FOLLOW_UP_DUE"|"NEVER_CONTACTED";
type FollowUpRow={
 customerId:string;displayName:string;phoneE164:string|null;
 phoneMissing:boolean;incomplete:boolean;consentState:string;
 followUpDue:boolean;followUpDueUtc:string|null;attemptCount:number;
 reasons:string[];lastChannel:string|null;lastOutcome:string|null;
};
type Queue={
 rows:FollowUpRow[];filter:Filter;limit:number;mayBeTruncated:boolean;
 mode:string;messagingSent:boolean;dormantEvidence:string;
};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTERS:Array<{id:Filter;label:string}>=[
 {id:"ALL",label:"الكل"},{id:"INCOMPLETE",label:"CRM ناقص"},
 {id:"NO_PHONE",label:"بدون موبايل"},{id:"NO_CONSENT",label:"بدون موافقة عروض"},
 {id:"FOLLOW_UP_DUE",label:"متابعة مستحقة"},{id:"NEVER_CONTACTED",label:"لم يُتواصل"},
 {id:"HAS_NOTES",label:"فيه ملاحظات"},
];
const CHANNELS:Array<{id:string;label:string}>=[
 {id:"CALL",label:"اتصال"},{id:"WHATSAPP_MANUAL",label:"واتساب يدوي (تسجيل فقط)"},
 {id:"IN_PERSON",label:"حضور"},{id:"OTHER",label:"أخرى"},
];
const OUTCOMES:Array<{id:string;label:string}>=[
 {id:"REACHED",label:"تم الوصول"},{id:"NO_ANSWER",label:"لم يرد"},
 {id:"WRONG_NUMBER",label:"رقم غلط"},{id:"CALL_BACK_LATER",label:"يتصل لاحقًا"},
 {id:"DECLINED",label:"رفض"},
];

export default function FollowUpClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const [state,setState]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
 const [filter,setFilter]=useState<Filter>("ALL");
 const [queue,setQueue]=useState<Queue|null>(null);
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [target,setTarget]=useState<FollowUpRow|null>(null);
 const [channel,setChannel]=useState("CALL");
 const [outcome,setOutcome]=useState("REACHED");
 const [note,setNote]=useState("");
 const [dueLocal,setDueLocal]=useState("");
 const attemptKey=useRef<string|null>(null);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+
  encodeURIComponent(branchId)+"/customers";
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);

 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const r=await fetch(api+"/follow-up?filter="+encodeURIComponent(filter),
    {credentials:"same-origin",cache:"no-store"});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setState("denied");return;}
   if(!r.ok){setState("unavailable");return;}
   const data=await r.json() as Queue;
   if(!data||!Array.isArray(data.rows)||data.messagingSent!==false){setState("unavailable");return;}
   setQueue(data);setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,filter,router]);
 useEffect(()=>{void load();},[load]);

 function openLog(row:FollowUpRow){
  setTarget(row);setChannel("CALL");setOutcome("REACHED");setNote("");setDueLocal("");
  attemptKey.current=null;setNotice("");
 }
 function closeLog(){setTarget(null);attemptKey.current=null;}

 async function saveLog(event:React.FormEvent){
  event.preventDefault();if(busy||!target)return;
  let followUpDueUtc:string|null=null;
  if(outcome==="CALL_BACK_LATER"){
   if(!dueLocal){setNotice("لازم تحدد موعد متابعة مستقبلي.");return;}
   const d=new Date(dueLocal);
   if(!Number.isFinite(d.getTime())||d.getSeconds()!==0||d.getTime()<=Date.now()){
    setNotice("موعد المتابعة لازم يكون دقيقة UTC مستقبلية.");return;
   }
   followUpDueUtc=d.toISOString();
  }
  if(!attemptKey.current)attemptKey.current=crypto.randomUUID();
  setBusy(true);setNotice("");
  try{
   const body:Record<string,unknown>={channel,outcome,note:note||null};
   if(followUpDueUtc)body.followUpDueUtc=followUpDueUtc;
   const r=await fetch(api+"/"+encodeURIComponent(target.customerId)+"/contact-attempts",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","Idempotency-Key":attemptKey.current},
    body:JSON.stringify(body),
   });
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setState("denied");return;}
   if(r.status===409){
    attemptKey.current=null;
    setNotice(channel==="WHATSAPP_MANUAL"
     ?"تسجيل واتساب اليدوي مرفوض بدون موافقة عروض نشطة على الرقم الحالي، أو الطلب اتغيّر."
     :"تعارض في طلب التسجيل. راجع البيانات.");
    return;
   }
   if(!r.ok){setNotice("تعذر حفظ محاولة التواصل. راجع القناة والنتيجة.");return;}
   attemptKey.current=null;closeLog();
   setNotice("اتسجّلت محاولة التواصل. مفيش رسالة اتبعتت للعميل.");
   await load();
  }catch{setNotice("تعذر الاتصال أثناء حفظ محاولة التواصل.");}
  finally{setBusy(false);}
 }

 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions">
    <Link href={home}>مساحة الفرع</Link>
    <Link href={home+"/customers"}>العملاء</Link>
   </nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">CUSTOMERS / CRM FOLLOW-UP</span>
   <h1>مكتب متابعة العملاء</h1>
   <p className="k5-muted">قائمة من ملف CRM (SQL031) + سجل محاولات التواصل (SQL034).
    تسجيل يدوي فقط — مفيش إرسال واتساب/SMS. الخمول حسب آخر زيارة مدفوعة محظور (CU-05).</p>
  </div></div>
  {state==="loading"&&<p role="status" className="k5-table-state">جاري تحميل قائمة المتابعة…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">متابعة العملاء مش متاحة لحسابك أو الفرع ده.</p>}
  {state==="unavailable"&&<p role="alert" className="k5-error">تعذر تحميل قائمة المتابعة.</p>}
  {state==="ready"&&queue&&<>
   {notice&&<p role="status" className="k5-notice">{notice}</p>}
   <section className="k5-admin-card k5-invite-card" aria-label="فلاتر المتابعة">
    <div className="k5-booking-actions">
     {FILTERS.map(f=><button key={f.id} type="button"
      className={filter===f.id?"k5-save":"k5-salon-refresh"}
      onClick={()=>setFilter(f.id)}>{f.label}</button>)}
    </div>
    <p className="k5-muted">وضع: {queue.mode} · إرسال رسائل: لا · دليل الخمول: {queue.dormantEvidence}</p>
   </section>
   {target&&<section className="k5-admin-card k5-invite-card" id="follow-up-contact"
    aria-label="تسجيل محاولة تواصل">
    <h2>تسجيل تواصل: {target.displayName}</h2>
    <p className="k5-muted">ده سجل لما الموظف عمله — مش إرسال رسالة. قناة واتساب اليدوي بتحتاج موافقة عروض نشطة على الرقم الحالي، وبرضه مش بتبعت.</p>
    <form className="catalog-form" onSubmit={saveLog}>
     <label>القناة<select value={channel} onChange={e=>{setChannel(e.target.value);attemptKey.current=null;}}>
      {CHANNELS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
     </select></label>
     <label>النتيجة<select value={outcome} onChange={e=>{setOutcome(e.target.value);attemptKey.current=null;}}>
      {OUTCOMES.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
     </select></label>
     {outcome==="CALL_BACK_LATER"&&
      <label>موعد المتابعة المحلي<input type="datetime-local" step={60} required value={dueLocal}
       onChange={e=>{setDueLocal(e.target.value);attemptKey.current=null;}}/></label>}
     <label>ملاحظة<textarea maxLength={300} value={note}
      onChange={e=>{setNote(e.target.value);attemptKey.current=null;}}/></label>
     <div className="k5-booking-actions">
      <button className="k5-save" disabled={busy}>حفظ المحاولة</button>
      <button type="button" className="k5-salon-refresh" disabled={busy} onClick={closeLog}>إلغاء</button>
     </div>
    </form>
   </section>}
   <section className="k5-admin-card">
    <div className="k5-admin-summary"><h2>قائمة المتابعة</h2>
     <span className="k5-count">{queue.rows.length} عميل
      {queue.mayBeTruncated?" (مقطوعة عند 200)":""}</span></div>
    <div className="k5-table-wrap"><table className="k5-table">
     <thead><tr><th>الاسم</th><th>الموبايل</th><th>الأسباب</th><th>آخر تواصل</th><th></th></tr></thead>
     <tbody>{queue.rows.length===0?
      <tr><td colSpan={5} className="k5-empty">مفيش عملاء في الفلتر ده.</td></tr>:
      queue.rows.map(c=><tr key={c.customerId}>
       <td>{c.displayName}</td>
       <td dir="ltr">{c.phoneE164??"—"}</td>
       <td>{c.reasons.join(" · ")||"—"}</td>
       <td>{c.lastOutcome??"لا يوجد"}{c.attemptCount?` (${c.attemptCount})`:""}</td>
       <td><button type="button" className="k5-salon-refresh" disabled={busy}
        onClick={()=>openLog(c)}>تسجيل تواصل</button></td>
      </tr>)}</tbody>
    </table></div>
   </section>
  </>}
 </main>;
}
