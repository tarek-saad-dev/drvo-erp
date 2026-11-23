# Cut Salon → DRVO: operational replacement acceptance ledger (initial source-backed baseline)

**Date:** 2026-11-22  
**Scope:** Cashier `tarek-saad-dev/casher@f8fa67d2b1c8254e638cf89d95dcee75edc88598` vs DRVO `tarek-saad-dev/drvo-erp@b22aaa2eb99ebd01ff45239bfb2b66968478c432`. **Baseline inventory, not a completed exhaustive audit or parity certificate.**

**Purpose:** One accountable living acceptance ledger for replacing Cashier at Cut Salon, covering every operator action, edge case, background job, SQL side effect and role. The prior [parity matrix V0](CASHIER-FULL-FUNCTIONAL-PARITY-MATRIX-V0-2026-11-15.md) is a useful starting point, but includes stale module statuses; [POS interaction audit](CASHIER-POS-PAGE-WORKFLOW-AUDIT-V1-2026-11-18.md) adds source-level detail. Neither proves a working Cashier replacement.

## Rules and definitions

- **Cashier remains the live system of record.** Do not import Cut PII, post money, change Cut production SQL or enable paid access by following this ledger.
- This ledger is **not** complete merely because a module is listed. Every user-triggerable action, visible screen, role, state transition, background job, report/export/print and cancellation/failure path in the Cashier source manifest must be mapped or explicitly founder-deferred.
- `SOURCE_ANCHORED` = mapped to a reviewed Cashier source family / prior source audit, **not** proven under this newest source SHA. `DRVO_PARTIAL` = source/CI capability exists, **not** full parity. `BLOCKED` = hard prerequisite unresolved. `PARITY_VERIFIED` requires source characterization, DRVO authorized SQL/HTTP/browser, security negatives, re-entrancy/concurrency, operator acceptance and evidence at a pinned SHA. **No row below is PARITY_VERIFIED**.
- P0 = no Cut Salon cutover if missing. P1 = required for full replacement unless founder approves an explicit, tested operational alternative. P2 = may defer only by written owner acceptance.
- Any statement about a current live SQL schema or Cut business data needs independently witnessed operator evidence; GitHub source proves neither.

## Source-anchored workflow seed (expand by inspecting every action)

