# DRVO ERP — Core Architecture Constitution: Consistency Review 01

**Date:** 2026-10-30
**Status:** PHASE-0 DOCUMENTATION REVIEW, not a production architecture certification or new accepted ADR.
**Founder-approved focus:** verify the general rules governing the **platform that can produce any compatible Module**, not predesign every Module's tables, transactions, billing steps or UI.
**Authority:** [Founder Three-Pillar Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) → [Seven-Law Core Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md) → [Accepted ADR Register](../05-decisions/DECISIONS.md).

## 1. Scope and method

Checked the Constitution against approved architectural directions: ADR-002/003 (Modular Monolith + shared Tenant model), ADR-006/007 (Module Core/Extensions + required/optional dependencies), ADR-015/016 (independent user-facing Apps, full priced Required bundle with explicit approval), ADR-017/018/019 (Shared Domains, Industry Solution compositions, conditional independent Domains, repeatable new industry intake), ADR-020/021 (minimal valid Business setup, customizable recommended starter, comprehensive Salon commercial V1), and ADR-029 (founder mission and functional **versus** operational scale).

Also checked that ADR-030/031/032 are still **PROPOSED** and that specialist drafts have **not** accidentally become platform laws. This is a **document comparison**, not a source-code audit, industry certification, security penetration test or scalability benchmark.

## 2. Seven-law alignment results

| Constitution law | Supported by accepted direction | Finding |
|---|---|---|
| 1. One platform / no client forks | ADR-002, ADR-017, ADR-018, ADR-029 | **ALIGNED.** Modular Monolith V1 and future justified isolated enterprise deployment are compatible: different infrastructure placement does not imply a product-code fork. |
| 2. Independent Modules with ownership | ADR-006, ADR-015, ADR-017, ADR-019 | **ALIGNED.** Separate user-facing App tile does NOT imply independent process/DB. Every Module defines Core+Extension without forced empty extension implementation. |
| 3. Safe Extensions and independent Domains when necessary | ADR-006, ADR-017, ADR-019, ADR-020 | **ALIGNED.** No mandatory one Domain Module per industry and no giant Core with conditionals. Clinic privacy / future Manufacturing are design lenses, NOT shipped modules. |
| 4. Tenant / Business / Branch isolation | ADR-003, ADR-017, ADR-029 and founder-approved tenancy/RBAC direction | **ALIGNED AS POLICY.** Physical SQL/RLS/worker details not approved or tested. |
| 5. Standard evolving contracts | ADR-006, ADR-007, ADR-016, ADR-017/019/021 | **ALIGNED.** Platform release and per-Business activation distinct; exact version/Extension hook mechanics still deferred. |
| 6. Functional **and** technical scale | ADR-002/003, ADR-018, ADR-020/021, ADR-029 | **ALIGNED.** Minimal valid per-Business activation and comprehensive commercial Salon V1 are different scopes; more Modules never proves more SQL throughput. |
| 7. Security, finance and reliability are mandatory | ADR-003, ADR-007, ADR-016/020/021, ADR-029 | **ALIGNED AS DESIGN OBLIGATION.** Exact first POS/GL transaction (ADR-031 proposed), tenant RLS (ADR-030 proposed), activation lifecycle (ADR-032 proposed) NOT accepted or empirically validated. |

**Overall document-alignment verdict:** `ALIGNED AT THE HIGH-LEVEL / NEEDS CLARIFICATION FOR FUTURE EDGE CASES`. No discovered direct **normative** contradiction among the reviewed accepted platform decisions. This does NOT mean implementation-ready or guaranteed universal fit; a finite docs review cannot prove the absence of contradictions in all project documents.

## 3. Important apparent conflicts — resolved by scope, NOT new policies

| Looks contradictory | Correct existing interpretation |
|---|---|
| Every Module requires Core+Extension vs "no unnecessary placeholders" | Design genuine and documented extension points, not a mandatory fake/no-op extension package for every module (ADR-006/019). |
| Every App independent vs Modular Monolith shared SQL | User-facing Module/App identity is NOT a deployment topology requirement (ADR-015/002). |
| One platform vs dedicated enterprise deployment | Same product/contracts may be deployed with dedicated resources in future if evidence requires; not a separate industry/customer fork (ADR-018/029). |
| Any Business may start with fewer modules vs comprehensive Salon commercial V1 | Customer-selected functionality is distinct from the full feature set DRVO must develop for the platform's Salon commercial release (ADR-020/021). |
| Industry can be any sector vs Clinic data cannot live in generic Booking | "Any" means a reusable process to build/validate new domains, NOT instant availability or universal data model (ADR-017/019/029). |
| "Financial integrity mandatory" vs Accounting visible App could be unsubscribed | Protected integrity obligations cannot be bypassed by disabling an app tile; exact catalog/billing implementation deferred (ADR-020/021). |
| Many test matrices exist vs Phase 0 should be platform-level only | Test matrices/ADR-030/031/032 remain specialist **PROPOSED reference** until their domain design phase; accepted old business behavior remains accepted. |

