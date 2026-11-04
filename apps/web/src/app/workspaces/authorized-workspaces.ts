// Only display server-issued, current SQL-authorized branch scopes.
// This is a UI normalizer, NOT an authorization mechanism: APIs must enforce
// live Tenant/Business/Branch permissions on every request.
export type Workspace = {
  tenantId: string;
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
};
export type BusinessGroup = { tenantId: string; id: string; name: string; branches: Workspace[] };

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function groupsFromAuthorizedWorkspaces(value: unknown): BusinessGroup[] {
  if (!Array.isArray(value)) return [];
  const grouped = new Map<string, BusinessGroup>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const ws = raw as Record<string, unknown>;
    if (typeof ws.tenantId !== "string" || !GUID.test(ws.tenantId) ||
        typeof ws.businessId !== "string" || !GUID.test(ws.businessId) ||
        typeof ws.branchId !== "string" || !GUID.test(ws.branchId) ||
        typeof ws.businessName !== "string" || typeof ws.branchName !== "string") continue;
    const row: Workspace = {
      tenantId: ws.tenantId, businessId: ws.businessId,
      businessName: ws.businessName, branchId: ws.branchId,
      branchName: ws.branchName,
    };
    const key = row.tenantId + ":" + row.businessId;
    let group = grouped.get(key);
    if (!group) {
      group = { tenantId: row.tenantId, id: row.businessId,
        name: row.businessName, branches: [] };
      grouped.set(key, group);
    }
    if (!group.branches.some(b => b.branchId === row.branchId)) group.branches.push(row);
  }
  return Array.from(grouped.values());
}
