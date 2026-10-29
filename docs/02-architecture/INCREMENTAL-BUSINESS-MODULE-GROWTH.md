# DRVO ERP — Incremental Business Modules and Growth-Ready Contracts

**Date:** 2026-10-29
**Status:** FOUNDER-APPROVED PRODUCT DIRECTION (ADR-020); exact manifests, technical workflow and minimum sets are design proposals; NO CODING.

## 1. Intended customer experience
Create a Business → select industry or custom configuration → start with a validated essential Module bundle → preview its Required dependencies/costs and explicitly approve activation (ADR-016) → operate → later open Apps, add Modules/Extensions → validate compatibility, quote/pricing/roles, activate for **that Business** → see newly authorized independent app tile. Industry Solution is a reusable starter template rather than a rigid one-time lock-in.

**Important:** basic start is per Business, and does not revise the approved comprehensive Salon commercial V1 feature set. A new or small Business may choose fewer optional apps, but core financial, RBAC and compliance obligations remain enforceable.

## 2. Starter bundles vs requirements
Each Business is a valid composition, not arbitrary toggles. Define, per active workflow and industry:
- Platform Kernel compulsory always (identity, tenant/business/branch, access, audit, module registry, subscriptions/entitlements).
- Shared Business Modules and Extensions selected by industry/workflow.
- Required dependencies that must be present for supported actions (e.g., POS financial controls are not bypassed by hiding an Accounting tile).
- Optional Add-ons (e.g., WhatsApp, loyalty and analytics) may be enabled later only when built/released, compatible and authorized.
- Role-scoped independent launcher tiles; an active app is not visible to an unauthorized employee.

Avoid promising one fixed global 'minimal ERP' bundle across salons, clinics, manufacturing and real estate; determine actual invariant needs using domain analysis.

## 3. Architectural readiness for later modules
- Typed, versioned module APIs and domain events; modules own authoritative aggregates and do not write each other's tables.
- Registry captures dependency graph, declared extensions, contracts, version and entitlements.
- Industry Solution Registry references compatible released modules and provides default configs and roles. Business can activate further Modules without cloning the solution or altering other Businesses.
- Stable tenant/business/branch-aware references connect source data from Booking, POS, HR and Inventory to an optional future Module.
- Outbox/inbox idempotency and retries guard ledger and cross-module effects. Uninstalled optional listeners must not prevent core sales/bookings from completing.
- Modules are deployed to the whole platform and database schema migrates under a safe release. Customer activation enables configuration/entitlement only; future new modules might need releases, schema changes and backfills.
- No speculative one-Module-per-industry scaffolding, no unused ten-extensions bundles and no current customer-specific code forks.

## 4. Salon V1: no independent Service Execution Module
The founder explicitly excluded a *standalone* `Salon Service Execution Module` from Salon V1.

| User workflow | Authoritative module in initial architecture | Salon-specific extension responsibilities |
|---|---|---|
| Appointment/reschedule/resource allocation | Booking | barber/chair, duration, booking service/resource policy |
| Product/service catalog and pricing | Catalog | service definition, duration, packages/price rules |
| Sale/invoice/refund and staff service attribution | POS | executor/opener references and legitimate edits/corrections |
| Commission plan/targets/staff ledger | HR & Payroll | Salon attribution/commission computation |
| Material/recipe consumption | Inventory | salon recipe allocation triggered by recorded sale/service flow |
| Cash, accounting and reconciliations | Treasury, Accounting | industry account mappings; preserve posted immutable records |
| Insights | Reporting | barber/service/branch KPIs from authoritative modules |

No separate Service Execution state machine, app, data owner, Required dependency or mandatory workflow is part of Salon V1. The founder did **not** remove the above approved capabilities. Multi-stage service execution tracking (step-by-step start/pause/complete/signoff) is a future feature candidate to be scoped independently, not assumed mandatory for initial Salon launch.

## 5. Upgrade example
After a Salon Business is live, owner requests detailed skincare step execution:
1. Discovery: is this only checklist/UX within current Core or a truly independent aggregate and lifecycle?
2. If independent, design Service Execution Domain Module and versioned contracts referencing existing BookingId, SaleLineId, EmployeeId and Branch.
3. Review compatibility and permissions, deliver platform release/migration after separate authorization and tests.
4. Show module/Required dependencies/any price for one Business approval.
5. Activate only that Business, preserve current posted invoices, bookings and commission history.
6. Start recording new service execution states; do not fabricate historical steps or migrate old invoices inaccurately.
7. Verify disabling extension leaves base Booking/POS/HR/Inventory functional and reconciled.

## 6. Pending design work
- Exact smallest valid Module sets per target industry and activity; whether Catalog is visible/required or technical prerequisite.
- Domain contract between booking → sale/attribution → stock/HR effects and timing of posting and reconciliation.
- How to distinguish technical financial dependencies from purchasable app tiles.
- Module install/uninstall idempotency, pricing entitlements and authorization.
- Future extension/version migration/compatibility policy.
- Salon queue ownership and detailed POS/Booking service attribution UI.

## 7. Acceptance scenarios
- New Salon Business activates essential modules and required financial controls; can operate without WhatsApp or Service Execution Module.
- Adding optional WhatsApp to Business A leaves Business B, Booking and POS unaffected.
- Later module activation does not duplicate sale, ledger, commission, inventory movements or overwrite historical financial data.
- After module is suspended, historical sales remain consistent and accessible per retention and roles.
- Cross-Tenant Business cannot install or read other Business's data.
- Critical finance stays consistent when optional modules or their workers are absent.

See [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md), [Module Registry](MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md), [Boundary Matrix](CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md), [Lifecycle](MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md).

No app code or DB changes authorized.
