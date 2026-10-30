# ADR-036 — Global-Ready Platform with Verified Industry & Country Releases

**Date:** 2026-10-30  
**Status:** **ACCEPTED — founder-approved cross-platform architecture principle (Phase 0)**  
**Resolves:** CONST-04 — Industry & Country Support  
**Related accepted direction:** [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [Core Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md), ADR-017/018/019 (Industry Solutions and domain boundaries), [ADR-033](ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md), [ADR-034](ADR-034-OPTIONAL-ENTERPRISE-ORGANIZATION-STRUCTURE.md), [ADR-035](ADR-035-GOVERNED-THIRD-PARTY-EXTENSION-ECOSYSTEM.md).

## Context
DRVO ERP aims to grow beyond its initial Egyptian Salon pilot to multiple industries, jurisdictions and customer sizes without creating a separate ERP codebase for each market. A shared Module or Industry Solution being technically present is **not evidence** that its workflows, financial handling, privacy controls, taxation, local compliance and operational behavior are ready in another country. Conversely, hard-coding Egyptian or Salon assumptions into the Platform Kernel would obstruct global expansion.

## Decision — accepted general law

> **One Global Platform — Verified Industry & Country Releases.** DRVO's common product foundation must be designed to evolve across industries and jurisdictions. Actual commercial availability, activation and marketing of a particular Industry Solution / capability in a jurisdiction require a declared, validated support scope; global architectural potential must never be presented as already delivered or legally certified.

1. **One reusable global foundation:** DRVO maintains one coherent platform codebase and shared Kernel principles, without mandatory per-country or per-industry forks. Egypt and Salon are the first delivery targets, not permanent platform limits.
2. **Composable differences:** Industry-specific and country/localization variations belong in compatible, versioned Modules, bounded Extensions, configuration and published Localization contracts where justified. A genuinely distinct lifecycle, sensitive boundary or regulatory requirement may need an independent Domain Module. No unsafe universal switch or assumption that all countries share tax/privacy/accounting rules.
3. **Explicit release eligibility:** A supported combination is defined by the relevant released capabilities/Industry Solution, jurisdiction, required workflows, domain/security scope, finance/tax obligations, operational compatibility and limits as appropriate. Release/activation mechanisms must enforce validated combinations where safety or legal requirements demand it.
4. **Verification before claims:** Sector/market release requires documented fit-gap, security/privacy and financial assessment, applicable legal/regulatory validation by qualified owners, integration and operational testing, and clear known limitations. Product marketing may describe **future intent**, but must not claim unsupported combinations as live.
5. **Separation of organizational and jurisdiction concerns:** Multi-country enterprise groups remain supported as a *design direction* under ADR-034 with explicitly scoped rights/books and jurisdiction-aware eligibility. Do not assume one Business's current legal/financial/currency/timezone settings automatically work for all of its Branches across countries; cross-border Business operations and placements require their own future design and approvals.
6. **No implied cross-country or cross-industry equivalence:** A Salon release validated in Egypt does not certify a Clinic in Egypt or a Salon/Clinic in Saudi Arabia/UAE. Unsupported and partially supported combinations must be identified rather than silently enabled.
7. **Evolvable and evidence-based:** Country expansions, localization contracts, residency/hosting choices and version changes must preserve ownership, authorization, audit and financial history. A shared codebase does not imply one hosting location, universal throughput, an unlimited SLA or legal approval for every market.

## Illustrative scenarios (not released product claims)
| Scenario | Platform rule |
|---|---|
| Egyptian one-branch Salon | Can use a minimal valid released Salon composition **only when** that market/workflow has passed release gates |
| Salon company later expanding to Saudi Arabia | Reuse released shared capabilities; add and validate Saudi-specific localization/requirements before enabling that combination |
| Enterprise group with different legal entities in multiple countries | Distinct Business books/permissions, optional authorized group relations; country eligibility assessed per relevant operations |
| Future medical Clinic | Separate sensitive clinical domain where warranted; independent sector and jurisdiction privacy/compliance review before release |

## Explicitly NOT approved
- Claim of worldwide country/industry coverage, completed Egyptian/GCC tax or medical compliance, legal certification or verified Enterprise capacity.
- A mandatory country-per-codebase or country-per-database architecture; nor a guaranteed single-database global hosting solution.
- Universal cross-border single-Business accounting/locale behavior, implicit consolidated company books or cross-Tenant permissions.
- Specific jurisdiction compliance checklists, exact tax engines, schemas, locale inheritance, SDKs, API endpoints or deployment topology.
- Implementation, SQL migrations, tests, staging/VPS/Production changes, or permission to start product engineering.

## Consequences and next gate
**CONST-04 is RESOLVED at the architectural-law level.** Together with ADR-033 (CONST-01), ADR-034 (CONST-02) and ADR-035 (CONST-03), all four previously open Constitution-wide clarifications are accepted. The seven-law Constitution can be marked **V1 stable as design direction**, subject to a documented cross-platform consistency review. Detailed module/country approval, production readiness, and proposed ADR-030/031/032 remain independently pending.

**Implementation status:** Phase 0 documentation only. No feature, jurisdiction launch, security/capacity test or deployment has been performed by this decision.
