# PR0–PR2+ packages progress — Cashier migration (2026-11-19)

## Delivery status matrix (do not collapse)

| Layer | State | Evidence |
| --- | --- | --- |
| Code committed locally | YES | HEAD `5ccb249` |
| Code on GitHub `main` | YES | `git ls-remote` = `5ccb2498432c68aa4dc55352e964d7b21ab3ff83` |
| Customers SQL024 CI | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44563649332 (`537005b`) · https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44564799543 (`04c00dc`) |
| K5C + POS Rich on `2103d50` | PASS | K5C https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44565099095 · POS Rich https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44565099330 |
| Catalog SQL025 on `492b4d3` | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44566865041 |
| K5C/POS Rich/K1 on `492b4d3`/`d313531` | FAIL then fixed | Outdated pricing key assertion + TS handoff seed + Staging P4 pending count; fix `5ccb249` |
| Deployed / private usable | Staging Deploy may follow green web; Owner browser OPEN | Flags OFF; SQL024/025 **not** applied to primary/VPS |
| Full Cashier parity | NO | Migration incomplete |

## Source lock (PR0)

| Field | Value |
| --- | --- |
| Prior pin | `bc9c03fff86074872590ad0fd3525f9a4e416958` (retained) |
| New immutable pin | `046bf19b0d5833a07fe4b2891cbf3032d03b7cef` |
| Inventories | `tools/cashier-reuse/*-2026-11-19.*` |
| Workflow ledger | `tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json` |

## Customer search (PR1)

| Piece | Detail |
| --- | --- |
| SQL024 | `SearchCustomers`, phone index, create-time phone conflict |
| API | `GET .../customers?q=` Business TOP 20 |
| Private POS + Booking | Server search UI |
| Concurrency | verify.cjs parallel duplicate-phone race |

## POS UX (PR2+)

| Slice | Detail |
| --- | --- |
| Catalog/cart/quick-actions | Cashier-adapted private Light shell; finance buttons disabled + labeled |
| Barber → executor | `selectedBarberId` seeds SERVICE line executors on rich DRAFT save; PRODUCT forced null; cart shows context |
| Packages (SQL025) | `CatalogPackage` + items; `GET/POST .../catalog/packages`; POS expand → DRAFT SERVICE lines; live Catalog prices on quote |
| Optional groom add-ons / booking package hydration / print / paid history | Still OPEN |
| CU-05 paid visit history | Still BLOCKED (no posted Sales owner) |

## Explicit OPEN / gated

- Primary DB SQL024/025 apply + backup/restore
- Owner authenticated browser
- Cut import
- ADR-031 posting / fake payments forbidden
- Remaining HR/Booking/Queue/Treasury/Expenses/Inventory/Loyalty/Reports workflows

## Next

1. Confirm Shared Catalog + K5C/POS Rich CI green after packages push.
2. Optional package extras + Booking→POS multi-line handoff.
3. Expand ledger; keep finance gated.
