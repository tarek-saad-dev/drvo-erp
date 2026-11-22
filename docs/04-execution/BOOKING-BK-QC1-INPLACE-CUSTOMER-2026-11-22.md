# Booking BK-QC1 — in-place Cashier customer registration (2026-11-22)

**Status:** SOURCE IMPLEMENTED on review branch; protected Owner SQL/browser acceptance **OPEN**. Does NOT mean full Booking/Cashier parity.

## Operator journey and Cashier reuse
Cashier POS already has name/mobile lookup → quick-create → select the Customer, including 409 business-phone collision resolution. DRVO POS has the analogous [scoped UI](../../apps/web/src/app/workspace/%5BbusinessId%5D/%5BbranchId%5D/pos-preview/pos-customer-operator.tsx). DRVO Booking used a scoped server-side Customer search, but left the booking screen to create a new Customer. New Booking Quick Customer UI follows Cashier's operator intent without cloning the legacy SQL or creating a Booking-owned Customer table.

**Flow:** within authenticated Booking, operator enters name/mobile → browser canonicalizes Egyptian mobile → POST to **same protected** `/api/workspaces/:businessId/branches/:branchId/customers` (Customers-owned `core.CreateCustomer`) using retained `Idempotency-Key` → on validated result, select customer immediately without navigating away → finish appointment. If Customers Core reports `CUSTOMER_PHONE_EXISTS`, do **not** trust the returned ID as a name/profile: query `GET /customers?q=<phone>` under the same scope; accept only exact matching active ID+phone+Business result; never overwrite CRM/consent. A replay with `created:false` uses the same verified reread. 401 redirects to sign-in; 403/404 blocks registration. Network/5xx ambiguity keeps the same idempotency key for safe retry, changing name/phone resets it.

## Architecture impact
- Booking UI composes the independent Customers Core API. No direct SQL, new auth, migrations, finance, marketing consent, global customer list or booking-specific Customer records.
- Shared Booking works for Salon, Hotel or Clinic scheduling; no Salon-only action is embedded in its domain.
- Booking creation remains Booking-owned with separate SQL/idempotency/availability checks, not a composite atomic create-booking operation. A successful Customer create followed by failed Booking still leaves a legitimate Customer; operators may retry Booking.
- This does not enable public website registration, Cut customer import, posted sales or ADR-031 money movement.
- Normalizing Egyptian phone follows the existing UI helper, while the server remains authoritative for scope, creation, conflict detection and data validation.

## Verification
- `node --test apps/web/test/booking-quick-customer.test.cjs` tests normalizer/validation, response parsing, conflict scoped reread and protected Booking UI wiring.
- `node --test apps/web/test/booking-customer-finder.test.cjs apps/web/test/booking-pos-handoff.test.cjs` checks existing integration regressions.
- `npm run typecheck --prefix apps/web` + Next build + CI at the **exact proposed SHA** before merging; no local or GitHub CI PASS claimed until observed.
- After owner activates isolated synthetic SQL Pilot: private operator tests create/reload, duplicated mobile/no duplicate, booking save, denied customers.manage, cross-Tenant/Business/Branch negative cases; no real Cut data.
- Source is reviewed Cashier POS flow, **not** complete Cashier booking/customer feature parity. Entry remains **OPEN** in [Execution HQ #163](https://github.com/tarek-saad-dev/drvo-erp/issues/163) B02/A02 and pending [VPS task #166](https://github.com/tarek-saad-dev/drvo-erp/issues/166).

## Changed paths
- `apps/web/src/app/workspace/[businessId]/[branchId]/booking/booking-client.tsx` — compose quick-create in protected booking form.
- `booking/booking-quick-customer.tsx` — customer selection workflow via Customers Core.
- `booking/booking-quick-customer.mjs` + `.d.mts` — validation and protected duplicate-read contract.
- `apps/web/test/booking-quick-customer.test.cjs` — behavior and wiring tests.

## Remaining
Review exact-commit CI, independently verify isolated Owner browser/SQL and offline/retry concurrency with permissions. Full website booking, payroll, finance, real Cut import and financial cutover are unchanged/blockers.
