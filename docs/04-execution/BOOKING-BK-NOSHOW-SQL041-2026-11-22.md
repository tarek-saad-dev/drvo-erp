# BK-NOSHOW — persisted private Booking terminal state (2026-11-22)

Source Cashier `tarek-saad-dev/casher@f8fa67d` `src/app/api/bookings/[id]/route.ts` PATCH `no_show`. DRVO adapts into the **shared Booking owner** rather than duplicating a Salon-only table.

**Impact:** SQL041 extends `core.BookingAppointment` + `core.BookingStatusChange` constraints and alters the existing `core.ChangeBookingAppointmentStatus` transaction. No new permissions: SQL015 K5 guard, scoped Tenant/Business/Branch key, actor audit, resource serializable lock, existing EXECUTE-only app principal and idempotent key remain. The `NO_SHOW` terminal transition rejects appointments before they start and bookings with live `WAITING/CALLED/IN_SERVICE` Queue tickets. Queue is read-only in this routine; never silently changes arrived/working tickets. Existing cancel/complete behavior unchanged.

**Operator UI:** Bookings list and resource day board now show "لم يحضر", with confirm action for already-started BOOKED appointments only, truthful success message and no automatic POS invoice. Nest DTO validation, SQL and protected UI are all updated.

**Verification needed:** `node --test apps/web/test/booking-no-show.test.cjs`, `apps/api/test/booking.test.cjs` (via API test suite), and Shared Booking CI `tools/booking/verify.cjs` against **disposable SQL Server 2022 SQL001–041** with `BOOKING_SQL_041=YES`. Test future/invalid/foreign/Queue-active, exact audit once and replay. Main CI and protected Owner SQL/browser evidence separate. No full booking/website/POS/financial parity claimed.

**Deployment:** `ops/staging/pilot/activate-pilot-sql.cjs` now expects SQL041 on a *fresh isolated synthetic* Pilot only; see [one-command runbook](PRIVATE-PILOT-LIVE-ACTIVATION-ONE-COMMAND-2026-11-21.md) and [VPS owner queue #166](https://github.com/tarek-saad-dev/drvo-erp/issues/166). No live/primary SQL apply, public auth, Cashier data or financial posting authorized. ADR-031 stays PROPOSED/BLOCKED.
