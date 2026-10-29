# DRVO ERP Module Ecosystem — Architecture Proposal
Date: 2026-10-29
Status: PARTIAL APPROVAL — independent visible Apps accepted in ADR-015; remaining design details proposed; NO CODING.

## Current accepted baseline
- One SQL Server database for V1, Tenant > Business > Branch with Business-scoped accounting and independent branch operations.
- Modular monolith; **every module has Core and Extension architecture**. More than one compatible extension may activate for a Business.
- Dependencies Required/Optional and incompatibilities are validated. Salon first, Clinic second; multiple Businesses can be different industries under one Tenant.
- One comprehensive Salon commercial V1, not multiple reduced public editions. Windows browser PWA POS, existing Cut Salon booking site integrates with DRVO API.

## Three layers (proposal)
1. Platform kernel (always on): Identity, tenancy, authorization, audit, subscription/entitlement, module registry, event/outbox infrastructure, navigation design system.
2. Business capabilities (each owns Core API, domain entities, UI and extension points): Catalog, Customers, POS/Sales, Booking, Treasury, Accounting, Inventory, Purchasing, HR/Payroll, Reporting.
3. Business extensions and add-ons: Salon Pack (service execution, opening commission, targets, recipes, barber resources); Clinic Pack (medical appointments, doctor resources, regulated records and privacy, gated from first release); optional WhatsApp and AI integration adapters, loyalty, marketing.

## How modules collaborate (proposal)
- Owning module alone writes its authoritative data and exposes typed command/query contracts; no cross-module arbitrary repository imports or SQL updates.
- Synchronous commands/queries for pre-post authorization, available balance or other mandatory consistency checks.
- Persist core state + transactional outbox in the same database transaction; worker processes versioned domain events with tenant/business/branch scope and idempotency, backoff and dead-letter review.
- Cross-module projections and financial effects arise from events; if financial correctness requires atomic consistency define one coordination boundary and compensating records, not unsafe best-effort posting.
- Example sale: POS owns sale -> SalePosted.v1 -> Accounting journal, Inventory stock, HR entitlement/commission; WhatsApp add-on listens only if enabled. Each consumer has Inbox uniqueness and auditing.
- Module manifest proposal: module id/version, owner, required/optional deps, compatible extensions, permissions, navigation routes, events schema, settings, lifecycle/migrations, billing entitlement.
- No customer-specific schema migration on activation; SQL Server shared schema migrations run with app release, while Business activation inserts scoped configuration, seeds and entitlements.

## Lifecycle (proposal)
- Existing Business: browse Apps -> preview dependencies and cost -> owner approves -> check entitlement/RBAC -> enable business-scoped module and selected compatible extensions -> initialize safe scoped settings -> menus appear only for authorized members -> optionally import data -> audit and rollback if activation fails.
- New Business: create business, industry/currency/timezone, branches and staff -> starter template (salon or clinic) -> prerequisite check and explicit module choice -> provision business data/config -> invite users -> test checklist -> go live.
- New module added to SaaS platform: design Core/Extension and contract, validate multi-tenancy, register version/permissions/nav/event schemas, reviewed global DB migration, QA against all existing tenants, release, THEN make available for per-Business activation. No hot loading arbitrary server code from tenant UI.
- Disabling: stop new writes/actions, avoid orphaned dependencies, keep invoices/records/history, preserve lawful retention, no destructive table drops. Upgrades require compatibility and rollback plan.

## First-launch scope proposal (pending founder approval)
Platform Kernel + Catalog + Customers + POS + Booking + Treasury + Accounting + Inventory + Purchasing + HR/Payroll + Reporting + Salon Pack. WhatsApp is an optional add-on, not mandatory for finance/POS; Clinic Pack staged later after clinical/privacy domain design. This list categorizes existing V1 features, not an unapproved cut in founder-approved V1 capabilities.

## Open architecture questions
First visible app set and pricing entitlements, WhatsApp role in commercial V1 (optional at launch or later), module activation approval roles and dependency purchase experience, Clinic clinical scope, and final UI direction.


## Approved app identity update — 2026-10-29

Founder selected Option A: **every user-facing Module appears as its own independent App**, Odoo-like. Do not group them into Sales/Finance/Operations mega-apps as the default launcher. This does not require separate code deployments or databases. See [ADR-015](../05-decisions/ADR-015-EACH-MODULE-INDEPENDENT-APP.md). The exact V1 app inventory and Module Registry/contracts are still under design: [Registry and Contracts](MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md).
