# Modules catalog

> **NORTH STAR ADR-029:** Modules are reusable platform capabilities supporting ANY investigated industry and businesses from tiny to huge. The valid minimum Business setup must not be artificially bloated; independent Domain Modules are justified by genuine aggregates/lifecycles. **Adding Modules does not automatically scale SQL/operations** — every major module design must pass [Architecture Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md).


This is a **planned scope map**, not a statement that modules exist in code.

| Module | Scope | Status |
|---|---|---|
| Platform / Identity | Auth, membership, roles, tenants, businesses, branches | Planned |
| Catalog | Products/services, categories, pricing | Planned |
| Customers | Customer profiles and relationships | Planned |
| POS Core | Sales, line items, discount, tax, payment flow, refunds, session | Planned |
| Salon Extension | Barber assignment, commissions, booking/queue links | Planned |
| Retail Extension | Barcodes, units and stock-selling workflows | Planned |
| Inventory | Stock movements, purchasing basics | Planned |
| Booking / Queue | Appointments, resources, completion | Planned |
| HR / Payroll | Employees, attendance, compensation | Planned |
| Finance | Cash control, reporting, eventual accounting | Planned |
| SaaS Billing | Subscriptions, plans, entitlements, admin control | Planned |

Each module will receive its own specification before implementation, referencing ADRs, entities, APIs/events, authorization rules, tests and migration requirements.


## Founder-approved multi-industry architecture (2026-10-29)

The list above is a historic planned scope map, **not** final user-visible App inventory or complete per-industry coverage. ADR-017 defines **Shared Business Modules**, **bounded Industry Extensions**, **independent vertical Domain Modules** (each also Core+Extension), **optional integrations**, and **Industry Solutions** that package compatible released modules/extensions and setup defaults without forking the codebase. ADR-015 still requires each user-facing activated Module to appear as its own app. ADR-016 previews Required prerequisites and any costs for one explicit approval.

Potential future modules, NOT in launched V1: Clinical Records (Clinic industry), Course Enrollment (Education), Property & Deal Management (Real Estate), Imports & Landed Cost / Manufacturing MRP / Quality (Wood importing/manufacturing), and sector-specific integration adapters. First comprehensive commercial V1 remains Salon/Cut Salon; Clinic follows after separate compliance and workflow design. Distinguish **new Domain Module** from a smaller Core Extension using [Industry Solutions Architecture](../02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md). Exact launch tile inventory and module boundaries remain open. No code exists.


## Approved basics-first per-Business Modules — ADR-020

Each Business starts with a valid essential Module bundle for its industry and adds compatible Modules later. Required dependencies, explicit price approval, permission, tenant scope, financial integrity and historical records remain protected. Salon commercial V1 has **no standalone Service Execution Module**; ordinary service booking, executor/opener attribution, HR commission/targets and inventory consumption stay in their owning Shared Modules with Salon Extensions. Any future independent step-by-step workflow is a separately scoped optional module after need is established. [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md).
