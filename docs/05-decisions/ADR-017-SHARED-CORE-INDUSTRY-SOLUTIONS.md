# ADR-017 — Shared Core + Domain Modules + Industry Solutions

**Date:** 2026-10-29
**Status:** ACCEPTED DIRECTION by founder. Detailed interface and industry-specific implementation remain to be approved.
**Related:** ADR-002 Modular Monolith; ADR-006 Core + Extension for every Module; ADR-007 Dependencies; ADR-015 independent visible App tiles; ADR-016 bundled approval.

## Context
The same capabilities recur across salons, clinics, education centers, real estate CRM and importing/manufacturing businesses: sales/invoicing, booking/scheduling, treasury/expenses, accounting, identity, reporting and customer relationships. Building separate vertical systems would duplicate stable business logic; forcing fundamentally different workflows into one generic Core would instead create over-engineering and unsafe abstractions.

## Approved architecture direction
DRVO ERP is a **multi-tenant, multi-industry SaaS product platform** based on:
1. **Platform Kernel:** tenancy, identity, RBAC, entitlements/billing, module registry, audit, contracts/event infrastructure and design system.
2. **Shared Business Modules:** reusable capability boundaries (e.g., sales, booking, accounting, treasury, inventory, reporting), each with its own Core and Extension architecture.
3. **Industry Extensions:** compose/adapt defined behaviors at Core extension points when the underlying domain process is genuinely shared.
4. **Vertical/Domain-Specific Modules:** new owned domains for materially different lifecycles, invariants, data or security needs (e.g., clinical records, course enrollment, property/deal management, manufacturing/MRP). Do not force these into huge Booking/Sales extensions. Every newly built Module still exposes a deliberate Core + Extension contract under ADR-006.
5. **Industry Solutions:** versioned compositions of suitable Modules + extensions + settings/templates/roles/onboarding, presented as specialized products to customers, not duplicated codebases.
6. **Optional Add-ons/Integrations:** WhatsApp, AI, payments and other connectors, activated/entitled separately and never required by unrelated core financial workflows.

## Key boundaries
- Reuse the stable **business invariant**, not a similar name. Booking barber/chair vs doctor/room may share appointment/resource scheduling; repeating educational courses or clinical records deserve independent domain assessment.
- Separate generic Customer/Contact identity from sensitive medical patient records and privacy boundaries. A property asset or course enrollment is not a generic customer field.
- Shared Accounting/Treasury/Invoice engines can be reused while industry-specific operational, tax and compliance semantics are applied through explicitly scoped contracts.
- Core Modules own authoritative data; extensions and other Modules interact via typed interfaces/events, not arbitrary cross-module writes.
- Design extension points from proven V1 use cases, not speculative inventories of ten unused extensions.
- Tenant → Business → Branch and the single shared SQL Server database for V1 remain; a Business may belong to a different industry than another Business of the same Tenant.

## Customer-facing product
- Buyer selects an Industry Solution (Salon first), receives a compatible starter bundle and appropriate configuration/roles, previews Required dependencies and costs, and approves installation explicitly (ADR-016).
- Once active, each user-facing Module appears as its own App (ADR-015); Industry Solution is a product composition, not a mega-app replacing independent tiles.
- The existing app/extension marketplace supports optional additional capabilities for that Business.

## Sequence and limits
- First complete commercial V1 remains Salon and Cut Salon validation; **Clinic second** remains approved commercial direction. Education, real estate, importing and manufacturing are future examples/opportunities, not committed release dates or ready modules.
- The aim is to **enter any promising industry through structured analysis and productization**, not to claim all sectors/enterprise sizes are supported today.
- Reuse is conditional on domain fit. If the domain warrants a dedicated module or service, create one with clean contracts rather than stretch the shared Core.

## Non-decisions
Industry Solution manifest schema, exact module boundaries, reusable extension hook mechanics, pricing/licensing, launch dates outside Salon/Clinic, regulatory compliance per country/industry, and operational scale SLAs require separate design and evidence.

**No application code, SQL migration, deployment or production testing authorized.**
