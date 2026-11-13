# Modules catalog

> **2026-11-13 S6 CURRENT CODE OVERRIDE:** Shared Booking SQL source now 017 (scoped dated availability window closure audit and active coverage), after 013 create/014 POS/015 lifecycle/016 dated windows. Private Salon composition includes authorized resource/status/day filters and completed Booking→unsaved POS DRAFT link. None of 010–017 is approved to apply on VPS, and Public Auth/paid Business flags remain OFF; ADR-031 finance POSTED, ADR-032 activation, K5F root/offhost restore and Clinical Records unimplemented. [S6](../04-execution/SALON-S6-INTEGRATED-DELIVERY-2026-11-13.md).


> **2026-11-13 S5 OVERRIDE OF HISTORICAL MODULE TABLE:** Shared Booking now includes an opt-in **dated UTC Resource availability** SQL016 slice in addition to create/status/read and strict tenant locks; the private Salon solution now has local-day operating filters and nonposting completed-service handoff to independently authorized POS Draft UX. Shared Catalog, Customers and POS DRAFT remain narrow SQL/API CRUD slices. Financial POS POSTED, full HR/Inventory, paid Commercial Activation, Clinic Clinical Module remain unimplemented. SQL 010–016 source/CI only and K5F/ADR-031/032 OPEN. [S5](../04-execution/SALON-S5-THREE-TRACK-DELIVERY-2026-11-13.md).


> **2026-11-13 ACTUAL CODE STATUS OVERRIDE (older table below is historical):** Existing Shared Catalog and Customers create/list, Booking create/list + CANCELLED/COMPLETED statuses (SQL source 013+015), POS DRAFT create/list (SQL source 014) and K5 private Web all MERGED to main with disposable SQL2022/Nest HTTP success; Salon private overview is a composition of existing owners, not a new standalone Salon Domain. **All SQL 010–015 are still not applied to VPS / Business flags remain OFF**, no real POS POSTED/Treasury/Accounting, full SaaS activation or Clinic Clinical Records module. See [S4 status](../04-execution/SALON-S4-PARALLEL-DELIVERY-2026-11-13.md).


> **NORTH STAR ADR-029:** Modules are reusable platform capabilities supporting ANY investigated industry and businesses from tiny to huge. The valid minimum Business setup must not be artificially bloated; independent Domain Modules are justified by genuine aggregates/lifecycles. **Adding Modules does not automatically scale SQL/operations** — every major module design must pass [Architecture Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md).


This is a **planned scope map**, not a statement that modules are fully available to customers. **2026-11-12:** a narrow Shared Catalog create/list SQL/API/private UI vertical slice is implemented on a **review branch**, with SQL 011 not deployed/approved; edit/archive, variants, commerce and full V1 remain unfinished. See [Catalog Core V1](CATALOG-CORE-V1.md).

| Module | Scope | Status |
|---|---|---|
| Platform / Identity | Auth, membership, roles, tenants, businesses, branches | Planned |
| Catalog | Products/services, categories, pricing | **Initial create/list slice in review PR; not activated/deployed** |
| Customers | Customer profiles and relationships | **Initial create/list contact slice on stacked PR; not activated/deployed** |
| POS Core | Sales, line items, discount, tax, payment flow, refunds, session | Planned |
| Salon Extension | Barber assignment, commissions, booking/queue links | Planned |
| Retail Extension | Barcodes, units and stock-selling workflows | Planned |
| Inventory | Stock movements, purchasing basics | Planned |
| Booking / Queue | Appointments, resources, completion | **First BOOKED-only read/create slice on PR; no cancellation/completion; not deployed** |
| HR / Payroll | Employees, attendance, compensation | Planned |
| Finance | Cash control, reporting, eventual accounting | Planned |
| SaaS Billing | Subscriptions, plans, entitlements, admin control | Planned |

Each module will receive its own specification before implementation, referencing ADRs, entities, APIs/events, authorization rules, tests and migration requirements.


## Founder-approved multi-industry architecture (2026-10-29)

The list above is a historic planned scope map, **not** final user-visible App inventory or complete per-industry coverage. ADR-017 defines **Shared Business Modules**, **bounded Industry Extensions**, **independent vertical Domain Modules** (each also Core+Extension), **optional integrations**, and **Industry Solutions** that package compatible released modules/extensions and setup defaults without forking the codebase. ADR-015 still requires each user-facing activated Module to appear as its own app. ADR-016 previews Required prerequisites and any costs for one explicit approval.

Potential future modules, NOT in launched V1: Clinical Records (Clinic industry), Course Enrollment (Education), Property & Deal Management (Real Estate), Imports & Landed Cost / Manufacturing MRP / Quality (Wood importing/manufacturing), and sector-specific integration adapters. First comprehensive commercial V1 remains Salon/Cut Salon; Clinic follows after separate compliance and workflow design. Distinguish **new Domain Module** from a smaller Core Extension using [Industry Solutions Architecture](../02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md). Exact launch tile inventory and module boundaries remain open. No code exists.


## Approved basics-first per-Business Modules — ADR-020

Each Business starts with a valid essential Module bundle for its industry and adds compatible Modules later. Required dependencies, explicit price approval, permission, tenant scope, financial integrity and historical records remain protected. Salon commercial V1 has **no standalone Service Execution Module**; ordinary service booking, executor/opener attribution, HR commission/targets and inventory consumption stay in their owning Shared Modules with Salon Extensions. Any future independent step-by-step workflow is a separately scoped optional module after need is established. [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md).
