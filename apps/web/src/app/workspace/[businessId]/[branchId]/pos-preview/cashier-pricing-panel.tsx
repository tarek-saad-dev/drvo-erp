"use client";
import {useState} from "react";

/**
 * Real K5 private POS quote. Reuses authenticated Fresh Catalog prices in Nest.
 * NOT part of public synthetic Salon demo; never saves discounts or payments.
 * Mounted with a cart-derived key to prevent stale price/display on cart edits.
 */
type Offering={offeringId:string;kind:"SERVICE"|"PRODUCT";displayName:string;
 priceMinor:number;currency:string;isActive:boolean};
type Line={offeringId:string;quantity:number};
type Mode="amount"|"percent";
type Discount={mode:Mode;text:string};
type Quote={
 state:"CASHIER_INVOICE_PRICE_QUOTE_ONLY";sourceRule:"CASHIER_LINE_AND_HEADER_DISCOUNT";
 priceSource:"FRESH_AUTHORIZED_CATALOG";persisted:false;paymentState:"NOT_COLLECTED";
 accountingState:"NOT_POSTED";inventoryState:"NOT_DECREMENTED";taxComputed:false;
 currency:string;subtotalMinor:number;lineDiscountTotalMinor:number;
 linesNetTotalMinor:number;headerDiscountMinor:number;grandTotalMinor:number;
 lines:Array<{offeringId:string;displayName:string;quantity:number;unitPriceMinor:number;
 grossMinor:number;discountMinor:number;netMinor:number}>;
};
function money(minor:number,currency:string):string{
 return (minor/100).toFixed(2)+" "+currency;
}
function minor(text:string):number|null{
 if(!/^(0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(text))return null;
 const [major,fraction=""]=text.split(".");
 const amount=Number(major)*100+Number(fraction.padEnd(2,"0"));
 return Number.isSafeInteger(amount)&&amount<=9_000_000_000_000?amount:null;
}
function basisPoints(text:string):number|null{
 if(!/^(0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(text))return null;
 const [percent,fraction=""]=text.split(".");
 const bps=Number(percent)*100+Number(fraction.padEnd(2,"0"));
 return Number.isSafeInteger(bps)&&bps<=10000?bps:null;
}
export default function CashierPricingPanel({api,lines,offerings}:{
 api:string;lines:Line[];offerings:Offering[];
}){
 const [discounts,setDiscounts]=useState<Record<string,Discount>>({});
 const [header,setHeader]=useState<Discount>({mode:"percent",text:"0"});
 const [quote,setQuote]=useState<Quote|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 function updateLine(id:string,patch:Partial<Discount>){
  setDiscounts(current=>({...current,[id]:{
   ...current[id]??{mode:"amount",text:"0"},...patch,
  }}));
  setQuote(null);setError("");
 }
 async function calculate(){
  if(busy||lines.length===0)return;
  const payload=[];
  for(const l of lines){
   const d=discounts[l.offeringId];
   const row:Record<string,unknown>={offeringId:l.offeringId,quantity:l.quantity};
   if(d&&d.text.trim()!==""){
    const value=d.mode==="percent"?basisPoints(d.text):minor(d.text);
    if(value===null){
     setError("راجع خصم السطر؛ النسبة من 0 لـ100، والمبلغ بدقة قرشين.");
     return;
    }
    row[d.mode==="percent"?"lineDiscountPercentBps":"lineDiscountMinor"]=value;
   }
   payload.push(row);
  }
  const val=header.mode==="percent"?basisPoints(header.text):minor(header.text);
  if(val===null){setError("خصم الفاتورة غير صالح.");return;}
  const body={lines:payload,...(header.mode==="percent"?
   {headerDiscountPercentBps:val}:{headerDiscountMinor:val})};
  setBusy(true);setQuote(null);setError("");
  try{
   const response=await fetch(api+"/cashier-invoice-quote",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
   });
   if(!response.ok){setError(response.status===401||response.status===403||
    response.status===404?"لا توجد صلاحية لعرض أسعار هذا الفرع.":"فشل الحساب. راجع الكتالوج والخصومات.");return;}
   const result=await response.json() as Quote;
   if(result.state!=="CASHIER_INVOICE_PRICE_QUOTE_ONLY"||
    result.sourceRule!=="CASHIER_LINE_AND_HEADER_DISCOUNT"||
    result.priceSource!=="FRESH_AUTHORIZED_CATALOG"||
    result.persisted!==false||result.paymentState!=="NOT_COLLECTED"||
    result.accountingState!=="NOT_POSTED"||result.inventoryState!=="NOT_DECREMENTED"||
    result.taxComputed!==false||!Array.isArray(result.lines)){
    setError("استجابة المعاينة غير صالحة.");return;
   }
   setQuote(result);
  }catch{setError("الاتصال بالحساب الآمن غير متاح.");}
  finally{setBusy(false);}
 }
 return <section className="k5-admin-card" dir="rtl" aria-label="حاسبة Cashier لقواعد الفاتورة">
  <div className="k5-admin-summary"><div>
   <span className="k5-eyebrow">CASHIER SOURCE RULES / AUTHORIZED CATALOG</span>
   <h2>حساب الفاتورة وفق قواعد Cashier الأصلية</h2>
   <p className="k5-muted">خصم لكل خدمة/منتج، وبعده خصم الفاتورة من صافي السطور؛ السعر من الكتالوج الحقيقي للفرع.</p>
  </div></div>
  {lines.length===0?<p className="k5-muted">أضف عناصر للسلة الأول.</p>:<>
   <div className="k5-table-wrap"><table className="k5-table">
    <thead><tr><th>العنصر</th><th>السعر × الكمية</th><th>نوع الخصم</th><th>القيمة</th></tr></thead>
    <tbody>{lines.map(l=>{
     const item=offerings.find(o=>o.offeringId===l.offeringId);
     const d=discounts[l.offeringId]??{mode:"amount",text:"0"};
     return <tr key={l.offeringId}>
      <td>{item?.displayName??"—"}</td>
      <td dir="ltr">{item?money(item.priceMinor*l.quantity,item.currency):"—"}</td>
      <td><select aria-label={"نوع خصم "+(item?.displayName??"العنصر")}
       value={d.mode} onChange={e=>updateLine(l.offeringId,{
        mode:e.target.value as Mode,text:"0",
       })}><option value="amount">قيمة ثابتة</option><option value="percent">نسبة %</option></select></td>
      <td><input aria-label={"خصم "+(item?.displayName??"العنصر")} type="text"
       inputMode="decimal" value={d.text} maxLength={14}
       onChange={e=>updateLine(l.offeringId,{text:e.target.value})}/></td>
     </tr>;
    })}</tbody>
   </table></div>
   <div className="catalog-form">
    <label>خصم الفاتورة بعد خصومات السطور
     <select value={header.mode} onChange={e=>{
      setHeader({mode:e.target.value as Mode,text:"0"});setQuote(null);
     }}><option value="percent">نسبة %</option><option value="amount">قيمة ثابتة</option></select></label>
    <label>القيمة
     <input type="text" inputMode="decimal" maxLength={14} value={header.text}
      onChange={e=>{setHeader({...header,text:e.target.value});setQuote(null);setError("");}}/></label>
    <button type="button" className="k5-save" disabled={busy}
     onClick={()=>void calculate()}>{busy?"جاري الحساب…":"احسب وفق Cashier"}</button>
   </div>
   {error&&<p className="k5-error" role="alert">{error}</p>}
   {quote&&<div role="status" className="k5-table-state">
    <p>إجمالي الأسعار: <b>{money(quote.subtotalMinor,quote.currency)}</b></p>
    <p>خصم السطور: <b>{money(quote.lineDiscountTotalMinor,quote.currency)}</b></p>
    <p>الصافي قبل خصم الفاتورة: <b>{money(quote.linesNetTotalMinor,quote.currency)}</b></p>
    <p>خصم الفاتورة: <b>{money(quote.headerDiscountMinor,quote.currency)}</b></p>
    <p><strong>الإجمالي: {money(quote.grandTotalMinor,quote.currency)}</strong></p>
   </div>}
  </>}
  <p className="k5-muted">النتيجة للعرض والمراجعة فقط؛ حفظ المسودة الحالي لا يحفظ الخصومات ولا ينشئ فاتورة أو دفع أو حركة مخزون أو قيد.</p>
 </section>;
}
