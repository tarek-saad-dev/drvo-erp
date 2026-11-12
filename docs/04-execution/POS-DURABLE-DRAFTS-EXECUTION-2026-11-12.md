# PL-1b — Durable, scope-protected POS draft execution (2026-11-12)

**Status:** review branch + PR; not merged or deployed at creation. No Production/VPS SQL authorization. Founder requested scoped durable drafts as the next slice after merged PL-1 Preview. ADR-030 implementation-neutral scope baseline accepted; **ADR-031/032 still PROPOSED**. K5F operational security OPEN.

## Architecture impact (before implementation)

This introduces POS-owned database records, **not** Accounting/Treasury or universally shared Kernel data. SQL migration 014 adds `core.PosDraft` and `core.PosDraftLine` with scoped FKs, restricted principals and stored procedures `core.AssertPosDraftBranchAction` (internal), `core.ReadBranchPosDrafts` and `core.CreateBranchPosDraft`. Reuses existing K5 identity, scoped Branch SQL role grants and Catalog product/service price ownership. No Booking, HR, Inventory, Cashier write integration. Existing Catalog and Preview continue to operate as separate read-only capabilities.

## Changed files

- SQL `db/migrations/014_branch_pos_drafts.sql`: Status constrained DRAFT, composite ownership and FKs, stable client request deduplication/payload hash, server-side Catalog price snapshot inside serializable transaction, separate `pos.draft.read/manage` checks, EXECUTE-only app principal grants.
- Nest `apps/api/src/pos-drafts/*` and `apps/api/src/app.module.ts`: protected GET/list and POST/create, strict body validation and Origin, session hashing, SQL sanitization, idempotent response.
- Web `apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/*`: optional private save/list UI behind separately gated Web flag, and fail-closed display; no submit POSTED action.
- Tests: `apps/api/test/pos-drafts.test.cjs` unit; `tools/pos-drafts/verify.cjs` disposable SQL Server 2022+live Nest HTTP, workflow `.github/workflows/pos-drafts-ci.yml` (no VPS).
- Updated module contract, architecture, Current State, Roadmap and Changelog.

## Security acceptance (required before merge)

1. CI exact PR HEAD: Node root K0, API/Web K1, POS Draft SQL/HTTP integration, existing Catalog/Customers/Booking/K5 regressions green.
2. Disposable SQL migration 001–014 apply/replay, strong app SQL grants denied on tables, no permission for internal assert routine.
3. Forged Origin, client-priced totals, unknown Offering, wrong Branch/Business/Tenant, revoked Role/Business membership/session, no posted status.
4. Concurrent identical request replay results in one created Draft, one reused Draft; changed payload with same key fails 409; SQL atomicity and price snapshot verified.
5. Independent reviewer should check SQL Server SERIALIZABLE lock/migration semantics, no direct `core.CatalogOffering` table use outside SQL owner, no entitlement claim.

## Unresolved / next vertical slice

Draft editing/repricing, immutable change history, explicit POS launch permission model, tax and invoice numbering, shift lifecycle and Accounting first journal are intentionally absent. **No automatically authorized payment or GL posting.** After a separately approved ADR-031 finance/architecture decision, implement a typed Sales→Accounting boundary; until then a saved Draft is **not** a sale, invoice, receivable, or proof of cash.

**Operational holds:** do not execute SQL 010–014 on VPS; K5F currently checks 001–009 and needs separately reviewed gate upgrade, Backup/Restore, migration history and privilege audit. Keep all existing K5/Catalog/Booking/POS flags OFF and require separate staging activation authorization. Do not touch Cashier data or announce customer readiness.
