# DRVO ERP — Foundation Core Contracts Proposal (No Code)

**Date:** 2026-10-30
**Status:** ENGINEERING DESIGN OPTIONS / PROPOSAL, NOT founder-approved additional technical detail. Existing ADR mandates (006,007,015–021,029) remain in force.
**Purpose:** Make architecture seams explicit before implementation and capture choices to decide, not invent a schema or turn open questions into approved policy.
**Related:** [Foundation Review 01](FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md), [Module Registry](MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md), [Tenancy](TENANCY-ARCHITECTURE.md), [Module Lifecycle](MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md).

## 1. Trusted Scope Contract (proposed)
Every user command/query, worker, event, cached projection and report has an authoritative context:
- `tenantId` (resource and identity isolation boundary);
- `businessId` owned by Tenant;
- `branchId` if scope is Branch-specific, validated as member of Business; explicit Business-wide context for legal reports if permission allows;
- `actorId` and authenticated identity, grants/roles/approver, relevant entitlement/module;
- `requestId`, `correlationId`, `idempotencyKey` when applicable;
- effective data placement and audit/version context.

**Authority:** server derives actual permitted Tenant/Business/Branch roles and service principal, never grants based on user-submitted `tenantId` or a mutable job payload alone. Branch scope can only narrow permissions; it does not expand them. A worker validates signed/trusted producer and event scope, not just a raw row reference. Avoid generic, unscoped `findById(id)` across Tenant-aware tables.

**Physical FK design options — unapproved:** compound `(TenantId, BusinessId, RowId)` and `(TenantId, BusinessId, BranchId)` keys/foreign keys vs restricted relational joins and RLS; select based on SQL Server index design, cost and proven isolation. Foreign keys must stop cross-Business relation ID collision. Tenant/Business IDs in all data types are not automatically appropriate for platform-global reference tables; document owner scope table by table.

**Negative security acceptance:** user from Tenant A cannot read/write Tenant B by swapping URL/record UUID, branch parameter, filtering, export, cache key, saved search, queued outbox event or query suggestion. Same Tenant staff assigned Business A cannot view Business B records unless explicitly granted. Platform support doesn't inherit clinical access.

## 2. Module Release / Entitlement / Activation Contract
**Separated ownership:**
- `GlobalModuleVersion`: released verified code/manifest/permission/supported contracts, shipped in shared platform release.
- `BusinessModuleActivation`: per-Business approved/entitled configuration, versions, extension keys and lifecycle state.
- `IndustrySolutionVersion`: curated reference composition of released modules/extensions, onboarding defaults and intended workflows, **not** executable code.
- `ModuleDependencyPlanner`: computes valid Required closure + Optional suggestions/conflicts; versioned solver and graph signature.
- `BillingQuote/Approval`: truthful, scoped, immutable quote snapshot/expiry/taxes, selected business payer, renewals and one-bundle consent (ADR-016), not coded in Module manifests.
- `ActivationCoordinator`: idempotent Business-specific state transition and safety checks; not the owner of a module's transactional business records.

**Candidate transition:** `REQUESTED → PLANNED → AWAITING_APPROVAL → ACTIVATING → ACTIVE | FAILED`. These names are not approved; `AVAILABLE` is global registry availability rather than per-Business account state. The coordinator must distinguish quote approval from confirmed payment/settlement and from the module actually being ACTIVE. When it fails, reconcile planned charges/credits and restart only safe configuration stages, preserve other modules and financial history.

**Concurrency challenge:** two owners approve same add-on or one disables prerequisite while another activates dependent → graph/hash/entitlement/version must be rechecked under a Business-scoped concurrency boundary and idempotent unique operation key; avoid last-write-wins.

**Disabling/upgrade:** blocked when an active dependent requires module, or an explicitly audited safe transition plan after founder approval. Suspended module preserves lawful record read/history. Platform-wide deployment migration runs once and doesn't execute customer-supplied code.

## 3. Core/Extension/Domain Module Contract

Each Module's implementation-neutral manifest should define:
- `moduleKey`, owner, bounded context, aggregates and protected invariants;
- `coreApiVersion`, contract versions, minimum platform/release compatibility;
- permission/action/resource scopes, entity sensitivity/data retention and audit;
- `extensionPoints` with input/output types, deterministic priority/conflict rules, eligibility and error handling;
- `requires` / `optional` / `conflicts` and Business activation/deactivation constraints;
- commands, queries and versioned domain event schemas, payload minimization/redaction;
- allowed UI app/navigation/view contributions and feature flags;
- migrations, old-config compatibility, backfill and rollback/restore plan;
- safe capability degraded mode when Optional app absent, and health metrics.

**Business extension selection** can choose compatible released extensions and configs; it cannot load untrusted arbitrary code, bypass finance/RBAC, write other Module-owned records or override protected status semantics. Some domain-owned extension points may be intentionally minimal but real; no pointless no-op packages.

**Boundary discipline:** Shared Booking owns appointment/slot. Salon resource/executor policy may be bounded extension. Clinic medical encounter/consent and Manufacturing MRP/WIP are owned Domain Modules. Industry Solution only composes verified parts. Actual per-Module map/ownership still requires signed V1 spec.

