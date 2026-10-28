# Accounting Core — Discovery Round 1

**Date:** 2026-10-29. **Status:** founder-approved requirements and open decisions; not implemented.

| # | Decision | Status |
|---|---|---|
| 1 | Industry-specific editable Chart of Accounts template for each Business | Approved |
| 2 | Separate books for each Business; Tenant consolidated reports | Approved |
| 3 | Number of account hierarchy levels | Open |
| 4 | Used accounts cannot be deleted; deactivate or constrained rename | Approved |
| 5 | Automatic journals from modules plus manual accountant entries | Approved |
| 6 | Debit equals credit | Founder has not decided; double-entry balance is a non-negotiable accounting integrity invariant for posted GL entries |
| 7 | Journal entries post immediately, no normal Draft approval stage | Approved; permissions and posting validation still required |
| 8 | Reverse/correct posted errors using linked entries; keep original | Approved |
| 9 | V1 report selection configurable per Business | Approved; required minimum report set not specified |
| 10 | Branch, Business and Tenant-consolidated reporting | Approved; each Business separate ledger |
| 11 | Cost centers by branch, department and project | Approved |
| 12 | Period and branch comparisons | Deferred |
| 13 | Fiscal-year start configured per Business | Approved |
| 14 | Monthly and annual closing | Approved |
| 15 | Reopen closed period with permission | Approved; full audit, correction, and reclose safeguards proposed |
| 16 | Audit logging of sensitive operations only | Approved scope; posted financial records must still retain provenance, event traceability and immutable history |

## Reconcile with prior POS decisions

- POS paid invoices and posted journal entries stay immutable. Permissioned re-opening a period must NOT rewrite existing posted documents; use reversing/adjusting journals for correction.
- POS shifts and financial days close provisionally then settle finally. Accounting month/year periods are a distinct layer; define how late offline sales get a posting date and period if day/month closed.
- Separate Business books and optional Tenant consolidated reporting cannot silently merge different currencies. Business-level currency and fiscal calendar remain authoritative. Consolidation exchange rates and effective periods are open.
- Manager can see profits/costs within management scope; configurable Manager role remains applicable to other functions. Permissions for period reopening and manually posted journals need a matrix.
- Immediate journal posting still needs balanced debit/credit, an allowed period and idempotent source event. No optional unbalanced journal in GL.

## Concise suggested shape (engineering proposal)

Business chart template -> accounts -> journal header and debit/credit lines -> balances by dimension -> report configuration. Modules publish source events; transactional outbox/inbox deduplicates auto-posts. Period status OPEN/CLOSED/REOPENED with reason, actor, authority and audit. No in-place mutation of posted journals.

## Still open

Account level depth; mandatory reports vs user-configured; fiscal cross-business consolidation rules, country/tax, source-event mapping, account coding, posted transaction validations, period reopening authorization, and minimum audit-event taxonomy.
