# POS Discovery Round 2 — Payments, Refunds & Salon Attribution

**Date:** 2026-10-28
**Status:** Founder requirements recorded; unresolved policies are not implementation decisions.

| # | Decision / response | Status |
|---|---|---|
| 1 | Built-in and Business-custom payment methods | Approved |
| 2 | Split payment may include cash and remaining amount as customer receivable | Approved |
| 3 | Reject credit sale beyond customer credit limit | Approved |
| 4 | Partial or full collection of existing receivables | Approved |
| 5 | Tips are separate from service revenue and attributed to an employee | Approved |
| 6 | Partial refunds by invoice lines and custom partial amount | Approved |
| 7 | Refund to customer credit balance or payment method | Approved |
| 8 | Executed services can be refunded with permission and documented reason | Approved |
| 9 | Manager approves refund exceeding authorized amount threshold | Approved |
| 10 | Reopening a closed financial day | Deferred to detailed Accounting Module |
| 11 | One executor versus multi-staff revenue/commission sharing | Founder requests detailed scenario |
| 12 | Who sets service attribution percentages | Deferred to HR Module |
| 13 | Whether attribution shares must total 100% | Unanswered |
| 14 | Commission Plan can differ for each employee | Approved |
| 15 | Refund automatically reverses relevant Target and Commission effects | Approved business intent; mechanics remain open |

## Interdependencies and conflicts to design explicitly

- **Credit limit:** check outstanding receivables plus new unpaid amount in a transaction-safe manner; concurrency and reservations require design. Credit transactions require identified customer.
- **Split tenders + debt:** preserve independently auditable payment allocations, receivable balance and collection events; refunds must not create cash reimbursement for an amount never collected.
- **Refund types:** line-level and arbitrary-amount refunds require bounded allocations, original-line references, tax/discount adjustment and anti-overrefund controls.
- **Refund destination:** customer credit is not a cash payout. Define policy for mixed payments, tender reversals, original payment provider, proof and financial journal effects.
- **Tips:** distinct from service revenue and tracked as payable/assigned to employee; decide if employee allocation may span multiple staff, payment methods, withholding or refund behavior.
- **Manager approval:** authorization and amount threshold must be checked server-side and audited. Manager operates only within allowed scope; owner rules follow existing RBAC.
- **Closed day:** reopening procedure cannot mutate immutable posted invoices. Defer journals, reversals and settlement periods to Accounting discovery.
- **Targets/commission reversal:** distinguish accrued vs paid periods. Auto-generated reversal or adjustment must be idempotent and preserve original accounting/payroll history. The founder approved outcome, not posting-period implementation.
- **Salon attribution:** one *executor* per service is confirmed; multiple revenue/commission beneficiaries are envisioned but business rules and ratios remain unsettled. Do not model distribution as execution unless confirmed.
- **Cash-only Offline POS:** offline refund and credit sale behavior are not approved; offline sale synchronization and accounting rules remain separate.

## Proposed future modules and specs, NOT accepted designs

POS Core: payment tender registry, split allocation, invoice immutable posting, refunds/credit allocations; Accounting Core: receivables, journal postings and credit limits; HR/Salon: service executor and target/commission policies; Shift Cash: tender reconciliation; Audit and RBAC gates.

## Next questions

Payment setup and clearing; refunds and customer credits; tip accounting; shift close; attribution/targets, and reversal after payroll posting.

[Round 1](POS-DISCOVERY-ROUND-1.md) · [Open questions](../04-execution/OPEN-QUESTIONS.md).
