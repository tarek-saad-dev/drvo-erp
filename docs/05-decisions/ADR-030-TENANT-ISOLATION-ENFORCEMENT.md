# ADR-030 — Tenant/Business/Branch Isolation Enforcement Contract

**Date:** 2026-10-30
**Status:** **FOUNDER-ACCEPTED BASELINE (2026-11-11)** — trusted server-side Tenant/Business/Branch scope, Allow-only / Default Deny, scoped SQL predicates with parent/child referential integrity, and negative Tenant isolation tests. **Physical RLS choice, extra privilege policies and full implementation/security acceptance remain OPEN.** This is not an approval to apply migrations to VPS, activate public auth, or claim enterprise security certification.
**Priority:** **P0 pre-code blocker FND-01/FND-10.**
**Related:** ADR-029 [Founder's Three Pillars](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md); approved Identity Allow-only Default Deny; accepted Tenancy hierarchy; proposed [Isolation Contract](../02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md) and [40-Test Negative Matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md).

## Problem
A shared SQL Server and one Modular Monolith serve unrelated Tenants and multiple Businesses/Branches per Tenant. Data access can leak across HTTP handlers, direct IDs, joins, API roles, background jobs, outbox/inbox, cache, search indexes, file exports, theme assets and privileged support tools. Frontend UI module visibility alone cannot enforce privacy. Large enterprise isolation must not demand a custom code fork.

## Accepted higher-level decisions — not new approvals
- Tenant → Business → Branch. Business has independent books, active Modules, locale/theme. Tenant isolation and Business/Branch access are mandatory.
- Platform-wide username uniqueness and resolved account Tenant, explicit Business Membership even for Owner, one Role per Branch, Allow-only + Default Deny, Manager profit within authorized scope.
- V1 one shared SQL Server, later pools/dedicated tenant placements only based on evidence.
- ADR-015/016/029 require per-Business Module activation, full dependency/price consent and reusable scalable platform.

## Accepted implementation-neutral baseline (2026-11-11)
1. Every protected command/query/event/report/file read is bound to a **trusted authenticated/service execution context** containing immutable Tenant and validated Business/Branch scope; no client-supplied scope grants permissions.
2. Every data owner declares **scope class** and applies an authorization intersection (identity + active membership + action Allow + resource ancestry + module entitlement as needed + sensitivity policy); omission and stale revocation fail closed.
3. SQL schema enforces Tenant/Business/Branch parent-child and cross-owned FK referential consistency, while domain/repository methods restrict operations to authorized scoped predicates. Globally unique IDs do **not** authorize by themselves.
4. Background consumers, cache/search/exports/storage/support tools enforce the SAME boundary; event provenance and service identity are verified. User-supplied event fields cannot establish authority.
5. Safe cross-Branch transfers and Tenant-level read-only consolidation are distinct authorized domain workflows, not implicit unscoped joins.
6. Future Tenant placement and enterprise migration preserve ownership, audit, idempotency, money and data recovery without requiring separate industry codebases.

**Founder accepted these six implementation-neutral invariants as the baseline on 2026-11-11.** This does NOT approve a universal SQL schema, RLS, unrestricted Support access, exact worker/event mechanics or completed isolation evidence. K6C may implement a narrow, tested, opt-in read-only Business candidate-list slice on a review branch.

## Alternatives that require explicit choice
- **Physical FK layout:** composite scoped FK/unique constraints versus alternate SQL designs with equivalent isolation proofs. Candidate composite Tenant/Business/Branch keys are recommended for review; performance/index costs must be measured.
- **SQL Server Row-Level Security:** evaluate as defense-in-depth versus strong application scope + relational guarantees initially. RLS adds benefits and pooled-session/service-principal risks; cannot replace endpoint authorization and may be adopted per table/security zone after tests.
- **Business-scope grants and Tenant Owner bootstrap:** exact membership, escalation, cross-Business report authorization and sensitive support access process remains open. No automatic unrestricted Owner/support account allowed.
- **Async jobs and revocation:** permission snapshot vs current access for user-requested exports, distinguishing previously committed irreversible financial obligations from newly requested work.
- **Future multi-pool placement:** architectural routing seam now, actual deployment only with measured scale/regulatory triggers.

## Remaining P0 acceptance before production/customer activation
- Baseline server-side scope, Default Deny, SQL scoped predicates/FKs and negative tests: **FOUNDER ACCEPTED on 2026-11-11**. Per-domain ownership/permission matrix and worker/event/cache/support policies still need review.
- K6C code and SQL/HTTP negative tests were separately authorized on 2026-11-11 for **this narrow read-only slice**. The broader [Negative Matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md) still needs execution per applicable module and independent security review.
- No “secure,” “isolated,” “enterprise-ready” certification from a document alone.

## Founder acceptance and remaining decisions
**Founder approved the baseline on 2026-11-11**, explicitly: trusted server-issued Tenant/Business/Branch scope, Default Deny, scoped SQL predicates plus referential integrity and negative isolation tests. This also authorizes **K6C read-only Business Module Registry implementation on a GitHub branch/PR** — no public authentication enablement and no VPS SQL migration.

**Still requires separate acceptance:** SQL Server RLS decision and pooled-connection testing, privileged Support/break-glass, final cross-Business report grants, background task/revocation policy, exact per-domain resources and broader Tenant Isolation Matrix. ADR-032 for paid activation and ADR-031 for financial truth remain separate proposals. **No customer data, launch approval or staging K5 closeout follows from the baseline.**

**History:** 2026-10-30 status was PROPOSED. **2026-11-11:** narrow baseline ACCEPTED by founder; implementation/CI results must be recorded separately. No VPS migration, live feature activation, real Tenant creation or production security sign-off authorized.
