# Core / Extension / Domain Module Boundary Matrix — Salon, Clinic, Manufacturing

**Date:** 2026-10-29
**Status:** DRAFT TECHNICAL CLASSIFICATION; ADR-019 boundary rule and ADR-020 Salon V1 no-standalone-Service-Execution decision accepted; exact contracts pending.
**Scope:** Architecture analysis; not final modules, schemas, UI inventory or implementation permission.

## 1. Decision rule

Choose by data ownership, stable domain invariants, real state machine, scope/security and transactional requirements — not merely shared nouns such as "client", "booking" or "invoice":

| Reuse mechanism | Suitable when | Unsuitable when |
|---|---|---|
| Existing Shared Core | Same invariant and fundamental lifecycle | Industry requires contradictory core rules and huge conditional branches |
| Core Extension | Typed policy/validation/resource/allocation/metadata/UI slot within shared operation | Own independent aggregates, high-sensitivity data and separate workflow state |
| New Domain Module (with its own Core+Extension) | Independent bounded context and lifecycle, specialized authorization, records or consistency guarantees | Tiny variation of stable Core rules |
| Integration adapter | External service/provider/device/channel needs connection | External-specific code is placed in transactional business Core |
| Industry Solution | Bundle released Modules/extensions/defaults into domain-ready product | Duplicate full product codebase per vertical |

Core **does not import** specialized industry code. Adapters implement declared contracts. Contracts carry Tenant/Business/Branch scopes; shared DB does not permit cross-module table writes.

## 2. Salon commercial V1 — candidate boundary map (not yet ratified)

| Capability / invariant | Shared Core owner | Salon Extension / optional variant | Separate Salon Domain Module? |
|---|---|---|---|
| Product/service catalog, pricing snapshot | Catalog | service duration, custom service attributes, packages rules | Not needed by default |
| Cart, invoicing, split tender, refunds, cashier session | POS / Sales | executor/opener on service lines, salon sale presentation | Not needed by default |
| Appointment/resource availability and rescheduling | Booking | barber/chair allocation, service duration and resource policies | Not needed by default |
| Customer contact and sales history | Customers | preferences, salon customer-facing UI | Not needed by default |
| Branch stock and movement, consumption and stocktake | Inventory | recipe/BOM-lite consumables per salon service | Not needed by default |
| Supplier purchase order/receipts | Purchasing | consumable purchase policies | Not needed by default |
| Staff, payroll, commissions, targets | HR / Payroll | salon opener/executor attribution and Commission Plan hooks | Not needed by default |
| Cash custody/transfers, branch treasury | Treasury | salon close-of-day UX | Not needed by default |
| Journal, AR/AP, financial periods | Accounting | account mapping/tax policy by jurisdiction | Not needed by default |
| Reporting and analytics | Reporting | salon utilization/service/employee KPIs | Not needed by default |
| Multi-stage service execution (start/pause/steps/sign-off) | Booking/HR/POS are existing reference owners | Not needed for V1; evaluate after real demand | **EXCLUDED from Salon V1 as standalone Module (ADR-020)**; may be independently designed later |
| Queue management, if operationally distinct from appointment booking | Booking as scheduling authority | Salon queue display and priority policy | Evaluate independently; not assumed mandatory V1 module |

**Salon conclusion:** founder accepted start with Shared Core Modules + Salon Extensions and **NO standalone Service Execution Module in Salon V1** (ADR-020). Existing booking/POS/staff attribution/commission/recipe workflows stay within their owners; step-by-step execution lifecycle is future candidate only. Do not force a giant Salon Domain Module.

## 3. Clinic (second intended industry — no clinical implementation approved)

| Capability | Shared/Core candidate | Clinic Extension candidate | Separate Domain owner where needed |
|---|---|---|---|
| Appointment slot and resource allocation | Booking | doctor/room specialization, scheduling policies | Complex care paths/clinical orders if distinct |
| Nonclinical billing/receivables | Sales/Accounting/Treasury | procedure billing mapping with validation | Insurer claims if own adjudication lifecycle |
| Basic contact and notifications | Customers / optional messaging | patient-contact consent, non-sensitive reminders | Medical identity, clinical consent and access control may need separate protected boundary |
| Visit/encounter notes, diagnoses, prescriptions | none in generic business Modules | not a generic Booking extension | **Clinical Records / Encounter Domain Module** |
| Medical stock/equipment | Inventory, where compatible | batch/expiry policies where safe | Drug/clinical compliance domain if required |
| Staff scheduling | Booking/HR | doctor availability policy | Clinical credentialing if independent regulatory workflow |

