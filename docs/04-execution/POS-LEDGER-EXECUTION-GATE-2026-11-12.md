# POS → Ledger execution gate — engineering track started (2026-11-12)

**Status: REVIEW PR / FINANCIAL POSTING BLOCKED.** Founder instructed parallel POS→Ledger readiness and Cashier reuse audit. This is authorization to prepare design, tests and independent PRs; **not** selection of ADR-031 A or B, financial policy, posting implementation, customer activation or VPS schema migration. [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) remains **PROPOSED**.

## Architecture impact & ownership (before code)

- **Sales/POS** owns sale draft, versioned pricing snapshot, source operation ID, immutable posted document and customer-visible status; no direct writing of Accounting tables.
- **Accounting** owns first balanced GL, period policy, AR and reversals; Treasury owns cash custody and independently verified tender, not generic POS `PAID` flags.
- **Catalog** supplies scoped Business service/product references, but historical price must be snapshotted at sale time; **Customers** optional for genuine anonymous cash sale, mandatory for credit/AR.
- **Kernel** supplies trusted Tenant → Business → Branch context, K5 session/RBAC and eventually authorized entitlement; no client ID can grant scope.
- **Salon Extension** supplies service executor/opener attribution and commission policy; shared sale/posting code must not hard-code Salon.
- **Worker/Inventory/HR** get owner-scoped, idempotent effects after the first mandatory journal boundary as decided; no unscoped outbox consumer.
- **Scale fitness**: one Modular Monolith, Business-scoped SQL operations and replay keys suit the initial small salon; larger multi-branch/enterprise proof needs measured concurrent sales, lock waits, p95, isolation and restore. No claimed measured scale.
- **Operational impact today**: NONE; no API endpoints, SQL migrations, UI flags, live data, finance postings or VPS changes.

## Decision before implementing POSTED

The founder, Finance and Architecture must explicitly record:
1. **ADR-031**: Option A (sale + first balanced GL + outbox in one SQL transaction) **or** Option B (sale + outbox committed with mandatory `ACCOUNTING_PENDING`, GL confirmed later). A is conditionally recommended, not already approved.
2. Tender proof and account mapping: CASH physical receipt vs selected method vs **unverified** electronic evidence; no false bank settlement; AR for credit/partial tender, taxes/country/currency and receipt text.
3. First mandatory journal accounts, rounding precision, reversal/refund and period-close behavior; who can authorize manual journals and exceptions.
4. Business/Branch permission and entitlement, `saleOperationId` plus payload-hash replay semantics, SQL principal rights; financial outbox identity and worker revocation.
5. Explicit performance thresholds and security/recovery exercise with disposable SQL and multiple Tenants; K5F and schema checker compatibility before future VPS approval.

## Proposed small PR sequence (none implied as already delivered)

| Gate | Independent vertical slice | Acceptance |
|---|---|---|
| PL-0 | **This PR:** A/B test-only truth fixture + decision packet | Root test CI; never runtime-import fixture |
| PL-1 | POS nonposting Draft→Checkout Preview, read Catalog & optional Customer under current scope | Private default-OFF API/UI, priced immutable snapshot, retries, cross-scope negative SQL/HTTP CI; no POSTED |
| PL-2 | Finance-approved ADR-031 + immutable first-journal typed contract | Reconciled Account/Treasury truth and decision signed |
| PL-3 | Implement one real Sale→first GL transaction/consumer per approved choice | Source/GL exact-once business effect on retry, atomic rollback or pending recovery, no false tender state |
| PL-4 | Refund/credit/tax/cash/close & failure matrices, Salon attribution, Inventory/HR downstream effects | Disposable SQL concurrency/failure/period tests, finance sign-off |
| PL-5 | Approved staging rollout & multi-Branch Cashier coexistence comparison | Separate reviewed migrations/flags, backup/restore, K5 security, no silent live cutover |

### Executable acceptance seed

`tools/finance/first-journal-evidence.cjs` is **a test-only classifier of synthetic evidence, not a domain service**. `tests/finance-first-journal-evidence.test.cjs` runs as part of root `npm test`: A cannot claim POSTED if first GL absent; B only reports ACCOUNTING_PENDING; orphan/unbalanced journals invalid; payment selection is not settlement. These assertions do **not** test SQL atomicity, Tenant isolation, crash recovery, actual accounting, or production behavior. Those are mandatory PL-3/PL-4 gates.

### Parallel work / dependencies

[Cashier reuse discovery](CASHER-REUSE-DISCOVERY.md) feeds POS/shift/HR/booking test parity, never copied database structure or credentials. [ADR-032](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) commercial activation is a separate open decision. Existing SQL 010–013 stay **CI-only**; public K5 and all module flags **OFF**; K5F operational acceptance **OPEN**.

**Next owner action:** finance/founder review the numbered ADR-031 choices; engineers may develop PL-1 behind default-OFF flags independently without claiming first ledger posting.
