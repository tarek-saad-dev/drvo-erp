# PUR-S1 — Suppliers + purchase receive + AP preview (SQL037)

**Date:** 2026-11-20. **Status:** coded for review; disposable CI required; **not** PARITY-VERIFIED.

## Scope

Cashier-characterized Purchasing operator slice on Shared Core:

- Business-shared `core.Supplier` directory
- Branch `PurchaseReceiveDocument` / lines that raise `BranchStockBalance` via SQL027 `ApplyBranchStockDelta`
- Informational **AP preview** totals (`AP_PREVIEW_ONLY`, `NOT_PAID`, `NOT_POSTED`)
- Private `/purchasing` Light UI + Nest EXECUTE-only APIs behind `DRVO_PURCHASING_*` flags (default OFF)

## Migration number

**SQL037** (`037_purchasing_suppliers_receive_ap_preview.sql`).

- SQL035 = Catalog PRODUCT barcode (#148) — do not reuse
- SQL036 = Queue settle-expired (owned by Queue track; not included in this PR — must exist on main/tree for K4 consecutive apply of SQL037)

## Explicit non-goals

- No primary/VPS apply
- No ADR-031 payable payment, Treasury CashMove, or GL
- No live Cut
- Does not replace Inventory SQL027 OPENING/ad-hoc `StockReceiveDocument` path

## Evidence targets

- API unit: `apps/api/test/purchasing.test.cjs`
- Web source: `apps/web/test/purchasing-workspace.test.cjs`
- Domain pin: `tests/purchasing-ap-preview.test.cjs` + `_cashier_source/purchasing/`
- Disposable SQL2022/Nest: `tools/purchasing/verify.cjs` via `shared-purchasing-ci.yml`
