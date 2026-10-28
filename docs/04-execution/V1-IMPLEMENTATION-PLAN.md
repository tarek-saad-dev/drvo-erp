# DRVO ERP — Phased V1 Engineering Plan (pre-code)
Date 2026-10-29. Status: proposed execution plan; do not start development until the gating decisions are recorded.

## Phase 0 — requirement gates and verification plan
Resolve monetary/offline policies: customer credit offline cap; selected-but-unverified tender invoice state and eventual failure; Business cost method choices incl. negative stock; late sync posting/closed month/tax; module dependency enforcement; opener rate precedence and rounding. Confirm SQL Server edition/driver/hosting/backup, device offline storage, base taxation and currency. Each decision has ADR and executable acceptance scenarios. No coding in this phase.

## Phase 1 — platform foundation
Next.js UI shell, NestJS API modular monolith, SQL Server schema/migrations, tenancy and global username identity, RBAC, explicit Business memberships, settings, module registry, secure audit, transactional outbox, release environment/CI. Gate: negative multi-Tenant access tests; worker scope tests; migration/restore exercise.

## Phase 2 — POS Online
Catalog, versioned pricing, mixed cart/draft/post, service executor, payment method availability/selection, verified tender vs receivable model, refund/correction records, shifts, customer credit guard. Gate: idempotent posting, no unbalanced GL or doubled customer balance, permissions.

## Phase 3 — Treasury and Accounting
Cash count, custody, manager-approved transfers, expenses, one Branch treasury, GL postings/AR, monthly/yearly periods, provisional/final close, audit adjustments. Gate: reconciliation of shift and day counts, accurate cash over/short and separate shortage deduction approval.

## Phase 4 — Inventory and Purchasing
Branch stock, transfer within Business, direct receipt, supplier returns, stocktakes, approved discrepancies, Recipe consumption, reorder point, negative-stock exceptions and costing reconciliation. Gate: unique stock effect per sale and per transfer; valuation correctness.

## Phase 5 — HR and Salon Extension
Service attribution/one executor/optional distinct opener, configurable commission plans and targets, per-Branch attribution, daily accrual, tips and employee ledger, early advances, monthly payroll and scoped approval. Gate: commission reversal on refund, no double-earned or double-paid amounts.

## Phase 6 — Offline runtime
Independent POS device queues, cached local auth under selected security policy, offline sale and tender selection, event correction, retries, reconciliation dashboard, provisional shift/day close, lost-device incident and controlled manual cash settlement. Gate: replay 20x one invoice/stock/commission, device crash recovery, mixed devices, ledger period late delivery, lost-device drill, no false provider settlement.

## Phase 7 — branch pilot and release
Sandbox customer+Branch validation, staged migration and parallel totals, cashier training, rollback/backups, observed resource limits/latency, audit/privacy review, payment/stock/payroll signoff. No production release absent documented gates.

## Delivery controls
Small PR per vertical slice, unit/integration/E2E tests, SQL Server integration tests running real DB, branch-level permission matrix, test data and migration dry-runs. Require product owner approval of each critical unresolved policy before related code.
