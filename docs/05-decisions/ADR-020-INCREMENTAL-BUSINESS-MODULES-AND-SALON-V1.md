# ADR-020 — Start Every Business With Essentials; Add Modules Later; No Standalone Salon Service Execution in V1

**Date:** 2026-10-29
**Status:** ACCEPTED founder product/architecture decisions. Implementation contracts remain to be designed.
**Related:** ADR-006, ADR-007, ADR-015, ADR-016, ADR-017, ADR-018, ADR-019.

## Context
The founder wants DRVO ERP SaaS to remain ready for businesses of any supported industry to **start with the essential capabilities they actually need and add additional Modules when requirements grow**, without creating a new bespoke ERP per customer. The current Salon V1 should avoid an unnecessary separate Service Execution app.

## Approved decisions
1. **Business-specific incremental composition:** a Business begins with the minimum valid core/starter set for its industry and selected workflows, not an obligatory full installation of every module on the SaaS platform. It may progressively enable compatible Modules/Extensions in the same Business, preserving existing data and accounting records.
2. **Platform always extensible by design:** Modules have versioned contracts, Business-scoped activation, optional extensions, declared dependencies and clean data ownership so future modules can be added to already operating Businesses. This is an architectural preparedness requirement, **not** a promise that unbuilt functionality is installable without design/build/migration/test.
3. **Required dependency approval stays explicit:** new modules may require prerequisites; show all Required dependencies and any additional fees and approve as a single bundle (ADR-016), not silently enable paid apps.
4. **Industry Solution is a starter composition, not a monolithic fork:** starter bundles may differ by industry and use common modules and selective extensions, with independent app tiles (ADR-015). No compulsory large industry Domain Module unless real owned aggregates/lifecycles justify it (ADR-019).
5. **Salon V1 exclusion:** do **not** implement or require a standalone `Salon Service Execution Module` in the initial Salon V1. Provide current approved salon sale, booking, employee service attribution, Commission Plan, targets, stock recipe/consumption and related flows through their owning common Modules plus bounded Salon Extensions as needed. A separate multi-step service execution/workflow app is a *possible future* module, not a V1 dependency.
6. **Future addition when justified:** if a Business later needs genuinely independent Service Execution states/steps/approvals, design a new owned Module with Core + Extension contract and versioned booking/invoice/staff/stock references; present pricing/dependency implications for explicit Business activation. Do not couple V1 invoice/booking correctness to a non-existent Service Execution app.
7. **No forced scope reduction:** the previously approved **comprehensive Salon commercial V1**, with accounting, HR, inventory, booking and SaaS capabilities, remains the product launch requirement, except the explicitly excluded standalone Service Execution Module. A minimal *per-Business starter bundle* must be distinguished from a deliberately reduced *platform implementation scope*. Any actual change to commercial V1 coverage needs separate explicit approval.

## Engineering constraints / not yet sign-off
- Define industry-appropriate minimum starter sets and Required dependency graphs. It is not acceptable to let a paid sale bypass legally or operationally required finance, authorization, tax, cash or ledger integrity merely by disabling an app tile.
- A disabled Module must not erase historical records or make required business data unaccounted for. Data owned by other Modules cannot be rewritten by a newly enabled Module; use versioned command/event APIs.
- Future optional module activation requires compatibility validation, idempotent Business configuration/seed, permission/entitlement check, explicit preview of charges, audit and reliable rollback/retry.
- Keep stable service/invoice/employee/booking references (IDs and scoped contracts) sufficient for future integration, without storing speculative execution state or mandatory empty Service Execution tables.
- Future modules may require new *platform-wide* SQL migrations on deployment, and possibly import/backfill of Business data; self-service Business activation only enables code already safely deployed. No claim of zero migrations, unlimited compatibility or zero downtime.
- Distinguish Module as independent domain from App tile, Industry Solution starter, Core extension and optional integration; preserve tenant/business/branch isolation.

## Concrete examples
- Salon V1: Booking owns appointment and barber allocation; POS owns invoicing/sale and service execution attribution on line; HR owns commission/targets; Inventory owns recipe material consumption; Treasury and Accounting own financial records. None needs a mandatory standalone Service Execution Module.
- New salon need later: specific owner requests multi-stage skincare workflow with step history; evaluate whether it justifies its own Module then implement versioned events/interfaces, activation and user permissions without breaking already-posted sales.
- Different new industry: begin with its justified shared starter Modules, then add a separate clinical/manufacturing/education Domain Module where its aggregates and lifecycle truly differ.

## Non-decisions
Exact per-industry default starter bundles, billing tiers, minimum POS/Accounting compulsory prerequisite list, service status field model, optional future Service Execution contract, Module activation roles and future event schema are not approved by this ADR.

**Documentation decision only. No app code, SQL migrations, server access, tests or production deployments authorized.**
