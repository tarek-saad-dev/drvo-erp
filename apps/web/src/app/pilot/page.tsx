import Link from "next/link";
import {headers} from "next/headers";

export const dynamic = "force-dynamic";

function flagOn(name: string): boolean {
  return process.env[name] === "YES";
}

export default async function PrivatePilotPage() {
  const k5Web = flagOn("DRVO_K5_WEB_ENABLED");
  const catalog = flagOn("DRVO_CATALOG_WEB_ENABLED");
  const customers = flagOn("DRVO_CUSTOMERS_WEB_ENABLED");
  const booking = flagOn("DRVO_BOOKING_WEB_ENABLED");
  const pos = flagOn("DRVO_POS_PREVIEW_WEB_ENABLED");
  const drafts = flagOn("DRVO_POS_DRAFTS_WEB_ENABLED");
  const rich = flagOn("DRVO_POS_RICH_WEB_ENABLED");
  const hr = flagOn("DRVO_HR_WEB_ENABLED");
  const inventory = flagOn("DRVO_INVENTORY_WEB_ENABLED");
  const sliceReady = k5Web && catalog && customers && booking && pos && drafts;
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "erp-stage.drvotech.com";

  return (
    <main className="shell" dir="rtl" data-drvo-ui="light-v1" data-pilot-entry="private-p0">
      <header className="topbar">
        <div className="brand" aria-label="DRVO ERP">
          <span className="brandmark">D</span>
          <span>DRVO <b>ERP</b></span>
        </div>
        <span className="env">PRIVATE PILOT · NONPOSTING</span>
      </header>

      <section className="hero">
        <span className="eyebrow">DATABASE-CONNECTED · K5 SCOPED</span>
        <h1>Private Pilot<br /><span>محطة Cashier الحقيقية</span></h1>
        <p>
          هذه بوابة الدخول للمنتج الخاص — عميل وحجز ومسودة POS محفوظة في SQL Server
          المعزول (`DRVO_ERP_STAGING`). ليست Demo العامة، وليست تحصيلًا ماليًا.
        </p>

        {sliceReady ? (
          <div className="demo-hero-actions">
            <Link className="demo-hero-primary" href="/sign-in">
              دخول Owner للـ Private Pilot <span aria-hidden="true">←</span>
            </Link>
            <span className="demo-hero-description">
              بعد الدخول: مساحات العمل → العملاء / الحجز / نقطة البيع (3 أعمدة)
            </span>
          </div>
        ) : (
          <div className="demo-hero-actions" role="status">
            <span className="demo-hero-primary" aria-disabled="true" style={{opacity: 0.55, cursor: "not-allowed"}}>
              Private Pilot غير مفعّل على هذا النشر بعد
            </span>
            <span className="demo-hero-description">
              يحتاج موافقة المؤسس + تطبيق SQL001–040 على `DRVO_ERP_STAGING` + drop-ins في
              `ops/staging/pilot/` ثم إعادة تشغيل الخدمات.
            </span>
          </div>
        )}

        <div className="status">
          <span className="dot" />
          Host: {host} · ADR-031 posting BLOCKED · Cut live import BLOCKED
        </div>
      </section>

      <section className="section" aria-labelledby="pilot-flags">
        <div className="section-title">
          <h2 id="pilot-flags">حالة أعلام الواجهة</h2>
          <span>{sliceReady ? "جاهز للدخول" : "بانتظار التفعيل"}</span>
        </div>
        <div className="cards">
          {[
            ["K5 Web / Sign-in", k5Web],
            ["Customers", customers],
            ["Catalog", catalog],
            ["Booking", booking],
            ["POS Preview", pos],
            ["POS Drafts", drafts],
            ["POS Rich", rich],
            ["HR / Barber", hr],
            ["Inventory", inventory],
          ].map(([label, on]) => (
            <article key={String(label)} className="card">
              <div className="card-top">
                <span className="mini-dot" />
                <span>{on ? "ON" : "OFF"}</span>
              </div>
              <h3 dir="ltr">{label}</h3>
              <p>{on ? "متاح على هذا النشر" : "ما زال مقفولًا على الخادم"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="pilot-vs-demo">
        <div className="section-title">
          <h2 id="pilot-vs-demo">Private Pilot مقابل Demo</h2>
          <span>لا تخلط بينهما</span>
        </div>
        <div className="cards">
          <article className="card">
            <div className="card-top"><span className="mini-dot" /><span>منتج</span></div>
            <h3>Private Pilot</h3>
            <p>
              تسجيل دخول K5 · بيانات SQL حقيقية · محطة Cashier الثلاثية المشتركة ·
              مسودات غير محصّلة فقط.
            </p>
            {k5Web ? <Link href="/sign-in">/sign-in</Link> : <span>/sign-in (404 حتى التفعيل)</span>}
          </article>
          <article className="card">
            <div className="card-top"><span className="mini-dot" /><span>محاكاة</span></div>
            <h3>Public /demo/salon</h3>
            <p>
              بيانات داخل المتصفح فقط · بدون حساب · بدون APIs خاصة · مفيد للعرض البصري فقط.
            </p>
            <Link href="/demo/salon">افتح Demo الصناعي</Link>
          </article>
        </div>
      </section>

      <footer className="footer">
        DRVO TECH <span>·</span> Private Pilot P0 — NOT PILOT_VERIFIED without Owner acceptance
      </footer>
    </main>
  );
}
