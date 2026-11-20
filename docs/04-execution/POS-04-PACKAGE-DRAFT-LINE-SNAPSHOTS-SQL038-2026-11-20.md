# POS-04 — Package draft line snapshots (SQL038, NONPOSTING)

**Status:** PORTING (disposable SQL + Nest unit/HTTP; Owner browser / primary DB OPEN).  
**Owned migration:** `038_pos_draft_package_line_snapshots.sql` exclusively (SQL026 remains Queue tickets; this closes the Cashier “SQL026-class” draft persistence gap under consecutive K4 numbering).

## What landed

- Additive columns on `core.PosDraftLinePriceSnapshot`: `PackageId`, `PackageGroupKey`, `PackageRole`, `CommercialPackagePriceMinor` (all NULL for non-package lines).
- `CREATE OR ALTER` of `core.CreateBranchPosCashierDraft` / `core.ReadBranchPosCashierDrafts` to persist and reload package fields from `LinesJson`.
- Nest `pos-rich.service` parser + list mapping; Shared Core `hydratePackageMetaFromSnapshots`.
- Private Cashier UX: rich save sends package snapshots; draft history reload rebuilds cart grouping.
- Verify: `tools/pos-packages/verify.cjs`; CI job `cashier-package-snapshots-sql-http` on `pos-rich-ci.yml`.

## Explicit non-goals

- No ADR-031 posting, paid sale, stock decrement on sale, or GL.
- Catalog remains ExpectedTotalMinor price authority (commercial package price is snapshot metadata for grouping/reload).
- No primary/VPS migration apply in this slice.
- Salon GROOM optional-group rules stay UI/resolve-side (not SQL038 columns).

## Evidence commands

```bash
npm ci --prefix apps/api && npm test --prefix apps/api
node --test apps/web/test/cashier-packages-expand.test.cjs
# disposable (CI env):
# POS_PACKAGES_SQL_DISPOSABLE=YES POS_PACKAGES_TEST_PORT=14348 node tools/pos-packages/verify.cjs
```
