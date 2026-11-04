"use client";

import { useEffect, useRef, useState } from "react";
import { parseVerificationFragment } from "./verification-fragment";

type Status = "pending" | "verified" | "invalid" | "unavailable";

export default function VerifyEmailClient() {
  const started = useRef(false);
  const [status, setStatus] = useState<Status>("pending");

  useEffect(() => {
    if (started.current) return; // React Strict Mode must not redeem twice.
    started.current = true;

    // Clear the fragment synchronously before any fetch, route change, or
    // browser event is dispatched. Do not retain the raw token in React state.
    const fragment = window.location.hash;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const payload = parseVerificationFragment(fragment);
    if (!payload) {
      setStatus("invalid");
      return;
    }

    // The route is feature-gated and may only be enabled after the backend
    // implements atomic single-use redemption and approved identity binding.
    void fetch("/api/auth/verify-email", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async response => {
      if (!response.ok) {
        setStatus("unavailable");
        return;
      }
      const data: unknown = await response.json();
      setStatus(data !== null && typeof data === "object" &&
        (data as Record<string, unknown>).verified === true ? "verified" : "unavailable");
    }).catch(() => setStatus("unavailable"));
  }, []);

  return (
    <main className="k5-shell k5-standalone">
      <section className="k5-login" aria-live="polite" aria-busy={status === "pending"}>
        <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
        <span className="k5-eyebrow">SECURE EMAIL VERIFICATION</span>
        <h1>تأكيد البريد الإلكتروني</h1>
        {status === "pending" && <p className="k5-muted" role="status">جاري التحقق من صلاحية رابط التأكيد…</p>}
        {status === "invalid" && <p className="k5-error" role="alert">رابط التأكيد غير صالح. اطلب رابطًا جديدًا من الإدارة.</p>}
        {status === "unavailable" && <p className="k5-error" role="alert">تعذر تأكيد البريد الإلكتروني. قد يكون الرابط منتهيًا أو مستخدمًا، أو الخدمة غير متاحة حاليًا. تواصل مع الإدارة.</p>}
        {status === "verified" && <>
          <p className="k5-notice" role="status">تم تأكيد بريدك الإلكتروني بنجاح.</p>
          <a className="k5-verify-link" href="/sign-in">الانتقال لتسجيل الدخول</a>
        </>}
        <p className="k5-footnote">لأمان حسابك، رابط التأكيد يستخدم مرة واحدة ولا يظهر في سجل المتصفح بعد فتحه.</p>
      </section>
    </main>
  );
}
