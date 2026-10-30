# ADR-034 — Optional Enterprise Organization Structure

**Date:** 2026-10-30  
**Status:** **ACCEPTED — founder-approved platform architecture principle (Phase 0)**  
**Supersedes policy status:** CONST-02, formerly OPEN in the [Enterprise Structure policy brief](../02-architecture/ENTERPRISE-ORGANIZATION-STRUCTURE-POLICY-PROPOSAL.md).  
**Related accepted rules:** [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [Core Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md), ADR-003 (Tenant/Business/Branch), ADR-033 (Business identity independent of Industry).

## Problem
DRVO ERP must serve one-person shops and complex Enterprise groups in **one product codebase**. If we permanently limit the hierarchy to a rigid three-level tree, future holdings, subsidiaries, franchises and shared-service relationships could require a rebuild. If we add Enterprise complexity to every account, micro-Business onboarding becomes unnecessarily difficult. Legal entities, accounting ownership, operating locations and management/reporting relationships are not always the same hierarchy.

## Decision — accepted general rule

> **Enterprise-ready, Small-Business Simple.** Keep **Tenant → Business → Branch** as the straightforward V1 ownership/security baseline, and preserve a **separate optional, extensible Enterprise Organization/relationship capability** for larger groups. Do not conflate corporate relationships with accounting, location or access-control boundaries.

1. **Tenant:** DRVO customer account and isolation boundary. It is **not necessarily one legal entity**; it may contain multiple Businesses.
2. **Business:** separately controlled operational and financial ownership unit, with its own books and authorization. One Business can compose compatible industries (ADR-033). Create distinct Businesses when genuine legal or independently accounted entities warrant it, **not merely when industry differs**.
3. **Branch:** operational site or unit that belongs to a particular Business. It is **not** a substitute for a legally independent subsidiary or holding company.
4. **Enterprise Organization:** an **optional** enterprise grouping/relationship layer, potentially permitting more complex management and reporting relationships. It is not a compulsory intermediate entity for a micro-Business, a different ERP deployment, or a pre-approval of one particular hierarchy schema.
5. **Separate concerns:** legal entity, Business books/ownership, operating site, organizational management and reporting group are distinct concepts; an organizational link alone does **not** grant access or merge ledgers.
6. **Explicit cross-Business permissions and reporting:** consolidated visibility, intercompany transactions and shared management require their own authorized contracts; group membership alone cannot confer unlimited privileges or silently combine financial records.
7. **Scale remains separately proven:** the same architecture supports progressive complexity, but actual Enterprise throughput, compliance, tenant placement and reliability must be measured/validated. Extra organization levels or Modules are not a scalability benchmark.

## Illustrative outcomes (not delivered features)

| Business situation | Appropriate general model |
|---|---|
| One-chair salon | One Tenant → one Business → one Branch; no Enterprise layer |
| Twenty outlets under one legal/accounting company | One Tenant → one Business → multiple Branches; enterprise grouping optional |
| Holding with separate registered operating companies | Tenant → distinct Businesses/Branches; **optional** group relationships and explicitly permissioned reporting |
| Franchises with independent Tenant owners | Cross-Tenant federation/consent is **not approved by this ADR** and needs future design/approval |

## Explicitly NOT approved

- Additional mandatory Tenant→Group→Company→Branch hierarchy for all clients, any SQL table/entity design or universal recursive graph engine.
- Cross-Tenant identity federation, franchise owner data pooling, legal consolidated financial posting, intercompany accounting, regional taxation, multi-country Branch locale design.
- Implicit Tenant/holding owner privilege over every Business or sensitive domain.
- Any claim that DRVO already serves a specific Enterprise scale; no code, benchmark or operational test is authorized.

## Consequences for DRVO Constitution

**CONST-02 is RESOLVED as an architectural law.** The seven-law Constitution remains the top-level rulebook and gains only short clarifying text under Tenant isolation and growth laws. Specialist organization-management Modules and actual data structures are **deferred until warranted by a concrete product requirement**. Preserve existing ADR-003 and ADR-033, and never treat this general direction as a completed feature.

**Next Phase-0 founder questions still OPEN:** CONST-03 — governed Extension ecosystem; CONST-04 — verified industry/region release eligibility.

**Implementation status:** documentation only. No SQL, app code, staging, performance/security tests, VPS or Production changes.
