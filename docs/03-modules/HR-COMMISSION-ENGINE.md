# HR & Commission Engine — Discovery Round 1

> **2026-11-15 ACTUAL IMPLEMENTATION STATUS:** **2026-11-15 HR-S1 REAL EXECUTABLE VERTICAL SLICE (NOT FULL CASHIER PARITY):** [HR-S1 source/report](https://github.com/tarek-saad-dev/drvo-erp/blob/main/docs/04-execution/HR-S1-EMPLOYEE-BARBER-PERSISTENT-SLICE-2026-11-15.md) delivers Cashier-adapted Employee master classification and branch-specific Salon Barber ↔ Booking `PERSON` Resource configuration with **new additive SQL migration 018**, owner-scoped K5 Nest controllers and service, private Next HR screen and workspace link, idempotent create/profile updates, strict `hr.read`/`hr.manage`/`salon.barber.manage` permission checks, cross-Tenant/Business/Branch isolation and source-specific invalid `freelance+monthly` guard. Dedicated [HR SQL2022 HTTP CI](https://github.com/tarek-saad-dev/drvo-erp/actions/workflows/shared-hr-ci.yml) **PASS on earlier source+test exact SHA `0a71186a`**, and K0/K1/K5C on repaired `797a72f8` **PASS**; after documentation commit, exact final SHA must be checked separately. **Actual primary DRVO DB/Backup and VPS deployment NOT verified/applied**; currently a disposable SQL+HTTP tested feature only, with Web build/test. P1–P7/C1–C3 remain OPEN and historical P4 approval only covers 001–017 (018 is not approved on VPS).. An additive SQL018 + Nest API + private Web **employee/branch + barber Booking PERSON-resource binding** is implemented and proven on disposable SQL2022. The 12 Founder compensation decisions below remain a **specification**, not implemented salary/commission/payout functionality. The older sentence 'no code implemented' below refers to the original 2026-10-29 compensation-engine discovery, not today's Employee master/Barber profile slice.

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
