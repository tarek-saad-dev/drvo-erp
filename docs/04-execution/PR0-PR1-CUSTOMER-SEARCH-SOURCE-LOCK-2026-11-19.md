# Cashier migration progress — 2026-11-19 (incomplete)

## Delivery status matrix (do not collapse)

| Layer | State | Evidence |
| --- | --- | --- |
| Code committed locally | YES | tip after S12 browser repair |
| Code on GitHub `main` | YES | must match `git ls-remote` after push |
| Customers SQL024 CI | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44563649332 (`537005b`) |
| Catalog SQL025 packages CI | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44566865041 (`492b4d3`) |
| K5C / POS Rich / Deploy on `34c56fc` | PASS | K5C https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569387987 · POS Rich https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569387941 · Deploy https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569387936 |
| Salon Private Browser S12 on `76647c7` | FAIL then repair | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44570523438 — Booking probe required SQL024 `?q=` while disposable browser SQL stopped at 018; resource form never reached `ready` (`scopePresent` UUID-case false positive in diagnostic) |
| Workflow ledger | EXPANDED | 97 rows across CU/POS/BK/Q/HR/OPS/TR/INV/PUR/EXP/LOY/RPT/FIN/SYS |
| Inventory Shared DRAFT | STARTED | INV-01/02 PORTING — Catalog PRODUCT preview, on-hand UNKNOWN; INV-03 BLOCKED; no SQL027 / no VPS apply |
| Deployed / private Owner usable | NOT VERIFIED | Staging Deploy may succeed; Owner browser + primary SQL024/025 OPEN |
| Full Cashier parity | NO | Migration incomplete |

## Source lock

| Field | Value |
| --- | --- |
| Immutable pin | `046bf19b0d5833a07fe4b2891cbf3032d03b7cef` |
| Workflow ledger | `tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json` (97 workflows) |

## Delivered slices (CI-backed unless noted)

| Slice | Detail |
| --- | --- |
| Customer search | SQL024 + POS/Booking `?q=` |
| POS shell | Catalog/cart/quick-actions + Barber executor + PRODUCT search |
| Packages | SQL025 + commercial resolve + cart grouping + exclusive home-visit (NONPOSTING) |
| Booking→POS | `customerId`+`offeringId` handoff |
| S12 repair | Booking prerequisites use GET `/customers`; browser SQL→024; Chromium uses Business search UI |
| Inventory DRAFT track | Shared domain `stock-preview` + private `/inventory` UI (`DRVO_INVENTORY_WEB_ENABLED`); PRODUCT offerings only; on-hand UNKNOWN; no decrement / purchasing / ADR-031 |

## Explicit OPEN / gated

- Re-green Salon Private Browser CI on repair commit (required)
- Primary DB SQL024/025 (+ backup/restore) before any authorized mutation
- SQL026 draft package group/commercial price persistence
- SQL027 branch inventory balances + Nest EXECUTE-only + disposable verify CI (deferred; prefer over inventing qty)
- Owner authenticated private journey proof
- CU-05 paid history; ADR-031 posting; Cut live adapter
- INV-03 transfers; PUR-* purchasing posts; remaining SOURCE_IDENTIFIED/BLOCKED ledger rows

## Next

1. Confirm Salon browser CI PASS on repair SHA.
2. Owner disposable journey evidence; primary DB preflight only with approval gates.
3. Parallel HR/Queue/Treasury tracks; Inventory SQL027 only with Nest EXECUTE + disposable CI (never fake paid balances).
