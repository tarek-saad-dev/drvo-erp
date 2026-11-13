# Salon Pilot S2-UI — Authenticated branch workflow navigation

**Status:** review branch. Non-public, K5 protected Web navigation changes only; no SQL migration, runtime new API, customer role grant or financial posting.

## Architecture impact before implementation

- Existing private Booking screen already loads real Customer and Catalog resources from their independently owned APIs. Keep real `/demo/salon` public mock sandbox **completely separate**.
- Add an explicit **Customer → Catalog → Booking → POS preview** onboarding/workflow nav inside private Booking **only after** Booking/Customers/Catalog reads succeed, preserving existing status/permission/default-DENY. POS link is additionally gated by Next Web flags AND an independent HTTP 200 from `pos-preview` under same scoped Branch session; a Booking read does NOT grant POS.
- Add manual **تحديث من SQL** button that uses existing authorized no-store GET; no client-side persistent credentials/state, no attempt to use local mock fixtures for real modules. Real POS DRAFT save still governed by separate POS Draft private flags and `pos.draft.read/manage`; no posted sale/payment/tax.
- Use already existing Shared customers/catalog/booking/pos routes, not copied Cashier APIs or a new Salon backend. No new module or ownership overlap.

## Validation

- Existing K5C Private UI Route Gates, Shared Booking SQL HTTP CI, Web typecheck/build, and a new static security/nav test in `apps/web/test/private-salon-pilot.test.cjs`.
- Next/Web flag OFF must keep `/workspace/:businessId/:branchId/booking` returning 404. No new public route; synthetic Public Demo stays independent and unchanged.
- No staging pilot activation without K5F operational security/Backup/Restore and explicit approved SQL 010–014 staging change window. ADR-032 commercial activation and ADR-031 posting still PROPOSED.

## Manual private journey after authorization (NOT performed here)

1. Authenticate to one seeded test Branch with distinct `customers.*`, `catalog.*`, `booking.*`, `pos.draft.*` permissions.
2. Add a customer, service with valid duration and price, and a booking resource.
3. Book an appointment; click **تحديث من SQL** or hard refresh and verify the row stays (authenticated branch only).
4. If separately authorized, open POS preview and save a DRAFT; no invoice, payment, financial GL, refunds or tender settlement.
5. Verify sibling Business, foreign Tenant, unassigned Branch and revoked permission cannot list/alter the records.

### Release hold
Nothing in this PR sets flags or applies migrations on VPS. The public Demo remains for UX preview only.
