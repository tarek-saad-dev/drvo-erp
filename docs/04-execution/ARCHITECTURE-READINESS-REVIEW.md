# Architecture Readiness Review — V1

Date: 2026-10-29. Status: **architecture review + recommendations**, not approval to code or deploy.

## Executive result
**Ready to begin foundational engineering planning/prototyping; NOT ready to finalize production financial schema and settlement rules.** Reviewed: Tenancy Architecture, POS State Machine, Offline API/Data, Accounting, Treasury, HR, Inventory and Purchasing, OPEN-QUESTIONS, CURRENT-STATE.

## Confirmed business invariants
- Tenant > Business > Branch; separate Business books; branch stock and one treasury; independent shifts.
- All configured payment types selectable online and offline; payment selection is not confirmed settlement.
- Provisional then final shift/financial-day close, actual cash counts include received offline cash; lost device incident reconciled manually.
- Posted sales/journals are immutable with linked corrections; balanced accounting GL.
- Permissioned Manager operations and separate scope; Owner membership explicit.
- Inventory negative allowed with review, Recipe service consumption, direct purchase and receipt.
- Per-employee and per-service opener commission configurable (latest decision), one distinct opener max; executor credited target; daily accrual and monthly close.

## Conflicts, stale references and dispositions
1. Earlier documents say offline **cash-only**. Latest founder decision: all configured payment methods SELECTABLE offline. Update stale summaries during implementation; unresolved tender verification remains pending, not a conflict.
2. Earlier docs describe fixed **10% opener commission**. Latest decision overrides fixed rate with by-service/by-employee rules; discounted pre-tax basis and one opener continue.
3. Earlier day-close text asks if final/provisional. Founder resolved provisional, then final reconciliation.
4. Treasury manager costs/profit visibility vs cash balance visibility: costs/profit in authorized scope always, treasury balances require separate permission.
5. User explicitly selected automatic advance deduction; cash-shortage recovery still requires separate lawful approval, not automatically deducted.
6. Immutability vs reopening period: period may reopen with permission; journal history remains append-only.
7. Negative stock vs inventory valuation: quantity can be negative, but cost-layer adjustments and reconciliation require a valuation policy.
8. Cross-Business stock transfers unresolved; no silent transfer permission between separate Business books.

## Decisions that affect production data correctness (blocking until design locked)
**B1. Credit offline:** global credit cap cannot safely be enforced across independently offline devices without offline reservations/caps, or a rule for unconfirmed debt. Document permissible offline Credit selection but not guaranteed posting.
**B2. Electronic tender posting:** all methods selectable; pending verification vs invoice posting / AR / reconciliation statuses and eventual failure handling.
**B3. Inventory costing:** Business-configurable selection from approved cost methods, with rule for negative inventory costing and later cost corrections.
**B4. Accounting posting periods:** exact late offline sales/returns and reopening policies, adjustment journal date and tax-period boundaries.
**B5. Module Dependencies:** Core + Extension contract and activation/required modules must be resolved before architecture is frozen.
**B6. Compensation precedence:** variable opener rate resolution (employee/service), effective dates, rounding and refunds.
**B7. Tech stack/DB:** choose DB, migrations, tenancy isolation enforcement, queue storage, CI and deployment before implementation.

## Safe decisions to defer past initial scaffolding
Max account hierarchy depth; report customization defaults; Bank Reconciliation (already deferred); Batch/Expiry (V1 excluded); cross-Business stock transfer; advanced branch/period comparisons; supplier purchase approvals; optional audit UI. **Do not implement** an unapproved feature by guessing a rule.

## Recommended ownership boundaries
Identity/Tenancy/Core → POS (invoices, payment intents, shifts and offline events) → Accounting (ledger/journals/AR and periods) → Treasury (cash custody/transfers) → Inventory/Purchasing (stock and receipts) → HR (employee ledger/payroll) + Salon Extension (attribution and Recipes). This is logical ownership, not unapproved hard dependency installation. Use transactional outbox + idempotent consumers, immutable source references, separate payment confirmation states.

## Execution phases (proposal)
P0: resolve B1-B7 and tests/acceptance; identify deployment constraints and nonfunctional requirements.
P1: tenancy/identity/RBAC, business/branch, settings, migrations, audit/event/outbox.
P2: product/service catalog, POS online, invoice/return, tender selection/confirmation model, open shifts.
P3: Treasury/accounting postings and immutable correction, provisional shift/day close.
P4: inventory purchasing recipes and negative-stock reconciliations.
P5: HR commissions/tips/advances/payroll, Salon Extension.
P6: offline device queues, replays, late reconciliation, loss incidents, stress/security tests.
P7: branch pilot and staged release only after money/data-loss gate checks.
Offline architecture must be anticipated from P1 to avoid retrofit, even if offline runtime is delivered at P6.

## Non-negotiable verification gates
Tenant isolation and permission tests; unique invoice/event/source accounting posting; zero silent lost offline cash; no unverified tender marked settled; balanced GL; refund cap and commission reversal; one inventory deduction/Recipe; credit hard stop, including disconnected scenarios; auditable provisional/final closure; restore/replay/device-loss tabletop exercise.

## Explicitly not performed
No code, migrations, CI, benchmark or deployment. This review summarizes design documentation only.
