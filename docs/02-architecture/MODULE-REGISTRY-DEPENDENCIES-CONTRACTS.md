# DRVO ERP — Module Registry, Dependencies, and Cross-Module Contracts

**Date:** 2026-10-29
**Status:** ENGINEERING DESIGN PROPOSAL, pending founder sign-off. No application code or SQL migrations executed.

## 1. Ground rules already approved
- ADR-015: each user-facing Module is an independent App tile, rather than grouped Sales/Finance mega-apps.
- ADR-006: **every** module has reusable Core and explicit Extension points.
- ADR-007: Required and Optional Dependencies with conflict detection.
- Business-scoped activation, several compatible extensions, multiple Businesses per Tenant, one shared SQL Server database in V1.
- First commercial industry Salon; next Clinic. WhatsApp is proposed as an optional integration Module, NOT an automatic core dependency.
- Auth/RBAC, single business books, no financial cross-module mutation by arbitrary SQL calls.

## 2. System inventory and ownership (proposal; app grouping not final launch confirmation)

| Module | Owns | Example extension points | UI tile |
|---|---|---|---|
| Catalog | Products/services/price definitions | Service attributes, industry rules | Yes |
| Customers | Customer profiles, customer lookup | Patient linkage only through separate Clinic privacy boundary | Yes |
| POS & Sales | Cart, invoice, refund, selected tenders, local sync acceptance | Salon service attribution; clinic billing policy | Yes |
| Booking | Appointments, allocation and booking lifecycle | Barber-chair schedule; clinician/room schedule | Yes |
| Treasury | Branch cash vault, cash movements, banking/payment settlement records | Industry-specific cash workflow | Yes |
| Accounting | Chart of accounts, journals, ledger, fiscal periods, receivables | Business-specific mapping and tax connectors | Yes |
| Inventory | Branch stock, movements, recipes and stocktakes | Salon consumption recipe; medical inventory policy | Yes |
| Purchasing | Suppliers, receipts and purchase returns | Supplier-specific validation | Yes |
| HR & Payroll | Staff, pay, attendance, commission and target ledger | Salon opener/executor commission plan | Yes |
| Reporting | Business-scoped projections and exports | Industry-specific dashboards | Yes |
| WhatsApp | Messaging opt-in, templates, provider channel and delivery status | Salon reminders, future Clinic consent-aware notices | Optional tile |
| Platform Kernel | Auth, Tenant/Business/Branch, entitlements, registry, audit, outbox infrastructure | System extension registration | Not required as business app |

**Important:** separating Catalog and Customers into tiles, whether Reporting is a priced module, and the precise initial app catalog are proposals. The founder approved the **principle** that every selected Module is shown independently, not the final inventory.

## 3. Global Module Registry vs Business activation

**Global registry** (platform code and released manifest, common to all Tenants):
- moduleKey, display name and icon/navigation contribution, semantic version, minimum platform compatibility;
- Core contracts and versioned Extension points, required/optional dependencies and conflicts;
- own permissions, scopes, settings schema, events produced/consumed, data ownership, migrations and lifecycle hooks;
- industry compatibility, entitlement requirements, supported locale and deprecation status.

**BusinessModule installation** (per Business, NOT code upload):
- tenantId, businessId, moduleKey, requestedVersion/compatible release, status, active extensions, entitlement reference, configuration revision, enabledBy/At, lastError/audit;
- proposed statuses: AVAILABLE, ENABLE_PENDING, ACTIVE, SUSPENDED, DISABLE_PENDING, DISABLED, FAILED;
- activated app tile shown only if Business activation ACTIVE + user permission + valid entitlement, with clear unavailable reason otherwise.

**No dynamic untrusted code execution** from Business self-service installation. App binaries and schema changes ship through platform deployment. Activation configures Business-scoped records after validation.

