# ADR-035 — Governed Third-Party Extension Ecosystem

**Date:** 2026-10-30  
**Status:** **ACCEPTED — founder-approved platform architecture principle (Phase 0)**  
**Resolves:** CONST-03 — Trusted Extension Ecosystem  
**Related:** [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [Core Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md), ADR-006 (Core + Extension), ADR-019 (Domain Module boundaries), ADR-034 (optional Enterprise organization).

## Context
DRVO ERP aims to allow internal and independent developers to build reusable Extensions and Integrations while keeping one protected multi-tenant platform. Unreviewed executable customer packages with core runtime privileges would create tenant isolation, authorization, financial integrity and version compatibility risks.

## Decision — accepted general law

> **Open for Developers — Controlled by DRVO.** Independent developers may build DRVO-compatible Extensions using documented platform contracts. Any Extension executing *inside DRVO-managed platform runtime* must pass DRVO-controlled review, versioning, declared permission scope, compatibility checks and release approval before activation. External Integrations use official APIs and scoped credentials, not direct production database access.

1. **Developer openness:** The ecosystem permits third-party authorship and future distribution/marketplace capability; authorship alone never authorizes deployment.
2. **Controlled in-platform releases:** Internal and third-party executable Extensions follow an authorized review, test, version and publish lifecycle. No arbitrary Tenant-uploaded code runs with Kernel/server/SQL privileges.
3. **Scoped authority and ownership:** All Extensions obey Tenant/Business/Branch isolation, least privilege, domain ownership, financial integrity, audit and existing Core/Extension contracts. No implicit access to unrelated modules or businesses.
4. **Safe activation:** Business activation selects a pre-approved, compatible release/configuration; activation is distinct from deploying executable code. Mandatory dependencies, entitlements and historical obligations remain enforced.
5. **External Integrations:** Third-party services outside DRVO runtime connect only through supported APIs/events and explicitly scoped credentials; they are governed by integration authorization and operational security controls, not automatically by the same internal executable code-review procedure.
6. **Lifecycle governance:** DRVO may reject, suspend, disable or retire a dangerous/incompatible extension through defined safe processes, preserving historical records, audit trails and financial obligations. Revocation and recovery mechanisms require future design.
7. **No premature implementation commitment:** This decision does not select sandbox technology, SDK, signing, runtime packaging, marketplace business model or source review workflow.

## Not authorized
- Customer-supplied executable packages deployed directly to production.
- Extension access to core credentials, other Tenant data, or another Module's authoritative tables outside explicit approved contracts.
- Direct external integration access to DRVO's production database.
- A claim that a Marketplace, extension sandbox or third-party SDK exists today.
- Any application, SQL, worker, staging, VPS or production code change.

## Consequences
**CONST-03 is RESOLVED** as a cross-platform architecture principle. The existing seven Constitution laws receive minimal clarifications under Laws 3 and 5. **CONST-04 — Industry & Country Support remains OPEN**, subject to founder review. Detailed implementation and verification follow only when the ecosystem is actually designed and independently authorized.

**Implementation status:** Documentation only, Phase 0. No code, migrations, tests or Production deployment.
