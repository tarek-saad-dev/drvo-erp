# BK-POS2 — trusted completed-booking handoff to nonposting POS Draft (2026-11-22)

**Merged evidence:** [PR #170](https://github.com/tarek-saad-dev/drvo-erp/pull/170), `main@9523dacf`, exact PR-head `1fd07586` **32/32 GitHub Actions PASS**. Code is merged; no confirmed fresh Pilot activation, production SQL apply or Owner browser acceptance.


**Source comparison:** Cashier `tarek-saad-dev/casher@f8fa67d` `src/apps/booking/application/convertBooking.ts`: original performs shift-guarded paid invoice creation. **DRVO explicitly does not copy the posting side effect** while ADR-031 is proposed/blocked. Existing Booking → POS link used `customerId` / `offeringId` query parameters, which could be forged and did not prove Booking COMPLETED.

**New API:** GET `/api/workspaces/{businessId}/branches/{branchId}/booking/appointments/{bookingId}/pos-handoff` is protected by normal private K5 cookie, `DRVO_BOOKING_ENABLED`, `booking.read`, and SQL042 `core.ReadCompletedBookingForPosDraft`. The transaction returns only an exact scoped `COMPLETED` appointment's `bookingId/customerId/offeringId`, otherwise 404 (except malformed GUID 400). EXECUTE-only runtime grant; no direct table SELECT. No Customer phone/private profile, no price, token or invoice is returned.

**UI:** Booking now passes `bookingId` ONLY, POS reads the server-verified Booking owner response **after the independently authorized POS/Catalog GET**, verifies the ID/status/IDs, then seeds a one-time draft service line at the *current* Catalog price. Unauthorized, stale or foreign Booking IDs never seed the draft; legacy direct POS lookup hints remain separate and cannot override `bookingId` handoff. Saving DRAFT still uses its existing scoped POS API and independently validates Customer/lines. No sale, ledger, payment, queue, HR or notification mutation.

**Tests:** Shared Booking SQL2022 disposable CI now applies SQL001–042, tests booked/foreign/no-session cases, scoped completion and HTTP handoff, runtime EXECUTE-only; web source tests assert that raw Booking query IDs are no longer sent as if authoritative. Older SQL024 browser harness stays pinned and skips SQL042-specific assertions to prevent false failures.

**Operator/VPS:** Isolated one-time synthetic `DRVO_ERP_PILOT` runbook should use SQL001–042 *only after code merge and independent preflight*. Do not re-run the one-time activator, touch real Cut database, activate public Website Booking or financial posting. The Owner browser and staging deployment remain unverified. Related [#163](https://github.com/tarek-saad-dev/drvo-erp/issues/163), [#166](https://github.com/tarek-saad-dev/drvo-erp/issues/166), ADR-030/031/040.
