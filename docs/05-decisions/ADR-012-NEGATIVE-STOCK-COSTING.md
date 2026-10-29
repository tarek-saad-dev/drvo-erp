# ADR-012 Negative Inventory Costing
Date: 2026-10-29. Status: Approved business rule.

When product on-hand is negative, assign **last known cost** as provisional cost and adjust the difference upon later receipt/purchase. Use Business-selected inventory valuation method for normal stock. Preserve original sale date, inventory movement, provisional cost, correcting adjustment date and references; do not overwrite posted journal or invoice.

Proposed safeguards: last known cost may not exist; route to exception/provisional cost pending without making up a number. Later receipts may not uniquely correspond to earlier negative movements; costing allocation strategy, rounding, multi-receipt cases, returns, stocktakes and cross-Branch transfers require implementation contract. Correction journal entries immutable and idempotent.

Example: sell at zero stock, last known item cost 100, later replacement purchase cost 120: post provisional COGS 100 and later difference +20 when matched by documented policy; actual treatment depends on approved costing method and periods.
