# Cashier POS S2 — real authenticated SQL-backed price snapshots, customer and executor

**Date:** 2026-11-17.  
**Source lock:** `tarek-saad-dev/casher@bc9c03fff86074872590ad0fd3525f9a4e416958`, authoritative rules in `src/lib/sales/service-line-totals.ts`, original pinned blob `13942cef1852003af388a086f45c324ff1ae4d17` preserved under `tests/fixtures/cashier/`.  
**Status:** SOURCE + disposable SQL2022/Nest HTTP/private Web CI VERIFIED PASS on exact code SHA `8c8af0d17415d160dce061c163cd35750e0f9a21` — [GitHub Actions run #44164395952](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44164395952): **11/11 actual SQL + HTTP integration groups, 110/110 API unit tests, 4/4 POS V2 Web tests, 3/3 existing Cashier pricing Web tests, Next.js build and Typecheck**. **Primary DRVO development DB SQL019–023 migrations, backup restore, feature flags, private real-browser acceptance and external pilot remain OPEN.** Do not call this a posted sale, full Cashier POS or verified production.

## Why this vertical slice

Previous Cashier canonical discount price quote was **not persisted** in the authenticated DRVO POS. Existing SQL014 POS Draft V1 saves immutable, nonposting list-price snapshots, with no client/barber selection or discount lines. That did not preserve mature Cashier sale state.

**S2 closes a limited but genuine path:** select Catalog-priced service/product → enter line amount/percentage discounts and header discount → quote from the real K5-scoped Catalog → choose an existing Customer and HR Branch Employee per line → save **immutable, idempotent SQL discount snapshots** → reload actual saved totals and employee IDs, all without POS Payment or Inventory effects. This follows Cashier's line/header discount precedence and never copies its legacy `dbo` authentication/data model.

## Source changes / ownership

- **Shared POS owner:** `db/migrations/022_pos_cashier_draft_pricing.sql` adds `core.PosDraftPriceSnapshot` and `core.PosDraftLinePriceSnapshot` as immutable FK extensions to existing V1 `core.PosDraft`/`PosDraftLine` records. V1 reads/writes remain unchanged; V2 rows are optional and only created via new V2 SQL procedure.
- `core.CreateBranchPosCashierDraft` performs a single SERIALIZABLE transaction, verifying **live** K5 `pos.draft.manage`, `catalog.read`, `customers.read`, `hr.read`, **active same-Tenant/Business Customer, active same-Tenant/Business/Branch HR executor**, fresh active Catalog prices and same currency, unique Offering per draft and safe money limits. SQL recomputes line gross, amount discount precedence, % discount half-up in minor units, net, header discount AFTER line discounts, grand total. **Saving stale preview total fails with 409**; the browser cannot supply a price or overwrite the server's total. Idempotency is keyed by Branch+Actor+ClientRequestId+canonical payload SHA256. No change to legacy V1 SQL014 state/route.
- `core.ReadBranchPosCashierDrafts` (SQL022 definition + SQL023 post-DDL EXECUTE grant) scopes reads to the authenticated Branch, requires POS + Customer + HR read rights and returns immutable price/discount/customer/employee IDs, not private phone numbers or unscoped business contacts. Runtime SQL principal has SELECT/DML **DENY** on both new tables and EXECUTE-only public routines; the internal assert functions are not granted.
- **Nest owner** `apps/api/src/pos-drafts/{pos-rich.controller.ts,pos-rich.service.ts}` exposes `GET/POST /api/workspaces/{businessId}/branches/{branchId}/pos-drafts/cashier`; strict JSON whitelist, UUID request key, exact HTTPS Origin for POST, K5 cookie and flags `DRVO_K5_AUTH_ENABLED`, `DRVO_CATALOG_ENABLED`, `DRVO_POS_DRAFTS_ENABLED`, `DRVO_POS_RICH_ENABLED` default OFF; JSON money is integer minor/bps only.
- **Private Light UI** `cashier-pricing-panel.tsx` now gates `cashier-rich-draft-actions.tsx` behind `DRVO_POS_RICH_WEB_ENABLED=YES` and existing K5/Catalog/POS draft Web feature flags. The user must first calculate with the private Catalog quote; only then can they pick Customer/Employee from actual authorized APIs and save/reload. The older POS Draft action remains, clearly a V1 list-price draft. **No public `/demo/salon` changes** for this slice.
- Customer identity is **Customers Core-owned**, employee identity is **HR Core-owned**, offering/price **Catalog Core-owned**. Shared POS stores FK references and immutable amounts only; **no Salon-specific employee/customer duplication**. Barber skill / eligibility/booking availability/commission extension is **NOT** proven by generic executor IDs.

## Tests and release proof

- `apps/api/test/pos-rich-draft.test.cjs`: canonical parser/hashes, strict money, foreign/unknown fields, default OFF, origin before session, SQL procedure binding, read model.
- `apps/web/test/pos-rich-draft.test.cjs` and K5C: private flag, server Customer+HR fetch, draft vs posted status, readonly finance, no synthetic fixtures.
- `tools/pos-rich/verify.cjs` and `.github/workflows/pos-rich-ci.yml`: disposable SQL Server 2022, replay full migration chain 001–023, app EXECUTE-only, real Nest K5 login, create/replay/change amount, preserving correct Cashier line/header totals, branch and Tenant negatives, Customer/Employee foreign scope, Catalog drift, dynamic permission/session revocation, no Payment/Stock/GL. **VERIFIED PASS on code SHA `8c8af0d17415d160dce061c163cd35750e0f9a21` — [run #44164395952](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44164395952): 11 actual SQL2022/Nest HTTP groups + 110 API tests + 7 private Web source tests + Next build/typecheck**. `SQL023` deliberately moves the new scoped read-EXECUTE grant into the next committed migration, after SQL022 DDL; this was corrected through real SQL Server CI, not assumed.
- No automatic SQL022 migration or private feature flag activation in Staging Deploy. Because primary DB identity + independently restorable backup and migration checksums are still not verified, **private production-like UI is NOT LIVE**; public synthetic demo remains separate.

## Verification evidence, release state and changed files

- **Verified on a disposable SQL Server**, not on the VPS: full migrations 001–023 apply and replay; permanent stored procedure grants tested; SQL runtime principal has only scoped EXECUTE access; real K5 cookie and live SQL role are checked on each request. Saved 31,500 minor-unit gross, 2,900 line discount, 2,860 header discount and 25,740 grand total persisted and reloaded exactly. Price changes reject a stale reviewed total; original snapshot stays immutable. Idempotency, Tenant/Business/Branch/customer/employee isolation, input injection and role/session revocation checked.
- **Verified CI:** [SQL2022 + Nest + Web #44164395952](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44164395952) full PASS, 11 integration groups, 110/110 API, 7/7 Web source, Next build + typecheck. Source code on later main commits is unchanged, but documentation commits do not certify any actual deployment.
- **Unverified operational gates:** real DRVO primary DB identity/migration history, independently restorable backup, SQL022–023 apply/permissions, real authorized K5 Owner/Staff browser check and persistence, feature switches, externally accessible private URL and eventual customer pilot readiness. Stage application code deployment (if successful) does **not** apply migrations or turn on private flags.
- **Files changed:** `db/migrations/022_pos_cashier_draft_pricing.sql`, `023_pos_cashier_draft_read_permission.sql`, `apps/api/src/pos-drafts/pos-rich.service.ts`, `pos-rich.controller.ts`, `apps/api/src/app.module.ts`, `apps/api/test/pos-rich-draft.test.cjs`, `apps/web/.../pos-preview/cashier-rich-draft-actions.tsx`, `cashier-pricing-panel.tsx`, `pos-preview-client.tsx`, `page.tsx`, `apps/web/test/pos-rich-draft.test.cjs`, `apps/web/test/cashier-pricing-ui.test.cjs`, `tools/pos-rich/verify.cjs`, `.github/workflows/pos-rich-ci.yml`, `k5c-private-ui-ci.yml`; canonical ADR, current-state, roadmap, changelog and parity matrix synchronized. No production database or posted financial file touched.

## Parity ledger

| Cashier behavior | DRVO S2 status |
|---|---|
| Authorized real Catalog service/product list prices | Existing V1 Catalog, preserved V2 SQL price snapshots |
| Per-line explicit amount over percent, header after net lines | SOURCE PORTED / differential Cashier characterization |
| Saved line/header discounts and immutable draft reload | SOURCE CODED SQL022, verify CI + real DB later |
| Customer assignment | Optional existing Customer FK + live `customers.read`; no purchase history |
| Service-line Executor assignment | Optional active Branch HR Employee FK; Salon Barber skill/eligibility/commission NOT implemented |
| Inventory stock availability/decrement, prices by branch | GAP: static Business Catalog price only, no Inventory movement |
| Cashier packages/addons, booking-to-cart full handoff | GAP: existing one-service preview handoff, no full package |
| Sale create/edit/delete, paid cash/card split, tips, printed receipt, GL | GAP / ADR-031 approval required; no posting code added |
| Full day/shift enforcement and day close | GAP; no finance activation |
| Deploy to actual DRVO primary DB + authenticated Owner acceptance | BLOCKED by target+restorable backup+version proof |

## Practical acceptance when operator gates are satisfied

**Future private target (NOT confirmed live):**
`https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/pos-preview`.

Owner with `pos.draft.manage/read`, `catalog.read`, `customers.read`, `hr.read`:
open real Branch POS; add two authorized active Catalog items; enter line 10% and explicit EGP discount plus header 10%; **quote**; choose Customer and HR employee per line; save with UUID key; refresh and verify total, discounts and references persist; repeat exact key without duplicate; change Catalog price and confirm old saved snapshot immutable, new stale quote rejected; test denied/foreign Branch and revoked role. Actual finance ledgers and stock must remain unchanged.

**Architecture impact:** additive migration and independent K5 owner, no shared Kernel or Treasury/Accounting mutation, existing V1 compatibility retained. Rollout is **not** authorized by this source-only document.
