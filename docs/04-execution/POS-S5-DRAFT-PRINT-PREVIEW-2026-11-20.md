# POS-S5 Draft print / reprint preview (DRAFT only)

Date: 2026-11-20. Branch `feat/cashier-pos-draft-print-20261120`. Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`. Ledger row: **POS-07** (`PORTING`, not parity-verified / not `DRVO_CI_PASS`).

## Landed
- `_cashier_source/pos-print/` read-only lock: verbatim `PrintInvoiceModal.tsx` (blob `f6531030…`) plus READ head excerpts for `PrintRecoveryCenter` / printing settings.
- `packages/business-modules/pos/src/draft-print.ts` (+ Nest byte-identical copy): `buildPosDraftReceipt` / `renderPosDraftReceiptHtml` with `documentKind:"POS_DRAFT_RECEIPT"`, `posting:"NOT_POSTED"`, `paymentState:"NOT_COLLECTED"`, Arabic banner `مسودة — غير محصّلة / غير مرحّلة`, `thermalAgent:"NOT_AVAILABLE"`, `postedReprint:"NOT_AUTHORIZED"`.
- Nest `GET|POST .../pos-drafts/cashier/:draftId/print-preview` behind existing POS rich flags; POST requires exact HTTPS Origin; reuses `core.ReadBranchPosCashierDrafts` only (no SQL035 / no new migration). Optional `Accept: text/html`.
- Private Light UI: Print link on Cashier draft history → `/workspace/{businessId}/{branchId}/pos-preview/draft-print?draftId=…` with iframe preview + browser `window.print()`.
- Tests: `tests/pos-draft-print-source.test.cjs`, `apps/web/test/pos-draft-print.test.cjs`, extended `apps/api/test/pos-rich-draft.test.cjs`. Workflow `.github/workflows/shared-pos-draft-print-ci.yml` (+ pos-rich path wiring).
- Ledger: POS-07 `BLOCKED` → `PORTING`.

## Hard limits (unchanged)
No thermal local-print agent, no PrintRecoveryCenter, no POSTED/paid sale reprint, no SQL035 print-attempt audit, no payment/stock/Treasury/GL on print, no ADR-031 posting activation, no barcode master.

## Deliberate differences from Cashier
- Cashier prints a posted sales invoice via local print agent (+ optional receipt-studio). DRVO prints an authorized **DRAFT** snapshot via browser print only.
- Payment method rows are omitted / shown as غير محصّلة — draft is never collected.
- Package receipt-studio / groom-package thermal CSS are not ported in this slice.

## Open / next
Thermal agent + recovery center after printer profile owner exists; POSTED reprint after ADR-031 Sales post. Owner browser walk of draft print in the pilot path (Customer → Booking → Barber → POS Draft → Inventory check → **Draft Print** → Reload).
