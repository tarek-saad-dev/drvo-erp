# Treasury Core — Discovery Round 1

**Date:** 2026-10-29. **Status:** Founder-approved requirements; design details pending. No code implemented.

| # | Decision | Status |
|---|---|---|
| 1 | Exactly **one treasury per Branch** | Approved; supersedes earlier unspecified treasury multiplicity |
| 2 | Bank accounts supported at **Business level and Branch level** | Approved |
| 3 | Cash transfers between treasuries/branches require recorded movement and Manager approval | Approved |
| 4 | Expenses can be paid from treasury cash or bank | Approved |
| 5 | Large expenses approved by Manager | Approved; threshold remains open |
| 6 | Bank reconciliation | Deferred |
| 7 | Cash withdrawals/deposits outside sales permitted, with permissions and audit trail | Approved |
| 8 | Manager's access to consolidated treasury balances requires **dedicated permission** | Approved; not implicit from Manager role |

## Reconciliation with existing decisions

- Shared **one Branch treasury**, separate cashier shifts and explicit custody/handover. One treasury does not imply one cashier or shift.
- Expenses, transfers and cash movements must carry source references and avoid double booking in POS shift cash counts.
- Manager visibility of profits/service costs remains always available within managed scope (earlier decision); **treasury balance visibility is separately permissioned** under this latest founder decision.
- Transfers require manager approval and consistent debit/credit movement; do not silently create or destroy cash. Transfers across separate Businesses or currencies were NOT approved.
- Expense approval threshold, manager scope and delegation rules are unresolved; general RBAC remains Allow-only + Default Deny.
- Bank reconciliation deferred does not remove the need to record bank movements or preserve payment confirmation evidence.
- Cash shortages require review and separate approval before an employee deduction. Cash surplus enters cash variance account pending verification.
- Financial-day and cashier shift provisional/final closure remains as approved.

## Proposed lightweight data aggregates (not final)
`branch_treasuries` UNIQUE(branch_id); `business_bank_accounts` scoped business with optional branch assignment where applicable; `treasury_movements` for cash in/out; `treasury_transfers` with request/approval/completion and two matched movements; `expenses` with source and approved manager; `treasury_balance_permissions` via scoped RBAC, not hardcoded visibility.

## Open questions
Large-expense threshold; transfer between branches in one Business vs cross Business; bank account ownership vs access rights; transfer handover evidence; cash/accounting posting timing; approval at source and anti-self-approval; bank reconciliation deferred.

## Next
HR and Commission Engine founder discovery, then Inventory/Purchasing, then cross-module review.
