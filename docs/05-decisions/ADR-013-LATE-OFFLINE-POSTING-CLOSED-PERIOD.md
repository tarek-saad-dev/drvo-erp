# ADR-013 Late Offline Sales After Accounting Period Close
Date: 2026-10-29. Status: Approved business rule.

Sale occurred in a closed month and syncs afterward: retain original occurred-at/business sale date for operations; recognize accounting entry in the **currently open period**, with explicit linked adjustment and audit evidence. Do not edit a closed month's posted journals or fabricate prior-period online receipt. Reopening periods with permission remains available as a distinct Accounting capability, NOT the default handling for delayed offline sales.

Record sale occurred_at, device/local event ID, sync_at, accounting_posted_at, posting_period_id, original_business_date, late_posting_reason and reconciliation linkage. Idempotent sync prevents double posting; shift/day provisional and final logic still applies.

Outstanding: jurisdiction-specific tax point/reporting, VAT return amendment requirements and multi-currency period conversion. These need accounting/legal validation before production in each country; do not assume posting in a current GL period resolves external tax obligations.
