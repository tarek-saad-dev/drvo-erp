"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { groupsFromAuthorizedWorkspaces, type BusinessGroup } from "./authorized-workspaces";

type Viewer = { username: string; mustChangePassword: boolean };

export default function WorkspacesClient() {
  const router = useRouter();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [groups, setGroups] = useState<BusinessGroup[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const me = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (!live) return;
        if (me.status === 401) { router.replace("/sign-in"); return; }
        if (!me.ok) throw Error("Viewer unavailable");
        const account = await me.json() as Viewer;
        if (account.mustChangePassword) { router.replace("/change-password"); return; }
        const response = await fetch("/api/auth/workspaces", {
          credentials: "same-origin", cache: "no-store",
        });
        if (!live) return;
        if (response.status === 401) { router.replace("/sign-in"); return; }
        if (!response.ok) throw Error("Workspaces unavailable");
        const data = await response.json() as { workspaces?: unknown };
        if (!live) return;
        setViewer(account);
        setGroups(groupsFromAuthorizedWorkspaces(data.workspaces));
        setStatus("ready");
      } catch {
        if (live) setStatus("error");
      }
    }
    void load();
    return () => { live = false; };
  }, [router]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: "{}",
      });
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  return <main className="k5-workspace">
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <div className="k5-head-actions">
        {viewer && <span dir="ltr">{viewer.username}</span>}
        <button type="button" onClick={() => { void logout(); }}>تسجيل خروج</button>
      </div>
    </header>
    <section className="k5-page-title">
      <div>
        <span className="k5-eyebrow">YOUR WORKSPACES</span>
        <h1>شركاتك وفروعك</h1>
        <p className="k5-muted">اختار الفرع اللي هتشتغل عليه. بتظهر هنا الفروع المصرّح ليك بالدخول ليها فقط.</p>
      </div>
    </section>
    {status === "loading" && <p className="k5-table-state" role="status">جاري تحميل الفروع المتاحة…</p>}
    {status === "error" && <p className="k5-error" role="alert">تعذر تحميل الفروع. جرّب إعادة فتح الصفحة.</p>}
    {status === "ready" && !groups.length && <div className="k5-admin-card k5-workspaces-empty">
      <h2>مفيش فروع متاحة لحسابك حاليًا</h2>
      <p className="k5-muted">اطلب من إدارة شركتك تفعيل عضويتك وتحديد الفرع والصلاحية المطلوبة.</p>
    </div>}
    {status === "ready" && groups.map(group => <section className="k5-workspaces-group"
      key={group.tenantId + ":" + group.id} aria-label={group.name}>
      <div className="k5-workspaces-heading"><h2>{group.name}</h2>
        <span>{group.branches.length} {group.branches.length === 1 ? "فرع" : "فروع"}</span></div>
      <div className="k5-workspaces-grid">
        {group.branches.map(branch => <button type="button"
          key={branch.branchId} className="k5-workspace-choice"
          onClick={() => router.push("/workspace/" + encodeURIComponent(branch.businessId) +
            "/" + encodeURIComponent(branch.branchId))}>
          <span className="k5-choice-eyebrow">BRANCH</span>
          <strong>{branch.branchName}</strong>
          <span className="k5-choice-action">فتح مساحة العمل <span aria-hidden="true">←</span></span>
        </button>)}
      </div>
    </section>)}
    <p className="k5-footnote">المساحات دي بتعكس صلاحياتك الحالية من قاعدة البيانات، ومش بتديك أي صلاحيات إضافية.</p>
  </main>;
}
