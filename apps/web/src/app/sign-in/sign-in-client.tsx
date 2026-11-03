"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Workspace = {
  tenantId: string;
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
};

export default function SignInClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!response.ok) {
        setError(response.status === 429
          ? "محاولات كثيرة. جرّب تاني بعد شوية."
          : "اسم المستخدم أو كلمة المرور غير صحيحة، أو تسجيل الدخول غير متاح حاليًا.");
        return;
      }
      const result = await response.json() as { mustChangePassword?: boolean };
      setPassword("");
      if (result.mustChangePassword) {
        router.replace("/change-password");
        return;
      }
      const workspacesResponse = await fetch("/api/auth/workspaces", {
        credentials: "same-origin", cache: "no-store",
      });
      if (!workspacesResponse.ok) {
        setError("تم تسجيل الدخول، لكن تعذر تحميل قائمة الشركات والفروع.");
        return;
      }
      const data = await workspacesResponse.json() as { workspaces?: Workspace[] };
      const workspace = data.workspaces?.[0];
      if (!workspace) {
        setError("الحساب نشط، لكنه غير مرتبط بفرع مسموح له بالدخول. تواصل مع الإدارة.");
        return;
      }
      router.replace("/workspace/" + encodeURIComponent(workspace.businessId) +
        "/" + encodeURIComponent(workspace.branchId) + "/access");
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="k5-shell">
      <section className="k5-login" aria-labelledby="k5-login-title">
        <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
        <div className="k5-eyebrow">BUSINESS WORKSPACE</div>
        <h1 id="k5-login-title">أهلًا برجوعك</h1>
        <p className="k5-muted">ادخل بحسابك علشان توصل للشركات والفروع المصرّح لك بها.</p>
        <form onSubmit={submit} className="k5-form">
          <label htmlFor="k5-username">اسم المستخدم</label>
          <input id="k5-username" name="username" autoComplete="username" minLength={3}
            maxLength={80} required value={username} onChange={e => setUsername(e.target.value)}
            placeholder="username" dir="ltr" />
          <label htmlFor="k5-password">كلمة المرور</label>
          <input id="k5-password" name="password" type="password"
            autoComplete="current-password" minLength={12} maxLength={256} required
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••••••" dir="ltr" />
          {error && <p role="alert" className="k5-error">{error}</p>}
          <button type="submit" disabled={pending}>
            {pending ? "جاري التحقق…" : "تسجيل الدخول"}
          </button>
        </form>
        <p className="k5-footnote">التسجيل للحسابات المدعوة أو المعتمدة فقط. ليس متاحًا للعملاء بعد.</p>
      </section>
      <aside className="k5-side">
        <span>ONE PLATFORM. MANY BUSINESSES.</span>
        <h2>شغلك كله،<br />في مكان واحد.</h2>
        <p>كل مستخدم بيشوف بيانات الشركات والفروع اللي الإدارة سمحت له بيها فقط.</p>
        <div className="k5-side-status">محمي بصلاحيات مستقلة لكل شركة وفرع</div>
      </aside>
    </main>
  );
}
