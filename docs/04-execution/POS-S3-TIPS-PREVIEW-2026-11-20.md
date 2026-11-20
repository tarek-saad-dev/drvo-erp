# POS-S3 Tips (تبس) non-posting preview

Date: 2026-11-20. Branch `feat/cashier-pos-tips-returns-20261120`. Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`. Ledger row: **POS-03** (`PORTING`, not parity-verified).

## Landed
- `_cashier_source/pos-tips/` read-only, blob-locked excerpts: `tipMath.ts` (`2b140c81`, `src/lib/pos/tipMath.ts`) and `TipsModal.tsx` (`6fdbc6da`, `src/components/pos/TipsModal.tsx`).
- `packages/business-modules/pos/src/tip-preview.ts` `previewTipEntry`: Cashier TipsModal state machine, NON-POSTING (tip = presented - due; only a strictly positive difference is a tip; default recipient = highest-revenue executor; a chosen recipient must be a cart service executor; `cashierWouldEnableSubmit` mirrors the modal's `canSubmit` minus payment method). Always `persisted:false`, `paymentState:NOT_COLLECTED`, `tipRecordingState:BLOCKED_ADR_031_HR_TREASURY`, `employeeLedgerCredit:NOT_AUTHORIZED`, `treasuryCashIn:NOT_AUTHORIZED`.
- Private POS (`pos-preview`): `cashier-tips-preview.tsx` panel (+ pure `cashier-tip-preview.ts`) fed by the **server-priced** total (`adjustment.afterDiscountMinor`, else the price preview) and SERVICE lines stamped with the selected executor (`CashierBarberSelector.onRoster` supplies names only). Disabled "تسجيل التبس — محظور" button; the old quick-action tips button stays disabled and points at the panel.
- Tests: `tests/pos-tips-source.test.cjs` (executes the pinned `tipMath.ts` and the pinned `sanitizeAmountInput`; compares calculateTipAmount, resolveTipBarberCandidates, web helper vs package), `apps/web/test/pos-tips-preview.test.cjs` (source guards), existing `tests/cashier-owned-module-port.test.cjs` tip cases. Workflow `.github/workflows/shared-pos-tips-ci.yml` (no SQL).
- Ledger: POS-03 `BLOCKED` -> `PORTING`; all UI/SQL-HTTP/Browser/Data/Pilot proof OPEN.

## Hard limits (unchanged)
No `/api/pos/tips` equivalent, no Nest tip route, no SQL, no migration, no flag turned on. No cash-in, no employee-ledger credit, no WhatsApp, no ADR-031 paid posting, no Treasury tip payout. The tip amount is never stored (not even in DRAFT).

## Deliberate differences from Cashier (not silent fixes)
- Money is integer minor units, max 2 decimals (Cashier uses float `Number()` + `roundMoney`).
- Equal-revenue executors order by employeeId (Cashier: first-seen). Executors are GUIDs, never `EmpID` ints.
- Cashier skips a recipient picker for one executor and so do we; with several executors DRVO today only has the selected barber (rich-draft per-line executors are not wired into the tip panel).
- Cashier tip needs an open ShiftSession + payment method + employee ledger dual-write; none of that exists in DRVO yet.

## Returns
Not started: Cashier refund/void/reopen (POS-09..) needs the Sales posting owner and reversal policy (ADR-031); it is not file-disjoint from paid posting, so it was deliberately left out.

## Open / next
Tip recording after ADR-031 + HR employee-ledger credit contract + Treasury receipt-method catalog + shift/day ownership: flag-gated idempotent Nest POST, SQL tests. Owner browser walk of the tips panel vs TipsModal.
