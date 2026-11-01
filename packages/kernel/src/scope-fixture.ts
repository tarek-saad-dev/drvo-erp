import type { ScopedResource, VerifiedScopeFixture } from "../../contracts/src/index";

/**
 * Demonstration of ownership ancestry matching only.
 * Not authorization: caller trust, action/role grants, current membership,
 * entitlement, object sensitivity and persistence checks are NOT implemented.
 * ADR-030 must be signed before using a real authenticated request.
 */
export function fixtureMatchesResourceScope(
  fixture: VerifiedScopeFixture | null | undefined,
  resource: ScopedResource | null | undefined,
): boolean {
  if (!fixture || !resource || !isId(fixture.tenantId) || !isId(resource.tenantId)) {
    return false;
  }
  if (fixture.tenantId !== resource.tenantId) return false;

  if (resource.scope === "tenant") return true;
  if (!isId(fixture.businessId) || !isId(resource.businessId)) return false;
  if (fixture.businessId !== resource.businessId) return false;

  if (resource.scope === "business") return true;
  if (resource.scope !== "branch") return false;
  return isId(fixture.branchId) && isId(resource.branchId)
    && fixture.branchId === resource.branchId;
}

function isId(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}
