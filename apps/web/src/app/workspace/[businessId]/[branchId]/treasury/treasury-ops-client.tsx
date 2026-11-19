"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Movement={
 movementId:string;dayId:string;shiftId:string;direction:"IN"|"OUT"|"TRANSFER";
 amountMinor:number;currency:"EGP"|"SAR"|"AED"|"USD";
 fromRail:"CASH"|"CARD"|"BANK"|"OTHER";toRail:"CASH"|"CARD"|"BANK"|"OTHER";
 note:string;status:"RECORDED"|"CANCELLED";glPostState:"GATED";
 createdAtUtc:string;cancelledAtUtc:string|null;
};
type Recon={
 reconId:string;dayId:string;shiftId:string;rail:"CASH"|"CARD"|"BANK"|"OTHER";
 systemMinor:number;countedMinor:number;varianceMinor:number;note:string;
 glPostState:"GATED";createdAtUtc:string;
};
type OpsRead={
 state:"NONPOSTING_TREASURY_MOVEMENTS_AND_RECON_ONLY";
 movements:Movement[];recons:Recon[];limit:200;mayBeTruncated:boolean;
 accountingState:"NOT_POSTED";glPostState:"GATED";settlementState:"NO_SETTLEMENT";
 balanceState:"COMPUTED_FROM_MOVEMENTS_ONLY";
};
type OpsDay={
 state:"NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY";
 openDay:{dayId:string;businessDate:string;status:"OPEN"|"CLOSED"}|null;
 shifts:{shiftId:string;dayId:string;actorAccountId:string;status:"OPEN"|"CLOSED"}[];
};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function minor(raw:string):number|null{
 if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw))return null;
 const [major,frac=""]=raw.split(".");
 const value=Number(major)*100+Number(frac.padEnd(2,"0"));
 return Number.isSafeInteger(value)&&value>=0&&value<=9000000000000?value:null;
}
const money=(v:number,c:string)=>(v/100).toFixed(2)+" "+c;
export default function TreasuryOpsClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const root="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId);
 const [state,setState]=useState<"loading"|"ready"|"denied"|"unavailable"|"need-ops">("loading");
 const [data,setData]=useState<OpsRead|null>(null);
 const [dayId,setDayId]=useState("");
 const [shiftId,setShiftId]=useState("");
 const [direction,setDirection]=useState<Movement["direction"]>("IN");
 const [amount,setAmount]=useState("");
 const [currency,setCurrency]=useState<Movement["currency"]>("EGP");
 const [fromRail,setFromRail]=useState<Movement["fromRail"]>("OTHER");
 const [toRail,setToRail]=useState<Movement["toRail"]>("CASH");
 const [note,setNote]=useState("");
 const [counted,setCounted]=useState("");
 const [reconNote,setReconNote]=useState("تسوية درج نقدي");
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState(false);
 const moveKey=useRef<string|null>(null);
 const reconKey=useRef<string|null>(null);
 const cancelKeys=useRef<Record<string,string>>({});
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const [ops,day]=await Promise.all([
    fetch(api+"/treasury/ops",{cache:"no-store",credentials:"same-origin"}),
    fetch(api+"/operations",{cache:"no-store",credentials:"same-origin"}),
   ]);
   if(ops.status===401||day.status===401){router.replace("/sign-in");return;}
   if(ops.status===403||ops.status===404){setState("denied");return;}
   if(!ops.ok){setState("unavailable");return;}
   if(!day.ok){setState("need-ops");return;}
   const payload=await ops.json() as OpsRead;
   const opsDay=await day.json() as OpsDay;
   if(payload.state!=="NONPOSTING_TREASURY_MOVEMENTS_AND_RECON_ONLY"||
      payload.glPostState!=="GATED"||payload.accountingState!=="NOT_POSTED"||
      payload.settlementState!=="NO_SETTLEMENT"||
      payload.balanceState!=="COMPUTED_FROM_MOVEMENTS_ONLY"||
      !Array.isArray(payload.movements)||!Array.isArray(payload.recons)){
    setState("unavailable");return;
   }
   const open=opsDay.openDay?.status==="OPEN"?opsDay.openDay:null;
   const openShift=opsDay.shifts?.find(s=>s.status==="OPEN")||null;
   setDayId(open?.dayId??"");setShiftId(openShift?.shiftId??"");
   setData(payload);setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
  if(direction==="IN"){setFromRail("OTHER");if(toRail==="OTHER")setToRail("CASH");}
  else if(direction==="OUT"){setToRail("OTHER");if(fromRail==="OTHER")setFromRail("CASH");}
  else if(fromRail==="OTHER"||toRail==="OTHER"||fromRail===toRail){
   setFromRail("CASH");setToRail("CARD");
  }
 },[direction]); // eslint-disable-line react-hooks/exhaustive-deps
 async function send(endpoint:string,key:string,body:unknown){
  return fetch(endpoint,{method:"POST",cache:"no-store",credentials:"same-origin",
   headers:{"Content-Type":"application/json","Idempotency-Key":key},
   body:JSON.stringify(body)});
 }
 async function createMove(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const amountMinor=minor(amount);
  if(amountMinor===null||amountMinor<1||!GUID.test(dayId)||!GUID.test(shiftId)||
   note.trim()!==note||note.length>240){
   setError(true);setNotice("راجع المبلغ واليوم والوردية والملاحظة.");return;
  }
  setBusy("move");setNotice("");setError(false);
  if(!moveKey.current)moveKey.current=crypto.randomUUID();
  try{
   const r=await send(api+"/treasury/ops/movements",moveKey.current,{
    dayId,shiftId,direction,amountMinor,currency,fromRail,toRail,note});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بتسجيل حركة.");return;}
   if(r.status===409){moveKey.current=null;setError(true);
    setNotice("تعارض أو يوم/وردية مغلقة؛ حدّث الحالة.");return;}
   if(!r.ok){setError(true);setNotice("تعذر حفظ الحركة؛ أعد نفس الطلب.");return;}
   moveKey.current=null;setAmount("");setNote("");
   await load();setNotice("اتحفظت حركة خزنة تشغيلية — GL GATED.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس الطلب.");}
  finally{setBusy("");}
 }
 async function cancelMove(movementId:string){
  if(busy||!GUID.test(movementId))return;
  setBusy(movementId);setNotice("");setError(false);
  if(!cancelKeys.current[movementId])cancelKeys.current[movementId]=crypto.randomUUID();
  try{
   const r=await send(api+"/treasury/ops/movements/"+encodeURIComponent(movementId)+"/cancel",
    cancelKeys.current[movementId],{});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بالإلغاء.");return;}
   if(r.status===409){delete cancelKeys.current[movementId];setError(true);
    setNotice("تعارض إلغاء؛ حدّث القائمة.");return;}
   if(!r.ok){setError(true);setNotice("تعذر الإلغاء؛ أعد نفس الطلب.");return;}
   delete cancelKeys.current[movementId];await load();
   setNotice("اتلغت الحركة بدون أي أثر محاسبي.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس طلب الإلغاء.");}
  finally{setBusy("");}
 }
 async function createRecon(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const countedMinor=minor(counted);
  if(countedMinor===null||!GUID.test(shiftId)||reconNote.trim()!==reconNote||
   reconNote.length>240){
   setError(true);setNotice("راجع العد والوردية والملاحظة.");return;
  }
  setBusy("recon");setNotice("");setError(false);
  if(!reconKey.current)reconKey.current=crypto.randomUUID();
  try{
   const r=await send(api+"/treasury/ops/recon",reconKey.current,{
    shiftId,rail:"CASH",countedMinor,note:reconNote});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setError(true);setNotice("غير مصرح بالتسوية.");return;}
   if(r.status===409){reconKey.current=null;setError(true);
    setNotice("الوردية مغلقة أو تعارض طلب.");return;}
   if(!r.ok){setError(true);setNotice("تعذر حفظ التسوية؛ أعد نفس الطلب.");return;}
   const body=await r.json() as {varianceMinor?:number;glPostState?:string};
   reconKey.current=null;setCounted("");await load();
   setNotice("اتقفلت الوردية بعد التسوية. الفرق="+
    ((body.varianceMinor??0)/100).toFixed(2)+" — ترحيل الفرق GL ما زال GATED.");
  }catch{setError(true);setNotice("انقطع الاتصال؛ أعد نفس طلب التسوية.");}
  finally{setBusy("");}
 }
 return <main className="k5-workspace" dir="rtl">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions">
    <Link href={root}>مساحة الفرع</Link>
    <Link href={root+"/treasury"}>الجرد</Link>
    <Link href={root+"/operations"}>التشغيل</Link>
   </nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">TREASURY · MOVEMENTS / RECON · GL GATED</span>
   <h1>حركات الخزنة وتسوية الوردية</h1>
   <p className="k5-muted">سجل IN/OUT/TRANSFER على يوم ووردية مفتوحين، وسوِّ العد مقابل النظام بدون ترحيل محاسبي.</p>
  </div></div>
  {state==="loading"&&<p className="k5-table-state" role="status">جاري التحميل…</p>}
  {state==="denied"&&<p className="k5-error" role="alert">مش مسموح لك بحركات الخزنة.</p>}
  {state==="unavailable"&&<p className="k5-error" role="alert">SQL030 أو علم Treasury Ops غير متاح.</p>}
  {state==="need-ops"&&<p className="k5-error" role="alert">شغّل موديول اليوم/الوردية أولًا (SQL029).</p>}
  {state==="ready"&&data&&<>
   <div className="drvo-expenses-banner" role="status">
    <strong>Custody movements only</strong>
    <span>GL GATED · NO SETTLEMENT · balance from movements only</span>
   </div>
   {notice&&<p className={error?"k5-error":"k5-notice"} role={error?"alert":"status"}>{notice}</p>}
   <section className="k5-admin-card k5-invite-card">
    <h2>تسجيل حركة</h2>
    <p className="k5-muted">Day <span dir="ltr">{dayId||"—"}</span> · Shift <span dir="ltr">{shiftId||"—"}</span></p>
    <form className="catalog-form" onSubmit={createMove}>
     <label>الاتجاه
      <select value={direction} onChange={e=>{setDirection(e.target.value as Movement["direction"]);
       moveKey.current=null;}}>
       <option value="IN">وارد</option><option value="OUT">منصرف</option>
       <option value="TRANSFER">تحويل</option>
      </select></label>
     <label>المبلغ
      <input type="text" inputMode="decimal" required placeholder="0.00" value={amount}
       onChange={e=>{setAmount(e.target.value);moveKey.current=null;}}/></label>
     <label>العملة
      <select value={currency} onChange={e=>{setCurrency(e.target.value as Movement["currency"]);
       moveKey.current=null;}}>
       <option value="EGP">EGP</option><option value="SAR">SAR</option>
       <option value="AED">AED</option><option value="USD">USD</option>
      </select></label>
     <label>من
      <select value={fromRail} disabled={direction==="IN"}
       onChange={e=>{setFromRail(e.target.value as Movement["fromRail"]);moveKey.current=null;}}>
       <option value="CASH">CASH</option><option value="CARD">CARD</option>
       <option value="BANK">BANK</option><option value="OTHER">OTHER</option>
      </select></label>
     <label>إلى
      <select value={toRail} disabled={direction==="OUT"}
       onChange={e=>{setToRail(e.target.value as Movement["toRail"]);moveKey.current=null;}}>
       <option value="CASH">CASH</option><option value="CARD">CARD</option>
       <option value="BANK">BANK</option><option value="OTHER">OTHER</option>
      </select></label>
     <label>ملاحظة
      <input maxLength={240} value={note} onChange={e=>{setNote(e.target.value);moveKey.current=null;}}/></label>
     <button className="k5-save" type="submit" disabled={!!busy||!dayId||!shiftId}>
      {busy==="move"?"جاري الحفظ…":"حفظ حركة (GL GATED)"}
     </button>
    </form>
   </section>
   <section className="k5-admin-card k5-invite-card">
    <h2>تسوية وردية نقدية وإغلاق</h2>
    <form className="catalog-form" onSubmit={createRecon}>
     <label>العدّ الفعلي (CASH)
      <input type="text" inputMode="decimal" required placeholder="0.00" value={counted}
       onChange={e=>{setCounted(e.target.value);reconKey.current=null;}}/></label>
     <label>ملاحظة التسوية
      <input maxLength={240} value={reconNote}
       onChange={e=>{setReconNote(e.target.value);reconKey.current=null;}}/></label>
     <button className="k5-save" type="submit" disabled={!!busy||!shiftId}>
      {busy==="recon"?"جاري التسوية…":"تسوية + إغلاق الوردية (بدون GL)"}
     </button>
    </form>
   </section>
   <section className="k5-admin-card drvo-expenses-list">
    <div className="k5-admin-summary"><div>
     <h2>الحركات</h2>
     <p className="k5-muted">آخر {data.movements.length} حركة</p>
    </div><button type="button" className="k5-salon-refresh" onClick={()=>void load()}>تحديث</button></div>
    {data.movements.length===0?<p className="k5-table-state">لسه مفيش حركات.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>الاتجاه</th><th>المبلغ</th><th>المسار</th><th>الحالة</th><th></th></tr></thead>
      <tbody>{data.movements.map(m=><tr key={m.movementId}>
       <td>{m.direction}</td><td dir="ltr">{money(m.amountMinor,m.currency)}</td>
       <td dir="ltr">{m.fromRail}→{m.toRail}</td>
       <td>{m.status==="RECORDED"?"مسجّلة":"ملغاة"} / {m.glPostState}</td>
       <td>{m.status==="RECORDED"&&<button type="button" className="drvo-expenses-cancel"
        disabled={!!busy} onClick={()=>void cancelMove(m.movementId)}>
        {busy===m.movementId?"…":"إلغاء"}</button>}</td>
      </tr>)}</tbody>
     </table></div>}
   </section>
   <section className="k5-admin-card drvo-expenses-list">
    <h2>تسويات الورديات</h2>
    {data.recons.length===0?<p className="k5-table-state">لسه مفيش تسويات.</p>:
     <div className="k5-table-wrap"><table className="k5-table">
      <thead><tr><th>المسار</th><th>النظام</th><th>العد</th><th>الفرق</th><th>GL</th></tr></thead>
      <tbody>{data.recons.map(r=><tr key={r.reconId}>
       <td>{r.rail}</td>
       <td dir="ltr">{(r.systemMinor/100).toFixed(2)}</td>
       <td dir="ltr">{(r.countedMinor/100).toFixed(2)}</td>
       <td dir="ltr">{(r.varianceMinor/100).toFixed(2)}</td>
       <td>{r.glPostState}</td>
      </tr>)}</tbody>
     </table></div>}
   </section>
  </>}
 </main>;
}
