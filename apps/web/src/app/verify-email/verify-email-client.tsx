"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { parseVerificationFragment, type VerificationLink } from "./verification-fragment";

type Status = "opening" | "ready" | "submitting" | "verified" |
  "invalid" | "unavailable" | "limited";

export default function VerifyEmailClient() {
  const initialized = useRef(false);
  // The bearer token lives only in this transient ref; NEVER store it in
  // React state, persistent browser storage, cookies, a URL or telemetry.
  const bearer = useRef<VerificationLink | null>(null);
  const busy = useRef(false);
  const [status, setStatus] = useState<Status>("opening");
  const [invite, setInvite] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Immediately clear fragment before rendering any form or sending a
    // request. Browser history and HTTP referrers will not retain the token.
    const fragment = window.location.hash;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const link = parseVerificationFragment(fragment);
    if (!link) {
      setStatus("invalid");
      return;
    }
    bearer.current = link;
    setInvite(link.purpose === "ACCOUNT_INVITE");
    setStatus("ready");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !bearer.current || status !== "ready") return;
    if (password.length < 12 || password.length > 256) {
      setError("كلمة المرور لازم تكون من 12 إلى 256 حرف.");
      return;
    }
    if (password !== confirm) {
      setError("تأكيد كلمة المرور مش مطابق.");
      return;
    }
    if (invite && !/^[a-zA-Z0-9._-]{3,80}$/.test(username.trim())) {
      setError("اسم المستخدم لازم يكون من 3 إلى 80 حرف إنجليزي أو رقم.");
      return;
    }
    if (!email.trim()) {
      setError("ادخل البريد الإلكتروني اللي وصلك عليه رابط التأكيد.");
      return;
    }
    busy.current = true;
    setError("");
    setStatus("submitting");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: bearer.current.token,
          purpose: bearer.current.purpose,
          email: email.trim(),
          ...(invite ? { username: username.trim().toLowerCase() } : {}),
          newPassword: password,
        }),
      });
      if (response.status === 429) {
        setStatus("limited");
        return;
      }
      if (!response.ok) {
        setStatus(response.status === 503 ? "unavailable" : "invalid");
        return;
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" ||
          (data as Record<string, unknown>).verified !== true) {
        setStatus("unavailable");
        return;
      }
      bearer.current = null;
      setPassword("");
      setConfirm("");
      setEmail("");
      setUsername("");
      setStatus("verified");
    } catch {
      setStatus("unavailable");
    } finally {
      busy.current = false;
      setPassword("");
      setConfirm("");
    }
  }

  return <main className="k5-shell k5-standalone">
    <section className="k5-login" aria-labelledby="k5-verify-title" aria-live="polite">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <span className="k5-eyebrow">SECURE OWNER VERIFICATION</span>
      <h1 id="k5-verify-title">{invite ? "تفعيل دعوة الموظف" : "تأكيد حساب المالك"}</h1>
      {status === "opening" && <p className="k5-muted" role="status">جاري قراءة رابط التأكيد…</p>}
      {status === "ready" || status === "submitting" ? <>
        <p className="k5-muted">{invite
          ? "تمت دعوتك للانضمام لفرع محدد. أكد بريدك وحدد اسم المستخدم وكلمة مرور قوية."
          : "لاستكمال الحساب المعتمد من الإدارة، أكد بريدك وحدد كلمة مرور قوية."} الرابط صالح للاستخدام مرة واحدة فقط.</p>
        <form className="k5-form" onSubmit={e => { void submit(e); }}>
          <label htmlFor="owner-email">البريد الإلكتروني المعتمد</label>
          <input id="owner-email" type="email" name="email" autoComplete="email"
            dir="ltr" maxLength={254} required
            value={email} onChange={e => setEmail(e.target.value)} />
          {invite && <>
            <label htmlFor="invite-username">اسم المستخدم</label>
            <input id="invite-username" name="username" autoComplete="username"
              dir="ltr" minLength={3} maxLength={80} required
              value={username} onChange={e => setUsername(e.target.value)} />
          </>}
          <label htmlFor="owner-pass">كلمة المرور الجديدة (12 حرف على الأقل)</label>
          <input id="owner-pass" type="password" name="new-password"
            autoComplete="new-password" minLength={12} maxLength={256} required
            value={password} onChange={e => setPassword(e.target.value)} />
          <label htmlFor="owner-confirm">تأكيد كلمة المرور</label>
          <input id="owner-confirm" type="password" name="confirm-password"
            autoComplete="new-password" minLength={12} maxLength={256} required
            value={confirm} onChange={e => setConfirm(e.target.value)} />
          {error && <p className="k5-error" role="alert">{error}</p>}
          <button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "جاري تأكيد الحساب…" : "تأكيد البريد وإنشاء الحساب"}
          </button>
        </form>
      </> : null}
      {status === "invalid" && <p className="k5-error" role="alert">الرابط غير صالح أو منتهي أو مستخدم من قبل. اطلب اعتمادًا أو رابطًا جديدًا من الإدارة.</p>}
      {status === "limited" && <p className="k5-error" role="alert">تم تجاوز عدد محاولات التأكيد. حاول مرة أخرى بعد مرور 15 دقيقة.</p>}
      {status === "unavailable" && <p className="k5-error" role="alert">تعذر تأكيد الحساب حاليًا. حاول فتح رابط التأكيد مرة أخرى أو تواصل مع الإدارة.</p>}
      {status === "verified" && <>
        <p className="k5-notice" role="status">{invite ? "تم تفعيل حساب الموظف بنجاح." : "تم تأكيد بريدك وإنشاء حسابك المعتمد بنجاح."}</p>
        <a className="k5-verify-link" href="/sign-in">الانتقال لتسجيل الدخول</a>
      </>}
      <p className="k5-footnote">التفعيل لأصحاب الحسابات المعتمدة أو الدعوات المصرّح بها فقط. مش متاح تسجيل عام.</p>
    </section>
  </main>;
}
