# DRVO ERP — Module Lifecycle and Communication Contracts (V1 design)

**Date:** 2026-10-29
**Status:** TECHNICAL ARCHITECTURE PROPOSAL (unless a rule cites an accepted ADR). NOT implemented; founder approval still required for unresolved options.

## Approved foundations
ADR-006 Core + Extension for every Module; ADR-007 Required and Optional Dependencies and conflict checks; ADR-015 independently visible app tiles; **ADR-016 explicit preview of all Required dependencies and their costs with one bundle approval**. One shared SQL Server database (V1), Business-scoped activations, multi-Tenant isolation, Salon-first then Clinic. WhatsApp remains a proposed optional app.

## 1. Two distinct lifecycles
### Platform release (all Businesses see a known compatible Module version)
Design contract → module manifest (dependency and extension descriptors) → permission/event schema review → shared-database migration in a controlled release → cross-Tenant/security/replay and version-compatibility tests → deploy → register as AVAILABLE. Installation in a customer Business **never downloads/executed arbitrary new server code**.

### Business activation (one Business may enable an already-released Module)
Business selects app → compute transitive Required closure → detect Optional suggestions/conflicts/industry/versions → show per-item pricing and billing consequences → one explicit authorization (ADR-016) → validate fresh permission, quote and entitlement → idempotently initialize per-Business records and configs → ACTIVE on success; preserve history and errors on failure → show each new app tile if the employee has view permission.

## 2. Registry and state ownership (draft schema concept, no SQL)
- `ModuleDefinition` / `ModuleVersion`: moduleKey, coreApiVersion, platformRange, requiredModules, optionalModules, conflicts, industries, extensions, permissions, settingsSchema, uiRoutes, commands, events, dataOwnership, lifecycleHooks.
- `BusinessModule`: tenantId, businessId, moduleKey, selectedExtensionKeys, activationState, entitlementRef, settingsVersion, activatedAt/By, transitionVersion, lastError.
- `ActivationRequest`: businessId, requestedModule, dependencySnapshot/graphHash, quote/total/expiry, selectedOptionals, explicitApprover, correlationId, idempotencyKey, lifecycleStatus.
- `ModuleActivationAudit`: scoped append-only transitions and pricing/permission evidence.
- `ModuleEventInbox` / `Outbox`: consumer unique key by tenant, module, eventId/version to avoid multiple effects.

Proposed `BusinessModule` transitions:
`AVAILABLE → APPROVAL_PENDING → ACTIVATING → ACTIVE`;
`ACTIVATING → FAILED → ACTIVATING` via authorized retry or `FAILED → AVAILABLE` via safe rollback of **new configuration only**;
`ACTIVE → SUSPENDING → SUSPENDED → ACTIVE` after entitlement resolution;
`ACTIVE → DISABLING → DISABLED → ACTIVATING` for reactivation.

`AVAILABLE` is better a registry display state than a persisted Business entitlement status; precise schema naming to be finalized after design. **Transition names are proposals, not business approvals.**

## 3. Dependency graph semantics
- Required edges must be satisfied in the same Business, transitively. Optional edges never block installing the primary app; they may gate selected features.
- Detect cycles, version incompatibility and mutual exclusions *before* approval.
- Preview a coherent plan: selected app, already active prerequisites, newly required prerequisites, optional suggestions, per-app prices, total/recurring or one-time cost and entitlement changes.
- ADR-016 requires explicit bundle approval. No paid module installed or charged without informed approval.
- If any prerequisite missing at commit time or quote stale, do not partially activate; refresh plan and request reconfirmation.
- Disabling a prerequisite with active dependent: block or offer an explicit impact plan; **which policy is final remains pending**.
- Apps should support a user-friendly error if a module is suspended but historical records must remain accessible per rights and retention.

## 4. Core + Extensions (across every module)
Each module owns Core business rules and publishes typed extension points (policy hooks, validation hooks, domain-specific services, UI slots, event subscription). One Business may select compatible multiple extensions, but conflicting hooks need deterministic configured precedence, not implicit patching.

