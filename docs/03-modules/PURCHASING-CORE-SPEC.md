# Purchasing Core — Founder Discovery Round 1

**Date:** 2026-10-29. **Status:** Founder requirements recorded, engineering draft only.

## Approved
- Direct purchasing and receipt without mandatory prior Purchase Order or approval stage. This does **not** prohibit optional PO flow later, but one is not a V1 requirement.
- Supplier directory shared across Branches within Business.
- Supplier return supported.
- Purchase receipt adds stock to destination Branch with stable receipt reference.
- Purchase cost and method of payment still flow to Accounting/Treasury according to separately defined source events.

## Proposed short workflow
1. User with permitted purchasing right selects Business, Branch, supplier and item lines.
2. Register purchase/receipt in one flow; capture quantity, unit cost, tax if applicable, supplier invoice references, payment or payable.
3. Post goods receipt movements once; publish accounting event once using outbox/idempotency.
4. Supplier return creates linked reverse stock movement and financial adjustment. Do not rewrite original purchase.
5. Exceptions: duplicates, missing price, variance or bad receipt become documented review tasks.

## Pending
- Mandatory supplier bill fields, taxes, purchase payment terms, supplier credit and balances.
- Whether additional approvals apply to high-value/direct purchases.
- Supplier return damaged goods rules and refund/credit note.
- Transfer stock between different Businesses is not approved.
- No Batch/Expiry requirement for V1, but avoid implying the feature can never be added.

[Inventory specification](INVENTORY-CORE-SPEC.md)
