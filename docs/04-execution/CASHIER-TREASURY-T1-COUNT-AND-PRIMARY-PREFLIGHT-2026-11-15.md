# Cashier → DRVO Treasury T1 + Operations Shift evidence + primary DB read-only preflight

**Date:** 2026-11-15  
**Status:** Treasury SQL021 + Nest HTTP disposable integration **PASS** on exact code commit `c6419c5c72e688f5d4cf0173be4219bc3de57b8a`, [9/9 real integration and 95/95 Nest unit](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43675431478); initial UI CI test-label mismatch fixed; [exact source SHA `75fc31f04` two-job SQL + HTTP + Web CI PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43675726632) — 9/9 SQL/HTTP integration, 95/95 API unit, 3/3 Web tests and Next production Build/Typecheck. [K5C private route CI PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43675726649). **No primary DRVO development DB 019–021 migration, independent off-host restore, authorized Owner UI, Public Auth, paid/posting or customer GO verified.**

## Cashier source actually reviewed

- Cashier `src/app/api/treasury/balance/route.ts` computes total per-method balance from `dbo.TblCashMove` in/out; it is source authority for *actual* cash movements only, **not** proof that counts equal balance.
- Cashier `src/app/api/treasury/movements/route.ts` lists movements by Branch/Day/Shift/payment method. DRVO intentionally does not port the old numeric ID, raw `dbo` tables, client filters or Cashier auth.
- Cashier `src/app/api/treasury/reconciliation/route.ts` creates audited end-of-day reconciliations with CountedAmount vs SystemAmount and calls close-day. **That lifecycle cannot be truthfully implemented without DRVO BusinessDay/Shift, authoritative ledger and ADR-031**. No legacy 50 EGP variance threshold was copied as a universal/country policy.
- Cashier `src/app/api/shift/open/route.ts` requires branch operator and `shift.open`; `src/app/api/day/close-and-open/route.ts` requires `day.close` + `day.open` and handles open shifts. **Reviewed**, not mechanically copied.

## Implemented Treasury T1 source slice

1. `db/migrations/021_treasury_cash_count_drafts.sql`: new **Treasury-owned** `core.TreasuryCashCountDraft` scoped `TenantId, BusinessId, BranchId` with composite Branch FK, trusted actor FKs, server UTC timestamps, `CountedMinor` integer from 0, currency allowlist, Notes, `DRAFT→CANCELLED` only, idempotent request keys and cancellation actor/key/time. No balance/settlement fields or other domain writes. SQL 021 is additive; no user seed.
2. `core.AssertTreasuryCountAction` checks live K5 session, current Account+Credentials, Tenant/Business+Branch membership and role permission `treasury.count.read/manage` under scoped transactions; runtime app principal has **EXECUTE-only** on public read/create/cancel SQL procedures and DENY table DML/SELECT. Separate from `expenses.read/manage`, HR and POS rights.
3. `apps/api/src/treasury/` Nest controller+service adds private `GET/POST /api/workspaces/{businessId}/branches/{branchId}/treasury/counts` and `POST /{countId}/cancel`, session-bound Actor, exact HTTPS Origin, strict JSON shape, UUID Idempotency-Key, minor-currency safe integers. Returns `NONPOSTING_PHYSICAL_CASH_COUNTS_ONLY`, `NOT_COMPUTED` balance, `NOT_PERFORMED` reconciliation, `NO_SETTLEMENT`, `NOT_POSTED`. Both API and private Web flags **default OFF**.
4. `apps/web/src/app/workspace/[businessId]/[branchId]/treasury` Light UI captures cash drawer observed amount/currency/note, reloads saved draft and cancels it. Branch launcher only shows the tile when server Web flag **AND successful independently scoped API GET**. This is **not** a cashier ledger screen or a finance balance.
5. Tests: `apps/api/test/treasury.test.cjs`, `apps/web/test/treasury-counts.test.cjs`, `tools/treasury/verify.cjs`, `.github/workflows/treasury-counts-ci.yml`, K5C default-404 check. [Real SQL2022/Nest integration 9/9 PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43675431478): 21 forward-only SQL migrations/replay, runtime direct-table access denied, trusted session, create/retry/conflict, amount precision, foreign Tenant/Branch denied, cancel, immediate role and membership/session revocation. `95/95` API test PASS. The first Web job failed because a source test incorrectly asserted `NOT_RECONCILED` instead of the actual `NOT_PERFORMED` API value. Corrected, then verified **[Treasury Web 3/3 and Next build PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43675726632)**.

