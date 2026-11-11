"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Branch = { branchName: string; businessId: string; branchId: string };
type AuthorizedWorkspace = { businessId: string; branchId: string; businessName: string };
type Account = { username: string; mustChangePassword: boolean };
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function WorkspaceHomeClient({businessId, branchId}: {
  businessId: string; branchId: string;
}) {
  const router = useRouter();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [canViewCatalog, setCanViewCatalog] = useState(false);
  const [canViewCustomers, setCanViewCustomers] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<"loading"|"ready"|"denied"|"error">("loading");

  useEffect(() => {
    let live = true;
    async function load() {
      if (!GUID.test(businessId) || !GUID.test(branchId)) {
        if (live) setStatus("denied");
        return;
      }
      try {
        const me = await fetch("/api/auth/me", {credentials:"same-origin",cache:"no-store"});
        if (!live) return;
        if (me.status === 401) { router.replace("/sign-in"); return; }
        if (!me.ok) throw Error("Session unavailable");
        const viewer = await me.json() as Account;
        if (viewer.mustChangePassword) { router.replace("/change-password"); return; }
        const base = "/api/workspaces/" + encodeURIComponent(businessId) +
          "/branches/" + encodeURIComponent(branchId);
        const [details, list] = await Promise.all([
          fetch(base, {credentials:"same-origin",cache:"no-store"}),
          fetch("/api/auth/workspaces", {credentials:"same-origin",cache:"no-store"}),
        ]);
        if (!live) return;
        if (details.status === 401 || list.status === 401) {
          router.replace("/sign-in"); return;
        }
        if (details.status === 404 || list.status === 404) {
          setStatus("denied"); return;
        }
        if (!details.ok || !list.ok) throw Error("Authorization failed");
        const data = await details.json() as Branch;
        const all = await list.json() as { workspaces?: AuthorizedWorkspace[] };
        const authorized = Array.isArray(all.workspaces) ? all.workspaces.find(ws =>
          ws.businessId === businessId && ws.branchId === branchId) : null;
        if (!authorized || data.businessId !== businessId || data.branchId !== branchId) {
          setStatus("denied"); return;
        }
        if (!live) return;
        setAccount(viewer);
        setBranch(data);
        setBusinessName(authorized.businessName);
        // A 200 response is required before exposing the management action.
        // Unauthorized or currently disabled role-administration stays hidden.
        const roleResult = await fetch(base + "/access/roles", {
          credentials:"same-origin",cache:"no-store",
        });
        if (!live) return;
        setCanManageMembers(roleResult.ok);
        const catalogResult=await fetch(base + "/catalog", {credentials:"same-origin",cache:"no-store"});
        if (!live) return;
        setCanViewCatalog(catalogResult.ok);
        const customersResult=await fetch(base + "/customers", {credentials:"same-origin",cache:"no-store"});
        if (!live) return;
        setCanViewCustomers(customersResult.ok);
        setStatus("ready");
      } catch {
        if (live) setStatus("error");
      }
    }
    void load();
    return () => { live = false; };
  },[router,businessId,branchId]);

  return <main className="k5-workspace">
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <nav className="k5-head-actions"><Link href="/workspaces">كل الفروع</Link>
        {account && <span dir="ltr">{account.username}</span>}</nav>
    </header>
    {status === "loading" && <p className="k5-table-state" role="status">جاري التحقق من صلاحية الفرع…</p>}
    {status === "denied" && <p className="k5-error" role="alert">الفرع غير متاح لحسابك أو غير موجود.</p>}
    {status === "error" && <p className="k5-error" role="alert">تعذر تحميل مساحة العمل. حاول مرة أخرى.</p>}
    {status === "ready" && branch && <>
      <div className="k5-page-title">
        <div>
          <span className="k5-eyebrow">BRANCH WORKSPACE</span>
          <h1>{branch.branchName}</h1>
          <p className="k5-muted">{businessName} · مساحة العمل الخاصة بالفرع المصرّح لك به.</p>
        </div>
        <div className="k5-branch-label"><strong>{businessName}</strong>
          <span>{branch.branchName}</span></div>
      </div>
      <section className="k5-admin-card k5-workspace-intro">
        <span className="k5-eyebrow">PLATFORM FOUNDATION</span>
        <h2>مساحة العمل جاهزة للربط بالموديولات</h2>
        <p className="k5-muted">المبيعات والمخزون والحسابات والموظفون هتظهر هنا بعد اكتمال الموديولات وتفعيلها. الوصول للفرع محمي بالصلاحيات الحالية.</p>
        {canViewCatalog && <Link href={"/workspace/" + encodeURIComponent(businessId) +
          "/" + encodeURIComponent(branchId) + "/catalog"} className="k5-verify-link">
          المنتجات والخدمات
        </Link>}
        {canViewCustomers && <Link href={"/workspace/" + encodeURIComponent(businessId) +
          "/" + encodeURIComponent(branchId) + "/customers"} className="k5-verify-link">
          العملاء
        </Link>}
        {canManageMembers && <Link href={"/workspace/" + encodeURIComponent(businessId) +
          "/" + encodeURIComponent(branchId) + "/access"} className="k5-verify-link">
          إدارة أعضاء وصلاحيات الفرع
        </Link>}
      </section>
    </>}
  </main>;
}
