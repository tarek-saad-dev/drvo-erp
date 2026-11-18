# ADR-040 — Cashier full functional parity in DRVO ERP, through independent shared Modules and Salon/Barber Extensions

> **2026-11-17 FOUNDER IMPLEMENTATION CORRECTION — PRESERVATION FIRST:** The founder explicitly rejected reproducing a small subset of Cashier functionality in synthetic DRVO UI. [Current complete source lock, source-to-runtime approach and workflow acceptance](../04-execution/CASHIER-PRESERVATION-FIRST-MIGRATION-2026-11-17.md) are now mandatory for ADR-040. Latest inspected Cashier `main` is `bc9c03fff86074872590ad0fd3525f9a4e416958`, superseding this ADR's historical `a511017...` initial pin. Exact all-4,291-blob source baseline (including SQL/CI/docs) and 2,168 TS runtime-file provenance are frozen. **No workflow may be silently removed or called migrated because a lookalike UI/demo or partial Node module exists.** Reuse original Cashier domain tests and application/port boundaries where adapted correctly to DRVO Module ownership, K5 Tenant/Business/Branch isolation, money/minor/timezone security and ADR-031. An actual source-executed POS line/header pricing comparison and private K5 quote UI have been coded; financial posting still OFF and full POS parity OPEN.

**Date:** 2026-11-15  
**Status:** **FOUNDER-APPROVED STRATEGIC GOAL; detailed contracts and individual migrations remain subject to source audit and tests.**  
**Founder directive:** DRVO ERP must eventually contain **all relevant functioning capabilities of the existing Cashier application**. Do **not** settle for a stripped-down Salon app, build ad-hoc salon-specific backends, or re-invent mature Cashier rules without auditing and reusing/adapting them. The replacement must conform to DRVO's multi-tenant, multi-business, multi-industry Modular Monolith architecture.

## Baselines / evidence

