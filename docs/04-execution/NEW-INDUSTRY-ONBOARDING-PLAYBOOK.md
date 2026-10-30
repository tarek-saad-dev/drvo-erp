# DRVO ERP — New Industry Solution Intake, Delivery and Productization Playbook

> **2026-10-31 architecture route:** [Master Architecture Map](../02-architecture/DRVO-UNIVERSAL-ERP-ARCHITECTURE-MASTER-MAP-V1.md) determines Kernel vs Module vs Extension vs Independent Domain vs Integration ownership. [Foundation Closure and New-Industry Gates](FOUNDATION-CLOSURE-AND-NEW-INDUSTRY-READINESS-GATES.md) distinguishes approved rules from unresolved engineering sign-off. This Playbook remains the sector intake process, not proof any sector is already ready for release.

> **FOUNDATIONAL MANDATE (ADR-029):** This is the controlled process to extend one DRVO platform to new industries without untested universal support claims. Each intake must pass [Founder Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) and [Industry/Scale Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md): fit-gap plus independent workload/security/enterprise readiness, not merely an app list.


**Date:** 2026-10-29
**Status:** APPROVED PROCESS DIRECTION via ADR-018. Per-client steps, contracts, capacity and effort estimates are examples/plans.
**Goal:** repeatedly enter new business industries without cloning entire ERP products.

## Industry lifecycle, owned outputs and exit gates

| Stage | Activities | Evidence/output | Exit gate |
|---|---|---|---|
| 0. Intake & fit | Identify company/sector/country/size, legal constraints, volume and willingness to standardize | Opportunity brief | Product owner chooses discovery |
| 1. Discovery | Interviews with domain experts and frontline staff; map current system/process, exceptions and controls | AS-IS/BPMN or workflow map, regulatory/data risk list | Stakeholder sign-off on problem |
| 2. Fit-Gap | Compare capabilities with released DRVO Shared Modules and existing Extensions; classify per use case | Reuse/Extend/New Module/Integration matrix; risk/cost | No unsafe Core overloading |
| 3. Domain design | Entities, invariants, states, ownership, user roles, data retention and critical journals | Bounded contexts, data and event contracts | Finance/security review |
| 4. Solution design | Proposed IndustrySolution template, module dependencies, activation and entitlements, country rules | Versioned manifest proposal, UX prototype, pricing/rollout | Explicit product+client approval |
| 5. Engineering plan | Implement Domain Modules/extensions/integrations behind stable contracts in platform code | Work packages and migrations/compat tests | No implementation before founder authorization |
| 6. Integration and testing | Per-module unit/contract, cross-Tenant, finance, performance/security tests and external integrations | Test evidence, defect log, UAT plan | Acceptance criteria met |
| 7. Migration & cutover | Cleansed data, opening balances, reconciliation, runbook, training, pilot and rollback | Cutover validation and customer sign-off | Production readiness |
| 8. Productization | Remove client IDs/assumptions, extract general defaults and supported configuration, version Solution | Reusable Industry Solution catalog entry | Second-customer repeatability check |
| 9. Maintenance | Support, compatibility testing, release upgrades, billing/usage and lifecycle observability | Release/support SLAs per actual contract | Sustainable ownership |

## Worked hypothetical: large Egyptian timber importer, supplier and manufacturer

### Discovery checklist
- Organization: subsidiaries/Businesses, warehouses, factories, branches, dimensions/units, roles, approval limits, project or order costing, locales/currencies and reporting needs.
- Imports: overseas vendors, purchase contracts, currency exchange, inbound shipping, customs/taxes, incoterms, landed costs and receiving quality.
- Inventory: wood species/grade, measurement units (m3, length, thickness), warehouses/locations, serial/batch where needed, conversion, shortages, valuation.
- Production: BOM, manufacturing stages, machine/work centers, routing, production planning/MRP, waste/scrap/yield, quality and work-in-progress costing.
- Sales: quotations, B2B orders, delivered quantities, returns, collections and credit limits.
- Financial: general ledger, AR/AP, stock and COGS postings, landed cost allocation, production costing, periods, reports and tax jurisdiction.
- Integrations: weighing/scanners, purchasing ERP, bank interfaces, e-invoicing, transport/shipments, BI, factories.
- Nonfunctional: daily transactions, concurrent users, site connectivity, SLA, change control, penetration/compliance, recovery targets and capacity.

**Do not assume these features are in Salon V1 or that exact company requirements are known.**

### Fit-Gap, proposed:
- Reuse after verification: identity, tenant/Business/Branch RBAC, billing, general accounting, treasury, generic invoicing, customer/vendor master, purchasing and inventory transactions, reporting engine.
- Generalize if actual semantics match: product unit of measure, warehouse/stock valuation, purchasing and B2B invoices.
- New Domain Modules: Imports & Landed Cost, Manufacturing/MRP, Quality Control as needed; Timber extension for grades/measures/waste policies.
- External Integrations: e-invoicing, bank or shipping carriers, hardware when required.
- No client-specific main-product fork. Prefer supported customer-specific integration/extension if narrow and justified.

### Process journey
Supplier contract/PO -> import shipment & landed costs -> quality receipt -> stock by grade/location -> BOM & production order -> consume wood and record yield/scrap -> finished goods -> sales/fulfillment -> invoice/settlement -> general ledger and profitability. Every handoff needs ownership, tenant scope and journal/stock idempotency.

### Rollout and acceptance
- Prototype critical UI for import operations, warehouse, production and management.
- Reconcile raw-material receipt, process yield, WIP, finished goods, AR/AP, cash and journal.
- Establish staged cutover with existing ERP and rollback; never pretend a large enterprise can go live directly from generic POS.
- After successful delivery, make a reusable Industry Solution for other timber manufacturers, with versioned templates and extension compatibility.

## Classification rubric to avoid bespoke chaos
1. **Configuration:** current released module already fulfills rule.
2. **Reusable Extension:** same Core lifecycle, bounded variation or industry rule.
3. **New Domain Module:** different processes, aggregate/state/security or high-level domain.
4. **Integration:** externally owned provider or site-specific hardware/system.
5. **Client-specific scoped customization:** isolate and support through contracts with upgrade obligations; no silent Core fork.

## Productization test
Can the next same-industry client activate a published module/solution bundle with configuration, rather than repeating the original project? If not, work is still project-specific services, not a mature industry SaaS offering.

## Safety and truthfulness
V1 has **Salon only as first planned commercial product**, Clinic second. A hypothetical huge manufacturing client requires commercial scoping, legal/privacy review, integration design, budget/schedule and documented enterprise SLO/SLA tests before promising delivery. No guarantee every industry fits any one Core. Development and migrations require separate founder authorization.

Links: [Industry architecture](../02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [ADR-018](../05-decisions/ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md).
