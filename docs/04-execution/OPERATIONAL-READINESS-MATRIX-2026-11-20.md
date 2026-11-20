# Operational Readiness Matrix — 2026-11-20

Baseline: `main` tip **`d0a5d06`** (Purchasing #152). Migrations **SQL001–037** in-repo. Cashier pin **`046bf19`**. ADR-031 **PROPOSED**; `postingActivation=BLOCKED`.

This matrix separates **merged disposable/CI evidence** from **Owner Pilot / primary VPS / paid posting** gates. Nonposting ≠ operational pilot.

## Track A — Private Pilot

| Gate | Status | Evidence | Next human action |
|---|---|---|---|
| Repo Pilot package (`tools/pilot/**`) | MERGED #150 | Fail-closed board, workflow matrix, disposable harness | Keep board honest as modules land |
| Workflow matrix DRAFT_PRINT | STALE until sync PR | #151 POS-07 print is in-repo; matrix may still say BLOCKED | Sync matrix → READY_IN_REPO; do not claim Owner print |
| TARGET_APPLY (isolated Pilot DB 001–037) | OPEN | Harness ≠ witnessed Pilot apply | Founder/DBA: isolated DB only; never primary/VPS without recovery gates |
| ISOLATED_BACKUP_RESTORE | OPEN | CI disposable restore ≠ Pilot witness | Operator witness encrypted/off-host Pilot restore |
| K5_PERMISSIONS (real Owner) | OPEN | Synthetic seed ≠ Owner session | Issue scoped Owner on Pilot target |
| OWNER_BROWSER_E2E | OPEN | S12/S13 disposable Chromium ≠ Pilot Owner | Customer→Booking→Barber→POS Draft→Inventory→Draft Print→Reload on Pilot |
| Live Cut import / primary SQL apply | BLOCKED | Track D fixtures only | Explicit Founder+Security+DBA approvals |

## Track B — Cashier functional parity (nonposting)

| Slice | Merged | Repo status | Still open |
|---|---|---|---|
| Catalog barcode SQL035 | #148 | PORTING | Owner browser; primary apply; sale stock− |
| POS draft print POS-07 | #151 | PORTING | Thermal agent; fiscal receipt; Owner print proof |
| Queue settle + live board SQL036 | #153 | PORTING | Voice/announce; ticket print; cron settle |
| Purchasing receive + AP preview SQL037 | #152 | PORTING | Paid AP/Treasury/GL |
| Packages expand | SQL025 + cart | SOURCE_TESTED | SQL038 draft package snapshots (in flight) |
| Ops day/shift | SQL029 | PORTING | Atomic handoff (in flight); BusinessClock |
| Treasury movements | SQL030 | PORTING | Settlement/GL (ADR-031) |
| HR employees + attendance | SQL018/020 | PORTING | Day-board depth; payroll (ADR-031) |
| Reports R1 booking sample | MERGED | SOURCE_TESTED | Revenue/P&L need posted Sales |
| Tips / returns / loyalty | Preview PRs | PORTING | Persist/post gated by ADR-031 |

## Track C — ADR-031

| Item | Status |
|---|---|
| Decision package #147 | MERGED, still PROPOSED |
| H1 Founder Option A/B/Defer | PENDING |
| H2 Finance CoA/tender/VAT/reversal | PENDING |
| H3 Architecture Sale→GL ownership | PENDING |
| H4 Security post-path isolation | PENDING |
| E1–E4 verified evidence | PENDING |
| `pos.sale.post` / paid posting | BLOCKED — no agent self-approve |

## Preferred next engineering (not more previews)

1. Pilot matrix honesty + isolated Owner E2E evidence (Track A).
2. Package draft snapshots SQL038; Ops shift handoff soft-gate.
3. HR attendance day-board; Queue ticket print; nonposting Reports filters.
4. Human ADR-031 H1–H4 packet only — no activation.
