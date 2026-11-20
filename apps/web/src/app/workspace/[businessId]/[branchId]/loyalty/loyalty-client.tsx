"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";

type Reward={id:number;titleEn:string;requiredPoints:number;rewardType:string;
 minTierCode:string|null;status:"available"|"locked"|"tier_locked";
 remainingPoints:number;progress:number};
type NextReward={id:number;titleEn:string;requiredPoints:number;remainingPoints:number;progress:number};
type Config={tiers:string[];rewards:Reward[];earnRule:string;cutClubConfigProvenance:string;
 cutClubConfig:{points:{pointsPerCurrency:number;coinMultiplier:number;expiryEnabled:boolean;expiryDays:number};
  tiers:{autoUpgrade:boolean;notifyOnUpgrade:boolean}}};
type RedeemPreview={ok:boolean;issue:string|null;pointsBefore:number;pointsDelta:number;pointsAfter:number};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISSUES:Record<string,string>={
 REWARD_CONFIRMATION_REQUIRED:"التأكيد مطلوب",REWARD_NOT_FOUND:"المكافأة غير موجودة",
 TIER_TOO_LOW:"المستوى أقل من المطلوب",INSUFFICIENT_POINTS:"رصيد النقاط غير كافٍ"};
// Loyalty / Cut Club is PREVIEW ONLY: balances typed here are hypothetical, nothing is stored,
// no points move and no message is sent. It never reads or writes a customer's real balance.
export default function LoyaltyClient({businessId,branchId}:{businessId:string;branchId:string}){
 const router=useRouter();
 const [state,setState]=useState<"loading"|"ready"|"denied"|"unavailable">("loading");
 const [config,setConfig]=useState<Config|null>(null);
 const [balance,setBalance]=useState("0");
 const [tier,setTier]=useState("BRONZE");
 const [rewards,setRewards]=useState<Reward[]>([]);
 const [next,setNext]=useState<NextReward|null>(null);
 const [redeem,setRedeem]=useState<Record<number,RedeemPreview>>({});
 const [notice,setNotice]=useState("");
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const api="/api/workspaces/"+encodeURIComponent(businessId)+"/branches/"+
   encodeURIComponent(branchId)+"/loyalty";
 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const r=await fetch(api+"/config",{credentials:"same-origin",cache:"no-store"});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===403||r.status===404){setState("denied");return;}
   if(!r.ok){setState("unavailable");return;}
   const data=await r.json() as Config;
   if(!Array.isArray(data.rewards)||!Array.isArray(data.tiers)){setState("unavailable");return;}
   setConfig(data);setRewards(data.rewards.map(x=>({...x,status:"locked",remainingPoints:x.requiredPoints,progress:0})));
   setState("ready");
  }catch{setState("unavailable");}
 },[api,businessId,branchId,router]);
 useEffect(()=>{void load();},[load]);
 async function post(path:string,body:unknown){
  return fetch(api+"/"+path,{method:"POST",credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 }
 async function previewRewards(e:React.FormEvent){
  e.preventDefault();setNotice("");setRedeem({});
  const pointsBalance=Number(balance);
  if(!Number.isSafeInteger(pointsBalance)||pointsBalance<0){setNotice("أدخل رصيد نقاط صحيحاً (رقم صحيح غير سالب).");return;}
  try{
   const r=await post("rewards-preview",{pointsBalance,tierCode:tier});
   if(r.status===401){router.replace("/sign-in");return;}
   if(!r.ok){setNotice("تعذر إجراء المعاينة.");return;}
   const data=await r.json() as {rewards:Reward[];nextReward:NextReward|null};
   setRewards(data.rewards);setNext(data.nextReward);
  }catch{setNotice("الاتصال غير متاح حالياً.");}
 }
 async function previewRedeem(id:number){
  setNotice("");
  try{
   const r=await post("redeem-preview",{pointsBalance:Number(balance),tierCode:tier,rewardId:id,confirm:true});
   if(r.status===401){router.replace("/sign-in");return;}
   if(!r.ok){setNotice("تعذرت معاينة الاستبدال.");return;}
   const data=await r.json() as RedeemPreview;
   setRedeem(current=>({...current,[id]:data}));
  }catch{setNotice("الاتصال غير متاح حالياً.");}
 }
 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions"><Link href={home}>صفحة الفرع</Link></nav>
  </header>
  <div className="k5-page-title"><div>
   <span className="k5-eyebrow">LOYALTY CORE + CUT CLUB EXTENSION</span>
   <h1>الولاء و Cut Club (معاينة)</h1>
   <p className="k5-muted">قواعد المكافآت والمستويات من Cashier للمعاينة فقط. لا يتم تسجيل نقاط أو استبدال أو
    إرسال رسائل، والأرصدة المدخلة هنا افتراضية وليست أرصدة عملاء حقيقية.</p>
  </div></div>
  {state==="loading"&&<p role="status">جارٍ تحميل قواعد الولاء…</p>}
  {state==="denied"&&<p role="alert" className="k5-error">ليس لديك صلاحية الولاء لهذا الفرع.</p>}
  {state==="unavailable"&&<p role="alert" className="k5-error">الولاء غير متاح حالياً.</p>}
  {state==="ready"&&config&&<>
   {notice&&<p role="status" className="k5-notice">{notice}</p>}
   <p className="k5-muted" data-loyalty-state="UNPOSTED_LOYALTY_PREVIEW">
    الحالة: معاينة غير مسجلة — قاعدة كسب النقاط لم تُنقل بعد ({config.earnRule}).
   </p>
   <section className="k5-admin-card">
    <h2>معاينة المكافآت</h2>
    <form className="catalog-form" onSubmit={previewRewards}>
     <label>رصيد النقاط (افتراضي)
      <input inputMode="numeric" value={balance} onChange={e=>setBalance(e.target.value)}/>
     </label>
     <label>المستوى
      <select value={tier} onChange={e=>setTier(e.target.value)}>
       {config.tiers.map(t=><option key={t} value={t}>{t}</option>)}
      </select>
     </label>
     <button type="submit">معاينة</button>
    </form>
    {next&&<p>المكافأة التالية: {next.titleEn} — متبقي {next.remainingPoints} نقطة ({next.progress}%)</p>}
    <ul>
     {rewards.map(x=><li key={x.id}>
      <b>{x.titleEn}</b> — {x.requiredPoints} نقطة{x.minTierCode?" · "+x.minTierCode+"+":""} · {x.status}
      {" "}<button type="button" onClick={()=>void previewRedeem(x.id)}>
       معاينة الاستبدال</button>
      {redeem[x.id]&&<span role="status"> {redeem[x.id]!.ok
       ?"ممكن: "+redeem[x.id]!.pointsBefore+" → "+redeem[x.id]!.pointsAfter+" (غير مسجل)"
       :ISSUES[redeem[x.id]!.issue??""]??"غير ممكن"}</span>}
     </li>)}
    </ul>
   </section>
   <section className="k5-admin-card">
    <h2>إعدادات Cut Club الافتراضية (غير مفعلة)</h2>
    <p className="k5-muted">مصدرها واجهة إعدادات Cashier التي لم تكن تُحفظ أو تُطبّق ({config.cutClubConfigProvenance}).</p>
    <ul>
     <li>نقاط لكل جنيه: {config.cutClubConfig.points.pointsPerCurrency}</li>
     <li>معامل العملات: {config.cutClubConfig.points.coinMultiplier}</li>
     <li>انتهاء النقاط: {config.cutClubConfig.points.expiryEnabled?config.cutClubConfig.points.expiryDays+" يوم":"غير مفعل"}</li>
     <li>إشعار الترقية: {config.cutClubConfig.tiers.notifyOnUpgrade?"مفعل":"متوقف (لا يوجد مرسل رسائل)"}</li>
    </ul>
   </section>
  </>}
 </main>;
}
