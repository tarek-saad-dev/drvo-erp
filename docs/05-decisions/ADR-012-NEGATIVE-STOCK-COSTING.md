# ADR-012 Negative Inventory Costing
Date: 2026-10-29. Status: Approved business rule.

When product on-hand is negative, assign **last known cost** as provisional cost and adjust the difference upon later receipt/purchase. Use Business-selected inventory valuation method for normal stock. Preserve original sale date, inventory movement, provisional cost, correcting adjustment date and references; do not overwrite posted journal or invoice.

Proposed safeguards: last known cost may not exist; route to exception/provisional cost pending without making up a number. Later receipts may not uniquely correspond to earlier negative movements; costing allocation strategy, rounding, multi-receipt cases, returns, stocktakes and cross-Branch transfers require implementation contract. Correction journal entries immutable and idempotent.

Example: sell at zero stock, last known item cost 100, later replacement purchase cost 120: post provisional COGS 100 and later difference +20 when matched by documented policy; actual treatment depends on approved costing method and periods.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**
