# ADR-018 — Industry Expansion and Growth-Ready SaaS Direction

**Date:** 2026-10-29
**Status:** ACCEPTED STRATEGIC DIRECTION by founder, not approval of implementation specifics.
**Related:** ADR-017 Industry Solutions; ADR-003 shared multi-tenant data; ADR-015 Apps; ADR-016 explicit bundle approval.

## Approved product and growth intent
- DRVO should support **a repeatable process to understand a new industry, identify reusable Core capabilities, build missing Domain Modules/Extensions, and publish an Industry Solution for later businesses**, not a separate forked system per customer.
- Repeated customer work should be **productized** into reusable versioned offerings where there is demand and sound domain fit.
- Customers discover their type of business/solution first; the Business dashboard shows only the Modules activated for and authorized within that Business. A future catalog of 100+ industries must be discoverable by grouping/search, not 100 tiles inside a customer's ERP.
- DRVO has a separate internal **Platform Control Center** for industry catalog, released Modules/versions, extensions, Tenants/Businesses, entitlements/subscriptions, compatibility, operational health and change rollout.
- **Industry count** and **Tenant count** are independent dimensions. Support for 100 industry categories does not prove capacity to run 100 companies, or to run a very large enterprise.
- Technical deployment evolves based on real measured workload and customer requirements, without requiring a separate product codebase per industry.

## Illustration: large Egyptian timber import / supply / manufacturing company
1. Discovery with management, finance, purchasing/imports, warehouses, manufacturing and sales.
2. Fit-gap and ownership map: reuse accounting, treasury, sales, purchasing, inventory and reporting where their domain contracts fit.
3. Define specialized capabilities: Import/Shipment, landed cost and customs, measurement/units, BOM, MRP, production orders, machine/work center, waste/yield, QC, costing and sales fulfillment — exact scope must be elicited, not assumed.
4. Model each need as configuration, Core extension, new Domain Module or external integration; do not encode an ad hoc client fork.
5. Agree security, financial consistency, localization/tax, scale and integrations; propose staged contracts/design, UX and migration.
6. Build and test new functionality with full multi-tenant regression, accounting and stock reconciliation, authorization and load acceptance.
7. Migrate validated master data/opening balances, run UAT and operational cutover with fallback and post-go-live monitoring.
8. Productize generalizable functionality as a reusable Manufacturing/Timber Industry Solution for subsequent clients; customer-specific requirements remain controlled extensions/integrations.

## Deployment evolution (DIRECTION, NOT an approved time-based migration or performance promise)
- **V1:** one SQL Server database, logical Tenant/Business/Branch isolation, single Modular Monolith service topology as planned. Baseline security, backup, monitoring and restoration essential before handling real financial data.
- **Growth:** measured workload may justify horizontal service/workers scaling, cache/read optimizations, background queues, partitioning and/or **multiple database pools/stamps** with explicit tenant placement.
- **Enterprise:** specific security, compliance, performance or availability requirements may justify a **dedicated database or isolated deployment** while retaining compatible product modules/contracts.
- Avoid direct app reliance on a globally hard-coded DB target; design a tenancy-aware data-access boundary suitable for future evolution. The mechanism and timing are not decided in V1.
- Do **not** promise unlimited industries, companies, users, transaction throughput, zero downtime, compliance or instant enterprise readiness merely because the architecture is modular.

## Avoiding bespoke-software fragmentation
- Route needs to (a) configuration of existing app, (b) reusable extension/domain module/product solution, or (c) explicitly scoped customer integration/customization behind supported contracts.
- No long-lived customer-specific forks or unmanaged core modifications by default. All variants need version compatibility, support and regression tests.
- New industry acceptance uses a documented **Discovery → Fit-Gap → Domain Design → Architecture → UX → Development → QA/UAT → Migration/Cutover → Productization** lifecycle.

## Deferred decisions
Control Center detailed roles and UI; exact Solution catalog schema/templating; data isolation tier upgrade and tenant relocation mechanics; Enterprise SLA/RPO/RTO; infrastructure capacity; pricing and custom-contract model; industry-specific legal/security requirements; performance acceptance thresholds.

This is an architectural and commercial direction, **not proof of implementation, capacity or production readiness**. No coding authorized.
