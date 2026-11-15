# Cashier → DRVO Expenses Core S1 — persisted nonposting documents

**Date:** 2026-11-15  
**Status:** source implementation on `main`; **real SQL2022/Nest CI pending exact SHA**, **primary DRVO dev DB and VPS not applied/verified**, not a complete Cashier Expenses/Treasury parity claim.

## Cashier source actually reviewed
- `tarek-saad-dev/casher/src/app/api/expenses/route.ts` from the pinned Cashier audit: `GET` filters legacy `dbo.TblCashMove` by Branch, expense type/category/date/payment; `POST` requires active business day and shift, validates amount/category/method, creates CashMove through a Treasury application port, optionally writes employee advance ledger and schedules WhatsApp. It reuses older integer legacy IDs, DB pool and auth. **DRVO does not reuse these SQL tables/routes/pool**.
- Cashier `src/app/api/treasury/balance/route.ts`: balance computed from cash movement in/out per payment method. This is **Treasury ownership** and cannot be conflated with Expense drafts.
- [ADR-040](../05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md) explicitly separates **Expenses business documents** from **Treasury movement/settlement** and **Accounting immutable journals**; ADR-031 actual financial posting remains unapproved.
- Default DRVO [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md) Light palette; [ADR-041](../05-decisions/ADR-041-CASHIER-UX-DRVO-LIGHT-V1.md) Cashier-inspired operator navigation.

## What source has implemented
1. **SQL019 additive** `db/migrations/019_expenses_documents_draft.sql`: Business-level `core.ExpenseCategory` with request-key unique and category-name uniqueness; Branch-level `core.ExpenseDraft` with FK Tenant/Business/Branch/Category/Account, minor integer amount, currency allowlist, immutable creation request, `DRAFT` → `CANCELLED` transition only, cancel actor/time/key and no paid/posting state. No SQL seed.
2. **Scoped stored procedures**: `core.ReadExpenseWorkspace`, `core.CreateExpenseCategory`, `core.CreateExpenseDraft`, `core.CancelExpenseDraft`. Every call checks **live K5 session, active Business membership/Branch assignment/role/action** inside SERIALIZABLE transaction, before returning scoped records. SQL role `expenses.read` for read, `expenses.manage` for writes. Internal assert routine is not granted to the runtime user. Runtime has public proc EXECUTE-only, table SELECT/DML explicitly denied.
3. **Nest module owner**: `apps/api/src/expenses/expenses.controller.ts` and `expenses.service.ts`, registered in AppModule. Default `DRVO_EXPENSES_ENABLED` OFF, requires `DRVO_K5_AUTH_ENABLED=YES`. Every POST rejects a missing/mismatched Origin and requires a UUID Idempotency-Key. Client Tenant injection and forged scope inputs rejected; exact body shape enforced, integer money never floating cash. Fail closed on stale session/role.
4. **Private Web**: `/workspace/{businessId}/{branchId}/expenses` requires `DRVO_K5_WEB_ENABLED=YES` **and** `DRVO_EXPENSES_WEB_ENABLED=YES`. Light UI for Category, Draft amount/currency/note, recent 200 docs and cancel. Branch Home tile only rendered if server flag AND actual authorized GET succeeds; no extra Client-only permission claims.
5. **Financial state truth**: API explicitly returns `state=NONPOSTING_EXPENSE_DRAFTS_ONLY`, `treasuryState=NOT_PAID`, `accountingState=NOT_POSTED`. This Slice writes **zero** `CashMove`, Treasury, payment, GL, budget, payable, employee advance or notification records. Cancelling a draft is not an accounting reversal; a paid document does not exist.

## Tests / verification contract
- `apps/api/test/expenses.test.cjs`: defaults OFF, strict body/Origin/UUID, positive safe integer money, no payment injection, read-model semantic truth.
- `apps/web/test/expenses-workspace.test.cjs`: K5 gate, no browser data storage, authorized API-based launcher, Light design tokens.
- `tools/expenses/verify.cjs` + `.github/workflows/shared-expenses-ci.yml`: GitHub-hosted disposable SQL Server 2022, real SQL019 migration/replay, real Nest HTTP session/login, no direct app-principal table DML, category+draft creation/replay/conflict, exact money, cross-Tenant/Branch denial, cancel/replay, role/member/session revocation. Build API/Next separately in CI. **Do not claim PASS until exact matching GitHub workflow results**.
- `.github/workflows/k5c-private-ui-ci.yml` checks Expenses is 404 when K5 is OFF. DB migrations and private flags are **never** activated by a normal code deployment.

## Architecture/operational impacts
- New independently owned **Expenses** source records, no Kernel tables or shared HR/Booking mutation. Business Category can be reused across Branches **only inside the authorized Business**; records always Branch scoped.
- No paid expense/balance/accounting APIs until a separately reviewed Treasury + Accounting contract, active BusinessDay+Shift evidence, currency/period controls, idempotent financial event and ADR-031 decision.
- SQL019 deployment onto primary DRVO dev DB **requires** confirmed target+applied 001–018 history, independently tested restorable backup/checkpoint, reviewed migrator privileges, SQL application and post-change verification. Existing history did NOT authorize 019. No Public Auth, real customer PII, charge or external Salon GO.
- This is **Cashier Expenses 7.1 partial**, NOT full Cashier Expenses (review/edit/recurring/allocations/payables) or Treasury, Income, Accounting, Payroll or Inventory.

## How founder will test when safely active
- Target (NOT confirmed live): `https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/expenses`. Requires valid internal private Owner/Staff K5 session, Branch permissions, SQL019 applied and feature flags only after approved security checks.
- Test: create `Rent` category → create `150.25 EGP` draft → reload (same record should remain) → cancel → reload (CANCELLED) → verify balances/treasury and GL were not affected and a separate unauthorized Branch/role cannot read. Do not put real employee/customer data in public synthetic demo.
- `https://erp-stage.drvotech.com/demo/salon` stays **synthetic** and contains no Expense SQL.

## Next batch / Cashier parity backlog
1. Treasury Core ledger and movements **separate from Expenses documents** with approved source/settlement events and reconciliation.
2. HR Attendance/Payroll without wage posting, separate Barber payroll extension.
3. Expenses draft update/reversal/approval, employee allocations, recurring expenses, then Other Income; integrate only after authenticated permissions and accounting decisions.
4. Authenticate a real branch's browser journey and verify the exact deployed release SHA; no fake LIVE labels.