| ID | Criticality | Operator workflow and required behavior | Cashier source family / evidence | DRVO current boundary / next test | State |
| --- | --- | --- | --- | --- | --- |
| C01 | P0 | Customer search by name / normalized phone, all business records | `src/app/income/pos/page.tsx`, POS interaction audit | SQL024 business-scoped search; prove full dataset and negative scope | DRVO_PARTIAL |
| C02 | P0 | Create customer, duplicate policy, profile, consent and edit | `src/components/pos/**`, `src/app/api/customers/**` | Customers SQL012/031, identity reconcile before import | DRVO_PARTIAL |
| C03 | P0 | Genuine last visits, invoice details, explicit apply-to-cart with fresh prices | `src/app/api/sales/**`, `src/components/pos/**` | DRVO DRAFT history is not posted sale history | BLOCKED |
| CAT01 | P0 | Service/product search, categories, active flags, price, duration | `src/app/api/services/**`, `src/lib/catalog/**` | SQL011 Catalog; prove edits and searches with real scoped data | DRVO_PARTIAL |
| CAT02 | P0 | Packages, bundled items, addons, barber durations, steps | `src/app/api/packages/**`, `src/app/api/services/**` | SQL025/038 package draft snapshots; full rules unproven | DRVO_PARTIAL |
| POS01 | P0 | Original compact POS navigation, keyboard, responsive dialogs, quick actions | `src/app/income/pos/page.tsx`, `src/components/pos/**` | Workstation shell transplanted, individual actions remain unverified | DRVO_PARTIAL |
| POS02 | P0 | Multi-line service/product cart, quantities, stock gating, executor allocation | `src/app/income/pos/page.tsx`, `src/apps/pos/**` | SQL014/022/023 DRAFT, pricing, partial stock validation | DRVO_PARTIAL |
| POS03 | P0 | Line/header discounts, tax, rounding, vouchers, loyalty and accurate totals | `src/lib/sales/**`, `src/lib/pos/**` | Cashier price characterization partially reused; all tender/loyalty unproven | DRVO_PARTIAL |
| POS04 | P0 | Save/reopen real posted invoices, edit/void/reversal/returns, partial refund | `src/apps/pos/application/**`, `src/app/api/sales/**` | DRAFT only; approved posting and reversal contracts absent | BLOCKED |
| POS05 | P0 | Cash/card/split/partial/credit tender with idempotency and real evidence | `src/app/api/sales/**`, `src/lib/clearingMethod.ts` | ADR-031 H1-H4/E1-E4 unresolved | BLOCKED |
| POS06 | P0 | Receipt printing, fiscal/paid reprint, device failure/retry | `src/lib/printService.ts`, receipt-studio, Cashier POS audit | DRAFT window.print exists; paid printer path unproved | DRVO_PARTIAL |
| POS07 | P0 | Tip/barber split, sale commission, reverse on cancellation | `src/lib/pos/tipMath.ts`, payroll/pos source | Proposed financial posting, HR ledger unproved | BLOCKED |
| B01 | P0 | Calendar, create/move/cancel/no-show/complete, multi-service booking | `src/app/bookings/**`, `src/apps/booking/**` | Booking SQL013/015/033 partial; source parity unproved | DRVO_PARTIAL |
| B02 | P0 | Barber/employee availability, shifts/day-off, overlap, timezone/overnight | `src/lib/booking/**`, `src/app/api/barbers/**` | SQL016/017 plus HR salon extension; race tests needed | DRVO_PARTIAL |
| B03 | P0 | Public website booking, search/slot/confirm/manage/cancel with safe auth | `src/app/api/public/booking/**`, booking UI | Site-to-DRVO live public flow and access approval absent | BLOCKED |
| B04 | P0 | Booking→POS conversion once, correct customer/service/executor, no double sale | `src/apps/booking/application/convertBooking.ts`, `src/app/api/bookings/**` | Link to DRAFT partial; atomic posted invoice boundary unresolved | BLOCKED |
| Q01 | P1 | Walk-in queue/arrival/ETA/assignment/expired ticket/reassignment | `src/app/api/queue/**`, `src/lib/queueEstimateEngine.ts` | SQL026/036 partial; floor-browser parity unproved | DRVO_PARTIAL |
| HR01 | P0 | Employee master, branch assignments/transfers, roles, inactive/archive | `src/app/admin/hr/page.tsx`, `src/lib/hr/**` | SQL018 employee/barber partial | DRVO_PARTIAL |
| HR02 | P0 | Attendance, breaks, leave, absence, override, overnight and audit | `src/modules/attendance/**`, `src/app/api/admin/hr/**` | SQL020 attendance sessions partial | DRVO_PARTIAL |
| HR03 | P0 | Salary agreements: fixed/hourly/daily/freelance, retroactive effective date | `src/lib/payroll/**`, `src/app/api/payroll/**` | Payroll persisted behavior not fully migrated | BLOCKED |
| HR04 | P0 | Daily/monthly commission, targets, tips, advances/deductions, employee ledger | `src/lib/payroll/**`, `src/app/admin/hr/**` | Financial cross-owner tests and reconciliation missing | BLOCKED |
| HR05 | P1 | Employee self-service/portal, permissions and acknowledgements | `src/app/api/employee-portal/**` | Full authenticated employee portal unverified | SOURCE_ANCHORED |
| OPS01 | P0 | Open/close BusinessDay, overnight cutoff, missed day, reopen rules | `src/modules/operations/**`, `src/app/api/day/**` | SQL029 operational day/shift nonposting | DRVO_PARTIAL |
| OPS02 | P0 | Shift open/close/handoff, operator custody, safe day close | `src/app/api/shift/**`, `src/app/treasury/shift-close/**` | SQL029/039 partial; real cash closure unverified | DRVO_PARTIAL |
| T01 | P0 | Cash in/out, bank/card rails, transfers, approvals and reversals | `src/apps/treasury/**`, `src/app/api/treasury/**` | SQL030 custody movements, GL gated | DRVO_PARTIAL |
| T02 | P0 | Shift/day drawer counts, expected vs actual, manager approval and reconciliation | `src/app/treasury/**`, `src/app/api/treasury/**` | SQL021/030 count and recon partial; posting blocked | DRVO_PARTIAL |
| FIN01 | P0 | Expenses, recurring categories, approval, receipt, reversal and settlement | `src/app/expenses/**`, `src/app/api/expenses/**` | SQL019 nonposting expense documents | DRVO_PARTIAL |
| FIN02 | P1 | Other income separate from sales, corrections, and budgets | `src/app/api/incomes/**`, `src/app/api/budget/**` | SQL028 other-income DRAFT; budgeting unproved | DRVO_PARTIAL |
| FIN03 | P0 | Balanced GL entry, taxes/tender classification, refunds, accounting close | `src/lib/accounting/**`, sale/cashmove sources | ADR-031 PROPOSED; no posted GL authorization | BLOCKED |
| INV01 | P0 | Product on-hand by branch, stock issue/adjust/count, negative-stock policy | `src/app/api/inventory/**`, `src/lib/inventory/**` | SQL027 stock, preview/receipt/adjust; sale decrement absent | DRVO_PARTIAL |
| INV02 | P0 | Purchase/receive/return/transfer, supplier payable and cost reconciliation | `src/app/api/purchases/**`, inventory source | SQL032/037 partial, posting/AP settlement absent | DRVO_PARTIAL |
| INV03 | P0 | Sale/return-driven stock and salon service recipe consumption exactly once | Cashier sale transaction + `src/lib/inventory/**` | POS→Inventory contract and retry/reversal proof missing | BLOCKED |
| LOY01 | P1 | Points earn/redeem/reverse, wallet, tiers and membership benefits | `src/app/api/loyalty/**`, `src/app/admin/cut-club/**` | DRVO partial Loyalty; latest Cashier commits require diff audit | DRVO_PARTIAL |
| CRM01 | P1 | Follow-up/new customer/visit filters, notes, consent, outreach history | `src/app/api/customers/**`, `src/app/api/loyalty/**` | SQL031/034 partial; real history/consent proof missing | DRVO_PARTIAL |
| R01 | P0 | Daily/shift sales vs collections vs cash, voids, reconciliation | `src/app/reports/**`, `src/app/api/reports/**` | Operational read model partial; posted finance absent | BLOCKED |
| R02 | P1 | Employee/service/branch/monthly performance, wages and profit | `src/app/reports/**`, `src/lib/reports/**` | Source-of-truth reports and finance policy needed | DRVO_PARTIAL |
| MSG01 | P1 | Booking reminder/cancellation, opt-in WhatsApp, safe retries/opt-outs | `src/modules/messaging/**` | End-to-end scoped outbox+webhook parity unverified | SOURCE_ANCHORED |
| AI01 | P2 | AI receptionist/handoff, permissions, audit, fallback | `src/apps/ai-receptionist/**`, `src/modules/messaging/**` | Founder may defer explicitly only if Cut does not depend on it | SOURCE_ANCHORED |
| CFG01 | P0 | Tenant/business/branch identity, role gate, revoke, forbidden cross-scope actions | `src/platform/**` + DRVO K5/ADR-030 | DRVO source & disposable tests exist; live private negative proof OPEN | DRVO_PARTIAL |
| OPS03 | P1 | Live floor board and multi-module quick action consistency | `src/app/operations/**`, `src/app/api/operations/**` | DRVO composition limited; browser operator proof absent | DRVO_PARTIAL |
| SYS01 | P0 | Backup restore, background jobs, printer/network outage, retry and recovery | Cashier ops/scripts, SQL + DRVO ops | Recovery, alerting and DRVO cutover rehearsal OPEN | BLOCKED |

