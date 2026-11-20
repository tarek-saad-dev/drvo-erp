"use client";
/**
 * Cashier QuickActions shell — finance paths explicitly blocked pending ADR-031.
 * Source UX: casher@046bf19 QuickActionsBar / TipsModal / PaymentTransferModal etc.
 */
const BLOCKED=[
 {id:"pay",label:"تحصيل / حفظ فاتورة",reason:"FINANCE_GATED — ADR-031"},
 {id:"split",label:"تقسيم دفع",reason:"FINANCE_GATED — NOT_COLLECTED"},
 {id:"tips",label:"إكراميات",reason:"HR/Treasury gated — معاينة التبس متاحة في لوحة التبس، التسجيل محظور"},
 {id:"returns",label:"مرتجع / مسح فاتورة",reason:"ADR-031 Sales void gated — معاينة المرتجع متاحة في لوحة المرتجعات، التنفيذ محظور"},
 {id:"expense",label:"مصروف سريع",reason:"Expenses draft only elsewhere"},
 {id:"income",label:"إيراد غير بيعي",reason:"Other Income owner pending"},
 {id:"transfer",label:"تحويل طريقة دفع",reason:"Treasury gated"},
 {id:"print",label:"طباعة إيصال مدفوع",reason:"POSTED reprint OPEN — استخدم طباعة المسودة من سجل المسودات (DRAFT فقط)"},
 {id:"whatsapp",label:"واتساب سريع",reason:"Messaging+consent pending"},
] as const;

export default function CashierQuickActions(){
 return <section className="k5-admin-card" aria-label="إجراءات سريعة Cashier"
  data-cashier-pos="quick-actions-blocked">
  <div className="k5-admin-summary"><h2>إجراءات سريعة</h2>
   <p className="k5-muted">أزرار Cashier ظاهرة للـparity البصري، لكن المسارات المالية مقفولة بصراحة — مفيش محاكاة دفع.</p>
  </div>
  <div className="k5-booking-actions">
   {BLOCKED.map(a=><button key={a.id} type="button" disabled title={a.reason}
    aria-disabled="true">{a.label} — محظور</button>)}
  </div>
 </section>;
}
