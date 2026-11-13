# S4A — Shared Booking cancellation and completion (review-only)

**Scope:** SQL migration `015_booking_appointment_lifecycle.sql`, existing Booking Nest controller/service, private K5 Booking Web page, real disposable SQL/HTTP tests. NO VPS migration, public Auth, commercial activation, POS posting, payment, employee commission or inventory movement.

## Impact on architecture before change

Keep Booking as independently owned Shared Domain. No Salon-only Booking schema or Cashier numeric employee/Branch assumption. A Booking resource is an abstract scheduler, not HR/medical identity. Customer/Catalog references stay scoped and owned by their modules. Add terminal states `BOOKED → CANCELLED | COMPLETED` only, with immutable scoped `core.BookingStatusChange` (ClientRequestId + Actor + timestamp); no rebooking/rescheduling API and no financial/commercial consequences.

The existing SQL 013 migration is IMMUTABLE. Add migration **015** rather than rewriting 013; K5F current observed SQL history remains 001–009, source gap now 010–015. Update local source manifest and negative operator-preflight expectations; all current VPS SQL still untouched. Operator migrations 010–015 require separate authorization, backup+restore, post-migration K5F compatibility and explicit security review. ADR-031/032 remain PROPOSED.

## Behavior / correctness

- Private POST `/api/workspaces/:businessId/branches/:branchId/booking/appointments/:bookingId/status` accepts strict `{status:"CANCELLED"|"COMPLETED"}`, exact Origin and UUID Idempotency-Key. Auth from K5 session only; Branch URL identifiers are selectors, not authority.
- Transaction rechecks `booking.manage` before idempotency replay, locks scoped Resource `UPDLOCK,HOLDLOCK` before appointment row (same order as create), updates from `BOOKED` only and records immutable change. Repeating exact request ID+payload returns changed=false; reused key with different target/Booking returns 409; final state with new key returns 409.
- Cancellation frees overlapping future slot through existing create procedure's `Status='BOOKED'` predicate. Completion is allowed only once appointment start is not future, and **does not create a sale/invoice, payment, GL journal, HR commission or Customer changes**.
- GET reads current status including terminal appointments (last 200). Private Web displays cancel/complete controls and active status; no public Demo connection.
- SQL app runtime stays **EXECUTE-only**; no direct Booking/StatusChange table UPDATE/INSERT rights. Unknown/foreign Booking fail 404; forged Origin 401; invalid states/body 400; conflict 409.

## Proof and deployment gate

Run Shared Booking SQL Server 2022/Nest HTTP CI **with migration 015**; tests verify create/overlap, cancel/frees slot, idempotent replay/conflict, complete-after-start, role/scope/Origin denials, SQL least privilege. Run API tests, Next build, K5C default 404, root K0/K1. This proves isolated CI only, not applied VPS/real clients.
