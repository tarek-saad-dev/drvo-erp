"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
type Invitation = {
  invitationId: string;
  roleId: string;
  roleCode: string;
  issuedAtUtc: string;
  expiresAtUtc: string;
  status: "PENDING" | "EXPIRED" | "REVOKED" | "ACCEPTED";
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState("");
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [invitesEnabled, setInvitesEnabled] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const root = "/api/workspaces/" + encodeURIComponent(businessId) +
    "/branches/" + encodeURIComponent(branchId) + "/access";

  const reload = useCallback(async () => {
    const [me, ws, roleReply, memberReply, inviteReply] = await Promise.all([
      fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/auth/workspaces", { credentials: "same-origin", cache: "no-store" }),
      fetch(root + "/roles", { credentials: "same-origin", cache: "no-store" }),
      fetch(root + "/members", { credentials: "same-origin", cache: "no-store" }),
      fetch(root + "/invitations", { credentials: "same-origin", cache: "no-store" }),
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
    if (inviteReply.ok) {
      const inviteData = await inviteReply.json() as { invitations: Invitation[] };
      setInvites(Array.isArray(inviteData.invitations) ? inviteData.invitations : []);
      setInvitesEnabled(true);
    } else {
      setInvites([]);
      setInvitesEnabled(false);
    }
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

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviting || !inviteEmail.trim() || !inviteRoleId) return;
    setInviting(true);
    setInviteResult("");
    try {
      const reply=await fetch(root + "/invitations", {
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email:inviteEmail.trim(),roleId:inviteRoleId}),
      });
      if (reply.status===401) {router.replace("/sign-in");return;}
      if (!reply.ok) {
        setInviteResult("تعذر إرسال الدعوة. راجع الدور وصلاحياتك أو تواصل مع الإدارة.");
        return;
      }
      setInviteEmail("");
      setInviteRoleId("");
      setInviteResult("تم قبول الدعوة للإرسال. لازم الموظف يفعّلها من رابط الإيميل.");
      await reload();
    } catch {
      setInviteResult("تعذر الاتصال بخدمة الدعوات.");
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (revoking || !invitesEnabled) return;
    setRevoking(invitationId);
    setInviteResult("");
    try {
      const reply = await fetch(root + "/invitations/" +
        encodeURIComponent(invitationId) + "/revoke", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (reply.status === 401) { router.replace("/sign-in"); return; }
      if (!reply.ok) {
        setInviteResult("تعذر إلغاء الدعوة. ربما تم قبولها أو فقدت صلاحية الإدارة.");
        return;
      }
      await reload();
      setInviteResult("تم إلغاء الرابط السابق. لإعادة الدعوة، اكتب الإيميل وأرسل دعوة جديدة.");
    } catch {
      setInviteResult("تعذر الاتصال بخدمة إلغاء الدعوة.");
    } finally {
      setRevoking(null);
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
        <Link href="/workspaces">كل الفروع</Link>
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
          "/" + encodeURIComponent(ws.branchId))}>
        {ws.businessName} · {ws.branchName}
      </button>)}
    </nav>}

    {error && <p className="k5-error" role="alert">{error}</p>}
    {!loading && !error && invitesEnabled && availableRoles.length > 0 && <section className="k5-admin-card k5-invite-card">
      <h2>دعوة موظف جديد</h2>
      <p className="k5-muted">ادعُ موظفًا ببريده الإلكتروني وحدد دوره في الفرع الحالي فقط. إرسال الدعوة يتطلب صلاحية إدارة الأدوار وتفعيل خدمة الإيميل.</p>
      <form className="k5-invite-form" onSubmit={e => { void sendInvitation(e); }}>
        <label htmlFor="invite-email">بريد الموظف</label>
        <input id="invite-email" type="email" dir="ltr" maxLength={254}
          autoComplete="off" required value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)} placeholder="staff@example.com" />
        <label htmlFor="invite-role">الدور</label>
        <select id="invite-role" required value={inviteRoleId}
          onChange={e => setInviteRoleId(e.target.value)}>
          <option value="">اختر دور الموظف</option>
          {availableRoles.map(role => <option key={role.roleId} value={role.roleId}>
            {role.displayName}
          </option>)}
        </select>
        <button type="submit" className="k5-save" disabled={inviting || !inviteRoleId}>
          {inviting ? "جاري الإرسال…" : "إرسال الدعوة"}
        </button>
      </form>
      {inviteResult && <p role="status" className="k5-footnote">{inviteResult}</p>}
      {invites.length > 0 && <div className="k5-table-wrap">
        <table className="k5-table">
          <thead><tr>
            <th>الدعوة</th><th>الدور</th><th>الحالة</th>
            <th>تاريخ الإصدار</th><th>الإجراء</th>
          </tr></thead>
          <tbody>{invites.map(invite => <tr key={invite.invitationId}>
            <td dir="ltr" title={invite.invitationId}>
              {invite.invitationId.slice(0, 8)}…
            </td>
            <td>{invite.roleCode}</td>
            <td>{invite.status === "PENDING" ? "معلّقة" :
              invite.status === "ACCEPTED" ? "تم التفعيل" :
              invite.status === "EXPIRED" ? "منتهية" : "ملغاة"}</td>
            <td>{new Date(invite.issuedAtUtc).toLocaleString("ar-EG", {
              timeZone:"Africa/Cairo",dateStyle:"short",timeStyle:"short",
            })}</td>
            <td><button type="button" className="k5-save"
              disabled={invite.status !== "PENDING" || revoking !== null}
              onClick={() => { void revokeInvitation(invite.invitationId); }}>
              {revoking === invite.invitationId ? "جاري الإلغاء…" : "إلغاء الدعوة"}
            </button></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p className="k5-footnote">لأمان الموظفين، الإيميلات والروابط لا تظهر في القائمة. بعد إلغاء دعوة، يمكن إرسال رابط جديد للإيميل من النموذج.</p>
    </section>}

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
