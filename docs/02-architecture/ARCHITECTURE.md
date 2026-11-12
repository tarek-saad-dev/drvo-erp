# Architecture baseline

> **2026-11-12 SHARED POS NONPOSTING PREVIEW BRANCH:** Add optional POS bounded context exposing in-browser draft and a separate server preview from existing scoped Catalog reads; no sale posting, no GL/Treasury/HR/Inventory effects or SQL tables. No future authorization implied by `catalog.read`; POS-specific RBAC and entitlement require separate approval. Default-OFF K5/Catalog/POS Preview flags, SQL 010–013 CI-only, K5F and ADR-031/032 unresolved. [POS preview contract](../03-modules/POS-PREVIEW-CORE-V0.md) · [PL-1 report](../04-execution/POS-NONPOSTING-PREVIEW-2026-11-12.md).



> **2026-11-12 SHARED BOOKING CORE (PR, NO CUSTOMER DEPLOYMENT):** The Booking Module owns Branch resources and appointments, references Customer and Catalog SERVICE-owned IDs through composite Tenant+Business(+Branch) FKs without modifying their authoritative records, checks live K5 Session+Branch `booking.read/manage` under SERIALIZABLE SQL transactions and rejects parallel overlapping Resource schedules. First module UI is a private, separately gated RTL page. No Salon HR employee state, multi-resource constraints, POS posting, paid activation, email, client self-booking or authoritative V1 acceptance. SQL migration 013 is **CI only; none 010–013 authorized on VPS**. [Booking Core](../03-modules/BOOKING-CORE-V1.md), [review/CI](../04-execution/BOOKING-SLICE-2026-11-12.md). ADR-032 remains proposed.

> **2026-11-12 SHARED CUSTOMERS BOUNDED CONTEXT (STACKED PR):** Reusable Business-owned Customer Contact (Name, optional E.164 phone) is distinct from authentication Account, Salon Booking and regulated clinical records. SQL 012 composite Tenant/Business key/FK and scoped stored procedures revalidate a live K5 session and `customers.read/manage`; private RTL UI requires separate OFF-by-default Web and API flags. **No VPS SQL or customer data; no cross-Business dedup; no financial/Marketing activation.** See [Customers Core](../03-modules/CUSTOMERS-CORE-V1.md). Booking owns appointment records and uses scoped Customer IDs in a later independent PR.

> **2026-11-12 SHARED CATALOG TECHNICAL SLICE (PR, NOT CUSTOMER RELEASE):** Add a shared Business-owned Catalog bounded context (Categories, Products, Services, list price) in a modular monolith. Catalog SQL 011 uses composite Tenant/Business FKs and audited scoped create/list routines requiring live K5 session and catalog.read/manage branch permissions; only opted-in private Next.js module UI displays it. **No Salon-specific entity fields**; Booking/Customers will consume approved scoped references later. No POS invoice, tax, inventory, Accounting, SaaS Module activation, entitlements or published release claim. **Catalog and K5 flags stay OFF, no SQL 010/011 on VPS.** See [Catalog specification](../03-modules/CATALOG-CORE-V1.md) and [implementation report](../04-execution/SHARED-CATALOG-IMPLEMENTATION-2026-11-12.md). ADR-032 remains unapproved.

> **2026-11-11 ADR-030 FOUNDER-ACCEPTED BASELINE / K6C REVIEW-ONLY SQL+HTTP SLICE:** Server-trusted Tenant/Business/Branch identity, Allow-only Default Deny, composite SQL ownership/FKs, scoped data queries and negative isolation tests are accepted baseline architecture. **SQL Server RLS remains a separate decision.** K6C adds an explicit double-flag-gated `GET /api/workspaces/:businessId/branches/:branchId/modules/candidates`, backed by an empty Business-scoped SQL candidate table plus a session/RBAC-rechecking EXECUTE-only procedure. Candidate catalog metadata is **not** authoritative published/activated/entitled Module state; ADR-032 remains PROPOSED. SQL migration 010 and public auth **are NOT authorized for VPS rollout**. See [K6C review](../04-execution/K6C-SCOPED-BUSINESS-MODULE-CANDIDATES-2026-11-11.md) and [ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md). Historical phase-0 status lines below are dated architecture history, not a reversal of 2026-11-11 approval.

