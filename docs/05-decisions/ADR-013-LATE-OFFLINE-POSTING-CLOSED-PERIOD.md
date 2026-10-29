# ADR-013 Late Offline Sales After Accounting Period Close
Date: 2026-10-29. Status: Approved business rule.

Sale occurred in a closed month and syncs afterward: retain original occurred-at/business sale date for operations; recognize accounting entry in the **currently open period**, with explicit linked adjustment and audit evidence. Do not edit a closed month's posted journals or fabricate prior-period online receipt. Reopening periods with permission remains available as a distinct Accounting capability, NOT the default handling for delayed offline sales.

Record sale occurred_at, device/local event ID, sync_at, accounting_posted_at, posting_period_id, original_business_date, late_posting_reason and reconciliation linkage. Idempotent sync prevents double posting; shift/day provisional and final logic still applies.

Outstanding: jurisdiction-specific tax point/reporting, VAT return amendment requirements and multi-currency period conversion. These need accounting/legal validation before production in each country; do not assume posting in a current GL period resolves external tax obligations.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**
