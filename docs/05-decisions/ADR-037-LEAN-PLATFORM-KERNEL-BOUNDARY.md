# ADR-037 — Lean Platform Kernel and Independent Business-Domain Ownership

**Date:** 2026-10-31  
**Status:** **ACCEPTED — founder-approved platform responsibility boundary (Phase 0)**  
**Founder decision:** Prefer a **Lean Platform Kernel**: universal cross-industry platform responsibilities in the Kernel, while operational Business logic and its authoritative records remain in independently owned Modules.  
**Related:** [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [Core Constitution V1](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md), ADR-002/003/006/007/015–021/029/033–036, [Kernel Boundary Map (working design)](../02-architecture/PLATFORM-KERNEL-BOUNDARY-MAP-V1-PROPOSAL.md).

## Context
DRVO must share one protected product foundation across tiny Businesses, complex Enterprises, industries and countries. A Kernel that absorbs POS, Accounting, HR, industry localization and every Business workflow would become a giant dependency bottleneck, undermine domain ownership and force frequent core changes as industries expand. A Kernel with no central control of scope, authorization and capability governance would instead threaten consistency and multi-tenant safety.

## Decision — accepted architectural principle

> **Lean Platform Kernel: universal control, not a universal Business engine.** The Kernel defines and enforces shared platform identity, trusted Tenant/Business/Branch scope, authentication and authorization, Module/release/compatibility governance, entitlement/eligibility gates, and common auditable contract/security requirements. Independently owned Business Modules define and control their own operational lifecycles, financial domain effects and authoritative business records.

1. **Universal responsibilities only:** Kernel responsibilities apply consistently to every relevant Business, industry and country; no Salon/POS/Clinic/manufacturing workflow or country tax implementation becomes a hard-coded Kernel rule.
2. **Trusted scope and governance:** Tenant → Business → Branch ownership and server-authorized membership, authentication, least privilege/Default Deny, approved module release/activation eligibility and trusted security audit boundaries are common platform obligations.
3. **Modules own Business truth:** POS owns sale lifecycle, Accounting owns ledger/journal semantics, Treasury owns its cash/bank operations; Booking, HR, Inventory and future Clinical/MRP Modules retain distinct ownership and Core+Extension contracts. The Kernel neither posts GL entries nor directly mutates Module-owned operational tables.
4. **Contract-first collaboration:** Modules and Extensions use typed, versioned and scoped contracts or domain events; one shared SQL Server does not imply shared authority to write each other's records. Kernel governance does not allow cross-Tenant or cross-Business data access.
5. **Separate conceptual concerns:** Software release, Business activation, entitlement validation, financial truth and compliance eligibility are distinct. A paid-plan entitlement gate is universal, but detailed DRVO commercial subscription invoicing/settlement, Industry Solution composition, country localization delivery, UI shell and operational monitoring are **not automatically Kernel business logic**. Their exact logical owner/package placement remains a future design choice, subject to the same platform laws.
6. **No mega-app or forced topology:** The Kernel is not a mandatory Business app tile, standalone microservice, separate database or particular package structure. The approved V1 Modular Monolith with shared tenant-aware SQL Server remains compatible with this logical boundary.
7. **Safe evolution:** New industries, countries, Extensions and Enterprise organizations can add compatible independent capabilities without forking or granting new implicit privileges. Financial posted history, scope, security and release compatibility remain protected.

## Explicitly out of scope / not approved by ADR-037

- Detailed physical Kernel package boundaries, tables, SQL FK/RLS choices, auth tokens/role evaluation algorithms, SDKs, APIs, event envelopes, deployment or tenant-placement implementation.
- A particular Industry Solution catalog ownership placement, commercial billing implementation, tax engine or UX shell package.
- An implicit decision on the technical proposals [ADR-030](ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) (isolation mechanism), [ADR-031](ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) (POS→GL atomic vs pending) or [ADR-032](ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) (activation coordinator/financial approval). They remain **PROPOSED**.
- Claim of implemented, benchmarked, security-certified or production-ready Kernel.

## Consequences and next design step

The **Lean Kernel responsibility boundary is ACCEPTED**; the detailed placement/contract matrix in the linked Kernel Map remains working architecture for separate review and must not be silently elevated to accepted physical design. Next, refine **Kernel Identity / Tenancy / Trusted Scope / Authorization boundary** by separating pre-existing approved founder behavior from technical open questions. Later address Registry & Lifecycle, entitlement/eligibility, trusted audit/contracts, then adjacent platform capabilities.

**Implementation status:** **Documentation-only Phase 0.** No source code, SQL, tests, CI, staging, VPS or Production changes authorized.
