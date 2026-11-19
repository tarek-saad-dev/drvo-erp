"use client";
/**
 * Cashier-adapted cart lines for private nonposting POS.
 * Source UX: casher@046bf19 CartPanel quantity/remove interactions.
 * No line employee attribution / packages / paid totals in this slice.
 */
import type {CatalogOffering} from "./cashier-catalog-browser";

export type CartLine={offeringId:string;quantity:number};

export default function CashierCartPanel({lines,offerings,disabled,onAdjust,onRemove}:{
 lines:CartLine[];offerings:CatalogOffering[];disabled:boolean;
 onAdjust:(offeringId:string,delta:1|-1)=>void;onRemove:(offeringId:string)=>void;
}){
 return <section className="k5-admin-card" aria-label="سلة المسودة Cashier"
  data-cashier-pos="cart-panel">
  <div className="k5-admin-summary"><h2>السلة — مسودة غير مدفوعة</h2>
   <p className="k5-muted">تعديل الكمية والحذف زي Cashier. مفيش تحصيل أو ترحيل.</p>
  </div>
  {lines.length===0?<p className="k5-muted">السلة فاضية.</p>:
   <div className="k5-table-wrap"><table className="k5-table">
    <thead><tr><th>العنصر</th><th>النوع</th><th>الكمية</th><th>إزالة</th></tr></thead>
    <tbody>{lines.map(l=>{
     const o=offerings.find(x=>x.offeringId===l.offeringId);
     return <tr key={l.offeringId}>
      <td>{o?.displayName??"—"}</td>
      <td>{o?.kind==="PRODUCT"?"منتج":"خدمة"}</td>
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
