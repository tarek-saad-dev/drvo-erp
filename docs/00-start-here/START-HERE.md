# Start here — project handoff

> **LATEST ACCEPTED CONSTITUTION DECISION (ADR-033):** [Business identity is independent of Industry](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md): one Business may mix compatible industry activities; create separate Businesses for real legal/financial ownership boundaries, not industry labels. The other three general platform questions remain proposals in the [Foundation Policy Brief](../02-architecture/CORE-CONSTITUTION-REMAINING-FOUNDATION-POLICIES.md). No code authorization.

> **CURRENT PHASE-0 FOCUS: PLATFORM CONSTITUTION, NOT PER-MODULE DESIGN.** Read [Founder Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) **then** [DRVO Core Architecture Constitution](DRVO-CORE-ARCHITECTURE-CONSTITUTION.md). Seven universal platform rules govern; specialist POS/Accounting/Tender/Activation draft contracts are parked until their relevant Module work. This supersedes their priority as the **immediate work queue**, NOT existing founder-approved business decisions. No app code authorized.

> **READ FIRST — FOUNDER'S NON-NEGOTIABLE 3-PILLAR ARCHITECTURE CHARTER:** [DRVO ERP Project North Star](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md). All future Modules, Industry Solutions, pricing and infrastructure architecture must pass its universal-industry / micro-to-enterprise / Egypt-scale review. The mission is design intent, not a proven capacity claim. [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md).


**Project:** DRVO ERP  
**Baseline date:** 2026-10-27  
**Phase:** 0 — documentation / architecture  
**Implementation:** not started

DRVO ERP is a new multi-tenant, multi-industry, modular ERP SaaS product. Cashier POS remains separate and operational; useful features may be adapted after review. DRVO's UI direction is **inspired by Odoo**, not a verbatim copy.

The initial implementation strategy is a **modular monolith** with a shared POS core and optional industry extensions. Salon is the first vertical, **medical Clinic is the second approved direction** (superseding the obsolete Retail-second plan); medical data/compliance requirements need separate discovery.

## Handoff checklist

Before planning or coding, read:
- **[Founder Architecture Charter — FIRST](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md)**
- **[DRVO Core Architecture Constitution — SECOND](DRVO-CORE-ARCHITECTURE-CONSTITUTION.md)**
- **[Universal ERP Scale & Industry Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md)**
- [Current state](CURRENT-STATE.md)
- [Architecture](../02-architecture/ARCHITECTURE.md)
- [Decisions](../05-decisions/DECISIONS.md)
- [Open questions](../04-execution/OPEN-QUESTIONS.md)
- [Roadmap](../04-execution/ROADMAP.md)
- [Modules](../03-modules/MODULES.md)

Before editing: identify impacted docs, tests and architecture. After editing: update status, changelog, ADR(s), roadmap and implementation evidence as appropriate. Never claim deployment without verification.

**Repository:** https://github.com/tarek-saad-dev/drvo-erp


## Phase-0 foundation review — 2026-10-30 (MANDATORY before implementation)

Before treating the current architecture as build-ready, read the [Foundation Architecture Gap Review](../02-architecture/FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) and [Core Contracts Proposal](../02-architecture/FOUNDATION-CORE-CONTRACTS-PROPOSAL.md). The founder charter direction is accepted, but tenant-scoped resource/worker isolation, POS first journal consistency, atomic dependency/paid activation, Module compatibility and enterprise workload proof are NOT yet finalized or tested. Review findings are proposals/risks, not production bugs or approved schemas. No code is authorized.


## Tenant Isolation first security design gate — 2026-10-30

Read the [Tenant/Business/Branch Isolation Contract](../02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md), [40 negative threat and test scenarios](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md), and [PROPOSED ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) before any scoped API/SQL/worker implementation. Approved product-level identity and default-deny roles are preserved, but detailed FK/RLS, Support/Manager delegated powers and data movement are not yet signed off. **No code or security tests performed.**


## P0 Financial Source-of-Truth Gate — 2026-10-30

Before implementing POS, Accounting, Treasury, Inventory, HR commissions or offline financial sync, read [Financial Consistency Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md), [46 Failure/Recovery Tests](../02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md), and [ADR-031 (PROPOSED)](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md). The first mandatory POS GL journal **A atomic vs B durable pending** is still unresolved; no single `POSTED/PAID/RECONCILED` shorthand and no customer screenshot as provider settlement. Founder product rules ADR-009–013 remain binding but no code/testing authorized.


## Financial journey — mandatory before any implementation (2026-10-30)

New [End-to-End Sale-to-Ledger Design](../02-architecture/SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md) traces one authorized POS operation through typed Sales/Accounting boundary, deterministic replay, Outbox Stock/HR/Treasury obligations, distinct receipt/GL/payment/cost statuses, refunds and offline/late-period reconciliation. [Tender Mapping & Close Gate Review](../02-architecture/FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md) **does NOT approve any chart of accounts, tax accounting or final posting policy**. ADR-031 remains proposed; Option A vs B needs formal founder/accountant/architect review. No code or tests.


## Next platform foundation: Business-scoped Module Activation Engine — 2026-10-30

**Read before any registry, billing/entitlement, Apps catalog, activation/disable/upgrade or Industry Solution code:** [Module Activation Dependency Contract](../02-architecture/MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md), [50 Concurrency & Failure Tests](../02-architecture/MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md), [ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md). The founder-approved required full-bundle priced preview/one consent is NOT blanket authorization to implement the proposed state machine, paid approver roles, payment policy or specific Salon graph. Financial first GL A/B is additionally gated by [Atomicity/Performance Decision Gate](../02-architecture/FINANCIAL-ATOMICITY-DECISION-GATE.md), and remains OPEN. No implementation/testing authorization.


## Core Constitution high-level review — current work (2026-10-30)

Read [Consistency Review 01](../02-architecture/CORE-CONSTITUTION-CONSISTENCY-REVIEW-01.md) and [Four-Scenario Stress Review](../02-architecture/CORE-CONSTITUTION-FOUR-SCENARIO-STRESS-REVIEW.md) before investigating specialist Modules. The seven laws align with reviewed founder-accepted architecture ADRs as a **direction**, the earlier four-question snapshot now has **CONST-01 RESOLVED by ADR-033 (multi-industry one Business)**, while three general policy questions remain open: enterprise org structures beyond V1 Tenant→Business→Branch, approved Extension ecosystem governance and industry/country verified eligibility. Preserve existing decisions; do **not** prematurely accept implementation designs or claim operational tests were run.
