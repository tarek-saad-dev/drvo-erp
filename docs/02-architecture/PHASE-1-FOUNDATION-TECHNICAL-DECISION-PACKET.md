# DRVO ERP — Phase-1 Foundation Technical Decision Packet

**Date:** 2026-11-01  
**Status:** **Engineering recommendation and scoped decision package; not a replacement for explicit ADR-030/031/032 acceptance, no tests executed.**  
**Purpose:** Turn the founder's approved Lean Kernel / multi-industry strategy into reviewable technical defaults for the *first bounded, non-production engineering slice*, without claiming production correctness.

## 1. Decisions and what they mean

| Topic | Recommended engineering target for V1 | May be prototyped in first slice? | Remaining gate |
|---|---|---|---|
| **ADR-030 isolation** | Trusted server-derived Tenant/Business/Branch execution context; Default Deny, explicit memberships, per-resource scope class, domain repository predicates and cross-scope SQL referential constraints; end-to-end guards on HTTP, background jobs, events, cache, files and exports | **Yes, in isolated foundation code after development authorization** | Physical composite FK indexes and optional RLS vs strong app/SQL safeguards require SQL Server integration/security testing; role inheritance/support break-glass signed off |
| **ADR-031 financial first journal** | **Option A as conditional V1 target**: when server marks a sale POSTED, POS source + first mandatory balanced Accounting GL + durable outbox commit in one SQL transaction through an Accounting-owned contract; cash/provider settlement/stock valuation/HR commission retain their own independently true statuses | **Only sandbox spike after finance contract approval**; do not implement production POS posting from this document | Finance must sign tender/AR/clearing mappings, fiscal/tax/refund/period close, ownership and measured p95/SQL lock effects; if A fails, explicitly adopt B with durable GL_PENDING and reconciliation barrier |
| **ADR-032 activation** | Business-scoped immutable bundle plan/quote, fresh graph/permission/price checks, per-Business CAS/version/concurrency guard, idempotency key+payload hash, no dependent ACTIVE until Required prerequisites ready, preserve historical records | **Yes, test with a FREE stub grant and two sample compatible Modules; do not issue real bills** | Paid approver permissions, quote/settlement/refund/grace, exact transition states/upgrade/disable conflicts and race tests |
| **Global Platform / Extensions** | Only DRVO-reviewed deployed versions activatable; signed/trusted manifest integrity, typed versioned contracts; Industry Solution references releases, no customer runtime arbitrary code | **Yes, simple static registry with versioned manifest fixture** | Code-signing/distribution mechanism, extension precedence, compatibility/migration support window |
| **Data access & migrations** | Typed repository interfaces, parameterized SQL Server access, explicit transaction boundary, versioned idempotent forward migration policy with checksums, seeded test fixtures and restore runbook | **Only after driver/migration-tool spike below** | Pick actual package/driver on verified SQL Server edition and lock/Decimal/migration benchmarks; no assumption an ORM solves scope automatically |

**Interpretation:** "Selected engineering target" is **not** tested performance, legally verified accounting, or unilateral adoption of an unapproved ADR. The founder approved cross-cutting objectives and asked for the development preparation; finance and security checks remain real gates.

## 2. Explicit security contract for first Kernel slice — ADR-030 target

1. Every principal (user or narrowly scoped service account) must resolve trusted Tenant identity server-side. Business selection and Branch selection are *untrusted input* until ancestry and current Membership/permission checked.
2. Every protected resource declares exactly one owner and scope class: PLATFORM_GLOBAL, TENANT, BUSINESS, BRANCH, or SENSITIVE_DOMAIN with additional owner controls. A Business-owned resource without Branch ID does **not** mean all Branches are allowed.
3. Repository access requires the validated scope context (not a free-form filter supplied by a handler), and SQL must reject cross-Tenant / cross-Business parents with appropriately scoped foreign keys or proven equivalent constraints.
4. Auth grants are Allow-only, Default Deny; user revocation prevents new protected operations on their next request. Owner explicit Business Membership and one Role per Branch remain approved facts. Manager delegation must never escalate beyond creator's authority; full role precedence remains to be signed off.
5. Events, jobs, external APIs, cache keys, search, exports, uploads and admin support tools **revalidate** provenance/scope. A successful UI render or opaque UUID is not authorization.
6. Future SQL Server RLS is optional defense-in-depth, not a substitute for application/domain checks. A pooled connection's SESSION_CONTEXT must be safely set/reset and adversarially tested before enabling RLS.