> **Architecture index (Phase 0):** [Master Architecture Map](DRVO-UNIVERSAL-ERP-ARCHITECTURE-MASTER-MAP-V1.md), [Kernel 03 Entitlements](PLATFORM-KERNEL-ENTITLEMENTS-AND-SUBSCRIPTION-BOUNDARY-V1.md), [Kernel 04 Audit and Contracts](PLATFORM-KERNEL-AUDIT-AND-CONTRACTS-BOUNDARY-V1.md), and [Foundation Readiness Gates](../04-execution/FOUNDATION-CLOSURE-AND-NEW-INDUSTRY-READINESS-GATES.md). These are documentation and design reviews; ADR-030/031/032 remain proposed.

> **FOUNDER-APPROVED LEAN KERNEL PRINCIPLE — [ADR-037](../05-decisions/ADR-037-LEAN-PLATFORM-KERNEL-BOUNDARY.md):** universal identity/scope/permissions and module governance belong to a small shared Kernel; POS/Accounting/HR and other Business-domain records/workflows remain with their Module owners. The [Kernel Boundary Map V1](PLATFORM-KERNEL-BOUNDARY-MAP-V1-PROPOSAL.md) is updated to show this principle accepted; **adjacent component placement and technical contracts are still working proposals**. No code, SQL or Production authorization.


> **NEXT KERNEL WORKING DRAFT (NOT ACCEPTED TECHNICAL DESIGN):** [Kernel 02 — Module Registry & Lifecycle Boundary](PLATFORM-KERNEL-MODULE-REGISTRY-AND-LIFECYCLE-BOUNDARY-V1.md) distinguishes Platform Module Release, Industry Solution, Business Activation, Commercial Entitlement and User Access; it preserves ADR-032 as PROPOSED. Documentation only.

> **PHASE-0 PRIMARY REVIEW: CORE ARCHITECTURE CONSTITUTION.** The founder wants the universal platform rules — one product, Modules with ownership, extensible Industry composition, strict Tenant isolation, versioned Contracts, functional+operational scale, security/financial integrity — settled **before** specialist Module design. Read [Core Architecture Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md) after the [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md). Detailed POS GL/paid module activation proposals in this document remain reference **drafts for later**, not Phase-0 required implementation decisions or signed-off strategies.

> **FOUNDATIONAL ARCHITECTURE CONSTRAINT (ADR-029):** [Founder Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) — one scalable ERP product, repeatably expandable to new Industries through Shared Modules / Extensions / conditional Domain Modules / Industry Solutions, designed for micro Businesses and enterprise workloads using **two independent scalability axes** (functional module composition AND validated operational/data capacity). Every major design must pass [Industry & Scale Fitness Gates](UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). V1 shared SQL Server/Modular Monolith is only a measured starting architecture, not an unlimited capacity promise.


**Updated:** 2026-10-28  
**Status:** Direction accepted; implementation architecture pending technical discovery.

> **2026-11-01 Phase-1 pre-code review:** The [Technical Decision Packet](PHASE-1-FOUNDATION-TECHNICAL-DECISION-PACKET.md), [Data and Contract Boundaries](FOUNDATION-DATA-AND-CONTRACT-BOUNDARIES-V1.md), [Technology/Migrations](TECHNICAL-STACK-AND-MIGRATION-BASELINE-V1.md), and [Standard Module Contract](STANDARD-MODULE-CONTRACT-V1.md) provide the first bounded implementation handoff. [Engineering Work Package](../04-execution/PHASE-1-FOUNDATION-IMPLEMENTATION-PACKET.md) gives slices and [Quality Gates](../04-execution/FOUNDATION-QUALITY-AND-TEST-PLAN-V1.md) gives test criteria. ADR-030/031/032 do not silently become accepted by this documentation.

## Design

Single repository, Modular Monolith. Explicit module boundaries and contracts, with shared platform services and strongly enforced tenant isolation.

### Platform

