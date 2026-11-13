# S6-B — Completed Booking to unsaved POS Draft link in Booking screen

**Scope:** private Booking Web only; no SQL, POS/Finance API, new role or real invoice/payment.

## Architecture impact

Existing POS Preview accepts an optional untrusted `offeringId` (S5-B), validates it against the independently authorized active Catalog and only fills an unsaved cart. This S6-B step surfaces that link **directly on Booking rows** only for `COMPLETED` bookings after all independently required Web flags and two same-Branch HTTP checks have returned 200: POS Preview and POS Draft GET. Booking `booking.read` alone cannot imply `pos.draft.read` or POS permission. No posted sale, automatic payment, customer PII transfer, Booking mutation or Cashier direct integration. Existing public demo remains synthetic.

## Verification

K5C Next build/typecheck and static default-deny regression test in `apps/web/test/private-salon-pilot.test.cjs`, existing Booking/POS SQL module tests and K0/K1. Private K5 remains OFF and no unapproved entitlement or SQL migration is applied on VPS.