## 4. Dependency policy (proposed precise semantics)
- Required: cannot activate target without all compatible requirements; cannot disable prerequisite while an active dependent needs it.
- Optional: activation permitted without it; only integrated features gated if optional module not active.
- Conflicts/incompatibility: reject activation or version upgrade with actionable reason.
- Dependency graph checked for missing modules, cycles, version mismatch, incompatible extensions, pricing/entitlement and authorization before commit.
- Side-by-side compatible extensions allowed; if two extensions conflict for one workflow, require explicit selection/priority rather than silently picking one.
- Business activation must never silently purchase paid prerequisite modules. **ADR-016 approved:** show all Required prerequisites and their costs in one explicit bundled activation preview/approval; no separate prerequisite-by-prerequisite manual installation required.

**Example proposed edges:** POS -> Catalog (Required), POS -> Customers (Optional for anonymous cash sales, Required only for Credit workflow); Salon execution extension -> HR service attribution contract (Required for that feature), -> Inventory recipe (Optional until that feature enabled); Booking -> Customers (proposed Required); WhatsApp -> Messaging provider/channel Core (Required), Booking/POS notifications as Optional event integrations. **All concrete edges require confirmation**; the accepted policy is Required/Optional, not these example links.

## 5. Cross-module collaboration contracts (proposal)

### Ownership and request routing
Each Module owns business rules and writes for its aggregate. Within the Modular Monolith, use typed application-level interfaces or commands for synchronous checks; other modules MUST NOT issue arbitrary updates to owned tables. Shared DB does not imply shared ownership.

### Synchronous call: consistency-critical
Use for immediate validated checks, e.g., POS sale -> Catalog get price snapshot, POS -> permissions, optional customer credit verification online. Cross-module synchronous commands must have tenant/business/branch context and timeouts; avoid circular call chains.

### Asynchronous domain event: independent side effects
Inside same SQL transaction: authoritative state change + append-only outbox record. Worker sends versioned event to subscribed Modules. Each uses inbox/unique business operation key and retryable processing; dispatch is **at least once** while financial effects must be idempotent. Handle DLQ/review for failures. Disabling optional WhatsApp never reverses the POS sale.

### Event envelope fields (conceptual only)
eventId, eventName, schemaVersion, sourceModule, tenantId, businessId, branchId (if scoped), aggregateType, aggregateId, occurredAt, correlationId, causationId, idempotencyKey, payload. Explicit consumer authorization and redaction for personal/clinical data.

### Sale event example
1. POS validates client/cart/tender and produces immutable sale; establishes accounting obligation.
2. Save POS document and outbox atomically. Decide which minimum GL posting is part of the critical completion transaction; NEVER tell cashier all financial effects are final if mandatory journal posting failed.
3. Accounting receives SalePosted.v1 and performs balanced journal/AR idempotently, with visible consistency status until confirmed if asynchronous.
4. Inventory receives it and records stock move and negative-stock review/valuation.
5. HR consumes service attribution and commission/reversal record.
6. If **enabled**, WhatsApp reacts using a template and permission/consent checks.
7. Same idempotency keys prevent repeated financial effects on retry; refunds generate linked correction/reversal events rather than mutate originals.

**Crucial open technical contract:** whether the first GL journal and inventory reservation belong to the original synchronous transaction or follow reliably via reconciliation. Must be chosen explicitly before implementation and not implied by a pretty event diagram.

## 6. Core + Extension model
Core defines stable capabilities and advertised extension points; industry extensions customize policy, fields, workflows or UI slots within a compatible contract. Extension cannot silently bypass Core authorization or directly mutate another module's tables. Installation eligibility is Business scoped; extension event handlers run with tenant context.

Salon: executor/opener attribution, targets/commission, recipe consumption, barber availability. Clinic: consent/security, regulated clinical resources and billing; do not place medical records in generic customer records. Future industries can reuse Core without copying POS.

## 7. Lifecycle

### Add module to existing Business
Apps -> select module -> preview required/optional modules, extensions, costs and permissions -> authorized approval -> validate graph/entitlements -> initialize configuration/role grants -> status ACTIVE -> menu appears. Failure leaves audited error; retry idempotent.

### Create new Business
Owner creates Business, industry, currency/timezone/language, first branch -> choose industry template -> preview/select starter modules and extensions -> validate dependencies/entitlements -> initialize Business scope -> invite or assign staff and branch Roles -> training/go-live checklist -> dashboard shows independent module tiles.

