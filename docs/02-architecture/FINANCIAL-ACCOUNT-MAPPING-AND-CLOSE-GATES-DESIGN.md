# DRVO ERP — Financial Account Mapping, Tender Truth and Close Gates (Design Review)

**Date:** 2026-10-30  
**Status:** **FINANCE DESIGN OPTIONS ONLY**, not approved Chart of Accounts, tax advice, legal classification, posting engine or receipt template. Requires accountant review (Egypt and each actual Gulf jurisdiction) plus founder sign-off.
**Related:** [Sale-to-Ledger Walkthrough](SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md), [Financial Consistency Contract](FINANCIAL-CONSISTENCY-CONTRACT.md), [ADR-031 PROPOSED](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md), [ADR-011](../05-decisions/ADR-011-OFFLINE-ELECTRONIC-PAYMENT-EVIDENCE.md).

## 1. Separate facts that customers often confuse

| Fact | Authoritative owner | Can be true while other facts are false? |
|---|---|---|
| A sales obligation exists | Sales/POS | Yes; it does **not** imply bank settlement |
| Its initial accounting journal is posted | Accounting | Yes; inventory cost can still be pending |
| Cash was physically handed to cashier | Treasury/Shift | Yes; no implication that bank deposit cleared |
| Customer says electronic payment sent | Treasury claim/evidence | Yes; this is **not** independently verified provider receipt |
| Bank/processor actually confirms funds | Treasury/provider reconciliation | Yes; confirmation may arrive later than original sale |
| Customer owes outstanding amount | Accounting receivable/collection domain | Yes; amount and counterparty type must be defined |
| Stock quantity changed | Inventory | Yes; its historical valuation can remain cost-pending |
| Staff commission is accrued | HR/Payroll | Yes; not necessarily payroll paid |
| Financial period closed | Accounting | Yes; later offline sale may need open-period linked entry |

**Hard invariant:** no universal `PAID` or `DONE` flag can be inferred from the presence of unverified tender proof, a local device row, stock move or successful page notification.

## 2. Tender/GL classification choices (PROPOSED, not canonical debit/credit policy)

The following account **categories** are review options, not customer-ready accounting entries or Egypt VAT policy. Actual debit/credit, account codes, receivables treatment, recognized revenue timing, tax and chargebacks depend on the legally approved CoA and contract.

| Sale/tender scenario | Evidence known now | Forbidden claim | Candidate accounting treatment for Finance review |
|---|---|---|---|
| Cash physically received in branch | Cashier receives/counts locally; customer receipt issued as governed | Bank deposit settled just because cash in drawer | Cash-on-hand / branch custody vs sale revenue/taxes; subsequent bank deposit is distinct transaction |
| Identified customer on credit | Authorized debt and receivable | Money collected | Customer AR vs revenue/tax; online hard cap / offline exception and post-sync hold |
| Electronic tender **screenshot only** | Claim & screenshot, **not** provider confirmation | Verified bank/processor funds, unconditional paid receipt | **Option E1:** keep identified AR/open collection pending provider proof. **Option E2:** special unverified-tender receivable/clearing category only if finance/legal treatment valid; never place into verified bank/cash ledger |
| Anonymous customer, screenshot only | Unverified receipt claim but no established customer AR account | Settled bank money or automatically named customer receivable | Scoped anonymous collection exception/liability/clearing model per formal finance policy; don't fabricate customer identity or silently erase outstanding amount |
| Electronic provider-confirmed funds | Independently verified provider receipt, confirmed source and amount | Cash in drawer if actually remote funds | Verified bank/payment clearing reconciliation; avoid double recognition when original unverified claim becomes verified |
| Partial refund | Linked original paid/credit/verified claim | Original invoice erased or amount refunded twice | Explicit partial credit note/reversal and controlled tender/refund outflow, status/FX/tax rules by country |
| Negative stock with **no prior cost** | Quantity consumed; cost unknown | Zero COGS or fabricated gross profit | Quantity recorded + `COST_PENDING`; recognized COGS/valuation adjustment requires approved accounting handling when defensible cost exists |
| Sale occurred last month, synced after close | Source date, local ID and later server receipt | Backdated post to locked GL or waived statutory tax obligations | Approved original-occurrence evidence plus journal/linked adjustment in current open GL period, local VAT/tax-point compliance separately reviewed |