## 4. Cross-Module Call / Event Contract
`ScopedCommand`: authenticated/service context, business operation ID, defined invariants, timeout and failure semantics; do not run circular synchronous cascades or multi-module direct table writes.
`EventEnvelope`: unique event + name/schemaVersion, immutable producer, Tenant/Business/Branch, source aggregate/version, occurredAt and committedAt if needed, correlation/causation, idempotency, minimal non-sensitive payload; record in same transaction as authoritative source write.
`ConsumerInbox`: unique by consumer + eventId (and affected business operation unique key where needed); commit marker and effect atomically, support retry and DLQ, version upcasters and replay/reconciliation.
**Delivery at least once; business effects idempotent** is the intended model. Event order per aggregate and stale-version rejection require an explicit strategy; do not assume global total order.

**Module disable case:** outbox financial effects of earlier posted transactions must still be reconciled even if optional module is disabled; optional WhatsApp must not hold up sale. Failed email/message dispatch is never a reason to rollback a posted invoice.

## 5. Financial source-of-truth decision — BLOCKED (founder/architect review needed)

Two candidate choices for the FIRST mandatory journal of a POS sale:

### A — Same SQL transaction (when all relevant mandatory owners are colocated)
- Within same DB transaction, commit authoritative sale + required journal/AR/effects needed for posting, plus outbox.
- Pros: simpler strong consistency and visible posting, less risk of a posted sale without journal.
- Cons: stronger synchronous coupling, possible lock/latency cost, and complicates future multi-placement and offline replay; each module still owns its writes through typed app contracts.
- Must still handle inventory valuation and HR commission as separately explicit eventual/pending effects where applicable.

### B — Durable accepted sale + mandatory Accounting consumer / reconciliation barrier
- Sale accepted durably with `ACCOUNTING_PENDING`; outbox eventually posts GL; “Posted”/“Reconciled” only after verified journal and mandatory effects. Retry and audit on failure.
- Pros: more resilient to transient Accounting processing interruption and less synchronous checkout coupling; may make modular extraction simpler.
- Cons: complex states/financial period handling, late offline posting and eventual cross-domain consistency; requires explicit outstanding queue SLA and clear finance user operations.
- Must not treat a locally queued POS sale or customer-provided electronic payment evidence as verified settlement.

**No selection recorded.** Do not implement a half-A/half-B design without an ADR. For critical multi-Branch cash/stock/accounting, specify exact status and invariant for every source document, and whether a pending sale can be refunded/reversed before GL finish.

## 6. Schema / SQL Server / future tenant placement seam
- **V1 accepted:** shared SQL Server and Modular Monolith on VPS; Tenant/Business/Branch-aware repositories. SQL Server version/edition/resources and driver exact choices still need verified environment checks before code.
- Avoid assuming one unpartitioned connection forever: define architectural `TenantPlacementResolver` capability **as a contract placeholder**, not working future routing in V1. Resolve authorized Tenant/Business to a placement only through trusted platform settings.
- Designing for future pools needs physical data migration plan: cutover, source freeze or CDC strategy, version compatibility, payment/cash/reconciliation, outbox/inbox drain/replay, audit/retention and rollback.
- Never use cache/event key without scoped IDs. Never assume enterprise gets a dedicated DB without budget/regulatory/measurements.

## 7. Priority contract test specifications (future, NOT executed)
- Cross-tenant direct IDOR, nested relation, export, search, cache bleed, Domain Event forging and worker replay negative matrix.
- Dependency cycles/conflicts and stale/priced quote changes, parallel admin enable/disable, no accidental double payment/activation.
- Event delivered 20× / reordered / stale-version / late refund / permanent DLQ: no duplicate source journal/stock/HR effect and full recovery.
- Business A uses Salon extension while B in same Tenant is manufacturing; A optional app install and theme changes never mutate B.
- Tiny Salon only minimum valid modules vs big Salon chain with same modules and high throughput: demonstrates functional size != technical load.
- Large Manufacturer Industry Solution adds independent MRP/landed cost with separate aggregate schema/permissions; regression tests must show no Salon Core break.
- Database placement/migration conceptual dry run then test after authorized dev; regulated Clinic event payload never leaks through generic subscribers.
- Frontend hides unauthorized Apps but direct API still denies.

## 8. Founder sign-off needed before implementation
1. Financial A/B transaction and reconciliation policy (including partial failure/UX).
2. Exact Tenant/Business/Branch resource scope/role enforcement, DB-side defense policy.
3. Module V1 ownership graph and Core/Extension contracts, event version/replay strategy.
4. Activation and paid-module authorization workflow, suspend/disable history policy.
5. Target workloads and capacity/recovery commitments, future tenant movement assumptions.
6. Clinic privacy and Egypt/Gulf statutory design before applicable market/industry release.

**Not a database schema, executable architecture, final sign-off or development authorization.**


## P0 Scope Contract expanded — 2026-10-30

Use the [Detailed Isolation Contract](TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md) and [40-case Threat/Test Matrix](TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md) as detailed proposal for Section 1. They preserve founder-approved identity and Default-Deny semantics and expose still-open FK layout, optional RLS and support/delegation decisions. [ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) remains PROPOSED. Financial POS/GL A vs B, activation and versioning options are not altered.