Authentication, tenants, businesses, branches, scoped memberships, permissions, entitlements and auditing.

### Module architecture — founder decision

**Every module must have a Core and Extension architecture, without exception.** The Core defines reusable capability; extensions implement industry or other specialized behavior. This is a strict design requirement, but **it does not yet prescribe one plugin per industry per module, particular package boundaries or mandatory no-op extension artifacts**. Those details require design approval and tests.

Examples:
- POS core: sale/cart/payment; salon extension: barber/service workflows; medical clinic extension: permitted billing workflows.
- Booking core: appointments/resource allocation; industry extensions: specialized resource/scheduling policies.
- Other modules: define core contract and valid extension surfaces in their individual specifications.

Avoid duplicating core logic and ad-hoc business-type conditions. Establish dependency direction, registries, extension lifecycle, tenant-specific activation and compatibility before implementation.

### Data

Initial shared tenant-aware SQL database direction, tenant/business/branch scopes and authorization applied server-side. Enforce relational tenant isolation and test cross-tenant access. Final SQL vendor and database-level RLS decisions are open.

### Module communication

Explicit synchronous APIs/contracts; domain events for cross-module reactions; transactions for critical invariants; outbox/idempotent consumers when needed.

### Mobile and locality

First release uses **responsive Web/PWA**. Offline capabilities, printing and synchronization remain open.

### Markets and industries

First barber salon edition (pilot: Cut Salon); medical clinic second, with sensitive data/compliance design before implementation. Both Egypt and Gulf are first-launch intended markets; jurisdiction-specific requirements remain open.

### Engineering safety

Migrations, least privilege, audit, backups, encrypted transport, tested auth and tenant isolation, CI/CD. No production implementation exists yet.

[Decisions](../05-decisions/DECISIONS.md) · [Open questions](../04-execution/OPEN-QUESTIONS.md).

## Founder-approved tenancy requirements (2026-10-28)

Tenant represents owner account, with multiple independently branded/accounted Businesses of possibly different industries. Each Branch belongs to one Business. Business customer directory and core pricing can be shared among Branches, while pricing overrides, stock, treasuries, shifts and scoped employee permissions exist at Branch level. Each Business chooses active modules and extensions; one module may have multiple compatible extensions. Shared database with strong tenant isolation. Tenant-scoped accounts (no account shared across Tenants), with separate per-Branch roles and sensitive audit history. See [Tenancy Architecture](TENANCY-ARCHITECTURE.md). Dependencies and detailed schema are still open.


## Independent visible application modules — founder-approved 2026-10-29

Every user-facing Module is an independent App in the Business launcher. Apps are still within the single Modular Monolith and shared SQL Server V1 database; code deployment and per-Business enablement are separate. See [ADR-015](../05-decisions/ADR-015-EACH-MODULE-INDEPENDENT-APP.md). The detailed Module Registry, Dependencies and communication contract design is [draft](MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md), not yet ratified.


## Multi-industry architectural direction — APPROVED 2026-10-29 (ADR-017/018)

Adopt Shared Platform Kernel + reusable Business Modules + bounded Industry Extensions + independent Vertical Domain Modules + versioned Industry Solutions + optional Integrations. **Do not** clone one siloed system per industry, and **do not** force unrelated domain workflows into one generic booking/sales extension merely because labels look similar. Each Module, including vertical-specific ones, retains deliberate Core + Extension design (ADR-006). Extensions adapt stable shared invariants; distinct aggregate lifecycles/medical privacy, course enrollment, property/deals or manufacturing MRP justify separate owned Modules. An Industry Solution composes compatible released Modules/extensions/configuration/roles, not executable customer-uploaded code. The chosen Solution is a customer entry point; active Modules remain individual app tiles (ADR-015). The combined required dependencies and fees use one explicit approval (ADR-016).