**Important:** Rows are *minimum required journeys*, not a count of all screens/actions. Cut's actual feature usage and shift/operator testimony must extend the list, not silently reduce it. Confirm Cashier's **latest** code before each port; prior DRVO source pin `046bf19` is older than the audited `f8fa67d`.

## One-row completion protocol

For each workflow: (1) pin Cashier file/blob/SHA and version delta; (2) enumerate every button, branch, retry, error and role; (3) identify original read/write SQL and dependent side effects; (4) map to one authoritative DRVO owner + permitted extensions; (5) migrate behavior/UI with scoped ports, not copy legacy `dbo` DML/session; (6) run original characterization and target differential cases; (7) run Tenant/Business/Branch negative, concurrency/idempotency and reversal tests; (8) prove trusted target SQL/HTTP + exact deployed SHA and actual private browser; (9) get staff/owner evidence. **Only then** mark `PARITY_VERIFIED`.

## Execution order and Go/No-Go

1. P0 **synthetic** isolated pilot: SQL001–040 checksums + independently witnessed backup/restore + K5 Owner + real private browser Customer→Booking→Barber→POS DRAFT→reload. This proves *persistence*, **not** paid Cut readiness.
2. Four file-disjoint owners in parallel: POS/Sales; Booking/Public Web/Queue; HR/Payroll; Operations/Treasury/Inventory/Accounting. Core scope & finance schema changes are **serialized** under one owner; no concurrent migration number allocation.
3. Financial posting remains OFF until **ADR-031 approvals and verified one-write idempotent Sale→Treasury→Inventory→GL/reversal**. No fake successful payment or cash ledger.
4. Authorized read-only Cut extract, identity map, import reconciliation and privacy controls; historical paid sales **read-only**, never repost.
5. Shadow/differential operation with one financial writer (Cashier), then signed Cut operator P0/P1 acceptance, rollback rehearsal, controlled Cutover with DRVO single writer.
6. Release **NO-GO** if any used P0 fails, any P1 lacks approved alternative, negative isolation fails, posted totals cannot reconcile, printer/backup recovery is unproven or required activation rights are missing.

**Next inventory expansion:** enumerate every route, page, dialog and background job from the pinned Cashier source manifest (`tools/cashier-reuse/cashier-all-source-blobs-2026-11-17.json`) and compare the post-pin commits; attach file+blob to each operator action. This document intentionally does **not** call those 4,291 files 4,291 features.

## Related authoritative decisions

[ADR-001](../05-decisions/ADR-001-new-repository.md) · [ADR-002](../05-decisions/ADR-002-modular-monolith.md) · [ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) · [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) · [ADR-037](../05-decisions/ADR-037-LEAN-PLATFORM-KERNEL-BOUNDARY.md) · [ADR-040](../05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md) · [Cut source extraction gates](CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18.md).
