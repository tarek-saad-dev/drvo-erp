"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordClient() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (newPassword !== confirm) { setError("تأكيد كلمة المرور غير مطابق."); return; }
    if (newPassword.length < 12) { setError("كلمة المرور لازم تكون 12 حرف على الأقل."); return; }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
      });
      if (!response.ok) {
        setError("تعذر تغيير كلمة المرور. راجع كلمة المرور الحالية وحاول مرة أخرى.");
        return;
      }
      setOldPassword(""); setNewPassword(""); setConfirm("");
      router.replace("/sign-in");
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setPending(false);
    }
  }

  return <main className="k5-shell k5-standalone"><section className="k5-login">
    <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
    <h1>تحديث كلمة المرور</h1>
    <p className="k5-muted">لازم تغيّر كلمة المرور قبل استخدام مساحات العمل. بعد التغيير هتسجّل دخولك من جديد.</p>
    <form onSubmit={submit} className="k5-form">
      <label htmlFor="old-pass">كلمة المرور الحالية</label>
      <input id="old-pass" type="password" autoComplete="current-password"
        required value={oldPassword} onChange={e=>setOldPassword(e.target.value)} />
      <label htmlFor="new-pass">كلمة المرور الجديدة (12 حرف على الأقل)</label>
      <input id="new-pass" type="password" minLength={12} maxLength={256}
        autoComplete="new-password" required
        value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
      <label htmlFor="confirm-pass">تأكيد كلمة المرور الجديدة</label>
      <input id="confirm-pass" type="password" autoComplete="new-password"
        required value={confirm} onChange={e=>setConfirm(e.target.value)} />
      {error && <p role="alert" className="k5-error">{error}</p>}
      <button type="submit" disabled={pending}>{pending ? "جاري التحديث…" : "حفظ كلمة المرور"}</button>
    </form>
  </section></main>;
}