**Clinic caution:** physician appointment and clinical encounter are different lifecycles. Never let generic Customer/Booking/WhatsApp consumers access unrestricted clinical records. Jurisdictional privacy/regulatory design needed before release.

## 4. Manufacturing / timber company (future example, not roadmap commitment)

| Capability | Shared/Core candidate | Extension candidate | Separate Domain owner where needed |
|---|---|---|---|
| Quotation/order/invoice/payment | Sales / Accounting / Treasury | B2B discounts, commercial terms, domain validations | specialized trade contracts if independent workflow |
| Purchase orders, vendor accounts | Purchasing / Accounting | import vendor attributes or currency policy | Imports/Shipment/Landed Cost if separate costing and customs lifecycle |
| Goods storage, movements, valuation | Inventory | species, dimensions, units conversion/grades | Manufacturing WIP/production costing |
| Production formula/requirements | not generic sale or stocktake | selected item attributes only | **Manufacturing/MRP with BOM and production orders** |
| Machine/work-center and routing | Booking scheduling algorithms perhaps reusable | resource availability policies if compatible | **Manufacturing Work Center / Routing Domain** if lifecycle independent |
| Yield, scrap, quality testing | Inventory moves reference result | grade/waste policy hooks | **Production/Quality Domain** if owns inspections, gates and records |
| Enterprise analytic reporting | Reporting | production KPI templates | specialized operational projections owned by Manufacturing |

**Manufacturing caution:** MRP and medical records are not extensions to Booking just because scheduling/records are involved. A future large enterprise needs dedicated discovery, capacity and compliance gates.

## 5. Example: source-of-truth ownership for Salon

| Operation | System of record | External contract/event (candidate) |
|---|---|---|
| Appointment confirmed | Booking | `BookingConfirmed.v1` |
| Invoice posted | POS / Sales | `SalePosted.v1`, idempotent accounting/stock/HR effects |
| Cash receipt | Treasury/Accounting per approved posting contract | `CashReceived` / a verified tender reconciliation event |
| Stock consumed | Inventory | `StockConsumed` from authoritative service/sale execution |
| Commission accrued | HR / Payroll | `CommissionAccrued` with deterministic service attribution |
| Step-by-step service execution (future, NOT V1) | No standalone V1 owner; future analysis only | Any `ServiceExecutionStepCompleted` event is hypothetical and not a V1 contract |

These event names/edges are proposals, not approved schemas. Critical GL transaction boundary and idempotent correction rules still require final technical sign-off.

## 6. Criteria / checklist for a future industry intake
- Map business lifecycle, aggregate ownership, allowed actors, authorization scope, data sensitivity and retention.
- Identify exact reusable domain invariants, not similar UI labels.
- Prototype extension contract only where variation is bounded; avoid optional flags leaking industry logic into Core.
- Create independently versioned Domain Module when own state and permissions/transactions are substantive.
- Compose resulting Modules/Extensions/Integration through Industry Solution manifest; verify activation dependencies and explicit cost preview (ADR-016).
- Maintain a single codebase and V1 one shared SQL Server DB until separate scaling evidence supports change.

## 7. Pending sign-off
Salon Service Execution is excluded from V1 (ADR-020); future lifecycle/ownership is deferred. Still open: whether Queue belongs to Booking or a separate Module; exact Booking resource abstraction; full Module list vs launcher tiles; extension conflict resolution, permissions/events/transaction boundaries and new industry manifests. These require architecture decisions, not hidden assumptions.

Links: [ADR-019](../05-decisions/ADR-019-CONDITIONAL-DOMAIN-MODULE-BOUNDARY.md), [ADR-017](../05-decisions/ADR-017-SHARED-CORE-INDUSTRY-SOLUTIONS.md), [Module Registry/Contracts](MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md), [Industry Architecture](INDUSTRY-SOLUTIONS-ARCHITECTURE.md).

**This document is an analysis proposal; no implementation authorized.**


## Approved incremental-business strategy — ADR-020

Each Business can launch with an industry-appropriate minimum **valid** module set and install further compatible modules later, always respecting Required dependencies/financial security and bundle approval. The comprehensive Salon commercial V1 platform scope remains unchanged except for the explicitly excluded standalone Service Execution Module; see [Incremental Business Modules](INCREMENTAL-BUSINESS-MODULE-GROWTH.md). Final per-Business starter list remains technical/commercial design.
