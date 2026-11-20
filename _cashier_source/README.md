# Cashier source reuse (read-only)

Pinned Cashier revision: `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`.

Do not edit these excerpts to invent DRVO behavior. Adapt through Nest/SQL module owners and characterization tests.

- `queue/queueLifecycleEngine.ts` — Cashier effective-status contract reused for Salon Queue.
- `operations/businessDayReconciliation.ts` — pure BusinessDay catch-up plan (NO_OP / ROLLED_OVER / OPENED_MISSING_DAY).
- `operations/invariants.ts` — one OPEN day per branch; one OPEN shift per user.
- `treasury/treasuryCashMoveFilters.ts` — Cashier movement filter vocabulary reused for characterization only.
- `crm/customerSource.ts` — verbatim Cashier customer acquisition-source contract (blob `70f0ad1b…`, `src/lib/customerSource.ts`). Adapted, not edited, into `apps/api/src/customers/customer-source.ts`; `tests/customer-profile-source.test.cjs` locks the blob and the option list.
- `loyalty/helpers.ts`, `loyalty/types.ts`, `loyalty/cutClubSettingsPage.tsx` — verbatim Cashier loyalty helpers/types and the Cut Club settings page (blobs `bcc16172`, `438a908f`, `6850a000`). Characterization-only; adapted into `packages/business-modules/loyalty/src/loyalty-rules.ts`, locked by `tests/loyalty-rules-source.test.cjs`.
- Additional Booking/Queue contracts may also live under `tests/fixtures/cashier/`.
