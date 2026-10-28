# POS Core + Salon Extension — Discovery Round 1
**Date:** 2026-10-28  
**Status:** 12 founder requirements captured; implementation and edge cases pending.

| # | Founder-approved requirement |
|---|---|
| 1 | Same invoice can contain services and products. |
| 2 | Exactly one employee executes each service. |
| 3 | An invoice can include services executed by different employees. |
| 4 | Customer selection is optional; cash/anonymous customer allowed. |
| 5 | Service base price cannot be edited during checkout; apply discounts instead. |
| 6 | Temporary non-catalog item/service can be added, flagged for review. |
| 7 | Persist draft invoice and resume later. |
| 8 | Multiple payment methods per invoice (split payments). |
| 9 | Credit sale must be tied to a customer account with balance, debt and credit limit. |
| 10 | Paid invoice is immutable; correction via refund/adjustment. |
| 11 | Revenue and commission from one service may be shared among several employees in manager-defined percentages. |
| 12 | Every sale requires an open shift. |

## Key distinction requiring further design

Q2 specifies **one executing employee per service**; Q11 specifies **multiple beneficiaries of that service's revenue/commission**. This need not conflict: keep executor and attribution beneficiaries separate, but **do not adopt exact fields, calculation or percentages without founder confirmation**. Reconcile whether split revenue affects sales KPIs, target credit, employee ledger, or all three. Ensure share percentages and rounding are coherent.

## Design/operational questions

- Anonymous customer vs credit sales: a credit transaction must link to identified customer; customer required for this subset.
- Offline cash-only sales vs open-shift requirement: how are local shifts authenticated and reconciled?
- Draft lifecycle: expiration, locking, stock reservation, shared access and treatment of booking resources.
- Temporary catalog lines: tax, stock, account mapping and review workflow before final posting.
- Price cannot be changed directly: define discounts, zero-price promo and permissions.
- Partial/split payments vs invoices on credit, outstanding balance, refund and settlement.
- Posted invoice immutability: establish separate reversing/adjustment documents with balanced accounting entries.
- Revenue vs commission attribution: do not assume manager splits money or only performance credit.
- How to reconcile shift closing, cash counts, tips and refunded payments.

## Architecture placement — proposed, not yet approved

POS Core: invoice/lines, catalog references or approved temporary line types, cart/drafts, payment allocation, refund/adjustments, credit/receivables integration, shift guard. Salon Extension: executing barber, service-specific employee attribution and commission policy. The payroll and accounting modules remain independent sources of truth for their respective ledgers.

## Next discovery

Payments, refunds, shift settlement, execution/attribution and offline reconciliation.

[Open questions](../04-execution/OPEN-QUESTIONS.md).
