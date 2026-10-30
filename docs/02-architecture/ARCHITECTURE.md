# Architecture baseline

> **NEW PHASE-0 WORKING DRAFT — NOT ACCEPTED:** [Platform Kernel Boundary Map V1 (Founder Review)](PLATFORM-KERNEL-BOUNDARY-MAP-V1-PROPOSAL.md) separates universal platform control (identity, trusted scope, authorization, module governance, entitlements, audit) from Business-domain owners and adjacent platform productization. This is a logical ownership proposal, not SQL/service boundaries or permission to code.


> **PHASE-0 PRIMARY REVIEW: CORE ARCHITECTURE CONSTITUTION.** The founder wants the universal platform rules — one product, Modules with ownership, extensible Industry composition, strict Tenant isolation, versioned Contracts, functional+operational scale, security/financial integrity — settled **before** specialist Module design. Read [Core Architecture Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md) after the [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md). Detailed POS GL/paid module activation proposals in this document remain reference **drafts for later**, not Phase-0 required implementation decisions or signed-off strategies.

> **FOUNDATIONAL ARCHITECTURE CONSTRAINT (ADR-029):** [Founder Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) — one scalable ERP product, repeatably expandable to new Industries through Shared Modules / Extensions / conditional Domain Modules / Industry Solutions, designed for micro Businesses and enterprise workloads using **two independent scalability axes** (functional module composition AND validated operational/data capacity). Every major design must pass [Industry & Scale Fitness Gates](UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). V1 shared SQL Server/Modular Monolith is only a measured starting architecture, not an unlimited capacity promise.


**Updated:** 2026-10-28  
**Status:** Direction accepted; implementation architecture pending technical discovery.

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
