# DRVO ERP — Core Architecture Constitution
## The rules for building the platform, not the design of individual Modules

**Date:** 2026-10-30  
**Status:** **FOUNDER-CONFIRMED ARCHITECTURAL DIRECTION AND PHASE-0 FOCUS**. This document restates accepted platform principles; it does **not** approve any outstanding engineering implementation choice.  
**Applies to:** DRVO Platform, every Module/Extension/Industry Solution, all future engineers and AI agents.  
**Source of authority:** [Founder's Three-Pillar Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) and [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md). This Constitution makes the platform-level rules **short, usable and enforceable**; it does not replace the Charter or silently override other accepted ADRs.

> **DRVO ERP is one expandable ERP platform for different industries and companies of every size. We design the factory for building compatible Modules, not every future Module in advance.**
>
> **العربي:** إحنا بنبني مصنع يقدر يستقبل ويطوّر أي Module لأي صناعة، مع الحفاظ على نواة واحدة تخدم المشاريع الصغيرة جدًا والمؤسسات الضخمة. قواعد المنصة أولًا، وتفاصيل كل موديول عند تصميمه فعلًا.

## A. Non-negotiable mission: three pillars

1. **Egypt-scale product ambition:** Build one maintainable SaaS platform capable of growing across the Egyptian market; not one-off ERP clones for individual customers. Market leadership is a **goal**, not a proven result.
2. **Any industry by extensibility:** New industries are supported through reusable Core capabilities, bounded Extensions and independent Domain Modules when warranted, plus configurable versioned Industry Solutions. Each new industry still needs discovery, productization and legal/security validation.
3. **Any customer size through two separate forms of growth:** A micro Business starts with the smallest **valid** module mix; an Enterprise can add compatible functionality. Operational scale — databases, workload throughput, isolation, recoverability, compliance and support — is a **separate** capacity dimension proven by evidence, not by the number of Modules.

## B. The seven universal platform laws

### LAW 1 — One product platform, no customer-specific forks
- Keep one shared DRVO product codebase and one common platform foundation. Salon is the first Industry, **not** the boundary of the system.
- Variations belong in configuration, reviewed Extensions or genuinely distinct Domain Modules. A bespoke customer fork is a design failure by default.
- **Business identity is industry-agnostic (ADR-033 ACCEPTED):** one Business may operate several activities through compatible Modules/Extensions/Industry Solutions; a primary industry is a recommendation, not an exclusive permanent Business type. Separate true legal/financial Businesses when warranted; do not fuse their books or permissions.
- A future independently deployed component may be justified by measurable demands, not by fashion.

### LAW 2 — Modules are independent capabilities with real ownership
- A Module has a clear responsibility and ownership of its domain data and rules, with a **reusable Core and declared, bounded Extension points** (ADR-006).
- Separate *Module identity*, *visible App tile*, *industry solution*, *configuration* and *deployment*. Per founder ADR-015, each selected user-facing Business Module gets its own authorized App tile.
- A Module must not update another Module's authoritative records behind its back.

### LAW 3 — Expand through extensions; split a domain only when justified
- Shared behavior belongs in Core. Industry-specific variability belongs in reviewed Extension contracts where the underlying domain lifecycle stays stable.
- A truly different aggregate, security boundary, compliance obligation or state lifecycle may require an **independent Domain Module**, not an unsafe generic switch.
- Industry Solutions are **versioned compositions** of compatible existing Modules/Extensions, not a duplicated ERP for each industry.
- No speculative empty Modules, unnecessary per-industry scaffolds or untrusted arbitrary tenant-supplied executable plugins.

### LAW 4 — Isolate every Tenant, Business and Branch
- Tenant → Business → Branch ownership and server-enforced authorization are universal. A user's access to one Business or Branch never implies access to another.
- Default Deny + explicit membership and permissions govern *every* API, report, file, cache and background operation. Financial/sensitive data gets stronger checks where required.
- Isolation follows the data, including future Enterprise Tenant placement and migration; UI hiding is never a security control.

### LAW 5 — All components obey standard, evolvable contracts
- Every Module exposes declared, versioned boundaries for the interactions it actually needs; typed commands and domain events preserve data ownership.
- Version changes, extension conflicts and deactivation must not silently corrupt historical records or break existing Businesses.
- A Business activates compatible **already released** capabilities; customer activation does not upload unknown server code or run arbitrary database migrations.
- Required vs Optional dependencies are explicit, incompatibilities are rejected, and all Required app costs appear in **one approved bundle** (ADR-007/016).

### LAW 6 — Growth is designed and measured, never assumed
- **Functional growth:** recommend a customizable minimal valid Industry Starter, add Modules and Branches when needed, preserve existing data. A small Business is not forced to pay for/use all Apps.
- **Operational growth:** keep clear options for scaling workers, read workloads, SQL capacity, Tenant placement and recoverability as proven demand requires. V1 Modular Monolith + shared tenant-aware SQL Server is an **initial baseline**, not infinite scale.
- Every substantial design must consider a one-person Business, a multi-branch operation and a high-volume Enterprise. Never equate 30 Modules with higher capacity than 3.

### LAW 7 — Security, financial truth and reliability cannot be switched off
- Trustworthy role scope, audit, immutable historical financial effects, idempotent corrections/retries, disaster-recovery planning and privacy boundaries are **platform obligations**.
- If a financial operation is unfinished, the system must not claim it is paid, posted or reconciled. The exact journal transaction strategy belongs in the Accounting/POS technical design, **not this Constitution**.
- A disabled/expired optional App may stop new authorized features; it cannot erase posted history or silently abandon mandatory past obligations.
- Never claim "supported", "secure", "enterprise-ready" or "unlimited" based only on an architecture diagram; use signed scope and evidence.

## C. Simple architectural vocabulary

| Layer | Why it exists | Not its job |
|---|---|---|
| **Platform Kernel** | Identity, Tenant/Business/Branch, access, audit, module registry, subscription entitlements, shared operational protections | Customer-specific billing flow or industry logic |
| **Shared Business Modules** | Reusable business capabilities with independent ownership and Core/Extension contracts | Becoming one giant ERP God Module |
| **Extensions** | Narrowly adapt an existing capability to a sector, locale or workflow | Own unrelated aggregates, skip authorization/finance rules |
| **Independent Domain Modules** | New bounded lifecycle/security/domain when genuinely needed | One separate Module for every cosmetic industry difference |
| **Industry Solutions** | Versioned, customizable assemblies of released capabilities | Per-customer fork or separate source-code release |
| **Infrastructure / Operations** | Secure hosting, capacity, backup, observability and future placement growth | Pretending installing more Modules solves server scaling |

## D. One-page review test for EVERY major future design

Before approving a proposed Module, industry pack, platform change or integration, answer **only these seven platform questions**:

1. **Reusability:** Can other Businesses and industries use it without copying the product?
2. **Correct boundary:** Core behavior, bounded Extension, independent Domain Module or Integration — and **why**?
3. **Ownership:** Who owns its data/business rules, and how are cross-module contracts respected?
4. **Isolation:** Does it maintain Tenant/Business/Branch and least-privilege permissions everywhere?
5. **Small Business:** Can a micro Business avoid needless complexity without disabling required security/finance?
6. **Enterprise:** Will it remain evolvable, observable and scalable under large workload, with performance testing required when relevant?
7. **Evolution & recovery:** Can we upgrade, disable safely where possible, correct errors and preserve historical data?

Mark each design **PASS AS DIRECTION / NEEDS DESIGN / BLOCKED**; real release readiness additionally requires implemented tests and product/compliance evidence. A missing answer is a real open question, **not** an excuse to invent every low-level detail at Phase 0.

## E. Scope discipline: what we design NOW vs LATER

### NOW — Phase 0, platform foundations only
1. Approve a short coherent **Constitution** and mission; reconcile contradictory high-level rules across accepted ADRs without erasing history.
2. Decide only structural platform boundaries: Kernel, Shared Module, Extension, Domain Module, Industry Solution, data ownership, Tenant isolation, versioning/compatibility principle and functional-vs-operational scale.
3. Stress-test the Constitution **conceptually** against: micro Salon, multi-branch Salon group, large manufacturer, and future Clinic (including sensitive-data boundary). Record only gaps in **general platform rules**.
4. Produce a clear pre-code review of which cross-platform decisions are truly foundational and which belong to individual Modules.

### LATER — when a Module is explicitly designed/implemented
- Exact POS journal debit/credit flow, tender scenarios, refunds, tax entries and accounting state machine.
- Every Module's SQL tables, event payloads/enums, endpoints, UI states, extension hooks and migration scripts.
- Exact module billing prices, payment workflow, human approval role, each starter manifest and concrete dependency graph.
- Detailed performance numeric budgets and implementation/test reports.
- Art/animation details, screen layouts and production assets.
All prior deep drafts **remain accessible** but are **NON-BINDING technical working papers**, unless a specific rule is separately approved in its relevant ADR. They are not the mandatory Phase-0 conversation agenda.

**Examples of deferred drafts:** [Financial Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md), [Module Activation Engine](../02-architecture/MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md), [ADR-030 PROPOSED](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md), [ADR-031 PROPOSED](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md), [ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md). **Preserve accepted product rules inside older ADRs**, including offline credit/e-tender/stock/period policies: deferring low-level design does not overturn founder-approved behavior.

## F. Document authority and contributor rule
1. **WHY — Founder Charter** is the supreme mission and three strategic pillars.
2. **HOW — This Core Architecture Constitution** is the concise platform-wide rulebook.
3. **DECISIONS — Accepted ADRs** specify particular approved decisions; later proposed ADRs are proposals until explicitly adopted.
4. **WORKING DESIGNS — Blueprints, per-Module documents and test matrices** are specialist reference material, not universally approved policy.
5. **EVIDENCE — Implemented tests, security review and load/ops records** are needed to claim proven readiness.

When documents conflict, **do not guess a new rule, retroactively approve a proposal or silently erase accepted founder decisions**. Record the conflict and request an explicit, versioned ADR decision. Exceptions to a platform law require founder review, written reason and migration/exit plan. Every new contributor/Cursor/Codex process reads Charter → Constitution → ADR Register → task-specific documents.

**Current status:** founder explicitly confirms the **focus on universal architecture rules, not premature per-Module implementation detail**. No code, SQL, benchmarks, servers or Production changes authorized.


## G. First alignment and four-scenario review — 2026-10-30

[Constitution Consistency Review 01](../02-architecture/CORE-CONSTITUTION-CONSISTENCY-REVIEW-01.md) compared the seven laws with accepted architectural ADRs and found **no direct high-level normative contradiction among the reviewed decisions**. [Four-Scenario Stress Review](../02-architecture/CORE-CONSTITUTION-FOUR-SCENARIO-STRESS-REVIEW.md) tested the **principles conceptually only** against micro Salon, chain/multiple Businesses, large Manufacturing and future medical Clinic. The original review identified four general clarifications. **CONST-01 is now RESOLVED by founder-approved [ADR-033](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md): Business identity is independent of Industry and compatible multi-industry activity can coexist in a Business.** Three general questions remain OPEN: enterprise organization hierarchy, governed Extension ecosystem and industry/region release eligibility. See [remaining founder decision brief](../02-architecture/CORE-CONSTITUTION-REMAINING-FOUNDATION-POLICIES.md). A review does not certify runtime/security/compliance or settle deferred low-level Module contracts. No code.