The future target is repeatable new-industry development and productization, not automatic readiness for all sectors. Salon/Cut Salon first, Clinic second. V1 still uses **one shared SQL Server database**, not one DB per industry. Later database pools or dedicated Enterprise placement are possible **only when measured and separately designed**; no SLA or scalability guarantee follows from choosing a Modular Monolith. See [Industry Solutions Architecture](INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [Industry Onboarding Playbook](../04-execution/NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md), [SaaS Scale & Control Center](SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md), [ADR-017](../05-decisions/ADR-017-SHARED-CORE-INDUSTRY-SOLUTIONS.md) and [ADR-018](../05-decisions/ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md).

**Status:** approved direction only; no code, migration or deployment authorized. Older text elsewhere in this baseline reflecting undecided SQL vendor or offline policy is historical and must be reconciled before implementation against later accepted ADRs.


## Primary architectural obligation — founder charter ADR-029 (2026-10-30)

All future platform work is subordinate to three strategic dimensions: (1) national-scale Egyptian ERP ambitions with one maintainable SaaS system, (2) repeatable industry onboarding and specialization with correct Core / Extension / independent Domain boundaries, and (3) micro-to-Enterprise functional choice **plus** independent performance/isolation/operational capacity. **Module count does not determine server scale**. Preserve a future tenant-placement / migration interface before locking large volumes into one shared SQL resource, without prematurely building per-client services/databases. Any design that creates bespoke industry forks, makes every customer buy/install all modules, or prevents future data placement evolution requires a blocker/exception ADR. Full criteria: [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md), [Fitness Gates](UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). Architecture intent only; SQL/scale evidence pending; implementation not authorized.


## FOUNDATION REVIEW STATUS — 2026-10-30

The accepted high-level architecture aligns with founder's three pillars but **is not yet implementation-ready** at several boundary details. [Foundation Gap Review](FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) itemizes 12 priority documentation gaps, including **P0** cross-Tenant/Business/Branch scope enforcement (incl. workers/cache/exports), POS first Accounting journal consistency and truth status, atomic priced module activation, domain ownership/event versioning and Core/Extension upgrade compatibility. [Core Contracts Proposal](FOUNDATION-CORE-CONTRACTS-PROPOSAL.md) is intentionally nonbinding; A=synchronous critical GL vs B=durable ACCOUNTING_PENDING remains OPEN. No executable validation or technical approval. This section strengthens ADR-029 Charter without changing the already accepted modular-monolith/shared-SQL-V1 direction.


## P0 Financial integrity before code — 2026-10-30

A proposed [Financial Consistency Contract](FINANCIAL-CONSISTENCY-CONTRACT.md) and [Financial Failure Matrix](FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) detail FND-02/FND-04 correctness (POS sale, first GL journal, tender/collection, stock cost, HR commission, refunds, offline sync, replay, closed periods). The two alternatives in [ADR-031 (PROPOSED)](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) are **A atomic sale+initial GL in V1 shared SQL (conditionally recommended)** and **B durable sale with GL_PENDING and guaranteed reconciliation barrier**. This choice is NOT approved and cannot be inferred from ADR-009–013 business rules. Multi-industry/tenant-safe correctness and real measured checkout latency are mandatory gates before implementation.


## P0 Module Activation & Financial Atomicity Review (2026-10-30)

[Financial Atomicity/Performance Decision Gate](FINANCIAL-ATOMICITY-DECISION-GATE.md) records what is needed to choose ADR-031 option A vs B with actual finance mapping, measured p95/SQL lock/cross-Tenant tests; **not accepted, no measured load**. [Module Activation Engine](MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md) and [50 Failure Cases](MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md) give the foundation the user needs to start with few Modules and add more without one-off code forks, price/permission fraud, invalid dependency DAGs or historical-data loss. [ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) is NOT final policy. FND-02/03/05 remain OPEN, and enterprise physical scale still requires independent tests. No code/SQL deployment.


## Founder platform identity clarification — ADR-033 accepted (2026-10-30)

[Business identity is industry-independent](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md). Tenant/Business/Branch authorization remains stable as one Business combines compatible Industry Solutions and Modules; distinct legal/financial Businesses retain separate books and grants. Primary industry is not permanent exclusive classification. [Three remaining policy proposals](CORE-CONSTITUTION-REMAINING-FOUNDATION-POLICIES.md) are not accepted. No schema/design implementation inferred.
