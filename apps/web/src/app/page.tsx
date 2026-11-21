import Link from "next/link";

const boundaries = [
  { name: "Private Pilot", description: "K5 + SQL عميل/حجز/مسودة POS على staging المعزول", state: "P0" },
  { name: "Platform Kernel", description: "الهوية، الشركات، الفروع والصلاحيات", state: "نشط" },
  { name: "Cashier workstation", description: "محطة Light RTL الثلاثية المشتركة", state: "في Pilot" },
];

const k5Web = process.env.DRVO_K5_WEB_ENABLED === "YES";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand" aria-label="DRVO ERP">
          <span className="brandmark">D</span>
          <span>DRVO <b>ERP</b></span>
        </div>
        <span className="env">PRIVATE PILOT PRIORITY</span>
      </header>

      <section className="hero">
        <span className="eyebrow">REAL PRODUCT · NOT IN-MEMORY DEMO</span>
        <h1>Private Pilot أولاً.<br /><span>Demo للصورة فقط.</span></h1>
        <p>
          الأولوية الآن: Owner حقيقي على قاعدة `DRVO_ERP_STAGING` المعزولة، بمحطة Cashier
          الثلاثية، مع عميل وحجز ومسودة POS تبقى بعد التحديث وإعادة الدخول.
          التحصيل المالي ما زال مقفولًا (ADR-031).
        </p>
        <div className="demo-hero-actions">
          <Link className="demo-hero-primary" href="/pilot">
            افتح بوابة Private Pilot <span aria-hidden="true">←</span>
          </Link>
          <span className="demo-hero-description">
            {k5Web
              ? "K5 Web مفعّل على هذا النشر — أكمل من /pilot إلى /sign-in"
              : "إن كان الدخول مغلقًا، /pilot يوضح الأعلام والبوابات المطلوبة"}
          </span>
        </div>
        <div className="demo-hero-actions" style={{marginTop: 12}}>
          <Link href="/demo/salon" style={{fontWeight: 700}}>
            Demo صناعي (ذاكرة المتصفح فقط)
          </Link>
          <span className="demo-hero-description">ليس المنتج — لا SQL ولا حساب</span>
        </div>
        <div className="status"><span className="dot" /> Public demo ≠ Private Pilot persistence</div>
      </section>

      <section className="section" aria-labelledby="boundaries">
        <div className="section-title">
          <h2 id="boundaries">مسار التسليم</h2>
          <span>P0</span>
        </div>
        <div className="cards">
          {boundaries.map((area) => (
            <article key={area.name} className="card">
              <div className="card-top"><span className="mini-dot" /><span>{area.state}</span></div>
              <h3 dir="ltr">{area.name}</h3>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">DRVO TECH <span>·</span> Engineering — Private Pilot first</footer>
    </main>
  );
}
