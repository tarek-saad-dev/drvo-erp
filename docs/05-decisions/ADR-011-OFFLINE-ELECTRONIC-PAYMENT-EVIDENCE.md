# ADR-011 Offline Tender: Customer Evidence and Reconciliation
Date: 2026-10-29. Status: **Approved product behavior; trust rules and settlement unresolved**.

Founder decision: every Business-configured electronic payment method remains selectable Offline; cashier records payment **based on customer-provided evidence**, and later discrepancies are reviewed.

Critical distinction: customer screenshot/reference is evidence submitted, **not** verified bank/processor authorization. Store selected tender, claimed paid amount, local evidence metadata and status EVIDENCE_RECORDED_PENDING_VERIFICATION. Never mark provider-confirmed, settled or cash received solely because the client supplied proof.

Proposal: reconciliation queue; manager review, verified settlement when trustworthy evidence arrives, disputed/failed outcome with linked AR or incident entry under pending financial policy. Retain proof, reviewer and event trail; do not expose card data or embed sensitive secrets in PWA local storage.

Still unresolved: invoice posting with unconfirmed tender, receipt language, staff confirmation powers, exact reconciliation SLA/provider integration, later failure liability and whether unsettled amount becomes AR.