## Operations + Payroll safety boundary

- `packages/business-modules/operations/src/shift-readiness.ts` adds shared **pure** `evaluateShiftReadiness` over trusted scoped BusinessDay, Shift, Actor and expected-date evidence. It blocks missing/closed/stale day, missing/closed/mismatched Shift, actor mismatch and all cross-scope/malformed evidence. It **always returns financialPostingState=NOT_AUTHORIZED** even when operational evidence is READY. No SQL/Shift open/close or timezone inference; test `tests/operations-shift-readiness.test.cjs` runs with root K0.
- HR Attendance SQL020 remains UTC-only, NOT linked to BusinessDay, payroll NOT_CALCULATED. Existing `packages/business-modules/hr/src/payroll-agreement.ts` is pure preview only. Full shift scheduling, BusinessDay writes, salary agreements, paid payroll and deductions **remain gaps**; do not label Operations/HR parity.
- ADR-031 remains **PROPOSED**: no legitimate paid Expense, Treasury movement, deposit/withdrawal, sale posting or general journal yet. Count is not an expense nor a movement and must never affect balances.

## Primary DRVO development DB — operational rollout gate

`ops/dev-primary/migration-readiness.cjs` validates SHA-256 SQL manifest and exact prefix history; `ops/dev-primary/verify-readonly.cjs` is a **local-only, explicitly opted-in, restricted-reader SQL preflight**. It forbids remote host and unexpected DB names/SQL admin roles, checks `DB_NAME()`, applied checksums and lists pending 019/020/021, and outputs **`safeToApply=false`** because no independent restorable checkpoint evidence is available. Unit `tests/dev-primary-migration-readiness.test.cjs` validates drift, gaps and duplicate histories. **These files were created; NO connection to the actual primary DB was possible from available connected GitHub-only capabilities.**

Instructions for authorized operator (not for public CI):

1. Privately confirm intended **existing primary DRVO development database** and read-only local SQL reader credentials (never paste in chat, code or logs). From the trusted machine with `apps/api/node_modules/mssql` installed, set `DRVO_DEV_PRIMARY_READONLY=YES`, `DRVO_DEV_SQL_HOST=127.0.0.1`, `DRVO_DEV_SQL_PORT=1433`, `DRVO_DEV_SQL_DATABASE` to the *verified* `DRVO_ERP_STAGING` / `DRVO_ERP_DEV` / `DRVO_ERP_DEVELOPMENT` as applicable, and restricted `DRVO_DEV_SQL_USER`/`DRVO_DEV_SQL_PASSWORD` from the existing secrets channel. Run `node ops/dev-primary/verify-readonly.cjs`; do NOT guess DB name or use the stage forced-migration receiver to bypass this gate.
2. Independently **create and verify a restorable backup** on the approved target/restore isolation, preserve restore proof and immutable migration history; review SQL 019–021, actual pending prefix, app grants and rollback/checkpoint recovery.
3. Only after explicit approved operator scope and run: execute exact incremental reviewed SQL migration via the restricted approved channel, verify post-schema hash/permissions, target read/writes and cross-Tenant negative tests, then consider private K5 flags and authorized Owner/Staff browser persistence. Public Auth and customer data remain OFF.
4. Do not call the **existing** [Staging SQL migration manual workflow](https://github.com/tarek-saad-dev/drvo-erp/blob/main/.github/workflows/staging-db-migrate.yml) on a guessed primary DB: it is explicitly pinned to DRVO_ERP_STAGING via manual exact-string authorization, a separate operational policy.

**Private candidate URL (NOT LIVE):** `https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/treasury`. Actual user-accepted persistence still OPEN; public `/demo/salon` is only synthetic.

## Next Cashier parity
- Real **Operations BusinessDay/Shift** persistence and local clock configuration with scoped close/catch-up/forced shift review, plus reversible tests.
- Authoritative Treasury movements/transfer/reconciliation and cash/bank method balances, after ADR-031 settlement/reconciliation policy, independent live DB/backup and appropriate approval.
- HR Attendance work dates, absence/breaks and payroll agreement application using trusted Day/Shift; no silent salary liability or payment.
- Real DRVO primary DB and private user-journey acceptance are separate blockers and cannot be auto-closed by green disposable SQL/HTTP CI.