- **Legacy system:** [tarek-saad-dev/casher](https://github.com/tarek-saad-dev/casher), observed latest `main` on 2026-11-15: **`a51101791c52bca90e45bd40ead3a46c08d78adb`**. This is the **initial source inventory pin**, not proof every route is production ready. Cashier remains a separate application; no code/credentials/customer data are transplanted into DRVO by this ADR.
- **Destination:** [tarek-saad-dev/drvo-erp](https://github.com/tarek-saad-dev/drvo-erp). Source-confirmed DRVO SQL/HTTP/Chrome path currently supports shared Catalog, Customers, Booking and non-posting POS DRAFT, but **NOT full Cashier parity, real HR payroll, real Treasury, posted sales, full reports or validated actual main-DB rollout**.
- **Existing prior partial audits:** [Cashier Reuse Audit](../04-execution/CASHIER-REUSE-AUDIT-2026-11-12.md), [Pinned source parity](../04-execution/CASHIER-PINNED-SOURCE-PARITY-2026-11-12.md), [Cashier migration reference](../06-reference/CASHIER-MIGRATION.md), [Cashier booking lock review](../04-execution/CASHIER-BOOKING-LOCK-CU3-REVIEW-2026-11-13.md). They sampled functions; they are **not a complete feature inventory**.
- **Detailed source-to-target inventory:** [Cashier → DRVO complete functional inventory V0](../04-execution/CASHIER-FULL-FUNCTIONAL-PARITY-MATRIX-V0-2026-11-15.md).

## Architectural decisions, unchanged invariants

1. **Shared Industry-agnostic Modules** are independent owners of: HR, Catalog, POS/Sales, Booking, Treasury, Income/Expenses, Accounting, Inventory, Purchasing, CRM/Loyalty, Reporting, BusinessDay/Operations and Messaging/Integrations. Their exact Nest module package boundaries remain subject to implementation-specific ADRs; the initial inventory is *working mapping*, not automatic schema permission.
2. **Barber / Salon Extension** adds only the industry behavior: barber skills and service eligibility, branch/shift/barber schedule, chairs/appointment assignment, service-specific times/packages, walk-in queue/handoff, executor/opener commission and tip allocation, salon recipes and client experience. It consumes approved HR, Booking, POS, Catalog and Inventory contracts, not copies of their records.
3. **Lean Platform Kernel** owns universal identity, scoped Tenant/Business/Branch/Role authorization, releases and activation eligibility, audit/security boundaries; **no HR, POS, cash ledger, expense or salon-specific logic in Kernel** (ADR-037).
4. **Financial truth is not one catch-all Finance module:** POS owns sale/refund documents; Income/Expenses owner(s) own non-sale financial document reasons/approvals; **Treasury** owns the cash/bank collection and movements; **Accounting** owns authoritative general ledger/journal and balances; **Reports** compute authorized projections without writing financial source records. Each cross-module financial effect must be idempotent and reconciled, with explicit transaction/event contracts.
5. All migrated features retain **Tenant/Business/Branch isolation, server-side Default Deny, precise minor-unit money, timezone/BusinessDay boundaries, immutable audit and independent module-level tests**. Never copy Cashier's raw `dbo` tables, pooled DB adapter, legacy numeric IDs, API route/session auth or direct SQL mutations and call it compliant. Adopt only verified pure logic/test vectors; refactor IO to DRVO scoped contracts.
6. **Delivery order** prioritizes complete user-observable workflows and actual source-backed parity. Historical Cashier is the discovery reference, not automatically the desired architecture or policy. Record any deliberately omitted/deferred behavior explicitly with Founder signoff.
7. **Accelerated internal development:** follow [ADR-039](ADR-039-FOUNDER-TEMPORARY-FAST-DEVELOPMENT-MODE.md): commit directly to `main`, no mandatory PR, target the primary DRVO **development** database only after verifying it, its backup/checkpoint and migration state. Development speed does not authorize destructive writes, external customer access or unsafe payment posting.
8. Preserve **ADR-031** current unresolved posted sale → first GL Option A/B; implement and visually test UI, drafts, salary calculations, nonposting preview and synthetic financial tests freely, but do **not claim an authorized POSTED ledger, payment collection or business settlement** before the separate accounting/finance decision and proof.
9. Real external Salon / paid SaaS gates in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) do not automatically close by achieving source parity. Do not turn on Public Auth or production Tenant grants merely because Cashier already has a feature.

## Definition of Cashier full parity

A module is **PARITY-VERIFIED** only when every audited user-facing Cashier capability in its signed inventory has a DRVO equivalent with actual API/UI/SQL and tests covering normal, reversal/failure, role/branch/tenant negatives, precision and regression; relevant migrations are verified on the approved target DB; and demo/operator acceptance shows it working. Merely seeing a file, green synthetic unit test, UI screenshot or copied endpoint is **NOT** feature parity.

**Status today:** direction accepted, mapping being inventoried; **zero claims of complete module parity**. Scope covers the *latest* pinned Cashier main and requires ongoing delta checks rather than assuming the older 7a1d021 audit is exhaustive.

## 2026-11-17 Implementation note: POS V2 additive source-preserving draft

Per founder-approved preservation-first directive, **retain SQL014 POS DRAFT V1** and add only isolated, nonposting Cashier canonical snapshots in SQL022–023, as documented in [S2 acceptance](../04-execution/CASHIER-POS-RICH-DRAFT-S2-2026-11-17.md). POS owns price/discount snapshots; Catalog owns price authority; Customer and HR own identity; Salon Barber eligibility remains industry extension, not a duplicate POS employee domain. A quote is not an invoice or payment. SQL transaction re-prices and checks live K5 POS/Catalog/Customer/HR permissions + same Branch. Reviewed total mismatch must fail; no client price may mutate server-owned state. ADR-031 still blocks actual financial posting and cash settlement.

**This records an implemented partial vertical slice, NOT Cashier POS full parity or permission to apply SQL022–023 on a primary development database without ADR-039's independent restorable backup and target verification.** Source/CI evidence and private owner browser sign-off are separate gates.

## Next execution

1. Source-audit each Cashier functional category and cross-module edges; capture approved/differing/rejected behaviors and existing DRVO contracts.
2. Build one fully operational cross-module slice: **Barber (HR) → Service (Catalog) → Booking → POS DRAFT → Treasury/Accounting verified safe nonposting preview / downstream reporting**. Do not fabricate posted payment or accrual.
3. In parallel, implement independent domain cores (HR/Barber; Treasury/Expenses/Income; POS Sales/Booking; Inventory/Purchasing) with exact contracts and parity fixtures, avoiding direct table write leakage.
4. Exercise entire operator journey on the authorized DRVO dev environment, not just on an isolated synthetic demo; capture any blocked primary DB connection/backup/deployment truthfully.
5. Systematically close the full functional inventory, then open real customer launch gates separately.

**Revisit triggers:** Founder changes goal/scope, Cashier source substantially diverges, or individual module domain boundaries/finance posting policy require a concrete new decision.

## 2026-11-17 S3 limited draft-history implementation note

[S3 scope and acceptance](../04-execution/CASHIER-POS-CUSTOMER-DRAFT-HISTORY-S3-2026-11-17.md) adds private K5-authorized recent Branch Cashier V2 **DRAFT-only** client-filtered history and safe new-cart reuse. POS remains the history source, Customers/HR continue to own their identity records, and new carts revalidate the active Catalog rather than copying old prices/discounts. This is **not customer paid purchase history, full Salon Barber eligibility or full Cashier parity**. No new ADR decision, live flags, SQL schema or financial POSTED behavior is authorized.

## 2026-11-18 detailed POS workflow correction (no new decision)

[Cashier POS original page and dependency inventory V1](../04-execution/CASHIER-POS-PAGE-WORKFLOW-AUDIT-V1-2026-11-18.md) records founder correction that abbreviated POS migration lists omit phone/name lookup, on-the-spot Customer creation, profile completion, actual visit history and explicit **apply last visit**, together with additional cart, staff, package, stock, handoff, Loyalty, receipt and QuickActions flows. S2/S3 DRVO source-tested SQL **DRAFT** history is **not** Cashier purchase-history or last paid invoice. Do not mark full or customer-flow parity based on its display. Preserve original behavior with DRVO Customers/CRM, POS Sales, HR, Booking, Treasury and Salon Extension ownership, revalidate prices and K5 scope. ADR-031 financial posting remains unapproved.
