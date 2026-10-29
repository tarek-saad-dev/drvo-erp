# ADR-011 Offline Tender: Customer Evidence and Reconciliation
Date: 2026-10-29. Status: **Approved product behavior; trust rules and settlement unresolved**.

Founder decision: every Business-configured electronic payment method remains selectable Offline; cashier records payment **based on customer-provided evidence**, and later discrepancies are reviewed.

Critical distinction: customer screenshot/reference is evidence submitted, **not** verified bank/processor authorization. Store selected tender, claimed paid amount, local evidence metadata and status EVIDENCE_RECORDED_PENDING_VERIFICATION. Never mark provider-confirmed, settled or cash received solely because the client supplied proof.

Proposal: reconciliation queue; manager review, verified settlement when trustworthy evidence arrives, disputed/failed outcome with linked AR or incident entry under pending financial policy. Retain proof, reviewer and event trail; do not expose card data or embed sensitive secrets in PWA local storage.

Still unresolved: invoice posting with unconfirmed tender, receipt language, staff confirmation powers, exact reconciliation SLA/provider integration, later failure liability and whether unsettled amount becomes AR.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**
