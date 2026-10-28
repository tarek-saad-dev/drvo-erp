# POS Accounting Events & Posting Boundary — Design Draft

Status: proposed event contract; no final Chart of Accounts, ledger engine, API or deployed implementation. Date: 2026-10-29.

## Architecture goal
POS owns business transactions and immutable sale snapshots; Accounting owns GL, receivables and journal posting; Inventory owns stock movement and purchase cost; HR owns employee payable/advances/commission; Salon Extension owns service opener/executor mapping and commission calculation policy. Shared Business and Branch scope, source IDs, timestamps and idempotency.

## Contract envelope (candidate)
```json
{"eventId":"uuid","type":"pos.sale.posted.v1","version":1,"tenantId":"...","businessId":"...","branchId":"...","shiftId":"...","sourceDocumentId":"...","occurredAt":"...","postedAt":"...","businessDate":"...","correlationId":"...","idempotencyKey":"...","payload":{}}
```
No raw card secrets, OTPs or bearer QR tokens. Consumer verifies authorization context/source integrity and performs idempotent side effects. Contract names and schemas pending review.

## Event matrix
| Source event | Accounting | Inventory | HR / Salon | Notes |
|---|---|---|---|---|
| SalePosted | recognize sale/tax/AR or confirmed tender according to journal policy | decrement sold products; create shortage review if offline stock insufficient | service Target to executor; opener award and executor plan entries | avoid counting pending provider tender as cash |
| TenderSelected | no settled posting | none | none | selection alone is not payment |
| PaymentConfirmed | move pending allocation to confirmed funds/clearing as applicable | none | none | requires evidence; no duplicate recognition |
| ReceivableCollected | reduce customer AR, debit verified tender/clearing | none | none | partial collection approved |
| RefundPosted | reversal/refund payable/AR adjustment per original settled/unsettled split | reverse inventory when restock confirmed; disposition rules TBD | reverse opener/executor commissions and target idempotently | line or custom-amount refund |
| TipRecorded | employee tip payable, separate liability | none | employee ledger tip | not service revenue |
| AttributionAdjusted | no change to total sales revenue | none | delta target / commission entries, no direct rewrite | Manager, audited |
| ShiftVarianceReviewed | hold cash over/short pending classification | none | employee recovery only after separate approval | no fabricated sales |
| ShiftVarianceCorrected | append correction journal | none | adjust relevant payable only if approved | original preserved |
| OfflineSaleAccepted | do NOT re-post second sale if SalePosted exists | deduplicated stock effects | deduplicated employee entries | source date and posting date distinct |
| DeviceLossResolved | approved reconciliation adjustment only | unknown lost sales not reconstructed | no unproven commission | manual cash evidence |
| DayFinalized | journal/period control event | none | none | only after reconciliation or documented exceptions |

## Example accounting mappings — illustrative only
1. Confirmed cash sale 300 net pre-tax: DR Cash 300, CR Sales 300; tax may create extra liability depending on configured tax regime.
2. Invoice of 500, 200 cash actually collected and 300 on credit: DR Cash 200, DR AR 300, CR Revenue 500 (illustrative tax-free); prevent credit beyond limit.
3. Service priced 400 discounted by 100, taxable base 300: revenue 300 before tax. Distinct 10% opener commission = employee commission expense/payable 30, depending on accrual policy; single executor gets target 300.
4. Cash surplus 50: DR Cash 50, CR Cash Over/Short 50 pending investigation; only later supported sale can justify revenue reclassification.
These are examples for mechanics, not founder approval of automatic journal rules or jurisdiction-specific tax accounting.

## Outbox/inbox and atomicity
A command writes canonical transaction + outbox in the same DB transaction. Workers may deliver at least once; each consumer stores processed event ID before/with ledger effect in its own transactional boundary. Recover after crash, preserve processing errors and dead-letter review; no false end-to-end exactly-once network promise.

## Commission refunds
For partial refund of line: calculate delta from the refunded discounted pre-tax base using the rate snapshot, cap cumulative reversals to original commission and preserve prior payroll period. Refund posted after payout generates employee payable adjustment in current eligible period, not destructive payroll history. This is a recommendation needing HR approval for payroll posting timing.

## Tests / nonnegotiable invariants
Concurrent credit sales do not exceed cap; one invoice/event per retry; pending electronic tender never treated as settled; partial refund capped and consistently allocated; two retries reverse commission once; no double stock decrement; one executor + one different opener; cash variance approval and payroll deduction separate; closed-period adjustment has audit linkage; tenant isolation checked for all ledger postings.

## Open architectural decisions
Journal entry automation/manual exception policy, CoA mapping, taxes/Gulf vs Egypt, settlement provider evidence and reconciliation, cross-year late adjustments, offline credit, refund tax allocation, inventory returns/restock valuation, payroll accrual and rounding.
