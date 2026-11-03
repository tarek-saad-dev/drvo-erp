"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  roleId: string;
  roleCode: string;
  displayName: string;
  actions: string[];
};
type Member = {
  accountId: string;
  username: string;
  roleId: string | null;
  roleCode: string | null;
};
type Workspace = {
  tenantId: string;
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
};
type Viewer = {
  accountId: string;
  username: string;
};

const MANAGED_ROLES = new Set(["MANAGER", "STAFF", "VIEWER"]);

export default function AccessClient({
  businessId,
  branchId,
}: { businessId: string; branchId: string }) {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [proposed, setProposed] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const root = "/api/workspaces/" + encodeURIComponent(businessId) +
    "/branches/" + encodeURIComponent(branchId) + "/access";

  const reload = useCallback(async () => {
    const [me, ws, roleReply, memberReply] = await Promise.all([
      fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/auth/workspaces", { credentials: "same-origin", cache: "no-store" }),
      fetch(root + "/roles", { credentials: "same-origin", cache: "no-store" }),
      fetch(root + "/members", { credentials: "same-origin", cache: "no-store" }),
    ]);
    if (me.status === 401 || ws.status === 401 ||
        roleReply.status === 401 || memberReply.status === 401) {
      router.replace("/sign-in");
      return;
    }
    if (!me.ok || !ws.ok || !roleReply.ok || !memberReply.ok) {
      setError("الحساب غير مصرح له بإدارة هذا الفرع، أو الخدمة غير متاحة حاليًا.");
      return;
    }
    const meData = await me.json() as Viewer;
    const wsData = await ws.json() as { workspaces: Workspace[] };
    const rolesData = await roleReply.json() as { roles: Role[] };
    const membersData = await memberReply.json() as { members: Member[] };
    setViewer(meData);
    setWorkspaces(wsData.workspaces);
    setRoles(rolesData.roles);
    setMembers(membersData.members);
    setProposed({});
    setError("");
  }, [root, router]);

  useEffect(() => {
    let live = true;
    // Callback always sets state after fetch; do not leak updates across unmount.
    const load = async () => {
      try {
        if (live) await reload();
      } catch {
        if (live) setError("تعذر تحميل بيانات الفرع.");
      } finally {
        if (live) setLoading(false);
      }
    };
    void load();
    return () => { live = false; };
  }, [reload]);

  async function saveRole(member: Member) {
    if (submitting) return;
    const roleId = proposed[member.accountId];
    if (!roleId || roleId === member.roleId) return;
    const option = roles.find(role => role.roleId === roleId && MANAGED_ROLES.has(role.roleCode));
    if (!option) return;
    setSubmitting(member.accountId);
    setError(""); setNotice("");
    try {
      const reply = await fetch(root + "/members/" + encodeURIComponent(member.accountId) + "/role", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (reply.status === 401) { router.replace("/sign-in"); return; }
      if (!reply.ok) {
        setError("التغيير اترفض. اتأكد إن صلاحياتك تسمح بمنح الدور المطلوب.");
        return;
      }
      setNotice("تم تحديث دور الموظف وتسجيل العملية. جلساته القديمة اتلغت.");
      await reload();
    } catch {
      setError("تعذر حفظ الدور بسبب مشكلة اتصال.");
    } finally {
      setSubmitting(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      router.replace("/sign-in");
    }
  }

  const current = workspaces.find(ws => ws.businessId === businessId && ws.branchId === branchId);
  const availableRoles = roles.filter(role => MANAGED_ROLES.has(role.roleCode));

  return <main className="k5-workspace">
    <header className="k5-workspace-header">
      <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
      <div className="k5-head-actions">
        {viewer && <span>{viewer.username}</span>}
        <button type="button" onClick={() => { void logout(); }}>تسجيل خروج</button>
      </div>
    </header>

    <div className="k5-page-title">
      <div>
        <span className="k5-eyebrow">BUSINESS ACCESS</span>
        <h1>أعضاء وصلاحيات الفرع</h1>
        <p className="k5-muted">إدارة حسابات الفرع الحالي فقط، حسب صلاحيات دورك.</p>
      </div>
      <div className="k5-branch-label">
        <strong>{current?.businessName ?? "الشركة"}</strong>
        <span>{current?.branchName ?? "الفرع الحالي"}</span>
      </div>
    </div>

    {workspaces.length > 1 && <nav className="k5-branch-tabs" aria-label="اختيار فرع مصرح به">
      {workspaces.map(ws => <button key={ws.branchId} type="button"
        aria-current={ws.businessId === businessId && ws.branchId === branchId ? "page" : undefined}
        className={ws.businessId === businessId && ws.branchId === branchId ? "selected" : ""}
        onClick={() => router.push("/workspace/" + encodeURIComponent(ws.businessId) +
          "/" + encodeURIComponent(ws.branchId) + "/access")}>
        {ws.businessName} · {ws.branchName}
      </button>)}
    </nav>}

    {error && <p className="k5-error" role="alert">{error}</p>}
    {notice && <p className="k5-notice" role="status">{notice}</p>}
    {loading ? <div className="k5-table-state">جاري تحميل الصلاحيات…</div> :
      <section className="k5-admin-card" aria-labelledby="k5-members-title">
        <div className="k5-admin-summary">
          <div><h2 id="k5-members-title">أعضاء الفرع</h2>
            <p className="k5-muted">كل تغيير في الدور يتم تدقيقه وتسجيله.</p></div>
          <span className="k5-count">{members.length} أعضاء</span>
        </div>
        <div className="k5-table-wrap">
          <table className="k5-table">
            <thead><tr><th>اسم المستخدم</th><th>الدور الحالي</th><th>تعديل الدور</th><th>إجراء</th></tr></thead>
            <tbody>
              {members.map(member => {
                const own = member.accountId.toLowerCase() === viewer?.accountId.toLowerCase();
                const protectedRole = !member.roleCode || !MANAGED_ROLES.has(member.roleCode);
                const disabled = own || (Boolean(member.roleId) && protectedRole);
                const choice = proposed[member.accountId] ?? member.roleId ?? "";
                return <tr key={member.accountId}>
                  <td dir="ltr">{member.username}</td>
                  <td><span className="k5-role">{member.roleCode ?? "بدون دور"}</span></td>
                  <td>
                    <select aria-label={"دور " + member.username} disabled={disabled}
                      value={choice} onChange={e => setProposed(prev => ({
                        ...prev, [member.accountId]: e.target.value,
                      }))}>
                      <option value="">اختار الدور</option>
                      {availableRoles.map(role =>
                        <option key={role.roleId} value={role.roleId}>{role.displayName}</option>)}
                      {member.roleId && !availableRoles.some(role => role.roleId === member.roleId) &&
                        <option value={member.roleId}>دور محمي — غير قابل للتعديل</option>}
                    </select>
                  </td>
                  <td><button type="button" className="k5-save" disabled={disabled ||
                    !choice || choice === member.roleId || submitting !== null}
                    onClick={() => { void saveRole(member); }}>
                    {submitting === member.accountId ? "جاري الحفظ…" : own ? "حسابك" : "حفظ"}
                  </button></td>
                </tr>;
              })}
              {!members.length && <tr><td colSpan={4} className="k5-empty">لا يوجد أعضاء في الفرع.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}
    <p className="k5-footnote">إدارة الـOwner وإنشاء حسابات جديدة تتم من مسار التفعيل الآمن، وليس من هذه الشاشة.</p>
  </main>;
}
