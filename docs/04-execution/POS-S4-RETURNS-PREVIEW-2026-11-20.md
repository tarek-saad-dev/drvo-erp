# POS-S4 Returns / void non-posting preview

Date: 2026-11-20. Branch `feat/cashier-pos-returns-preview-20261120`. Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`. Ledger row: **POS-16** (`PORTING`, not parity-verified).

## Landed
- `_cashier_source/pos-returns/` read-only, blob-locked excerpts: `DeleteInvoiceDialog.tsx` (`d7af1617`, `src/components/sales/DeleteInvoiceDialog.tsx`) and `deleteSalesInvoice.ts` (`e38b5cea`, `src/lib/deleteSalesInvoice.ts`); derived `deleteReasonGuard.ts` from DELETE `/api/sales/[id]` (full route blob `2e9746f0`).
- `packages/business-modules/pos/src/return-preview.ts` `previewReturnRefund`: Cashier DeleteInvoiceDialog confirm gate, NON-POSTING (reason.trim required; sale display ref required for `READY_IN_CASHIER`; always `persisted:false`, `saleReverseState:BLOCKED_ADR_031_SALES_VOID`, stock/Treasury/loyalty/GL/WhatsApp `NOT_AUTHORIZED`).
- Private POS (`pos-preview`): `cashier-returns-preview.tsx` panel (+ pure `cashier-return-preview.ts`) with Arabic NONPOSTING banner and disabled "مسح الفاتورة / استرداد — محظور" button; quick-action returns button stays disabled and points at the panel.
- Tests: `tests/pos-returns-source.test.cjs` (pinned blobs + reason/confirm characterization; web helper vs package), `apps/web/test/pos-returns-preview.test.cjs` (source guards). Workflow `.github/workflows/shared-pos-returns-ci.yml` (no SQL).
- Ledger: POS-16 `BLOCKED` -> `PORTING`; all UI/SQL-HTTP/Browser/Data/Pilot proof OPEN. Status is **not** `DRVO_CI_PASS` (no disposable SQL proof of a void/refund write path — none exists).

## Hard limits (unchanged)
No Nest void/refund route, no SQL, no migration (do not touch SQL032/033/034), no flag turned on. No sale reverse, no stock increment, no Treasury cash refund, no loyalty reverse, no GL, no WhatsApp, no ADR-031 paid posting.

## Deliberate differences from Cashier (not silent fixes)
- Cashier hard-deletes a posted invoice and cascades stock/Treasury/loyalty. DRVO preview never writes; future DRVO shape should prefer linked refund documents (see POS data model), not silent deletes.
- Sale reference is a display-only label entered for UX preview; DRVO has no posted Sales read model yet, so this is not invoice lookup.
- Confirm enablement mirrors Cashier (`reason.trim()` + existing target); DRVO action button stays disabled even when Cashier would enable confirm.

## Open / next
Void/refund execution after ADR-031 + Sales void owner + Inventory/Treasury/Loyalty reverse contracts: flag-gated idempotent Nest void/refund, SQL tests. Owner browser walk of the returns panel vs DeleteInvoiceDialog.
