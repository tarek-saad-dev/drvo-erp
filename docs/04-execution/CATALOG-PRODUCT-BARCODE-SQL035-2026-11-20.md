# Catalog PRODUCT barcode (SQL035) — Cashier product search

**Date:** 2026-11-20  
**Base:** `main` `c4fa98f` (post #137–#146)  
**Pin:** Cashier `046bf19` `productCatalog.service.ts` Barcode search  

## Scope

- Shared Core `CatalogOffering.Barcode` (PRODUCT only; SERVICE must be NULL).
- Unique filtered index per Tenant/Business when barcode present.
- `ReadCatalog` returns `barcode`; create accepts optional barcode; `SetCatalogProductBarcode` for updates.
- Private POS PRODUCT search matches displayName + barcode + offeringId prefix.
- Inventory stock preview search also matches barcode when present.

## Explicit non-goals

- No sale-time stock decrement / COGS / GL (ADR-031).
- No primary/VPS migration without backup + approval gates.
- No Owner browser proof in this slice.
- No inventing barcode from offeringId prefix.

## Evidence

- Disposable: `tools/catalog/verify.cjs` (apply through 035 + create/list/set/deny/uniqueness).
- Web source: `apps/web/test/cashier-pos-workstation.test.cjs`.
- Workflow: `.github/workflows/shared-catalog-ci.yml`.
