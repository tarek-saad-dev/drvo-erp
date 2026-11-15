"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Category={categoryId:string;displayName:string;isActive:boolean};
type Draft={draftId:string;categoryId:string;categoryName:string;amountMinor:number;
 currency:"EGP"|"SAR"|"AED"|"USD";note:string;status:"DRAFT"|"CANCELLED";
 createdAtUtc:string};
type ExpenseWorkspace={state:"NONPOSTING_EXPENSE_DRAFTS_ONLY";
 categories:Category[];drafts:Draft[];limitPerSource:200;mayBeTruncated:boolean;
 treasuryState:"NOT_PAID";accountingState:"NOT_POSTED"};
type State="loading"|"ready"|"denied"|"unavailable";
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Read decimal as a string. Never multiply binary floating-point money.
function parseMinor(raw:string):number|null{
 if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw))return null;
 const [major,fraction=""]=raw.split(".");
 const minor=Number(major)*100+Number(fraction.padEnd(2,"0"));
 return Number.isSafeInteger(minor)&&minor>=1&&minor<=9000000000000?minor:null;
}
const showMoney=(minor:number,currency:string)=> (minor/100).toFixed(2)+" "+currency;

export default function ExpensesClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const base="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/expenses";
 const [state,setState]=useState<State>("loading");
 const [data,setData]=useState<ExpenseWorkspace|null>(null);
 const [newCategory,setNewCategory]=useState("");
 const [categoryId,setCategoryId]=useState("");
 const [amount,setAmount]=useState("");
 const [currency,setCurrency]=useState<Draft["currency"]>("EGP");
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const categoryRequest=useRef<string|null>(null);
 const draftRequest=useRef<string|null>(null);
 const cancelRequests=useRef<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const resp=await fetch(api,{credentials:"same-origin",cache:"no-store"});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){setState("denied");return;}
   if(!resp.ok){setState("unavailable");return;}
   const workspace=await resp.json() as ExpenseWorkspace;
   if(workspace.state!=="NONPOSTING_EXPENSE_DRAFTS_ONLY"||
      workspace.treasuryState!=="NOT_PAID"||
      workspace.accountingState!=="NOT_POSTED"||
      workspace.limitPerSource!==200||
      !Array.isArray(workspace.categories)||!Array.isArray(workspace.drafts)){
    setState("unavailable");return;
   }
   setData(workspace);
   setCategoryId(current=>workspace.categories.some(c=>c.categoryId===current&&c.isActive)?
    current:(workspace.categories.find(c=>c.isActive)?.categoryId??""));
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
 async function createCategory(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  if(!newCategory.trim()||newCategory!==newCategory.trim()||newCategory.length>100){
   message("اكتب اسم تصنيف صحيح من غير مسافات في البداية أو النهاية.",true);return;
  }
  setBusy("category");setNotice("");setError(false);
  if(!categoryRequest.current)categoryRequest.current=crypto.randomUUID();
  try{
   const resp=await send(api+"/categories",categoryRequest.current,{displayName:newCategory});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("مش مصرح لك بإدارة تصنيفات المصروفات.",true);return;}
   if(resp.status===409){categoryRequest.current=null;message("التصنيف موجود أو الطلب متعارض.",true);return;}
   if(!resp.ok){message("تعذر حفظ التصنيف. أعد المحاولة بنفس البيانات.",true);return;}
   categoryRequest.current=null;setNewCategory("");
   await load();message("التصنيف اتحفظ في بيانات الـBusiness، بدون أي حركة مالية.");
  }catch{message("الاتصال تعذر. أعد المحاولة بنفس البيانات لتجنب التكرار.",true);}
  finally{setBusy("");}
 }
 async function createDraft(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const amountMinor=parseMinor(amount);
  if(!GUID.test(categoryId)||amountMinor===null||note.length>240||
     note!==note.trim()){
   message("راجع التصنيف والمبلغ والوصف؛ المبلغ لازم يكون موجب وبحد أقصى رقمين عشريين.",true);
   return;
  }
  setBusy("draft");setNotice("");setError(false);
  if(!draftRequest.current)draftRequest.current=crypto.randomUUID();
  try{
   const resp=await send(api+"/drafts",draftRequest.current,
    {categoryId,amountMinor,currency,note});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("مش مسموح بإضافة مسودة؛ راجع صلاحية الفرع والتصنيف.",true);return;}
   if(resp.status===409){draftRequest.current=null;message("مسودة متعارضة؛ راجع البيانات.",true);return;}
   if(!resp.ok){message("تعذر الحفظ. أعد نفس الطلب حتى لو حصل انقطاع.",true);return;}
   draftRequest.current=null;setAmount("");setNote("");
   await load();message("المسودة اتحفظت. لم يتم دفع أي مبلغ أو إنشاء قيد مالي.");
  }catch{message("الاتصال تعذر. أعد المحاولة بنفس القيم بدون تغيير.",true);}
  finally{setBusy("");}
 }
 async function cancel(draftId:string){
  if(busy||!GUID.test(draftId))return;
  setBusy(draftId);setNotice("");setError(false);
  if(!cancelRequests.current[draftId])cancelRequests.current[draftId]=crypto.randomUUID();
  try{
   const resp=await send(api+"/drafts/"+encodeURIComponent(draftId)+"/cancel",
    cancelRequests.current[draftId],{});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){message("مش مسموح بإلغاء المسودة.",true);return;}
   if(resp.status===409){message("المسودة اتلغت بطلب مختلف؛ حدّث القائمة.",true);return;}
   if(!resp.ok){message("تعذر الإلغاء؛ أعد المحاولة بنفس الطلب.",true);return;}
   delete cancelRequests.current[draftId];
   await load();message("المسودة اتلغت بدون أي أثر على الخزنة أو الحسابات.");
  }catch{message("انقطع الاتصال؛ إعادة نفس الطلب آمنة.",true);}
  finally{setBusy("");}
 }
 const categories=data?.categories.filter(c=>c.isActive)??[];
 return <main className="k5-workspace" dir="rtl">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={base}>تطبيقات الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">EXPENSES CORE / DOCUMENT DRAFTS</span>
   <h1>المصروفات</h1>
   <p className="k5-muted">سجّل وصنّف مسودات المصروفات في فرعك. فصلنا المستند عن الدفع في الخزنة
    وعن القيد المحاسبي، زي ما اتفقنا على الـArchitecture الجديدة.</p>
  </div></div>
  {state==="loading"&&<p role="status" className="k5-table-state">جاري تحميل مصروفات الفرع…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">مش مصرح لك بعرض مصروفات الفرع.</p>}
  {state==="unavailable"&&<p role="alert" className="k5-error">الموديول مش متاح أو Migration 019 لسه مش مطبّقة.</p>}
  {state==="ready"&&data&&<>
   <div className="drvo-expenses-banner" role="status">
    <strong>مسودات محفوظة، وليست مصروفات مدفوعة</strong>
    <span>NOT PAID · NOT POSTED · لا تؤثر على رصيد الخزنة أو الأرباح.</span>
   </div>
   {notice&&<p className={error?"k5-error":"k5-notice"} role={error?"alert":"status"}>{notice}</p>}
   <div className="drvo-expenses-grid">
    <section className="k5-admin-card k5-invite-card">
     <h2>تصنيف مصروف جديد</h2>
     <p className="k5-muted">التصنيف مشترك داخل الـBusiness؛ المسودات نفسها خاصة بالفرع.</p>
     <form className="catalog-form" onSubmit={createCategory}>
      <label>اسم التصنيف
       <input required maxLength={100} value={newCategory}
        onChange={e=>{setNewCategory(e.target.value);categoryRequest.current=null;}}
        placeholder="مثلاً إيجار أو مستلزمات"/></label>
      <button className="k5-save" type="submit" disabled={!!busy}>
       {busy==="category"?"جاري الحفظ…":"حفظ التصنيف"}
      </button>
     </form>
    </section>
    <section className="k5-admin-card k5-invite-card">
     <h2>مسودة مصروف جديدة</h2>
     <form className="catalog-form" onSubmit={createDraft}>
      <label>التصنيف
       <select required value={categoryId} onChange={e=>{
        setCategoryId(e.target.value);draftRequest.current=null;}}>
        {categories.length===0&&<option value="">أضف تصنيف أولًا</option>}
        {categories.map(c=><option key={c.categoryId} value={c.categoryId}>{c.displayName}</option>)}
       </select></label>
      <label>المبلغ
       <input required inputMode="decimal" type="text" value={amount}
        placeholder="150.00" onChange={e=>{setAmount(e.target.value);draftRequest.current=null;}}/>
      </label>
      <label>العملة
       <select value={currency} onChange={e=>{
        setCurrency(e.target.value as Draft["currency"]);draftRequest.current=null;}}>
        <option value="EGP">EGP</option><option value="SAR">SAR</option>
        <option value="AED">AED</option><option value="USD">USD</option>
       </select></label>
      <label>الوصف (اختياري)
       <input maxLength={240} value={note} onChange={e=>{
        setNote(e.target.value);draftRequest.current=null;}}/>
      </label>
      <button className="k5-save" type="submit" disabled={!!busy||categories.length===0}>
       {busy==="draft"?"جاري الحفظ…":"حفظ مسودة المصروف"}
      </button>
     </form>
    </section>
   </div>
   <section className="k5-admin-card drvo-expenses-list">
    <div className="k5-admin-summary">
     <div><h2>مسودات مصروفات الفرع</h2>
      <p className="k5-muted">آخر {data.drafts.length} مستند · كل الأرقام مسودات غير مدفوعة</p></div>
     <button className="k5-salon-refresh" onClick={()=>void load()} type="button">تحديث</button>
    </div>
    {data.mayBeTruncated&&<p className="k5-notice">العرض محدود بآخر 200 مستند / تصنيف؛ مش تقرير إجمالي مالي.</p>}
    {data.drafts.length===0?<p className="k5-table-state">لسه مفيش مسودات مصروفات محفوظة.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>التصنيف</th><th>القيمة</th><th>الوصف</th><th>الحالة</th><th>الإجراء</th></tr></thead>
      <tbody>{data.drafts.map(d=><tr key={d.draftId}>
       <td>{d.categoryName}</td><td dir="ltr">{showMoney(d.amountMinor,d.currency)}</td>
       <td>{d.note||"—"}</td><td>{d.status==="DRAFT"?"مسودة غير مدفوعة":"ملغاة"}</td>
       <td>{d.status==="DRAFT"&&<button className="drvo-expenses-cancel" type="button"
        disabled={!!busy} onClick={()=>void cancel(d.draftId)}>
        {busy===d.draftId?"جاري الإلغاء…":"إلغاء المسودة"}
       </button>}</td>
      </tr>)}</tbody>
     </table></div>}
    <p className="k5-muted drvo-expenses-foot">لا توجد مدفوعات أو حركات Treasury أو قيود GL في هذا الـModule حتى الآن.</p>
   </section>
  </>}
 </main>;
}
