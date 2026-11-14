# Salon P6 preparation — separate synthetic Staff over real disposable K5 SQL/HTTP

**2026-11-14 · Source/CI-only. This is NOT P6 private browser acceptance, P5 rights approval or live staging verification.**

## Existing architecture reused

The current `tools/booking/verify.cjs` already exercises real Nest HTTP against **disposable SQL Server 2022, migrations 001–017**, with independent Catalog, Customers, Booking and POS DRAFT owners; booking lifecycle, dated windows, concurrency, persistence, Origin and Tenant/Business/Branch checks. It was testing principally one synthetic privileged `SCHEDULER` account plus a foreign-Tenant account.

This extension adds a **second real K5 login session** with explicitly scoped **`STAFF_READ`** test-fixture permission set: `booking.read`, `catalog.read`, `customers.read`. There is no `booking.manage`, customer/catalog write, or `pos.draft.*` grant. These are not new production roles or default grants; `SCHEDULER` is a privileged CI operator, **not an independently onboarded real Owner**.

## Actual disposable CI proof

- Staff reads previously persisted Booking/Customers/Catalog owned records through its **own** session cookie; no in-memory React demo can satisfy this.
- Staff cannot create Booking Resource/Appointment, change Booking status, create Customer or Offering, view/create POS DRAFT.
- Cross-Branch (unassigned) and foreign-Tenant routes return 404.
- Removing Staff `booking.read` denies immediately; re-granting the test action restores scoped read.
- Deactivating Staff BranchAssignment denies, reactivating returns read, session revocation returns 401. Privileged operator session remains independently authorized.
- All writes to SQL for fixture setup/revocation happen **only inside throwaway GitHub SQL** under explicit `BOOKING_SQL_DISPOSABLE=YES`; tests never contact VPS or modify actual DRVO records.

## Acceptance and remaining blockers

Require [Shared Booking SQL API HTTP CI](../../.github/workflows/shared-booking-ci.yml) on exact PR SHA, in addition to K0/K1. Test runner is not a Playwright/Next Browser acceptance; it does not prove independently attested K5F, encrypted off-host recovery, external proxy/Origin, P4 authorized VPS 010–017 migration, trusted production Release or audited persistent Pilot grants. Do not mark P1–P7 GO in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106).

**Architecture:** ADR-030 scope, ADR-032 baseline and ADR-037 Lean Kernel unchanged; no new API, migrations, domain owner or public login. Rollback only reverts CI test and this note.
