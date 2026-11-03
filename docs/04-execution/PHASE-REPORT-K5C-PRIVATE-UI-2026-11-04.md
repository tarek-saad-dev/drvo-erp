# DRVO ERP — K5C private UI slice: login and branch access

**Date:** 2026-11-04
**Scope:** UI and SQL-derived workspace navigation, **NOT public onboarding or full K5 signoff**.

## Delivered
- Server-gated Next.js routes `/sign-in`, `/change-password` and `/workspace/:businessId/:branchId/access` share the RTL responsive DRVO ERP UI.
- The exact server-side environment variable `DRVO_K5_WEB_ENABLED=YES` is required to render any of these routes. Omitted/any other value returns 404. **No change to the current staging service config or public site is authorized by this PR.**
- The browser uses same-origin `/api/auth/login`, `/api/auth/me`, `/api/auth/workspaces`, `/api/auth/change-password`, `/api/auth/logout` and K5B `access/roles,members`. Token is stored in a `Secure; HttpOnly; SameSite=Strict` cookie by NestJS, not passed to React or stored in localStorage.
- First-login password rotation redirects to `/change-password` and requires reauthentication after session invalidation.
- Branch access UI lists active scoped members and Role permissions, provides a constrained `roleId` only role-assignment action, omits Owner from editable choices and always respects backend enforcement.
- New authenticated `GET /api/auth/workspaces` derives each navigable Business/Branch from active `core.Account`, Tenant, Membership, Assignment, Role and current `branch.read` permission. Caller cannot supply a Tenant ID to expand the result.
- Workspace navigation and member management are API-authorized; UI hiding is never relied upon for permission checks.

## Verification
- Next.js 16 release build and TypeScript typecheck via DevOps Staging Artifact CI.
- Real SQL Server K5B integration now checks `listAuthorizedWorkspaces` and `GET /api/auth/workspaces` scope, including an actor whose role has no `branch.read`, and foreign branches.
- K0/K1/K3/K5/K5B regression CI.
- No actual Owner user, Business or customer record was created on the VPS by these tests; they use disposable CI databases.

## Operational status
**PRIVATE AND DISABLED** until verified-email Owner bootstrap, recovery, invitation acceptance, full RBAC matrix and IP-based anti-abuse are approved. Do not add `DRVO_K5_WEB_ENABLED=YES` or `DRVO_K5_AUTH_ENABLED=YES` to public staging solely because this UI exists. K5B migration `003` still requires an authorized manual `staging-db-migrate.yml` run on GitHub before its new ledger can be used.

## Next phase
Email-based verified Owner onboarding, backend invitation lifecycle and safe first-owner provisioning, audit/recovery, IP+username abuse controls, explicit ADR-030 authorization sign-off, full end-to-end customer onboarding smoke and off-site backup procedures.
