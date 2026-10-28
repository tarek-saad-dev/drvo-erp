# POS Discovery Round 3 — Shifts, Treasury & Salon Attribution

**Date:** 2026-10-28
**Status:** Founder decisions recorded, deferred questions remain unresolved. No implementation.

| # | Founder response | Status |
|---|---|---|
| 1 | Founder will explain attribution scenario in their own words | Open |
| 2 | One primary service executor; attribution beneficiaries may differ | Approved |
| 3 | Whether attribution percentages total 100% | Open |
| 4 | Manager may correct attribution **after payment** using a documented adjustment, not an invoice rewrite | Approved |
| 5 | Shared branch treasury and separate cashier shifts | Approved |
| 6 | Cashier counts actual cash at shift close; determine shortage/surplus | Approved |
| 7 | Record shortage/surplus and Manager reviews | Approved |
| 8 | Transfers between treasuries or shifts | Defer to Treasury Module |
| 9 | Cash sales during connectivity loss attach to the **same open shift** and sync later | Approved |
| 10 | Closing shift with unsynced offline sales | Defer to Offline Design |
| 11 | Tips accrue to Employee Ledger | Approved |
| 12 | Financial day may close with open shifts, **with warning** | Approved; reconciliation design pending |

## Founder-described shortage / surplus policy

- **Shortage:** charge the cashier responsible as an employee expense/liability, labeled with reason *cash shortage*.
- **Surplus:** founder asks to record it as **sales income**, labeled with reason *cash surplus*.
- Record the difference, responsible cashier, reason and Manager review.

**Accounting and workforce control caution:** This is a requested business policy, not yet an approved final journal mapping or permission to auto-deduct compensation. A cash surplus is not evidence of a genuine sale; recording as sales may overstate revenue or tax. Recommend a distinct **cash over/short variance account** until a Manager investigates, then documented reclassification if evidence supports it. For shortages, distinguish pending employee accountability from a confirmed employee receivable or lawful payroll deduction; require review, evidence, audit and compliance with local labor rules. Do not silently post false sales or deduct salaries.

## Cross-module questions

1. How to attribute a shortfall with shared branch treasury and separate overlapping cashier shifts? Define custody, cash handoff, counted-by user and audit.
2. Financial day closing with open shifts must preserve open cash custody and late-arriving offline sales; choose provisional vs final reconciliation.
3. Service revenue allocation may differ from commission allocation; awaiting founder scenario and 100% rule.
4. Manager post-payment adjustment must preserve immutable invoice, target and commission history and emit auditable correction.
5. Offline sale records on an open shift: durable local IDs, shift state snapshot, idempotent sync, no double posting.
6. Tips in Employee Ledger require payout, refund and closing reconciliation design.

## Proposed next work (not approved)

Define POS invoice/shift state machines, treasury variance workflow, cash denomination/custody, offline sync, accounting event contracts, and salon attribution.

[POS Round 1](POS-DISCOVERY-ROUND-1.md) · [POS Round 2](POS-DISCOVERY-ROUND-2.md) · [Open Questions](../04-execution/OPEN-QUESTIONS.md).