**E1 vs E2 not decided.** In particular, recording a screenshot as a bank receipt creates financial falsehood. Creating a clearing asset can also be wrong if not legally/contractually collectible. Finance must review which receivable or suspense classification is appropriate; avoid selling “unverified e-tender is guaranteed money”.

## 3. Currency, time and rounding (not approved)
- Business-level currency/timezone/language from Tenancy decisions; line-level money represented in appropriately precise fixed decimal/minor unit (exact rounding rule TBD). Branch does not silently override Business currency/timezone in V1.
- Persist original local business date and server-accepted/posted timestamps, posting period and device operation ID separately; do not trust device clock for legality.
- Immutable price/discount/tax and exchange-rate snapshot for source sale; what FX rate controls late/foreign events remains Finance/jurisdiction-specific.
- Refund must reference original sales line/quantity/price/tax and posted journal/AR effects; no silent overwrite.

## 4. Period and shift close — proposed invariants
1. **Provisional shift close** may happen with offline unsynced cash/queue; the operator must see explicit counts and outstanding operations. It is not the same as final reconciled close (ADR-009).
2. **Final close policy** cannot imply all money is verified if disputed e-tender, pending mandatory first GL, unsynced device or open cash variance remains. Decide which conditions *block final close*, which produce a named exception, and who can approve. Mandatory first GL must never be silently waived.
3. **Accounting period close** may not rewrite posted closed-period journals. Late offline original date preserved; current open-period linked GL entry (ADR-013), with jurisdictional tax reporting tracked independently.
4. A later stock cost adjustment may post in an appropriate open period with clear origin and correction references, not mutate old posted revenue/COGS.
5. Close/reopen actions require explicit authorized Manager/Accountant rights, audit, concurrency guard and immutable reason; whether a closed shift with later sync re-opens or generates linked adjustment is still OPEN.
6. Tenant/Business/Branch scope and all-branch aggregation affect how final close is approved; cross-branch results may be read by authorized manager but not mutated via an aggregated widget.

## 5. Accounting sign-off form (must be completed BEFORE implementation)

| Policy question | Proposed direction | Decision status |
|---|---|---|
| First balanced sale GL transaction | ADR-031 Option A atomic recommended conditionally, B valid alternative | OPEN |
| Cash tender: branch custody posting + first GL | Assess whether must participate in same UoW for correct cash control | OPEN |
| Electronic screenshot initial GL | No verified bank; E1 identified AR or E2 allowed unverified clearing, only if valid | OPEN |
| Anonymous failed claim | Collection exception without fabricated identified AR | Founder behavior approved; exact GL OPEN |
| Late GL after period close | In current open period, original date preserved | Founder approved; tax/FX review OPEN |
| Inventory unknown cost | Pending, never zero fabricated | Founder approved; journal treatment OPEN |
| Commission accrual | HR owner, idempotent linked effect, payout separate | Business direction approved, exact timing OPEN |
| Tax/VAT/e-invoicing in Egypt/Gulf | Jurisdictional rules, no generic guarantee | OPEN |
| Final shift close and month-end pending items | Explicit blockers/review rights, no silent discard | OPEN |
| Error/rollback/duplicate refund | Idempotent corrections with balanced ledger | Rule direction proposed; tests OPEN |

## 6. What this document intentionally does NOT do
It does not prescribe Debit/Credit account numbers; calculate taxes; assert legal correctness; pick a payment gateway; design ERP accounting ledger schema; approve `ACCOUNTING_PENDING` status names; or change founder-accepted offline and inventory product rules.

**Gate:** Finance expert/accountant + product founder + architect sign off on an actual per-tender scenario/accounting matrix and period/receipt legal interpretation, then create/accept the corresponding ADR. No code, tests, migrations or Production operations until separate explicit approval.
