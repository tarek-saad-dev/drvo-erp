# INV-03 Inventory branch transfers (SQL032, nonposting)

Date: 2026-11-20. Branch `feat/cashier-inv-transfer-20261120` from `origin/main` `6b9c515`. Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`. Ledger row: **INV-03** (`BLOCKED` -> `PORTING`; not parity-verified).

## Landed
- `db/migrations/032_inventory_branch_transfers.sql`: `core.StockTransferDocument` + `core.StockTransferLine` (Tenant/Business/Branch composite FKs, `FromBranchId<>ToBranchId`, per-source-branch idempotency key, one cancel request per document) and three EXECUTE-only procedures `core.ReadStockTransfers`, `core.CreateStockTransfer`, `core.CancelStockTransfer`. Stock moves only through the SQL027 `core.ApplyBranchStockDelta` on `core.BranchStockBalance`.
- Nest `apps/api/src/inventory`: `GET .../inventory/transfers`, `POST .../inventory/transfers`, `POST .../inventory/transfers/:transferId/cancel` (existing `DRVO_INVENTORY_ENABLED` + K5 gates, Origin check before auth on POST, strict bodies, `Idempotency-Key`).
- Private Arabic Light UI `/workspace/:businessId/:branchId/inventory/transfers` (flag `DRVO_INVENTORY_WEB_ENABLED`), linked from `/inventory`.
- `packages/business-modules/inventory/src/transfer-rules.ts` (pure characterization of Cashier SAME_BRANCH / NO_LINES / INVALID_QTY / over-transfer rules) and byte-exact Cashier excerpts `_cashier_source/inventory/{transferInventory.service.ts,transfers.route.ts}` (blobs `0bb552bc`, `77fa2e22`).
- Tests: `tests/inventory-transfer-source.test.cjs`, `apps/api/test/inventory.test.cjs` (transfer cases), `apps/web/test/inventory-workspace.test.cjs` + `inventory-transfers.test.cjs`, `tools/inventory/verify.cjs` (SQL032 disposable SQL2022 + Nest HTTP cases), wired in `.github/workflows/shared-inventory-ci.yml`.

## Behavior
- **APPLY** (create): one SERIALIZABLE transaction. The caller must hold `inventory.manage` on the source branch (route branch) **and** on the destination branch. A per-business transaction applock serialises transfers (no A->B / B->A deadlock). Source on-hand must cover every line **regardless of the SQL027 negative-stock policy** (Cashier `allowNegativeOverride:false`); then source `-qty`, destination `+qty` via `ApplyBranchStockDelta` using precomputed named variables (never `EXEC ... -@var`).
- **CANCEL**: only from the source branch route, same two-branch RBAC; blocked with 409 if the destination no longer holds the transferred quantity; otherwise reverse deltas (`@DestDelta`, `@SourceDelta`) and `Status=CANCELLED`. Replay with the same key is a no-op; a different key on a cancelled document is 409.
- Replay of create with the same key and identical body returns the original id (`created:false`); a different body is 409.
- Tenant isolation: every statement is keyed by `TenantId`+`BusinessId`; foreign/unassigned/unknown branches and products return 404, same-branch 400.

## ADR-031
No GL, COGS, AP, Treasury, cost, price or sale-decrement objects. Responses and UI always carry `posting=NOT_POSTED`, `adr031=NOT_IN_SCOPE`, `treasuryState=NOT_PAID`, `accountingState=NOT_POSTED`. Quantity-only (`QtyMilli`); no unit cost on transfer lines.

## Deliberate differences from Cashier (not silent fixes)
- Cashier has DRAFT -> POSTED/IN_TRANSIT (source deduct) -> RECEIVED (destination add) with draft-only cancel; DRVO SQL032 is a single atomic APPLIED document with a reverse-delta cancel. No in-transit state, no separate receive authorization.
- Cashier skips non-stock-tracked products; DRVO only transfers active catalog `PRODUCT` offerings and rejects anything else.
- Cashier authorizes by session branch + `inventory.transfer`; DRVO reuses `inventory.manage` on both branches (no new permission seeded).
- Quantities are `QtyMilli` integers, not `DECIMAL(10,2)`.

## Proof state (honest)
| Layer | State |
| --- | --- |
| Static/pure tests (root, API, web) | run locally (see PR) |
| Disposable SQL Server 2022 + Nest HTTP (`tools/inventory/verify.cjs`) | **no local Docker/SQL**; proven only if `shared-inventory-ci` is green on the PR head |
| Primary / VPS SQL027 + SQL032 apply | **OPEN** (backup + 001-031 verification first) |
| Owner browser walk of `/inventory/transfers` | **OPEN** |
| Pilot | **OPEN** |

## Open / next
IN_TRANSIT + receive hop and a dedicated `inventory.transfer` action (Owner decision); stock-ledger movement history; POS sale decrement and COGS stay gated by ADR-031.
