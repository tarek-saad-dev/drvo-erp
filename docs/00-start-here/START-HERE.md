# Start here — project handoff

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
