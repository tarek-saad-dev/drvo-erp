# POS State Machine — V1 Design Draft

**Date:** 2026-10-28  
**Status:** Proposed engineering specification; founder business rules explicitly cited; state names/technical contracts are NOT yet approved or implemented.

## Agreed invariants

- Invoice supports services + products, may be drafted, and needs an open cashier shift at sale posting.
- Each salon service has exactly one executing employee, potentially distinct from one opener.
- Customer optional for cash sale; mandatory for credit and receivable accounting.
- Split tender and unpaid balance are allowed, subject to a strict credit limit.
- Posted/paid financial transaction is immutable: fix with linked refund/adjustment documents, never by modifying original posting.
- Refunds may be partial by line or amount, require permission, and manager approval beyond configured threshold. Target and commissions reverse automatically.
- Cash-only offline sales are stored locally and synchronized; retain original occurrence date and attach to original shift.
- Tenant / Business / Branch authorization, approved module entitlement and audit on every sensitive transition.

## Recommended orthogonal lifecycle axes (not yet approved)

Do NOT implement PAID, CREDIT and REFUNDED as mutually exclusive invoice states: one invoice can be posted, partially paid and partially refunded simultaneously.

Invoice document: DRAFT → POSTED (immutable core) OR DRAFT → DISCARDED.
Payment settlement derived from immutable payment/receivable allocations: UNPAID / PARTIALLY_PAID / PAID; refund history tracked separately as NONE / PARTIAL / FULL (derive from allocations). Offline synchronization state is its own axis: LOCAL_PENDING → SYNCING → ACCEPTED or REVIEW_REQUIRED; retryable errors return to LOCAL_PENDING, permanently invalid items are retained for investigation, not deleted.

## Proposed transitions

| Command | Guard | Atomic committed effects | Failure |
|---|---|---|---|
| CreateDraft | Authorized workspace | Draft and owner reference | Reject |
| UpdateDraft | Still DRAFT; allowed editor, version check | Versioned draft | Conflict response |
| PostSale | Open eligible shift, valid line/price/discount, sufficient customer credit where used, idempotency key | Invoice posting, tender records, AR record, inventory event, accounting outbox and audit within transactional boundary | No partial financial commit |
| ReceiveCustomerPayment | AR exists, customer and branch scope, positive amount | Payment allocation + AR reduction + accounting event | Reject duplicate/overcollection |
| RefundInvoice | Posted, eligible amount/line, permission, manager approval if required | Linked refund document + payment/customer-credit allocation + inventory/accounting reversal + Target/Commission correction event | Refuse overrefund; do not alter invoice |
| AdjustAttribution | Authorized manager; posted sale reference and reason | Append-only attribution correction; re-evaluate commissions/targets | Reject unauthorized changes |

Suggested event names (contracts not final): `SalePosted`, `PaymentCollected`, `RefundPosted`, `ServiceAttributionAdjusted`, `OfflineSaleAccepted`.

## Salon Opening Commission — founder-approved rules

A service has ONE executor and up to ONE opener; opener MUST differ from executor. A service can have no opener. Opener commission = **10% × service price after discount, before tax**. Executor alone owns the service's Target attribution. Opener gets opening commission only, not extra counted sales. Accounting sale revenue remains counted once.

Example: net-of-discount, pre-tax service price 300 EGP → opener 30 EGP. Executor's commission plan, if any, is separately determined. Multiple openers and self-opening are prohibited under approved rules. A refund automatically reverses opener and executor commission effects; method for partial refunds and payroll settlement correction requires a detailed contract.

Use currency-safe decimal/minor-unit calculations and explicit rounding policy (UNRESOLVED). Do not double-count sales.

## Offline cash-only draft design

Allow only cash sale when a valid preexisting locally cached shift entitlement exists (further design needed). Persist unique immutable `client_sale_id`, `shift_id`, `occurred_at`, `device_id`, submitted payload hash and local audit record. Server idempotently accepts once; preserve `synced_at` and `posted_at` separately. If stock is insufficient after sync, accept sale and create reviewable shortage; never silently lose sale. How to account for events arriving after closed periods is OPEN.

## Tests before implementation can be called complete

- Same idempotency key posted 20 times → one invoice, one receipt and one set of financial postings.
- Two concurrent credit sales cannot exceed credit limit.
- Refund cannot exceed settled/unrefunded amount; customer credit prevents paying out unpaid debt.
- Service target belongs to executor only; opener receives 10% after discount/pre-tax and no sale duplication.
- Partial refund reverses correct amounts exactly once.
- Offline retry does not duplicate sale; source and sync dates distinct.
- Cross-tenant/cross-business access and manager threshold abuse rejected.

## Deferred design

Posting and reversal journal accounts, offline shift-close mechanics, accounting period adjustments, taxes/currencies, discount policies, payment-provider integration and approved detailed API schemas.

## Offline scope change requested (2026-10-28)

Founder now requests offline services and products **with all payment methods**. This supersedes the cash-only **product wish**, but must NOT be interpreted as provider-confirmed electronic payments without connectivity. The existing cash-only offline implementation assumptions in this draft are superseded for product discovery; exact tender eligibility is open. See [Offline discovery](OFFLINE-POS-DISCOVERY-ROUND-1.md) and [Offline sync design](OFFLINE-SYNC-SPEC.md).
