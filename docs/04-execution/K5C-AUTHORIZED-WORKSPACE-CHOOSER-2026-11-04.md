# K5C — SQL-authorized workspace chooser (Staging feature OFF)

**2026-11-04.** This PR builds a small navigation slice, not an operational ERP.

## What it adds
- Authenticated users now land on `/workspaces` after login and required password change.
- The picker calls `GET /api/auth/workspaces` (current SQL-authorized BusinessMembership, BranchAssignment, BusinessRole and `branch.read`) and groups by **TenantId + BusinessId**, never by a client-supplied Business ID alone.
- The branch home `/workspace/:businessId/:branchId` re-authorizes using the existing `GET /api/workspaces/:businessId/branches/:branchId` and verifies the branch appears in current authorized workspace list.
- Member administration link is visible only after the existing `users.read` roles endpoint succeeds; Staff are not automatically sent to role administration.
- 401 sends user to sign-in; password-change requirement redirects to change-password; forbidden branch does not reveal its details.
- No stateful browser auth tokens; existing HttpOnly session stays the only authority.
- All new pages remain inaccessible unless `DRVO_K5_WEB_ENABLED=YES`, which must remain OFF until K5D Owner bootstrap is complete.
- CI adds tenant-aware grouping/invalid-scope tests and HTTP 404 smoke checks for the new private pages.

## NOT delivered
No Owner account, employee invitation, signup, customer Tenant, actual accounting,
POS, inventory or booking. No database migration, feature flag change, live SQL
writes or Production deployment. End-to-end live accounts need secure K5D
onboarding, manual SQL 004 Staging application and security review first.
