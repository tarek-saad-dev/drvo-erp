# Salon S8 — verified parallel product slices and held private Pilot gate

**Source evidence — 2026-11-14:** [#95](https://github.com/tarek-saad-dev/drvo-erp/pull/95), [#96](https://github.com/tarek-saad-dev/drvo-erp/pull/96), and [#97](https://github.com/tarek-saad-dev/drvo-erp/pull/97) merged into main, combined product SHA `94a3f46ab171b84c691e409d13480e6521bd7f48`. Exact PR-head GitHub workflows all PASS: #95 **9/9** (K0/K1/K5C, four Shared SQL HTTP CI, Interactive Demo, Staging Artifact), #96 **5/5** (K0/K1/K5C, Demo, Artifact), #97 **2/2** (K0/K1). Product-main CI and actual Staging Deploy remain separate checks; never infer a successful deployment from PR CI alone.

## S8-A — safer availability correction under Shared Booking

Private K5-gated Booking now includes an explicit two-step correction guide around the existing SQL017 **CLOSE** and SQL016/017 **CREATE**. Operators may select an OPEN window, prefill local start/end, alter the future replacement, close the original with existing idempotent K5/Origin manage permission, confirm CLOSED through scoped GET, then separately publish. When a window vanishes from the limited 300 returned rows or its Resource identity mismatches, publishing fails closed. Existing SQL017 refuses CLOSE when a future/ongoing BOOKED appointment depends on it; 409 leaves the edit incomplete. The browser's partial Booking rows are never authority. A successful close followed by a failed create intentionally leaves a **CLOSED gap**; UI never claims atomic rollback, reopened availability or guaranteed restoration.

## S8-B — first-visit guided synthetic Salon Demo

Public `/demo/salon` now has a guided three-step **fake-data** path: create a new synthetic appointment, explicitly mark that very appointment COMPLETE, and manually save an unsent, unpaid **in-memory POS DRAFT**. Existing isolated model functions are reused, with reproducible state reset, simple progress cues, responsive CSS and full model tests. No API, SQL, K5, real session, browser storage, real customer contact, invoice, taxes, payment or POSTED sale. Demo still has noindex; default-disabled private routes remain 404 in CI.

## S8-C — private Owner/Staff browser review plan, NOT executed live

A portable, purely **review-only** `node tools/salon-pilot/browser-matrix.cjs --matrix` outputs 14 conditional expected checks for independently permitted Owner, read-only Staff, foreign Tenant/Branch, exact Origin, Booking conflict and SQL017 availability denial, and independently authorized POS DRAFT. It has zero browser, HTTP, SSH, SQL or authentication capability; root K0 tests prove output remains non-authorizing. This is *preparation*, NOT a real positive browser test or approved customer pilot. Role name alone never grants an action.

## Platform invariants and release status

- Shared Booking/Customers/Catalog/POS owners and Modular Monolith preserved; Salon-specific presentation remains a composition. No SQL 018, API scope expansion, new worker, HR clinical model, live Cashier pool or domain transfer.
- ADR-030 trusted Tenant/Business/Branch scope, separate booking.read/manage and POS permissions, Origin checks, idempotency and negative tests stay with existing SQL/HTTP owners.
- SQL **001–017 source-only target; VPS SQL 010–017 NOT approved/applied by S8**. Public Auth and Business Paid Module activation remain OFF. K5F trusted root checker, encrypted offhost independent restore, proxy + real role isolation verification, separately approved SQL migration window and ADR-032 private entitlement decision remain OPEN.
- No financial POSTED sale: ADR-031 first-journal, account mapping, tax, tender and Finance approval remain OPEN.

**Next parallel tasks:** once operator approvals arrive, execute the conditional real Owner/Staff browser pilot matrix and separately verify login/session/Branch entitlements; meanwhile improve Customer/Booking private UX only through existing scoped module owners. Never deploy or activate from docs or workflow PASS alone.
