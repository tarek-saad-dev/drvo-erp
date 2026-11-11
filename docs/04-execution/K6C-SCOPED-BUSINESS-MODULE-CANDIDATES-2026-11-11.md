# K6C — Read-only scoped Business Module Candidates: review & acceptance

**Date:** 2026-11-11  
**Status:** Feature branch / PR review; **NOT migrated or activated on the VPS**.  
**Architecture authorization:** Founder accepted **ADR-030 baseline only** (server-issued trusted Tenant/Business/Branch identity, Allow-only/Default Deny, scoped predicates + composite referential integrity and negative isolation tests). **RLS remains undecided**. **ADR-032 module activation, pricing/entitlements and release eligibility remain PROPOSED.**

## Why this is the first real (but disabled) vertical slice

Reuses the **existing K5 authenticated session** and active Branch membership/RBAC to read **non-authoritative Business-scoped candidate metadata** from a SQL table, not from a developer fixture. Does not allow activated, published, entitled or eligible Module claims. No customer account creation, price, payment, enable/disable/upgrade or manifest seeding.

## API and trust boundary

- `GET /api/workspaces/:businessId/branches/:branchId/modules/candidates`.
- Requires **both** `DRVO_K5_AUTH_ENABLED=YES` and `DRVO_K6C_CATALOG_READ_ENABLED=YES`; both default to OFF in the deployed configuration. **Do not turn either on while K5 security gates remain open.**
- Extracts the existing `__Host-drvo-session` HttpOnly cookie and resolves the actor with the existing `IdentityService.actorFromToken`. Client never supplies TenantId, AccountId, role or SessionVersion.
- Service hashes the server-verified session token; sends only typed parameters to the fixed SQL `core.ReadBusinessModuleCandidates` stored procedure.
- SQL procedure **revalidates the very same live, unrevoked/unexpired token**, current `Account.SessionVersion`, active Tenant/Business/Branch, Business Membership, Branch Assignment, Branch Role, RolePermission(`branch.read`) and mandatory credential-change gate. Its serializable read transaction holds the authorization boundary stable while reading, and resets isolation before returning.
- Query filters both **TenantId AND BusinessId** and uses composite `core.Business` ancestry; no direct client-driven Tenant query. Rejected scope is mapped to 404 to avoid leaking Business existence, unauthorized/no cookie is 401, disabled flag is 503. Response is `Cache-Control: no-store`.
- `POST` and all mutations are absent. No frontend tile/URL or external catalog publication.

## SQL and permissions (proposal only)

- `db/migrations/010_business_module_candidate_registry.sql`: additive `core.BusinessModuleCandidate` keyed by `(TenantId, BusinessId, ModuleKey)` with a composite FK to `core.Business`, no prefilled data; a query-only procedure with **static same-owner SQL ownership chaining** (no caller impersonation) with current-session RBAC checks.
- The existing staging app principal `drvo_erp_stage_app` gets **EXECUTE on the fixed scoped procedure ONLY**, with explicit direct SELECT/INSERT/UPDATE/DELETE DENY on the table. The migration does not grant ownership, public login or unscoped catalog reads.
- **Not authorized for VPS execution**. The old K5F root-owned readiness checker expects **exactly migrations 001–009**, so applying 010 before a separately reviewed K5F checker/runtime-bundle update would make K5F readiness fail. Do **not** run any staging DB migration workflow for this PR or use a manual SQL tool on the VPS.
- The K5D historical onboarding CI was explicitly pinned to its own 001–009 migration subset to keep old security assertions stable while the new K6C isolated SQL test applies 001–010 in **disposable CI only**.

## Verification plan and security cases

`tools/k6c/verify.cjs` uses a throwaway SQL Server 2022 in GitHub Actions only; creates synthetic T1/B1/Branch1, T1/B2 and T2/B3 fixtures, distinct sessions and candidate rows. Exercises:
- Additive migration checksum/replay; no pre-seeded catalog
- Candidate FK rejects cross-Tenant/Business; SQL runtime principal cannot directly SELECT/UPDATE candidate rows but can EXECUTE the reviewed procedure
- Forged/missing token rejected inside SQL, even with known IDs
- Real NestJS HTTP 401 for missing session; 200 for exact active branch; only own Business catalog rows returned
- 404 for same-Tenant unauthorized Business, foreign Tenant, unauthorized Branch and malformed scope, and no HTTP POST mutation
- SQL revocation of role action and Business membership denies subsequent reads; revoked session returns 401
- API unit tests prove flag-off, invalid inputs and sanitized errors fail closed

**Acceptance requires verified passing CI on exact PR head.** The tests are a **bounded K6C slice**, NOT proof of the entire ISO-001..040 matrix, performance/load, offsite restoration, Nginx real-IP checks or K5 closeout.

## Impact / rollback / next review

- **Architecture:** Lean Kernel retains trusted scope governance; this is a narrow private read model, with no Business Module domain ownership or payment changes. SQL procedure rechecks scoped authorization; global released-module registry is **not** approved by this catalog.
- **Changed areas:** `apps/api/src/modules`, AppModule provider/controller wiring, `db/migrations/010...`, `apps/api/test`, `tools/k6c`, K6C CI workflow, historical K5D test pin and synchronized ADR/roadmap/state/changelog/docs.
- **No deployment requested:** no flags, real emails, accounts or SQL migrations on VPS; CI operates only on an isolated GitHub runner. GitHub merge may trigger a staging *code* deploy workflow; it is not schema approval or public activation.
- **Rollback before migration:** revert PR; no data rollback. **After future authorized migration**: forward-only corrective migration plan and independent backup/restore review required; never silently drop candidate records.
- **Next decisions:** security review of static SQL ownership chaining and no owner impersonation and isolation test coverage; evaluate deferred RLS/pool isolation. Obtain separate ADR-032 approval before actual module activation, entitlements, prices or Business-selected configuration.
