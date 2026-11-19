"use client";
/**
 * Cashier-adapted cart lines for private nonposting POS.
 * Source UX: casher@046bf19 CartPanel + groupCartForDisplay package grouping.
 * SERVICE lines may show selected Barber context; PRODUCT stays without executor.
 * No paid totals / payment in this slice.
 */
import type {CatalogOffering} from "./cashier-catalog-browser";
import {
  groupCartForDisplay,
  type PackageAwareCartLine,
} from "./cashier-package-cart";

export type CartLine=PackageAwareCartLine;

function money(minor:number,currency:string):string{
 return (minor/100).toFixed(2)+" "+currency;
}

export default function CashierCartPanel({lines,offerings,disabled,onAdjust,onRemove,selectedExecutorEmployeeId}:{
 lines:CartLine[];offerings:CatalogOffering[];disabled:boolean;
 onAdjust:(offeringId:string,delta:1|-1)=>void;onRemove:(offeringId:string)=>void;
 selectedExecutorEmployeeId?:string;
}){
 const rows=groupCartForDisplay(lines);
 const currency=offerings.find(o=>lines.some(l=>l.offeringId===o.offeringId))?.currency??"EGP";
 return <section className="k5-admin-card" aria-label="سلة المسودة Cashier"
  data-cashier-pos="cart-panel">
  <div className="k5-admin-summary"><h2>السلة — مسودة غير مدفوعة</h2>
   <p className="k5-muted">الباقات تظهر كمجموعة تجارية زي Cashier. مفيش تحصيل أو ترحيل.</p>
  </div>
  {lines.length===0?<p className="k5-muted">السلة فاضية.</p>:
   <div className="k5-table-wrap"><table className="k5-table">
    <thead><tr><th>العنصر</th><th>النوع</th><th>المنفذ</th><th>الكمية</th><th>إزالة</th></tr></thead>
    <tbody>{rows.map(row=>{
     if(row.kind==="package"){
      const executor=selectedExecutorEmployeeId
       ?selectedExecutorEmployeeId.slice(0,8)+"…"
       :"—";
      return <tr key={row.groupKey} data-cashier-pos="cart-package-group"
       data-package-group={row.groupKey}>
       <td>
        <strong>{row.packageName}</strong>
        <div className="k5-muted">باقة · {row.includedCount} مشمول
         {row.addons.length?` + ${row.addons.length} إضافة`:""}</div>
        <ul className="k5-muted">
         {row.included.map(i=>{
          const o=offerings.find(x=>x.offeringId===i.offeringId);
          return <li key={i.offeringId}>+ {i.displayName??o?.displayName??i.offeringId.slice(0,8)}</li>;
         })}
         {row.addons.map(i=>{
          const o=offerings.find(x=>x.offeringId===i.offeringId);
          const label=i.displayName??o?.displayName??i.offeringId.slice(0,8);
          const group=i.packageMeta?.optionalGroup==="home_visit"?" · زيارة عريس":"";
          const price=i.displayUnitPriceMinor!=null
           ?` (${money(i.displayUnitPriceMinor,currency)})`:"";
          return <li key={i.offeringId}>+ {label}{group}{price}</li>;
         })}
        </ul>
       </td>
       <td>باقة</td>
       <td data-cashier-pos="cart-executor">{executor}</td>
       <td>1</td>
       <td><button type="button" disabled={disabled}
        onClick={()=>onRemove(row.anchor.offeringId)}>حذف الباقة</button></td>
      </tr>;
     }
     const l=row.item;
     const o=offerings.find(x=>x.offeringId===l.offeringId);
     const executor=o?.kind==="SERVICE"&&selectedExecutorEmployeeId
      ?selectedExecutorEmployeeId.slice(0,8)+"…"
      :"—";
     return <tr key={l.offeringId}>
      <td>{l.displayName??o?.displayName??"—"}</td>
      <td>{o?.kind==="PRODUCT"?"منتج":"خدمة"}</td>
      <td data-cashier-pos="cart-executor">{executor}</td>
      <td><div className="k5-booking-actions">
       <button type="button" disabled={disabled||l.quantity<=1}
        aria-label="تقليل الكمية" onClick={()=>onAdjust(l.offeringId,-1)}>−</button>
       <span>{l.quantity}</span>
       <button type="button" disabled={disabled||l.quantity>=20}
        aria-label="زيادة الكمية" onClick={()=>onAdjust(l.offeringId,1)}>+</button>
      </div></td>
      <td><button type="button" disabled={disabled} onClick={()=>onRemove(l.offeringId)}>حذف</button></td>
     </tr>;
    })}</tbody>
   </table></div>}
 </section>;
}
