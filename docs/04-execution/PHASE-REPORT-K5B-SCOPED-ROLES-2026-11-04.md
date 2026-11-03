# DRVO ERP — K5B Slice 1: Scoped Role Administration

**Date:** 2026-11-04
**Delivery:** reviewed API/SQL implementation + isolated SQL/HTTP verification.
**Status:** K5B scoped role administration **code ready after CI/merge**; **NOT full K5, NOT enabled on VPS, NOT customer-ready**.

## Scope delivered
- New forward-only `003_branch_role_change_audit.sql` adds a foreign-key-backed `core.BranchRoleChangeAudit` with actor, target, old/new Role and Branch scope. It grants only `INSERT` to the audit ledger, `INSERT` on `BranchRole`, and column-limited `UPDATE(RoleId,IsActive)` on `BranchRole` to existing stage application SQL identity `drvo_erp_stage_app`. No ability to edit role definitions or create an Account is added.
- `GET /api/workspaces/:businessId/branches/:branchId/access/roles`: current authenticated account + explicit `users.read` Branch permission, returns roles and action codes inside its Business only.
- `GET .../access/members`: the same protection; returns only active accounts with active BusinessMembership and BranchAssignment for the requested Branch, including existing active roles.
- `POST .../access/members/:accountId/role`: requires current opaque session, exact configured HTTPS Origin, strict body (only `roleId`), `users.assign_role` on requested Branch. Mutation happens in one SERIALIZABLE transaction after checking current session, account, business, branch, explicit memberships, grants and both Role records.
- No delegated Owner role creation or Owner reassignment. Only existing non-Owner BusinessRole codes `MANAGER`, `STAFF`, `VIEWER` may be assigned. A user cannot assign their own role. All requested action grants MUST be a subset of the actor's current RolePermission set; revoked membership, role or permission fails closed.
- Success atomically updates BranchRole, inserts BranchRoleChangeAudit, increments target Account.SessionVersion and revokes target sessions. No-op assignments write no audit rows and preserve sessions.
- API requires **both** `DRVO_K5_AUTH_ENABLED=YES` and `DRVO_K5_ROLE_ADMIN_ENABLED=YES`. Both remain OFF by default. No account or role seeded to the VPS; only the dedicated SQL migration creates audit schema.

## Isolated evidence
The `K5B Scoped Role Administration SQL HTTP CI` workflow executes SQL Server 2022 in a disposable runner container and starts a real NestJS API with SQL-backed auth. **15/15 tests PASS**:
1. Forward-only SQL 001–003 apply + idempotent replay.
2. users.read role/member catalogue isolation.
3. No self-promotion.
4. Staff without users.assign_role cannot manage roles.
5. Manager cannot assign Owner.
6. Manager cannot demote Owner.
7. Actor cannot delegate actions not held.
8. Cross-Tenant, cross-Business and cross-Branch target denial.
9. Revoked membership denial.
10. Real Manager-to-Viewer assignment with atomic audit and target session revocation.
11. Idempotent role reassign doesn't duplicate audit or logout.
12. Permission revocation immediately affects next protected write.
13. App SQL login cannot create accounts, permissions, roles or DDL.
14. HTTP rejects missing session, forged scope, extra body and wrong Origin.
15. HTTP approved mutation and independent feature-off check.

Existing K5A testing stays pinned to historical migrations 001+002. Code deploy from merge does NOT run SQL migrations.

## Operational activation
After code PR merge, the reviewer/operator must **manually run** the already-proven [GitHub Staging SQL Migrations](https://github.com/tarek-saad-dev/drvo-erp/actions/workflows/staging-db-migrate.yml) with branch `main` and exact confirmation `DRVO_ERP_STAGING`. Expected:
```text
PASS: pre-migration COPY_ONLY checksum backup: ...
APPLIED: 003_branch_role_change_audit.sql
DRVO DB MIGRATION PASS: 1 applied; 3 total; commit ...
```
First run applying 003 writes schema/permissions **only to DRVO_ERP_STAGING**. The restricted migration account deliberately cannot perform independent restore every run; off-VPS backup and regular recovery tests are still OPEN. No public auth should be enabled yet.

## Next K5 gates
- Email-verified first Owner bootstrap with no implicit global rights, recovery and safe idempotency.
- Employee invitation/acceptance, email possession verification, first-login forced password change.
- Reviewed Owner and Manager permission templates/role seed policies; two-person approval for sensitive escalation.
- App rate limits per IP + identifier, audit retention, recovery controls, backend/worker cache isolation proof and Next.js UI.
- Security owner signoff on ADR-030 and negative isolation matrix.
- Offsite backup retention and restore rotation before handling real tenant/customer data.

K5B slice 1 is not an assertion that invitations, Owner bootstrap or customer access are working.
