# Inventory Core — Founder Discovery Round 1

**Date:** 2026-10-29. **Status:** Founder requirements confirmed; implementation details pending. No code deployed.

## Approved
1. Inventory quantities per Branch; stock transfers among Branches.
2. Salon services automatically consume stocked materials using service-specific Recipes.
3. Stock valuation method configurable at **Business** level (supported methods and migration rules not yet chosen).
4. Negative stock **permitted with alerts and review**, not silent acceptance.
5. Supplier shared across Branches of the same Business.
6. Supplier returns supported.
7. Full and partial stocktaking supported.
8. Inventory count discrepancy adjustments require Manager approval.
9. Reorder point and low-stock alerts required in V1.
10. Batch / expiry tracking **not required in V1**.

## Unresolved
- Transfer stock **between different Businesses within one Tenant** is unanswered: no assumed cross-Business transfer; books and stock ownership remain separate.
- Negative stock behavior for online sales versus offline-sync, thresholds and notification workflow.
- Recipe units, variants, wastage, timing, substitution and refunds.
- Valuation allowed policies, historical cost corrections and Business setting changes.
- Approval mechanics and discrepancy evidence, transfer-in-transit custody and reconciliation.

## POS / Accounting / Salon integration
- One mixed services/products invoice: product lines decrement their Branch stock exactly once; service lines consume Recipe materials exactly once when eligible. Do not double-decrement on retry.
- Offline accepted sale with insufficient stock remains recorded; create visible review/shortage records and adjust ledger once.
- Negative physical quantity is **not** equivalent to negative financial valuation; inventory-cost reconciliation remains an Accounting design question.
- Posted invoices remain immutable, while physical return/restock and financial reversals are distinct documents and audit events.
- Stock movement should use source_event_id and source_line_id; require scoped unique consumer key and signed quantity for idempotency.
- Multiple Branches per Business share supplier catalog but hold independent on-hand quantities.
- Reorder monitoring depends on available stock, reserved stock (if used) and outstanding transfer/receipt positions; thresholds configurable per item/Branch (proposed).

## Suggested logical components (not approved schema)
InventoryItem; StockLocation (Branch); StockMovementLedger; StockTransfer; StocktakeSession/Count/Adjustment; ServiceRecipe/RecipeComponent; ReorderPolicy; InventoryException. Historical movements append-only; corrections reference originals.

[Purchasing specification](PURCHASING-CORE-SPEC.md)
