# PR0 + PR1 + PR2 progress — Cashier migration (2026-11-19)

## Delivery status matrix (do not collapse)

| Layer | State | Evidence |
| --- | --- | --- |
| Code committed locally | YES | `537005b` then follow-up fixes on `main` |
| Code on GitHub `main` | YES (as of push `1d22de9..537005b`) | `git ls-remote` = `537005b38ec2d91951bcdc8801f52625fcde2c06` · https://github.com/tarek-saad-dev/drvo-erp/commit/537005b38ec2d91951bcdc8801f52625fcde2c06 |
| Customers SQL024 CI | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44563649332 (`customers-sql-http` success on `537005b`) |
| Web typecheck CI | FAIL then fixed | TS2322 cart `delta: 1\|-1` vs `number` broke K5C/Salon/Treasury/Staging Artifact; fix pushed in follow-up |
| Deployed / private usable | NOT VERIFIED | Staging Deploy may run after green web build; flags OFF; Owner browser OPEN |
| Full Cashier parity | NO | Migration incomplete |

## Source lock (PR0)

| Field | Value |
| --- | --- |
| Prior pin | `bc9c03fff86074872590ad0fd3525f9a4e416958` (retained) |
| New immutable pin | `046bf19b0d5833a07fe4b2891cbf3032d03b7cef` |
| Delta | +5 blobs, 0 removed |
| Inventories | `tools/cashier-reuse/*-2026-11-19.*` |
| Workflow ledger | `tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json` |

## Customer search (PR1)

| Piece | Detail |
| --- | --- |
| SQL024 | `SearchCustomers`, phone index, create-time phone conflict |
| Duplicate policy | Refuse create; `CUSTOMER_PHONE_EXISTS` + existing id; no UNIQUE yet |
| API | `GET .../customers?q=` Business TOP 20 |
| Private POS | Server search UI |
| Booking | Wired to same `?q=` server search (follow-up) |
| Concurrency | verify.cjs parallel duplicate-phone race case (follow-up) |

## POS UX (PR2)

| Slice | Detail |
| --- | --- |
| Catalog/cart/quick-actions | Cashier-adapted private Light shell; finance buttons disabled + labeled |
| Barber/HR selector | Reads `/hr/employees`; bookable vs non-barber; no payroll |
| Packages / history / print | Still OPEN |

## Explicit OPEN

- Primary DB SQL024 apply + backup/restore
- Owner authenticated browser
- Cut import
- Packages, handoffs, paid history, ADR-031 posting
- Remaining HR/Booking/Queue/Treasury/Expenses/Inventory/Loyalty/Reports workflows

## Next

1. Confirm web CI green after TS fix + Barber/Booking push.
2. Continue packages section + line executor wiring from selected Barber.
3. Expand ledger rows; keep finance gated.