## 3. Financial correctness for later POS/Accounting slice — ADR-031 target

**Chosen conditional target: A.** To protect truthful finance, **local offline queue = not yet server posted**; server POSTED means a balanced mandatory GL is committed for relevant operation. A crash before commit produces neither source posting nor first GL; a retry after commit looks up the same operation ID and never creates another sale/journal. Optional notifications/analytics, and independent required or pending treasury/stock/commission effects must be visible truthfully and reconciled.

**Must NOT silently finalize:** unverified electronic proof credited to Bank, anonymous AR semantics, tax/legal receipting, late offline tax handling, negative first-stock cost treated as zero, one-month close races, first mandatory Treasury custody obligation and refund reversal ordering. These require owner+Finance decision. Existing ADR-009–013 product outcomes stay in force.

**Performance gate:** measure p50/p95/p99 end-to-end posting, SQL lock waits/deadlocks and worker backlog on target test workloads. Set numeric threshold with founder/operations before implementation trials; do not invent an SLA. If A fails, evaluate B as an explicit new signed decision rather than hiding GL_PENDING.

## 4. Activation correctness — ADR-032 target

- **Released** code/manifest, **Eligible** market, **Activated** Business configuration, **Entitled** Business rights and **Authorized** user action are distinct.
- Each request includes scoped operation identity and immutable full Required closure with applicable charges. One explicit bundle consent (accepted ADR-016). The proposal is revalidated before mutation; a changed quote/graph requires new preview.
- Serialize conflicting changes **within one Business** using a revision/CAS or bounded transaction, not a platform-global lock. Duplicate callback/button/job retry must be idempotent and must not double initialize or charge.
- Domain-owned already-active Modules and past transactions survive failure/disable/expiry. Incomplete activation cannot be called ACTIVE; Required dependents cannot run without active compatible prerequisites.
- **Recommended default:** block removing a Required prerequisite while active dependents remain until an explicit safe removal plan exists. This precise policy is a proposal, not yet the ADR-032 signed rule.
- Paid commercial settlement, manual proof approval and rights grant are separate owners. Initial Kernel test can use an auditable **explicit free/test grant**; never fake production payment.

## 5. Unresolved decisions that may not be skipped or auto-assumed

| Owner | Blocking question | Before what? |
|---|---|---|
| Founder + Security | Privilege matrix; Owner bootstrap/delegation, support break-glass, physical scoped FK/RLS; ADR-030 acceptance | Production authentication and any real Tenant data |
| Founder + Finance + Architecture | Mandatory POS→GL atomic A financial classification, invoice/receipt/AR/tender, offline/closed period, refunds; ADR-031 acceptance | Production Financial Module posting |
| Founder + Billing + Security | Who can approve paid module bundles; actual plan/grant/renewal/expiry/refund rights; exact state/transition contract; ADR-032 acceptance | Production paid Module activation |
| Engineering + Ops | SQL Server edition/driver/ORM/migrations, backup/restore design, target workloads, test evidence | First database migration / shared staging |
| Module owners | Named Module ownership, actual required edges, typed contracts, event privacy, extension compatibility | Each dependent Module slice |

**Next actionable deliverables:** [Module Contract Template](STANDARD-MODULE-CONTRACT-V1.md), [Tenant/Data/Contract seam](FOUNDATION-DATA-AND-CONTRACT-BOUNDARIES-V1.md), [Technology Baseline](TECHNICAL-STACK-AND-MIGRATION-BASELINE-V1.md), [Salon V1 ownership](../03-modules/SALON-V1-OWNERSHIP-AND-DEPENDENCY-STARTER.md), [Quality Gates](../04-execution/FOUNDATION-QUALITY-AND-TEST-PLAN-V1.md) and [Phase-1 Work Package](../04-execution/PHASE-1-FOUNDATION-IMPLEMENTATION-PACKET.md).

**Execution status:** Architecture preparation only. No new source code, database, tests, deployment or proof of safety is part of this packet.