### Add module to entire SaaS
Product design -> Core and Extension contract -> manifest + dependency/permission/locale validation -> schema migration deployed across shared SQL Server -> QA cross-tenant and against old event versions -> platform release -> module appears AVAILABLE to eligible Businesses -> explicit activation by each Business.

### Disable/uninstall
Restrict future commands, process or park outstanding outbox safely, protect active dependents, preserve historical financial/stock/customer records for retention and audit; never delete shared schema on Business deactivation. Reactivation restores same Business ownership without duplicating records.

## 8. Tests before code sign-off
Activation across multiple Businesses/industries; required dependencies and optional absence; cycle/conflict/version mismatch; paid entitlement denied; module disable with outstanding dependent; extension conflicts; cross-Tenant event scoping; duplicate event and refund replay; partial Accounting worker failure and recovered journal; add/drop WhatsApp without affecting sale; clinic privacy event leak rejected; activation rollback after configuration failure.

## 9. Decisions founder still needs to make
1. Exact V1 tile inventory (which app names appear), distinct from domain module inventory.
2. **RESOLVED — ADR-016:** display full Required dependency bundle and any prices for one explicit approval; still open: approver roles, billing/proration and technical commit/retry strategy.
3. Which role can activate/deactivate modules (Owner only vs privileged Manager), and billable integration approval.
4. WhatsApp optional app available day one vs later release, and whether it talks to DRVO AutoResponse.
5. Whether Salon Pack appears as separate app tile or is activated as underlying industry extension with its features inside POS/Booking/HR.
6. Critical accounting consistency boundary, including how UI represents pending journal.
7. First UI designs and permission/navigation screen contract.

No engineering draft here grants permission to write code.


## Follow-up lifecycle and contract design — 2026-10-29

Founder selected bundling activation policy (ADR-016). The expanded state machine, quote/revalidation/audit and command/event ownership draft is at [Module Lifecycle and Communication Contracts](MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md). Engineering details remain proposals, not preapproval to write code.


## Approved Industry Solution composition direction — 2026-10-29

ADR-017/018 add a separately versioned **Industry Solution Registry** on top of (not in place of) the Global Module Registry and BusinessModule activation. A Solution is a reusable manifest/composition with compatible Module refs, Domain Modules, Industry Extensions, default settings/roles, locale constraints and onboarding steps, NOT independent customer-specific code or deployment. A Business can be onboarded by selecting a Solution and approving the full Required dependency/cost plan under ADR-016; activated/authorized Modules still render separately under ADR-015. Distinct domain models deserve new Domain Modules with Core + Extension (ADR-006); do not force all business functionality into generic adapters. Exact schema/manifest, solution version upgrades and compatibility rules are pending design: [Industry Solutions Architecture](INDUSTRY-SOLUTIONS-ARCHITECTURE.md).


## Conditional Industry Module classification — approved ADR-019 (2026-10-29)

An Industry Solution manifest does **not** require an always-present industry-specific Domain Module. It may comprise Shared Business Modules plus bounded Extensions when that genuinely fulfills the industry processes. Independent Domain Modules are registered when their owned aggregates, permissions and lifecycle are justified (e.g. Clinical Records, Manufacturing/MRP); each such Module retains its own Core+Extension design (ADR-006) and own App identity if user-facing (ADR-015). See [Boundary Matrix](CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md) and [ADR-019](../05-decisions/ADR-019-CONDITIONAL-DOMAIN-MODULE-BOUNDARY.md). Concrete dependencies must follow actual contracts; no invented required industry mega-app.


## Founder-approved progressive Business activation — ADR-020 (2026-10-29)

Industry Solution is an **initial compatible starter bundle**, not a frozen installation: any Business can begin with its essential valid Modules and later add more compatible Modules or Extensions when released, with versioned registry contracts, Business-scoped entitlements, audit, and explicit ADR-016 Required-dependency/cost approval. Do not pretend every application is optional where financial/permission correctness needs it; exact starter manifests remain pending. Salon V1 specifically must **not** require or install a standalone Service Execution Module. See [incremental Business module plan](INCREMENTAL-BUSINESS-MODULE-GROWTH.md) and [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md).
