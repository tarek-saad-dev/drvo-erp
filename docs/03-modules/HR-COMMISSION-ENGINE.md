# HR & Commission Engine — Discovery Round 1
Date: 2026-10-29. Status: founder requirements and limited design proposals; no code implemented.

## Founder decisions (all 12)
1. Support salary-only, commission-only, and mixed pay **per employee**.
2. Execution commissions: configurable rule engine.
3. Target periods: Business-configurable intervals.
4. Target achievements may increase commission rate AND award separate bonus, according to Commission Plan.
5. Opening commission rate may differ **by service and employee**. This supersedes the prior fixed universal 10% assumption; 10% remains an approved example/reference, not a forced global rate.
6. Each Branch holds separate targets and commissions for a worker active in multiple branches.
7. Daily automatic earning/accrual calculation; monthly payroll closing.
8. Employee advances deducted automatically from accrued/payable entitlements, subject to applicable law, caps and accounting controls; founder intent approved, exact payroll-deduction authorization and schedule unresolved.
9. Early partial payout of employee entitlements treated as advance against entitlements.
10. Negative month-end balance behavior configurable per Business.
11. Past targets/commissions corrected by documented adjustment, not mutation of posted history.
12. Final payroll approved by Owner or Manager with explicit permission.

## Consistency checks
- POS: one executor gets service target; optional different opener, maximum one. Opening commission basis remains discounted pre-tax service value; refund reverses opener/executor earnings once.
- Configurable opener rate is **newer** than fixed 10%; determine service/user plan precedence and effective-dated rate snapshots.
- Multi-branch employees: separate Branch attribution, with consolidated Business summary possible; avoid duplicate earnings.
- Cash shortage: independent approval required before employee recovery. General advance auto-deduction does not override cash-shortage approval and legal protections.
- Tips credited to Employee Ledger, not included in service revenue.
- Payroll month close must not destroy original accruals; late refunds create adjustment entries.
- Manager payroll approval is a distinct protected permission; the Manager role does not automatically receive it.
- Business-specific payroll settings do not override statutory limits/required employee consent where applicable.

## Proposed compact design (not final)
Employee Compensation Plan (salary components, targets, commission rule reference, branch assignment, effective dates); Earning Accrual (source invoice/line/refund); Employee Ledger (append-only signed entries: fixed salary accrual, commission, target bonus, tips, advance paid, advance offset, approved shortage recovery, adjustments, payout); Payroll Run (month, Business/Branch, state, approver); Commission Rule snapshots with deterministic rounding and recalculation on refunds.

No salary/advance should be paid twice on retries: key entries by source event and calculation version. Cash/bank transfer actually paid is recorded by Treasury, with matching ledger reference.

## Open
Rate precedence (service vs employee), eligible plan period, target basis, retroactive promotions, target and Commission Plan overlap across Branches, month-end negatives policies, lawful advance deduction cap, payroll approval segregation and rounding, payment disbursement events.
