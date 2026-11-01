const boundaries = [
  { name: "Platform Kernel", description: "الهوية، الشركات، الفروع والصلاحيات", state: "قيد البناء" },
  { name: "SaaS Commercial", description: "الخطط والاشتراكات وتفعيل الموديولات", state: "التالي" },
  { name: "Business Modules", description: "Catalog وPOS وAccounting وما بعدها", state: "مخطط" },
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand" aria-label="DRVO ERP">
          <span className="brandmark">D</span>
          <span>DRVO <b>ERP</b></span>
        </div>
        <span className="env">FOUNDATION · DEVELOPMENT</span>
      </header>

      <section className="hero">
        <span className="eyebrow">ONE PLATFORM. MANY BUSINESSES.</span>
        <h1>كل نشاط له مكانه.<br /><span>وكل حاجة تحت السيطرة.</span></h1>
        <p>
          بنبني DRVO ERP كنظام مرن للشركات والأنشطة المختلفة.
          هذه معاينة لأول واجهة تقنية وليست نظامًا جاهزًا للعملاء.
        </p>
        <div className="status"><span className="dot" /> Web runtime is operational — business features not enabled</div>
      </section>

      <section className="section" aria-labelledby="boundaries">
        <div className="section-title">
          <h2 id="boundaries">أساس المنصة</h2>
          <span>المرحلة الأولى</span>
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

      <footer className="footer">DRVO TECH <span>·</span> Engineering Preview — No customer data</footer>
    </main>
  );
}
