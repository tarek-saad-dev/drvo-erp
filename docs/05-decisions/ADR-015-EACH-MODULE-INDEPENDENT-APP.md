# ADR-015 — Each Business Module Is a Separate Visible App

**Date:** 2026-10-29
**Status:** ACCEPTED by founder (Option A)

## Decision
Every user-facing DRVO ERP business Module is a separately visible application in the App Launcher, in the style of an ERP apps catalog. Examples: POS, Booking, Inventory, Purchasing, Accounting, Treasury, HR, Customers, Reports. Do **not** merge these as one user-facing Finance/Sales/Operations super-app by default.

This is a **product navigation and module identity** decision. It does not require deploying each Module as an independent service, package, or SQL database.

## Architectural consistency
- The previously accepted Modular Monolith remains.
- Every Module must support Core plus Extension architecture (ADR-006).
- Required and Optional Dependencies with conflict checks (ADR-007) remain mandatory.
- SQL Server is one shared multi-tenant database for V1; Business-level module activation is separate from deploying a module's code.
- Tenant/Business/Branch access permissions filter visibility and actions. A Module installed in the platform is not necessarily enabled for every Business.
- Platform identity, tenancy, billing, module registry, audit and event infrastructure can remain internal capabilities instead of user-facing apps.
- One Business may enable several compatible extensions; Salon is the first commercial industry, Clinic a later industry pack.
- Do not alter existing requirement for one comprehensive commercial V1; this ADR does not reduce the Salon launch features.

## UX implications
1. Business Home / App Launcher shows one tile per activated and authorized Module.
2. Apps catalog separately shows available, active, unavailable and dependent applications with a clear activation flow.
3. Each Module owns its own navigation, landing view, permissions and relevant dashboards; shared navigation and visual language are consistent.
4. Cashier POS remains a focused full-screen Windows-browser experience.
5. Module links can navigate to related modules, but these do not erase module boundaries.

## Non-decisions
Exact public launch app inventory, WhatsApp launch timing, Clinic pack release, pricing/entitlement rules, dependency auto-activation, and the detailed Core/Extension interfaces remain open for explicit design and approval.

## Trace
Founder explicitly selected: **A — كل Module تطبيق مستقل ظاهر مثل Odoo**. This supersedes grouped app-home proposals, not technical modular monolith structure. No implementation/code authorized.
