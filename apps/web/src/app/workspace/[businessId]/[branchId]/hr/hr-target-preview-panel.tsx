"use client";
import {useRef,useState} from "react";
import {MAX_TARGET_TIERS,buildTargetPreviewBody,formatMinor,isSafePreview} from "./hr-admin-model";
import type {TargetPreviewView,TargetTierDraft} from "./hr-admin-model";

// Progressive MTD target preview (Cashier employee-target). Reads nothing, writes nothing:
// the server only computes the day delta; no ledger row, payroll or cash effect (ADR-031).
export default function HrTargetPreviewPanel({previewUrl,onUnauthorized}:{
 previewUrl:string;onUnauthorized:()=>void;
}){
 const seq=useRef(1);
 const [mtd,setMtd]=useState("");
 const [prior,setPrior]=useState("");
 const [tiers,setTiers]=useState<TargetTierDraft[]>([{key:"t1",startText:"0",ratePercentText:""}]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [result,setResult]=useState<TargetPreviewView|null>(null);
 function patch(key:string,next:Partial<TargetTierDraft>){
  setTiers(current=>current.map(t=>t.key===key?{...t,...next}:t));setResult(null);
 }
 async function run(){
  if(busy)return;
  const built=buildTargetPreviewBody(mtd,prior,tiers);
  if(!built.ok){setError(built.error);return;}
  setBusy(true);setError("");setResult(null);
  try{
   const r=await fetch(previewUrl,{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(built.body)});
   if(r.status===401){onUnauthorized();return;}
   if(r.status===403||r.status===404){setError("غير مصرح بمعاينة الهدف في هذا الفرع.");return;}
   if(r.status===400){setError("الشرائح أو المبالغ مرفوضة من الخادم.");return;}
   if(!r.ok){setError("معاينة الهدف غير متاحة حاليًا.");return;}
   const data=await r.json() as TargetPreviewView;
   if(!isSafePreview(data)){setError("رد غير آمن: المعاينة لازم تكون غير مرحّلة.");return;}
   setResult(data);
  }catch{setError("الاتصال غير متاح؛ جرّب مرة أخرى.");}
  finally{setBusy(false);}
 }
 return <section className="k5-admin-card hr-panel" data-hr="target-preview">
  <h2>الهدف الشهري التدريجي — معاينة</h2>
  <p className="k5-muted" data-hr="target-preview-limits">
   المستحق اليومي = هدف مبيعات الشهر حتى اليوم − هدف الشهر حتى اليوم السابق. معاينة فقط:
   لا يتم حفظ خطة أهداف ولا قيد دفتر ولا صرف ولا ترحيل (ADR-031).
  </p>
  <div className="catalog-form hr-form-grid">
   <label>مبيعات الشهر حتى اليوم (MTD)
    <input inputMode="decimal" dir="ltr" value={mtd} placeholder="0.00"
     onChange={e=>{setMtd(e.target.value);setResult(null);}}/>
   </label>
   <label>مبيعات الشهر حتى اليوم السابق
    <input inputMode="decimal" dir="ltr" value={prior} placeholder="0.00"
     onChange={e=>{setPrior(e.target.value);setResult(null);}}/>
   </label>
  </div>
  <h3>الشرائح ({tiers.length})</h3>
  {tiers.map((t,i)=><div className="catalog-form hr-form-grid" key={t.key}>
   <label>بداية الشريحة {i+1}
    <input inputMode="decimal" dir="ltr" value={t.startText}
     onChange={e=>patch(t.key,{startText:e.target.value})}/>
   </label>
   <label>النسبة % (0 – 100)
    <input inputMode="decimal" dir="ltr" value={t.ratePercentText} placeholder="0.00"
     onChange={e=>patch(t.key,{ratePercentText:e.target.value})}/>
   </label>
   <button type="button" disabled={tiers.length<=1}
    onClick={()=>{setTiers(c=>c.filter(x=>x.key!==t.key));setResult(null);}}>حذف الشريحة</button>
  </div>)}
  <button type="button" disabled={tiers.length>=MAX_TARGET_TIERS}
   onClick={()=>{setTiers(c=>[...c,{key:"t"+(++seq.current),startText:"",ratePercentText:""}]);setResult(null);}}>
   إضافة شريحة</button>
  {error&&<p role="alert" className="k5-error">{error}</p>}
  <button className="k5-save" type="button" disabled={busy} onClick={()=>void run()}>
   {busy?"جاري الحساب…":"احسب الهدف (بدون حفظ)"}</button>
  {result&&<div data-hr="target-preview-result">
   <p role="status" className="k5-notice">معاينة غير مرحّلة — لم يُحفظ شيء.</p>
   <p>هدف الشهر حتى اليوم: <b dir="ltr">{formatMinor(result.mtdTargetMinor)}</b>
    {" "}| حتى اليوم السابق: <b dir="ltr">{formatMinor(result.priorMtdTargetMinor)}</b>
    {" "}| مستحق اليوم: <b dir="ltr">{formatMinor(result.dayDeltaMinor)}</b></p>
   <div className="k5-table-wrap"><table className="k5-table">
    <thead><tr><th>من</th><th>إلى</th><th>المبلغ المؤهل</th><th>النسبة %</th></tr></thead>
    <tbody>{result.breakdown.map((b,i)=><tr key={i}>
     <td dir="ltr">{formatMinor(b.fromMinor)}</td>
     <td dir="ltr">{b.toMinor===null?"∞":formatMinor(b.toMinor)}</td>
     <td dir="ltr">{formatMinor(b.eligibleMinor)}</td>
     <td dir="ltr">{(b.rateBp/100).toFixed(2)}</td>
    </tr>)}</tbody>
   </table></div>
  </div>}
 </section>;
}