Example: Booking Core owns appointments; Salon extension assigns barber/chair; Clinic extension later adds doctor/room and clinical privacy checks. WhatsApp integration listens to Booking events but Booking works without WhatsApp. No extension may bypass authorization or mutate another module's owned database tables directly.

## 5. Commands/queries vs events
### Synchronous typed contracts
Use for mandatory validations or reads before a decision: authenticated Business/Branch context, module entitlement, Catalog price snapshot, permission and credit checks (with approved offline exceptions). Explicit contract ownership and versioning, errors/timeouts, denial if scope invalid. Avoid mutual call cycles.

### Versioned asynchronous domain events
On the authoritative transaction commit, store append-only outbox with `eventId, type, schemaVersion, tenantId, businessId, branchId?, sourceModule, aggregateId, occurredAt, correlationId, causationId, idempotencyKey, payload`. A worker dispatches at least once; each independent consumer records processed event and unique business effect under the same transaction as its own writes, retries failures, and dead-letter review. Do not promise exactly-once delivery, only tested idempotent effects.

### Ownership table (proposal)
| Source | Event/contract | Consumer & responsibility |
|---|---|---|
| POS | `SalePosted.v1` | Accounting: balanced journal and receivable; Inventory: stock movement; HR: commission attribution |
| POS | `SaleRefunded.v1` | Accounting: linked reversal; Inventory: restock policy; HR: commission reversal |
| Booking | `BookingConfirmed.v1` | Optional WhatsApp: consented notification; Salon: resource schedule |
| Inventory | `StockAdjusted.v1` | Accounting: valuation adjustment in permissible period |
| HR | `PayrollClosed.v1` | Accounting: payable/expense postings |
| Customer/Credit | `CreditLimitExceeded.v1` | Review/workflow alert and future credit hold |

Names/examples are illustrative; final schemas, sequencing guarantees and payload privacy must be approved. Clinical records must never be indiscriminately broadcast to generic event listeners.

## 6. Finance consistency boundary: must be explicitly specified
A posted POS sale cannot be represented as fully reconciled if Accounting journal or Inventory authoritative effects remain outstanding. Proposed reconciliation states: SALE_ACCEPTED / ACCOUNTING_PENDING / STOCK_PENDING / RECONCILED / NEEDS_REVIEW. Whether the primary journal is committed *in the originating DB transaction* or via mandatory outbox consumer is an unresolved technical/product decision. Some offline accepted sales will synchronise later and may have approved exception review states. Don't bury essential financial outcomes behind a best-effort WhatsApp notification.

## 7. Deactivation, upgrades and historical data
A per-Business disable stops new module commands/features after checks, but must not drop common SQL tables, remove posted invoices/journals, or erase audit trails. Process or hold queued events with visible errors; do not silently discard an event. Existing active dependent modules block a careless disable. Re-enable must be idempotent and restore rights without re-seeding historical transactions. For upgrades keep multiple supported event schema versions during transition and perform shared DB migrations once for the platform, not per Business.

## 8. Security and observability
Each call/event includes authenticated or service-derived Tenant/Business/Branch scope; service permissions and BusinessModule entitlement checked at entry. Outbox worker may operate across Tenants, but a claimed event is processed within its original Tenant context. Audit activation and price approval; alerts for stuck ACTIVATING, orphan dependencies, pending financial events, DLQ, module billing mismatches; business-level module health screen.

## 9. Acceptance scenarios before implementation
- Bundled activation POS + Catalog, price preview and permission approval, success, duplicate click, stale quote, failed entitlement and partial failure.
- Already-active module preserved; separate tiles visible only to authorized users.
- Required cycle, incompatible versions, optional absent, conflicting Salon extensions.
- Remove WhatsApp while Booking/POS continue; queued messages handled safely.
- Module disable while active dependent exists is prevented pending impact resolution.
- Cross-Tenant activation/event replay denied; workers do not leak scoping.
- Sale outbox replay 20x => exactly one invoice/journal/stock movement/commission effect.
- Clinic privacy events never leak to generic WhatsApp or cross-industry extension.
- Shared SQL database migration does not affect existing Business configurations unexpectedly.

