# Shared Booking Core — first appointment vertical slice

**Date:** 2026-11-12 · **Status:** engineering implementation in a review PR; not live or commercially activated.

## Shared Core ownership and scope

Booking owns **appointments and bookable resources** independently of Salon, HR/Payroll and POS. Booking Resource is `PERSON|CHAIR|ROOM|EQUIPMENT` as a scheduling handle, **not** an authoritative employee account, medical clinician profile, service execution state, or inventory asset. Salon barber/stylist assignment and chair eligibility may be added later through reviewed **bounded Salon Extensions** with typed contracts to HR, without hardcoding Salon-specific columns or a standalone Salon Service Execution Module (ADR-020).

- `BookingResource`: `TenantId, BusinessId, BranchId, ResourceId` key; scoped ClientRequestId for retries, name, kind, active flag; composite Branch FK.
- `BookingAppointment`: `TenantId, BusinessId, BranchId, BookingId` key; scoped ClientRequestId; **composite FKs** to *active validated* Customer (Customers-owned), Catalog Offering with `Kind=SERVICE`, and resource from the **same Branch**. Stores `StartsAtUtc` and `EndsAtUtc` determined by current Catalog Service DurationMinutes **at creation**. Status in this slice is **BOOKED only**.
- Booking does **not** write Customer, Catalog or HR tables. Stable references are read inside a SQL transaction and protected by scoped FKs. Cross-Module write is confined to Booking-owned tables. No invoice/payment/deposit, booking cancellation/completion, stock or commission effect. A service-duration change in Catalog does not retroactively change earlier bookings.

## Initial endpoints and UX

- `GET /api/workspaces/:businessId/branches/:branchId/booking`: authorized Branch resources + last 200 booked appointments with linked labels. Requires `booking.read` only.
- `POST .../booking/resources`: `{displayName,kind}` with UUID Idempotency-Key, exact Origin, `booking.manage`.
- `POST .../booking/appointments`: `{customerId,offeringId,resourceId,startsAtUtc}`; valid **whole UTC minute** as canonical ISO string `YYYY-MM-DDTHH:mm:00.000Z`, at least 5 minutes in future and within 1 year; exact scoped `booking.manage`.
- Business scope is obtained **only from authenticated K5 session**; `businessId` and `branchId` are resource selectors, never authority. All procedures revalidate active session hash/version, Tenant/Business/Branch membership, role, and exact `booking.read/manage` inside `SERIALIZABLE` transaction. Restricted staging app role can **EXECUTE** reviewed public procedures but has **no direct SELECT/INSERT/UPDATE/DELETE** on Booking tables and no EXECUTE grant on internal Assertion proc.
- Date/time is shown in the viewer's local device time in the private RTL UI; **canonical storage remains UTC**. No timezone identifier per Branch, DST schedule/recurrence or HR availability policy is claimed. Booking UI fetches Customers and Catalog through their **own authorized endpoints** and fails closed if those are unavailable; Booking API itself can show appointment labels under `booking.read` without granting unrelated Customer list or Catalog list rights.
- Any overlapping interval on a single Resource is rejected, even with two concurrent API requests, via an **exclusive SQL resource-row `UPDLOCK,HOLDLOCK`** and transactional range query. Adjacent slots and *different* resources can coexist. This currently models one required Resource per appointment; employee+chair simultaneous allocation is a **future reviewed Salon Extension** with separate conflict testing.
- Duplicate same Idempotency-Key + same payload returns the existing ID; changed payload returns 409. 409 is also returned for a resource scheduling conflict; clients must re-query before retry. No hidden creation of Customer/Service or scheduler users.

## Security and deployment gates

- `DRVO_K5_AUTH_ENABLED` and `DRVO_BOOKING_ENABLED` BOTH must be `YES` for API; private Next.js page separately requires `DRVO_K5_WEB_ENABLED` and `DRVO_BOOKING_WEB_ENABLED`. **All flags remain OFF**. No public booking URL or customer self-service.
- SQL migration `013_branch_booking_foundation.sql` exists **only on feature PR and disposable CI**. **DO NOT apply SQL 010–013 on VPS**; K5F operator readiness checker remains pinned to 001–009 and K5 full security/security operations acceptance is pending. No real salon/Customer data or Cashier migration.
- Proof: disposable SQL Server 2022 full migration replay; restricted SQL app permissions; forged token; real Nest HTTP 401/404 for anonymous/foreign Tenant/Business/Branch; customer/service/resource reference validation; strict Origin/input/UTC minute; idempotency and overlap; parallel double booking; role/membership/session revocation. Exact-head CI success is required before PR Ready for Review.
- Rollback before authorized migration: revert PR. Any later applied migration requires explicit forward-only corrections, backup/restore test and deployment verification.
- Booking is a bounded product slice, **NOT** approved Salon commercial V1, SaaS Module Activation (ADR-032 remains PROPOSED), or a verified publicly operable scheduling system.

## Future complete Booking work

Cancellation and rescheduling with resource conflict release; business opening hours, shifts, HR-attached providers, chair+staff availability, multi-service bookings, multi-resource constraints, recurring scheduling, time zones/branch holidays, reminders only with consent, search/pagination, quotas, accessibility and load tests are separately planned. Avoid claiming any are done in this initial slice.
