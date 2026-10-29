# DRVO ERP — 100+ Industry Catalog, SaaS Scale and Platform Control Center

> **FOUNDATIONAL MANDATE ADR-029:** Egypt-scale product ambition; any industry via repeatable released solutions, and customers from micro to very large enterprises through **functional module growth AND separate measured tenant/SQL/workload capacity growth**. This document's phases are a proposed scale path, not enterprise-ready proof. [Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) · [Fitness Gates](UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md).


**Date:** 2026-10-29
**Status:** Approved product direction ADR-018; technical/UX/deployment detail is a proposal only. No production capacity claim.

## 1. Independent dimensions
- **Industry Solution count:** how many industry categories/configured offerings the product catalog exposes.
- **Tenant count:** how many distinct customer organizations own accounts.
- **Business count:** how many independently configured businesses are active across those Tenants.
- **Module count:** how many platform Apps/versions are released.
- **Operational scale:** users, concurrent transactions, queues, SQL throughput, latency and recovery ability.
These are different metrics: 100 industries are not 100 Tenants, and neither demonstrates readiness for a single huge manufacturing enterprise.

## 2. Public website/catalog at 100+ industries
- Discover by sector taxonomy: Beauty & Services, Healthcare, Education, Real Estate, Manufacturing, Trade & Distribution, Retail and further sectors.
- Search, tags/filters by operations/country/size; each Solution landing page describes intended workflows, available Apps, optional integrations, dependencies, coverage and what is not supported.
- Customer starts with **industry selection**, then configures Business and previews the compatible App/Extension bundle, Required dependencies and real prices, and explicitly approves as ADR-016.
- If industry not supported yet, show truthful "request an Industry Solution" inquiry, not claim instant support.
- Platform website must not show 100 app tiles as a flat undifferentiated launcher; adapt catalog hierarchy as it grows.

## 3. Customer Business interface
- Business selector for owners with multiple Businesses; each Business has its own industry, settings, books, roles and activated modules.
- Once selected, **independent App tiles** (ADR-015) for only the Business's active Modules the current user is authorized to view.
- Role-tailored navigation; a cashier sees POS workflows; manager sees allowed Finance/Reports; specialized operator sees imports/manufacturing, etc.
- Apps Store separately lists available, not activated, compatible or suspended apps, with pricing/dependency preview.
- Industry Solution is a composition/template; not a single giant app that hides all other apps. Core module navigation remains consistent across industries.
- Own DRVO visual design, Arabic RTL and English LTR, accessibility and clear daily workflow; Odoo is a workflow inspiration rather than a source for unauthorized pixel/copyright cloning.

## 4. DRVO Platform Control Center — internal operations surface (proposal)
Separate from customer ERP and distinct from ordinary Tenant Owner privileges:
- **Industries & Solutions:** publish/unpublish versioned industry offerings, compatible module bundles and region requirements.
- **Module Registry:** versions, dependency graphs, extension compatibility, deprecation, security exposure and activation statistics.
- **Tenants & Businesses:** scoped customer support, lifecycle, entitlement and audit access with documented access controls; no default unrestricted read of customer sensitive records.
- **Billing & Plans:** commercial plans, approved add-ons, subscription status and usage.
- **Rollouts:** deployment and migration versions, staged rollout/feature flags, compatibility failures and rollback.
- **Ops/SRE:** service/worker health, failed activation, event DLQ, financial sync age, noisy neighbor/performance metrics, incidents, backups/restore-test evidence, capacity.
- **Onboarding pipeline:** industry discovery requests, Fit-Gap status, build vs productization, readiness and support.

Security: strict platform admin roles, least privilege, break-glass audited support only when authorized, no implicit medical/employee data access. This admin center is a proposed operational architecture, not finished UI.

## 5. Technical scaling path, without making V1 complex
### Phase 1 — shared SQL Server (APPROVED V1)
One shared SQL Server database with tenant/business/branch partitioning by keys and access rules. A single modular monolith and workers can start simply. No per-customer database at V1. Confirm SQL edition, recovery/backup, indexes, transaction consistency, worker queues and isolation before production. The advanced backup system is deferred, but basic backup and restore validation is required before real financial data.

### Phase 2 — measured multi-tenant growth (PROPOSAL, not automatically enabled)
Optimize high-load SQL paths and reporting, scale stateless API/web workers, use background processing, read caches/projections where safe, monitor tenant-specific SQL and queue usage. If workload requires, move to **multiple shared database pools/deployment stamps** and route Tenant/Business to the correct placement with migration and correctness tests. Determine when to adopt by real throughput, contention, cost and SLA evidence.

### Phase 3 — Enterprise placement (OPTION, not a promise)
Give special tenants isolated database/deployment when justified by residency, performance, security, regulation or SLA. Maintain shared domain contracts and codebase but allow their own data boundary/operational controls. Plan zero/multi-minute downtime requirements independently; no presumed seamless migration or instant single-tenant restore with shared DB.

## 6. Design affordances in V1 that reduce future lock-in
- Domain-owned data access behind tenant-aware repositories/transaction context; no blind cross-Tenant queries.
- Stable scoped IDs, data export/import/reconciliation plans, migration version registry and event versioning; cross-business reports explicit and safe.
- Outbox/Inbox processing with idempotent financial effects and per-tenant metrics.
- Tenant-aware config/entitlement and module activation separate from code release.
- Avoid strong promises about dedicated deployment, capacity, unlimited size or enterprise compliance without measured testing.

## 7. Measurable readiness gates before advertising capacity
- Cross-tenant isolation under concurrent load, SQL transaction consistency and payment/journal reconciliation.
- Target concurrent operators, invoices/day, events/minute, import volumes and reporting latencies per customer tier.
- Backup and restore drill, rollback, observability alerting, security/privacy reviews and customer integration validation.
- Definable RPO, RTO, SLA and capacity limits only after verified environment evidence.

## 8. What remains open
Exact catalog taxonomy and Solution manifest schema; Platform Control Center privileges/UI; B2B Enterprise billing; country/clinical/manufacturing compliance; SQL physical tenant routing, migration tools, performance thresholds, scale milestones and support model.

Links: [ADR-018](../05-decisions/ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md), [Industry Architecture](INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [New Industry Playbook](../04-execution/NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md), [Odoo-inspired UI](ODOO-INSPIRED-UI-DISCOVERY.md).
