# Cashier migration progress — 2026-11-19 (incomplete)

## Delivery status matrix (do not collapse)

| Layer | State | Evidence |
| --- | --- | --- |
| Code committed locally | YES | tip after INV/PUR + EXP/OI/RPT advance |
| Code on GitHub `main` | after push | must match `git ls-remote` after push |
| Customers SQL024 CI | PASS | prior run on main |
| Catalog SQL025 packages CI | PASS | prior run on main |
| Inventory SQL027 / Other Income SQL028 | CODED + unit | disposable CI workflows added; ADR-031 gated |
| Workflow ledger | UPDATED | INV/PUR/EXP/FIN-01/RPT rows advanced honestly |
| Deployed / private Owner usable | NOT VERIFIED | flags default OFF; primary SQL027/028 OPEN |
| Full Cashier parity | NO | Migration incomplete |

## Source lock

| Field | Value |
| --- | --- |
| Immutable pin | `046bf19b0d5833a07fe4b2891cbf3032d03b7cef` |
| Workflow ledger | `tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json` |

## Delivered slices (this advance)

| Slice | Detail |
| --- | --- |
| Inventory SQL027 | BranchStockBalance + policy + adjust; Nest EXECUTE-only; private `/inventory` |
| Purchasing PUR-01 | Nonposting OPENING/PURCHASE receive + cancel reverse qty; no AP/GL |
| Expenses EXP-01 | Existing SQL019 drafts remain SOURCE_TESTED (ledger corrected) |
| Other Income FIN-01 | SQL028 category/draft mirror; `notSalesRevenue=true`; `/other-income` |
| Reports | Barber ops + expense/OI/inventory draft summaries (read-only owners) |

## Explicit OPEN / gated

- INV-03 transfers; POS stock sale gates; cost valuation KPIs
- Paid PUR AP/Treasury; paid EXP/OI collect; ADR-031 posting
- Primary DB apply 027/028; Owner browser proof
- Cashier today-sales / monthly P&L RPT parity
