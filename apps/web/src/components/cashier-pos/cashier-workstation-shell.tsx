"use client";
import type {ReactNode} from "react";
import "./cashier-workstation.css";

export type CashierWorkstationMode="private"|"synthetic";

type Props={
  mode:CashierWorkstationMode;
  /** Cashier right rail: customer search / create / profile */
  customerPane:ReactNode;
  /** Cashier center: quick actions + barber + catalog + packages */
  catalogPane:ReactNode;
  /** Cashier left rail: cart + invoice / pricing / save DRAFT */
  invoicePane:ReactNode;
  /** Optional strip under the grid (tips/returns/history) */
  footer?:ReactNode;
  bannerExtra?:ReactNode;
};

/**
 * Compact Light RTL 3-column workstation matching Cashier
 * `src/app/income/pos/page.tsx` desktop composition (pin 046bf19):
 * customer | catalog/barber | invoice/cart.
 */
export default function CashierWorkstationShell({
  mode,customerPane,catalogPane,invoicePane,footer,bannerExtra,
}:Props){
  const synthetic=mode==="synthetic";
  return (
    <div
      className="cashier-ws"
      data-cashier-pos="workstation-shell"
      data-cashier-mode={mode}
      dir="rtl"
    >
      <div
        className="cashier-ws-banner"
        data-kind={synthetic?"synthetic":"private"}
        role="status"
      >
        <div>
          <strong>{synthetic?"تجربة عامة محاكاة":"نقطة بيع خاصة · مسودة فقط"}</strong>
          {" · "}
          {synthetic
            ?"بيانات داخل المتصفح فقط — لا حسابات ولا APIs خاصة ولا تحصيل."
            :"صلاحيات الفرع · مسودات غير محصّلة · ADR-031 يمنع الترحيل والتحصيل."}
        </div>
        <div>
          <kbd>/</kbd> بحث الكتالوج{" · "}
          <kbd>F9</kbd> حفظ مسودة
          {bannerExtra}
        </div>
      </div>
      <div className="cashier-ws-grid" data-cashier-pos="workstation-grid">
        <aside className="cashier-ws-pane" data-cashier-pos="pane-customer" aria-label="العميل">
          <div className="cashier-ws-pane-title">
            <span>CUSTOMER</span>
            <h2>العميل</h2>
          </div>
          {customerPane}
        </aside>
        <section className="cashier-ws-pane" data-cashier-pos="pane-catalog" aria-label="الكتالوج والحلاق">
          <div className="cashier-ws-pane-title">
            <span>BARBER · CATALOG</span>
            <h2>الحلاق والكتالوج</h2>
          </div>
          {catalogPane}
        </section>
        <aside className="cashier-ws-pane" data-cashier-pos="pane-invoice" aria-label="المسودة والفاتورة">
          <div className="cashier-ws-pane-title">
            <span>INVOICE DRAFT · NOT POSTED</span>
            <h2>المسودة</h2>
          </div>
          {invoicePane}
        </aside>
      </div>
      {footer?<div className="cashier-ws-footer" data-cashier-pos="workstation-footer">{footer}</div>:null}
    </div>
  );
}
