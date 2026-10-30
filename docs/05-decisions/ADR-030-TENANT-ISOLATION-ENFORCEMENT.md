# ADR-030 — Tenant/Business/Branch Isolation Enforcement Contract (Proposed)

**Date:** 2026-10-30
**Status:** **PROPOSED — AWAITING FOUNDER AND SECURITY/ARCHITECTURE SIGN-OFF.** Approval to study/document Tenant Isolation is NOT approval of specific SQL/RLS implementation.
**Priority:** **P0 pre-code blocker FND-01/FND-10.**
**Related:** ADR-029 [Founder's Three Pillars](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md); approved Identity Allow-only Default Deny; accepted Tenancy hierarchy; proposed [Isolation Contract](../02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md) and [40-Test Negative Matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md).

## Problem
A shared SQL Server and one Modular Monolith serve unrelated Tenants and multiple Businesses/Branches per Tenant. Data access can leak across HTTP handlers, direct IDs, joins, API roles, background jobs, outbox/inbox, cache, search indexes, file exports, theme assets and privileged support tools. Frontend UI module visibility alone cannot enforce privacy. Large enterprise isolation must not demand a custom code fork.

## Accepted higher-level decisions — not new approvals
- Tenant → Business → Branch. Business has independent books, active Modules, locale/theme. Tenant isolation and Business/Branch access are mandatory.
- Platform-wide username uniqueness and resolved account Tenant, explicit Business Membership even for Owner, one Role per Branch, Allow-only + Default Deny, Manager profit within authorized scope.
- V1 one shared SQL Server, later pools/dedicated tenant placements only based on evidence.
- ADR-015/016/029 require per-Business Module activation, full dependency/price consent and reusable scalable platform.

## Proposed implementation-neutral ruling for review
1. Every protected command/query/event/report/file read is bound to a **trusted authenticated/service execution context** containing immutable Tenant and validated Business/Branch scope; no client-supplied scope grants permissions.
2. Every data owner declares **scope class** and applies an authorization intersection (identity + active membership + action Allow + resource ancestry + module entitlement as needed + sensitivity policy); omission and stale revocation fail closed.
3. SQL schema enforces Tenant/Business/Branch parent-child and cross-owned FK referential consistency, while domain/repository methods restrict operations to authorized scoped predicates. Globally unique IDs do **not** authorize by themselves.
4. Background consumers, cache/search/exports/storage/support tools enforce the SAME boundary; event provenance and service identity are verified. User-supplied event fields cannot establish authority.
5. Safe cross-Branch transfers and Tenant-level read-only consolidation are distinct authorized domain workflows, not implicit unscoped joins.
6. Future Tenant placement and enterprise migration preserve ownership, audit, idempotency, money and data recovery without requiring separate industry codebases.

These are **recommendations for security sign-off**, not an accepted SQL schema, RLS selection or completed implementation.

## Alternatives that require explicit choice
- **Physical FK layout:** composite scoped FK/unique constraints versus alternate SQL designs with equivalent isolation proofs. Candidate composite Tenant/Business/Branch keys are recommended for review; performance/index costs must be measured.
- **SQL Server Row-Level Security:** evaluate as defense-in-depth versus strong application scope + relational guarantees initially. RLS adds benefits and pooled-session/service-principal risks; cannot replace endpoint authorization and may be adopted per table/security zone after tests.
- **Business-scope grants and Tenant Owner bootstrap:** exact membership, escalation, cross-Business report authorization and sensitive support access process remains open. No automatic unrestricted Owner/support account allowed.
- **Async jobs and revocation:** permission snapshot vs current access for user-requested exports, distinguishing previously committed irreversible financial obligations from newly requested work.
- **Future multi-pool placement:** architectural routing seam now, actual deployment only with measured scale/regulatory triggers.

## P0 acceptance before coding/production
- Explicitly approve the key enforcement choices and permission matrix, resource table ownership and event/worker/cache contract.
- Execute the [Negative Matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md) **after** separate founder authorization for implementation/tests; document all failures and independently review.
- No “secure,” “isolated,” “enterprise-ready” certification from a document alone.

## Founder decision requested (not presumed)
Approve the **baseline enforcement architecture**: trusted server-side scope + default-deny RBAC + owner-scoped repository/SQL predicates + parent/child referential integrity + all non-HTTP boundaries + negative tests; then review physical composite FK and optional SQL Server RLS specifically. This ADR should change to ACCEPTED only after explicit founder confirmation.

**Status at 2026-10-30:** awaiting approval; no code, SQL migration, tests, VPS activity or production changes.
