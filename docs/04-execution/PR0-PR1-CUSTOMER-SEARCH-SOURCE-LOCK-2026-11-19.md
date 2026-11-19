# PR0–PR2+ packages/handoff progress — Cashier migration (2026-11-19)

## Delivery status matrix (do not collapse)

| Layer | State | Evidence |
| --- | --- | --- |
| Code committed locally | YES | tip advances with optional-extras slice |
| Code on GitHub `main` | YES | must match `git ls-remote` after push |
| Customers SQL024 CI | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44563649332 (`537005b`) |
| Catalog SQL025 packages CI | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44566865041 (`492b4d3`) |
| K5C on `34c56fc` | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569387987 |
| POS Rich on `34c56fc` | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569387941 |
| K1 + Artifact + Deploy on `34c56fc` | PASS | K1 https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569388027 · Artifact https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569388041 · Deploy https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44569387936 |
| Deployed / private usable | Staging Deploy SUCCESS on `34c56fc`; Owner browser OPEN | Flags OFF; SQL024/025 **not** on primary/VPS |
| Full Cashier parity | NO | Migration incomplete |

## Source lock (PR0)

| Field | Value |
| --- | --- |
| Immutable pin | `046bf19b0d5833a07fe4b2891cbf3032d03b7cef` |
| Workflow ledger | `tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json` |

## Delivered vertical slices (verified in CI, not Owner-browser)

| Slice | Detail |
| --- | --- |
| Customer search | SQL024 + `?q=` + POS/Booking server search + duplicate-phone concurrency |
| POS shell | Catalog/cart/quick-actions (finance gated) + PRODUCT tab id-prefix search |
| Barber → executor | `selectedBarberId` seeds SERVICE rich-draft executors; PRODUCT null |
| Packages SQL025 | Catalog packages + POS expand-to-DRAFT SERVICE lines |
| Booking→POS | `customerId`+`offeringId` handoff; optional `packageId` expand when cart empty |

## Explicit OPEN / gated

- Primary DB SQL024/025 apply + backup/restore
- Owner authenticated browser proof
- CU-05 paid visit history (no posted Sales owner)
- Optional groom package extras / booking package identity on appointments
- Print/receipt, tips settlement, split tender, ADR-031 posting
- Cut import; remaining HR/Queue/Treasury/Expenses/Inventory/Loyalty/Reports full workflows

## Next

1. Optional package extras + barcode/stock only after Catalog schema owns them.
2. Keep CU-05 BLOCKED until posted Sales read owner or audited Cut read adapter.
3. Expand ledger; never fake payments.
