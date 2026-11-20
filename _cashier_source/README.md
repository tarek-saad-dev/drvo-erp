# Cashier source reuse (read-only)

Pinned Cashier revision: `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`.

Do not edit these excerpts to invent DRVO behavior. Adapt through Nest/SQL module owners and characterization tests.

- `queue/queueLifecycleEngine.ts` — Cashier effective-status contract reused for Salon Queue.
- `operations/businessDayReconciliation.ts` — pure BusinessDay catch-up plan (NO_OP / ROLLED_OVER / OPENED_MISSING_DAY).
- `operations/invariants.ts` — one OPEN day per branch; one OPEN shift per user.
- `treasury/treasuryCashMoveFilters.ts` — Cashier movement filter vocabulary reused for characterization only.
- `crm/customerSource.ts` — verbatim Cashier customer acquisition-source contract (blob `70f0ad1b…`, `src/lib/customerSource.ts`). Adapted, not edited, into `apps/api/src/customers/customer-source.ts`; `tests/customer-profile-source.test.cjs` locks the blob and the option list.
- `crm/customerFollowUpValidation.ts` — verbatim Cashier follow-up contact validation (blob `0b21742e…`, `src/lib/customerFollowUpValidation.ts`). Characterization/source-lock only for CU-04; DRVO desk uses append-only contact attempts (`customer-follow-up.service.ts` / SQL034) instead of Cashier's monthly upsert + ComplaintEmpId, and never sends WhatsApp.
- `loyalty/helpers.ts`, `loyalty/types.ts`, `loyalty/cutClubSettingsPage.tsx` — verbatim Cashier loyalty helpers/types and the Cut Club settings page (blobs `bcc16172`, `438a908f`, `6850a000`). Characterization-only; adapted into `packages/business-modules/loyalty/src/loyalty-rules.ts`, locked by `tests/loyalty-rules-source.test.cjs`.
- `operations/{shiftOwnership,shiftOperationalGate,viewOperationalState,handoffShiftSession,closeBusinessDay}.ts`, `treasury/{liveCashMoveSql,treasuryGroupDailyTypes,treasuryGroupDailyService}.ts` — byte-exact pinned excerpts (git blobs locked by `tests/treasury-readiness-source.test.cjs`); `operations/invariants.ts` and `treasury/treasuryCashMoveFilters.ts` re-pinned byte-exact. Characterization-only; adapted into `packages/business-modules/treasury/src/treasury-readiness-rules.ts`.
- `pos-tips/tipMath.ts`, `pos-tips/TipsModal.tsx` — verbatim Cashier POS tip math and TipsModal (blobs `2b140c81`, `6fdbc6da`). Characterization-only; adapted into `packages/business-modules/pos/src/tip-preview.ts` (`previewTipEntry`) and the private POS tips preview; locked by `tests/pos-tips-source.test.cjs`. Tip recording stays BLOCKED (ADR-031 / HR ledger / Treasury).
- `pos-returns/DeleteInvoiceDialog.tsx`, `pos-returns/deleteSalesInvoice.ts` — verbatim Cashier void/delete invoice UX + reason helper (blobs `d7af1617`, `e38b5cea`); `pos-returns/deleteReasonGuard.ts` is a derived DELETE reason-guard excerpt (full route blob `2e9746f0`). Characterization-only; adapted into `packages/business-modules/pos/src/return-preview.ts` (`previewReturnRefund`) and the private POS returns preview; locked by `tests/pos-returns-source.test.cjs`. Sale reverse / stock+ / Treasury refund / loyalty reverse stay BLOCKED (ADR-031 / Sales void owner).
- Additional Booking/Queue contracts may also live under `tests/fixtures/cashier/`.
