# ADR-033 — Business Identity Is Independent of Industry

**Date:** 2026-10-30
**Status:** **ACCEPTED — FOUNDER-APPROVED PLATFORM ARCHITECTURE RULE (Phase 0 design direction)**.
**Owner:** Founder
**Related:** [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md); [Core Architecture Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md); ADR-003, ADR-007, ADR-015–021, ADR-029; [Constitution Review](../02-architecture/CORE-CONSTITUTION-CONSISTENCY-REVIEW-01.md).

## Context
DRVO ERP must support any type of Business and size without duplicating ERP code or forcing customers to open another Business merely because they add another line of activity. A company can legitimately sell retail goods, offer booked services and manufacture products under one operating/legal entity. Conversely, a group owner may own multiple distinct legal or financially independent Businesses. A mandatory single `industry` enum attached to every Business would incorrectly impose a fixed choice and make future cross-industry composition brittle.

## Decision — accepted general platform law

> **Business identity and its legal/financial/security boundary are separate from its industry classification. Industry classification guides onboarding and recommendations; it does not imprison a Business in one Industry Solution.**
>
> **الـBusiness مش هو الـIndustry. الشركة الواحدة تقدر تجمع أنشطة وموديولات متوافقة من صناعات مختلفة، من غير نسخة ERP جديدة ومن غير إنشاء Business جديد لمجرد تغيير النشاط.**

1. A **Tenant** may own multiple independent **Businesses**. Each Business retains its own accounting/security/organizational boundaries and authorized branches.
2. **One Business may operate several industry activities/capability sets** through compatible Shared Modules, Extensions and, where needed, independently owned Domain Modules. The architecture must not assume every Business has exactly one unchangeable industry.
3. A Business may have a **primary industry/Industry Solution** for onboarding, recommendations and presentation, but that label is **non-exclusive**, not a domain authorization key or a hard requirement that controls all other available modules.
4. An **Industry Solution is a versioned, customizable composition**, not a separate ERP, a legal entity, a mandatory single enum, a source-code fork or a replacement for independent authorized App tiles.
5. **Do not duplicate shared functionality** when combining industry solutions: use existing authorized compatible Module capabilities; enforce Required/Optional dependencies, conflicts and explicit total pricing/consent already accepted in ADR-007/016. Exact compatibility rules/manifest fields are deferred.
6. Separate **Businesses when genuine legal, statutory accounting or explicitly independent financial/security ownership requires separation**, not simply because the business description contains two industries. If a legal group needs consolidation, it must be an authorized separate reporting/workflow contract, not silent merged ledgers.
7. One Business combining multiple activities **does not remove financial correctness, privacy, tenancy/branch RBAC or regulated-sector safeguards**. Modules with medical/regulated data still have their own protected boundaries.
8. Business and Tenant structures must remain conceptually extensible for future enterprise group hierarchies; **ADR-033 does not itself approve a new Holding/Subsidiary hierarchy**, physical SQL model or one-Business multi-country tax handling.

## Examples (design guidance, not enabled/shipped modules)

| Case | Model |
|---|---|
| Hair salon that sells cosmetics and appointments under the same company/books | **One Business** with compatible Salon, Retail and scheduling capabilities |
| A manufacturer that imports/sells goods under the same accounting entity | **One Business** with reusable stock/sales/accounting plus justified independent manufacturing/import domains |
| Owner of a separate salon company and an independently registered/importing company | **Two Businesses under one Tenant**, each with independent books and explicit membership |
| Franchise and parent company whose legal/ownership boundaries differ | Determine distinct Business boundaries during enterprise onboarding; group links/ownership and consolidation need separate approved general policy |

## Boundary with earlier ADRs
- **Extends and clarifies, not overturns:** ADR-003 Tenant → Business → Branch; ADR-017/019 Industry composition and conditional domain ownership; ADR-020/021 customizable recommended starter; ADR-015/016 app tiles and full priced dependency consent.
- **Explicit non-decision:** exact Business/Solution association schema, simultaneous solution enrollment UI, industry tags, Branch activity assignment, license/pricing, country-specific legal entities, or particular Module version compatibility policies.
- This **resolves CONST-01 at general platform law level**. It does NOT resolve CONST-02 (enterprise organization hierarchy), CONST-03 (extension ecosystem governance) or CONST-04 (region/industry supported eligibility), which remain founder-level policy questions.

## Constitution fitness (ADR-029)
- **Egypt-scale:** one product codebase with reusable capabilities rather than industry clones.
- **Any industry:** composable, versioned offerings without hardwiring an exclusive Business industry type.
- **Micro to Enterprise:** one simple valid starter for micro businesses; additional activities/capabilities grow over time without mandatory new legal entities; operational capacity still requires independent proof.

## Implementation gate
**Accepted platform direction only.** No SQL schema, application code, migration, runtime plugin, benchmarks or Production changes authorized. Module-specific workflow and compatibility details are designed when that Module/Industry Solution is actually taken into delivery.