## 10. Remaining founder/architecture gates (not silently selected)
- Exact public V1 App catalog and how Salon Pack is represented.
- Approver roles for installing, disabling or paying for modules; optional paid add-on authorization.
- Dependency disabling UX and billing/cancellation refund semantics.
- WhatsApp available at V1 launch vs later, provider/DRVO AutoResponse approach.
- Cross-module first Accounting journal transaction/reconciliation contract.
- Core/Extension hook registry priority and per-industry privacy isolation.
- Original DRVO app launcher, Apps catalog and activation preview UI (Odoo-inspired, not pixel-perfect copied).

**No code. No SQL migration. No deployment.**


## Industry Solution and vertical lifecycle overlay — 2026-10-29

Founder-approved ADR-017/018 require a **Solution release/assignment lifecycle** alongside (but distinct from) Global Module release and Business activation: discover and analyze industry → classify common Core vs Extension vs new Domain Module → design/implement separately after explicit development authorization → validate contracts/security/finance/compatibility → publish versioned Solution manifest referencing released Modules/extensions → select Solution for new Business → preview required bundle and any prices with one approval (ADR-016) → initialize/configure Business scope → show independent apps (ADR-015) → productize and upgrade with version compatibility. Solution selection never executes untrusted code or creates separate SQL schema per customer. See [Industry Solutions Architecture](INDUSTRY-SOLUTIONS-ARCHITECTURE.md) and [New Industry Playbook](../04-execution/NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md). Existing technical contract and state machine proposals still require separate approval.


## Conditional Domain Module lifecycle classification — ADR-019 (2026-10-29)

Before registering any new vertical Module, complete the Core-vs-Extension-vs-new-domain assessment in [Boundary Matrix](CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md). A Solution can activate only Shared Modules and selected compatible Extensions, or additionally distinct Domain Modules if those own independent processes; the platform must not auto-generate one giant Operations Module per vertical. Specialized Modules still publish Core+Extension contracts and interact with shared domains via owned commands/events, not cross-owned-table mutations. The classification policy is founder-approved; exact Salon/Clinic/Manufacturing candidate mapping and event schemas are still technical proposals.


## Founder approved additive Business growth — ADR-020 (2026-10-29)

A Business can operate on an industry-appropriate minimum dependency-valid starter set, then add new released modules/compatible extensions without replacing its Business or resetting historical records. Activation is Business-scoped and follows ADR-016 explicit bundle pricing/Required dependencies. New modules may require a platform deploy and schema migration before per-Business activation; the platform must not claim installability for undeveloped functionality. Salon V1 begins **without standalone Service Execution Module**; Booking/POS/HR/Inventory remain source owners for their functions. Future multi-step execution may become a separate module after discovery without retroactive fabricated steps. See [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md).


## Priority architecture audit overlay — 2026-10-30

The design correctly separates Global Module release and per-Business activation and allows Core/Extension/Domain composition. It is **NOT implementation-approved** until [Foundation Review FND-01–05](FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md): trusted scope, which critical POS/Accounting work commits atomically versus via durable pending, idempotent activation despite concurrent changes, signed release/versioned contracts and deterministic extension conflict rules. [Proposed contracts & finance A/B](FOUNDATION-CORE-CONTRACTS-PROPOSAL.md) explicitly remain choices, **not** accepted transaction policies. No code or SQL migrations authorized.


## FND-02/FND-04 Financial Contract review required — 2026-10-30

The accepted Core/Extension and at-least-once outbox direction must follow [Financial Consistency Contract](FINANCIAL-CONSISTENCY-CONTRACT.md) for owner-specific sale, first GL, tender verification, stock cost and HR commission truth. [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) is **PROPOSED**: Option A (same SQL transaction for source sale + first mandatory balanced GL) conditionally recommended based on future measured V1 latency; B (durable accepted sale with GL_PENDING) alternative and hard reconciliation remains viable. No actual Posting boundary approved, and no fund/paid badge inferred from customer evidence. [46 Failure Tests](FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) specify replay/refund/late-period/stock/credit invariants (zero tests executed). FND-02/FND-04 remain OPEN.
