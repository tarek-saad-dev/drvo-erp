# POS Core integrations — draft

Status: proposed architecture, not implemented.

POS Core owns draft, invoice, payment selection, posted receipt, refund and offline ingestion. Accounting owns journal entries, receivables and reconciliation. Inventory owns product stock movements and shortages. HR owns tips, commission payable and employee ledger. Salon Extension tracks sole executor plus optional distinct opener, and emits target and commission calculations. Booking provides appointment reference. Permissions and audit apply to every mutation.

One invoice may contain products and services; price snapshot immutable once posted. Refunds and corrections create linked records. Inventory may record an offline stock shortage without rejecting an already accepted sale. Payment methods remain selectable online/offline but provider settlement must be verified before marked paid.

Salon scenario: Mohamed opens Skin Care; Youssef executes and receives target credit. Mohamed receives 10 percent opening commission calculated after discount before tax. Opener and executor cannot be same person. One opener maximum. Refund reversals are idempotent.

Suggested integration: transactionally persist invoice and outbox, then idempotent consumers post stock, accounting and HR entries. Avoid dual posting. Cross-Business and cross-Tenant references rejected. Module dependency policy remains open pending founder discussion.

Open: temporary catalog item valuation, stock reservations, payroll posting timing, provider confirmations, offline credit, tax rules, and booking conversion.
