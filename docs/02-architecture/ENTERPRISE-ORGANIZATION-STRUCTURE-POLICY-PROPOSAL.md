# DRVO ERP — Enterprise Organization Structure (CONST-02)

**Date:** 2026-10-30  
**Status:** **PROPOSED — founder review; NOT approved, built, or production-tested.**  
**Scope:** Platform-wide organizational principles ONLY. No SQL tables, generic organization-engine implementation, module workflows, accounting journals, APIs or UI screen specs.  
**Read first:** [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) → [Core Architecture Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md) → [ADR-003](../05-decisions/ADR-003-tenant-model.md) and [ADR-033](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md).

## One-line proposed law

> **Enterprise-ready, small-business simple:** Preserve the existing Tenant → Business → Branch ownership/security baseline, while making enterprise corporate relationships an **optional, extensible organization layer**. Legal/financial ownership, operating sites, management/reporting relationships and authorization scopes must not be confused or forced into one rigid tree.

**العربي:** الشركة الصغيرة تستخدم Tenant → Business → Branch ببساطة. المجموعة الضخمة تقدر تنظم شركات تابعة ومجموعات وعلاقات إدارية من غير نسخة ERP مختلفة، ومن غير ما نستخدم Branch مكان شركة قانونية أو نخلط حسابات الشركات.

## Seven proposed platform rules

1. **Tenant = DRVO customer account and isolation boundary**, not automatically an individual legal company. An owner can manage multiple distinct Businesses inside one Tenant, as already established by ADR-003; authenticated access to any Business is still explicit.
2. **Business = the independently controlled operational/accounting ownership unit**. Its legal identity/financial books and permissions are not determined by its industry. ADR-033 already allows compatible Salon, Retail, Manufacturing, etc. activities in one Business. Distinct registered or independently accounted companies are modeled as distinct Businesses when relevant.
3. **Branch = an operational site or scoped operating unit of exactly one Business** in the V1 model. It is not a substitute for a subsidiary, new legal entity, separate books or a holding company. Particular sites (e.g., factory, warehouse, clinic location) may need domain-specific capabilities later without redefining the whole enterprise hierarchy.
4. **Enterprise Organization = optional relationship/structure layer** for a multi-Business group, possibly with additional reporting/management levels when justified. This is *not* a mandatory intermediate level for every customer, and it is not a second tenant or a duplicated ERP deployment. Relationships and group hierarchy must remain evolvable rather than require hard-coded `parentBusinessId` as the only possible structure. We do **not** approve an unconstrained recursive graph engine or physical hierarchy implementation at Phase 0.
5. **Separate four concerns:** legal entity identity, Business accounting/financial ownership, operating location, and management/reporting group. The same relationship should not be presumed to grant the same accounting or access consequences in all four.
6. **Cross-Business visibility, operations and consolidation require explicit scope/consent.** A Tenant owner, group manager, franchise operator or shared-services staff member does not inherit unlimited access just because a relationship exists; statutory books are never silently merged. Consolidated summaries may show authorized totals, but intercompany postings/transfers require purpose-specific approved domain contracts later.
7. **Modularity and capacity remain independent.** Micro Businesses are not forced to configure organization graphs or group reporting. Large multi-Business customers may add approved capabilities and require separate, empirically validated workload/SQL/tenant-placement scaling. Enterprise topology does **not** prove high transaction throughput or justify per-customer code forks.

## Test against three sizes (general rule only)

| Case | Minimum conceptual structure | Enterprise layer? |
|---|---|---|
| Independent one-chair salon | 1 Tenant → 1 Business → 1 Branch | No |
| Chain of 20 outlets under one legal/accounting Business | 1 Tenant → 1 Business → 20 Branches | Usually no |
| Holding with independent salon, manufacturer and importer companies | 1 Tenant → multiple separately scoped Businesses, each with authorized Branches | Optional corporate grouping/reporting relationships |
| Franchise network whose independent owners have their own accounts | Possibly **different Tenants** | **Future explicit federation/consent question**; not covered by automatic same-Tenant grouping |

## Guardrails / what this proposal does not do

- It does **not** rename a Branch as a subsidiary or allow one user's scope to cross Tenant/Business by default.
- It does **not** introduce a new compulsory UI step, subscription tier or dedicated Enterprise codebase.
- It does **not** settle whether a legal holding's subsidiary relationships or ownership percentages are stored as a tree, links or another structure.
- It does **not** approve cross-Tenant federation, shared identity, franchise data pooling, consolidated financial posting, intercompany accounting, VAT/legal-entity rules or multi-country Branch localization. Those require separate decisions and regulatory validation when necessary.
- It does **not** change ADR-003's existing initial Tenant → Business → Branch and shared database direction, ADR-033's Business ≠ Industry, or existing allow-only authorization commitments.
- It does **not** assert DRVO is technically ready for 50 companies/300 sites, because load, isolation, recovery and compliance are not yet empirically demonstrated.

## Founder approval question (one decision, no engineering detail)

**Approve this general architecture rule?**

> Keep V1 Tenant → Business → Branch as the simple default; preserve an **optional extensible organization/relationship capability** for holdings/subsidiaries and complex Enterprises, without conflating financial/legal boundaries, locations, reporting groups, or permissions.

If approved: record a short **ACCEPTED** ADR and minimally clarify the Constitution's Tenant/Business/Branch and scaling laws. If not approved: keep CONST-02 OPEN, adjust only the principle and avoid premature implementation design.

**No application code, database migration, tests, server, staging or production changes.**
