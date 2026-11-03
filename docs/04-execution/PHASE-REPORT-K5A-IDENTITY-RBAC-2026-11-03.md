# K5A — DRVO ERP Identity & RBAC foundation

**Date:** 2026-11-03. **Scope:** staged first K5 implementation; not full K5 acceptance and not live customer-ready authentication.

## Delivered
- SQL forward migration `db/migrations/002_identity_sessions_and_roles.sql` adds `core.AccountCredential`, `core.AuthSession`, `core.BusinessRole`, `core.RolePermission`, `core.BranchRole`, `core.LoginThrottle` and `core.SecurityAudit`, anchored to existing K4 tenant/business/branch composite FKs.
- Globally unique username remains K4's existing constraint; login resolves Tenant via the SQL Account row, never a client-supplied Tenant value.
- Passwords stored as salted 64-byte `scrypt-v1` hashes, not plaintext; configurable upgrade/rehash work remains before broad launch.
- Random opaque 32-byte tokens stored only as SHA-256 digests in SQL. HTTP uses `__Host-drvo-session` cookies with `Secure; HttpOnly; SameSite=Strict`; sessions expire after 12h and are revocable immediately. Password change increments `SessionVersion` and revokes all sessions.
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/change-password` and one read-only `GET /api/workspaces/:businessId/branches/:branchId` proof are implemented. Unsafe methods require exact configured HTTPS Origin. Sensitive responses use `Cache-Control: no-store`.
- An SQL-based account-name throttle blocks after 8 failed logins per 15 minutes. Cross-process IP/ASN controls and CAPTCHA/abuse detection are **not yet** implemented, so public rollout is still gated.
- Branch read authorization checks current Tenant and Account status, explicit BusinessMembership, BranchAssignment, exactly one active BranchRole, active BusinessRole and matching action in RolePermission. Missing authorization fails closed and returns indistinguishable 404 for resource access.
- All customer-facing K5 auth routes are **OFF by default** until `DRVO_K5_AUTH_ENABLED=YES` is intentionally configured. Code merge does NOT enable it.
- Existing runtime SQL account retains no DDL privileges; a separate one-time root-shell K5 migration script uses existing SQL Admin temporarily and grants explicit per-table/column privileges. No new SQL account is created or stored in GitHub Actions.

## Evidence — real disposable SQL Server, no VPS writes
- `K5 Identity & RBAC SQL HTTP CI`: **15 integration checks PASSED** against a disposable SQL Server 2022 container and a real NestJS process. It verified migration apply/replay, hashed credentials, token expiry/revocation, Tenant/Business/Branch/action isolation, role and membership revocation, password reset, login throttling, HTTP cookie attributes, Origin validation and production K3 proof denial.
- K5 operator proof runs the **exact guarded backup/restore/DDL/grant script** against a separate disposable SQL container. Pre/post COPY_ONLY checksum backup + independent restore, K5 migration/replay and selective app grants **PASSED**.
- K0, K1, K3, K4, Staging DevOps Artifact CI all **SUCCESS**. Existing K4 one-time verification remains pinned to its original 001 migration, so older CI keeps passing.
- No real account, business, customer data, public onboarding, real payment, or SQL migration on VPS was created by GitHub CI.

## What must happen next
1. After this PR is merged and GitHub code deploy is green, run the new [K5A one-time VPS migration script](../../ops/staging/K5A-ONE-TIME.md) locally with the existing hidden SQL Admin password. GitHub forced-command SSH deploy has **no** ability to perform SQL Admin DDL.
2. Agree ADR-030 complete privilege matrix, Owner/bootstrap, Manager non-escalation, support break-glass and sensitive-domain policy before customer access.
3. K5B: authenticated Owner/bootstrap and self-registration with verified email, employee invitations and first-login credential rotation; delegated Manager creation with non-escalation; RBAC admin APIs and audit, recovery via verified email OTP, IP-based distributed rate limits, CSRF/origin and session penetration tests, production support policy.
4. K5C: connect responsive Next.js signup/login/workspace screens and real tenant management to protected APIs, plus negative tests for exports, jobs, files, cache and future financial Modules.
5. Restrict public staging for any non-synthetic data; implement off-host backup rotation and actual alerting.

**Status:** K5A code/CI accepted after PR tests. **K5 full phase remains OPEN.** The operational K5 SQL migration and public auth activation have not been performed by this report.