## 4. True general-platform clarification candidates (NOT yet founder-approved)

**C-01 — Multiple industries within one Business / cross-industry group.** We already support several Businesses per Tenant, even from different industries. Still need an *explicit platform rule* for the case where **one legal Business** combines multiple activities (e.g. retail + salon + services). Do not force a single hardcoded `industry` enum to determine all permissions and Core behavior. Consider industry composition and compatibility rather than immediate approval of multi-Solution assignment. Final supported combinations/markets later.

**C-02 — Enterprise organizational complexity.** Tenant → Business → Branch is accepted V1 hierarchy, but a huge company may require subsidiaries, several legal entities, holding-level reporting, franchises, cross-country management or shared-service permission groups. Do NOT silently reclassify a legal entity as Branch or add unlimited hierarchy today. The general rule should preserve extensibility of organizational and scope boundaries, with explicit cross-Business read/transaction contracts when needed; detailed hierarchy is a future ADR.

**C-03 — Future extension ecosystem governance.** A Module's extension surface must remain reviewed, versioned and least-privilege. A public marketplace or external developer can later contribute **validated platform-released packages/integrations**, not arbitrary customer-submitted server code executing under DRVO privilege. Approval, compatibility, isolation, rollback and deprecation rules are platform concerns; exact plugin sandbox/provider-specific architecture deferred.

**C-04 — Country/industry compliance as capability eligibility.** Different industries/regions require privacy, accounting/tax, retention, consent and localization checks. Industry and Module activation should depend on **declared verified scope of support** rather than product marketing labels. No assumption that Egypt readiness automatically means all Gulf countries or that Salon readiness includes Clinic. Specific tax laws and country launch rules defer.

**C-05 — Cross-platform portability and exit as growth safety.** Founder Charter already calls for data export and later Tenant placement. Preserve a general rule that ownership/audit/financial lineage survive migration, upgrade or support-tier change; do NOT pick a database-splitting implementation in Phase 0.

All candidates are **general clarification/open decisions**; existing founder ADRs remain in force. Do not amend the Constitution or publish accepted ADRs based on recommendations alone.

## 5. What should NOT occupy Phase 0
- POS invoice journal Debit/Credit mapping, e-transfer proof accounts, tender/cash state enums and SQL transaction A/B selection.
- Exact Module activation CAS/lock, data migration scripts, payment provider code or package manifest fields.
- Salon product/service UI and detailed Extension hook lifecycle; Clinic clinical schema and medical consent workflow.
- Benchmarks and exact enterprise SLAs (need technical implementation and authorized test evidence).

These belong to dedicated Module/ops delivery phases. Their existing detailed documents remain linked historical working papers, not deleted or elevated into binding general law.

## 6. Next review gate
Run [Four Scenario Constitution Stress Review](CORE-CONSTITUTION-FOUR-SCENARIO-STRESS-REVIEW.md). Then write **only** short founder-level proposed clarifications for C-01 through C-04 if needed, with scope/compatibility impacts; leave C-05 covered by existing Charter unless an actual contradiction emerges. Do not generate more technical module-level drafts as a response to these general questions.

**No app code, SQL migrations, runtime tests, VPS or Production changes.**


## Post-review founder decision — ADR-033 accepted (2026-10-30)

This report is a **point-in-time assessment**; its earlier C-01 proposal has now been explicitly resolved by [ADR-033 ACCEPTED](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md). One Business may combine compatible industry capabilities without copying ERP or creating another Business solely because its industry changes. Keep actual legal/financial separation and security guarantees. **C-02/03/04 remain OPEN** in the [Founder Policy Brief](CORE-CONSTITUTION-REMAINING-FOUNDATION-POLICIES.md). C-05 remains covered by the original Charter. No code, tests or operational readiness claims.
