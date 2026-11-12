# Shared POS Core — nonposting Draft / Checkout Preview v0

**Status (2026-11-12): feature PR, review-only, NOT a commercial POS or a durable sale.** Implementation belongs to Shared POS, consuming existing Catalog through its scoped read API/service. Salon-specific execution and HR attribution are intentionally absent. [Execution and security evidence](../04-execution/POS-NONPOSTING-PREVIEW-2026-11-12.md).

## What this slice can do
- Private, temporary in-browser cart of Catalog PRODUCT/SERVICE offering IDs and quantity 1–20; max 20 distinct lines.
- `GET /api/workspaces/:businessId/branches/:branchId/pos-preview` supplies authorized active offering options (no-store).
- `POST .../pos-preview/checkout-preview` sends **exactly** `{lines:[{offeringId,quantity}]}`. Server computes list-price subtotals from a fresh SQL-backed `core.ReadCatalog` through `CatalogService.list`, not client unit prices or embedded prices. Catalog SQL rechecks live K5 token, membership, Branch and `catalog.read`. Invalid/other-Business/inactive offering IDs fail closed. No DB writes or application-wide entitlement/publishing change.
- Only 2-decimal EGP/SAR/AED/USD homogeneous currency previews are temporarily accepted. Reject multiple currencies, invalid amounts, duplicates and oversized totals. BigInt arithmetic guards intermediate integer overflow, bounded final minor units.
- Response always says `DRAFT_PREVIEW_ONLY`, `persisted:false`, `accountingState:NOT_POSTED`, `paymentState:NOT_COLLECTED`, `taxComputed:false`. A response is an **indicative list-price subtotal**, not payable tax-inclusive invoice, payment confirmation, price lock or authoritative snapshot.
- No sales table, invoice sequence, discount, tax, customers, credits, shift, GL, Treasury, inventory, payroll, receipts or persistent drafts created.

## Security/visibility
- API requires all `DRVO_K5_AUTH_ENABLED=YES`, `DRVO_CATALOG_ENABLED=YES`, **`DRVO_POS_PREVIEW_ENABLED=YES`**; UI requires `DRVO_K5_WEB_ENABLED=YES`, `DRVO_CATALOG_WEB_ENABLED=YES`, **`DRVO_POS_PREVIEW_WEB_ENABLED=YES`**. All are OFF/unset in operational environment. No authorization to change them.
- POST requires exact validated `DRVO_K5_ORIGIN` under HTTPS; HttpOnly K5 cookie. Web App tile appears only on authorized successful GET; UI visibility is not a permission grant. Every POST re-reads Catalog via scoped SQL; no privilege escalation to `catalog.manage`.
- `catalog.read` is a **temporary prerequisite only for an informational preview**. It **does not** give permission to create POS drafts or POST sales. Real POS capability and commercial entitlements require independent permission and ADR-032 sign-off.
- Caches must not persist previews. API marks no-store. Browser draft state is ephemeral and lost on refresh.

## Future transition
1. Design/approve POS-owned `pos.preview/pos.draft` permissions, PL-1b durable drafts and versioned re-price/expiry; keep this prototype disconnected from posted sales.
2. Adopt ADR-031 A or B and payment/accounting authority; implement typed durable Sales→Accounting interface and posting tests independently.
3. Verify SQL 010–013 rollout checker/backup/restore, K5F operational security and Commercial ADR-032 before staging activation.
4. Preserve one Universal Core for Salon, Clinic, Retail, etc.; put Salon barber attribution in a bounded Extension, not generic line model.

## Verification
- API unit tests: payload injection/unknown scope/price, currency and limits, disabled flags, fake Origin, mock scoped Catalog read.
- Existing disposable Catalog SQL+real Nest HTTP CI includes PL-1 authorized preview, cross-Tenant/Business/Branch rejection, origin spoof, foreign offering rejection, revoked role/membership and live session denial. NO POS-specific DB tables created. Passing CI is not production rollout proof.
