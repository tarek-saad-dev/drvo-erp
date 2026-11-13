# S6-A — Closing a Published Booking Window safely

**Scope:** forward-only SQL017, Booking-owned K5 API/UI and disposable SQL/HTTP tests. NOT approved to apply on VPS.

## Architecture & impact

Booking owns availability independently of Salon HR/POS. SQL016 retains immutable dated resources and SQL013/015 are not changed. SQL017 adds `BookingResourceWindow.State = OPEN | CLOSED`, immutable `BookingWindowCloseAudit` with Branch-scoped request UUID + actor + timestamp, updates existing scoped Read/Create public procedures and Booking INSERT trigger, and adds `core.CloseBookingResourceWindow` with trusted K5 `booking.manage`, serializable transaction and the same scoped Resource `UPDLOCK,HOLDLOCK` lock order as Booking creation.

**Critical behavior:** even when all windows are CLOSED, the resource's **original opt-in stays permanent** (trigger's EXISTS checks all windows; coverage checks OPEN only). No accidental restoration of unlimited hours. A close is refused if any future/ongoing BOOKED appointment intersects the window. Once bookings are independently cancelled via Booking API, a window can be closed, then a fresh OPEN window at the same time can be published. CLOSED windows remain available in a limited audit/read listing and no longer conflict with new windows. A repeated UUID/WindowId is safe; key reused for another window conflicts. No hard delete, retroactive mutation of historical Booking, automatic holiday recurrence, HR shift or financial adjustment.

Private UI `إغلاق الفترة` only displays for OPEN windows, retries with preserved UUID on network failure, reloads SQL and shows a clear 409 for a confirmed appointment. No new business action, no client authority to override Tenant/Business/Branch. The app principal gets EXECUTE-only SQL procedure permissions and explicit DENY on audit table DML.

## Acceptance

Real disposable SQL2022 + Nest HTTP tests: confirmed booking blocks close, cancellation permits close, the last closed window **still blocks Booking inserts**, new OPEN window restores only its exact time, replay/payload/foreign Branch/Origin/permissions tests, restricted DB-only migrator applied SQL 001–017 and restore proof. Root K0/K1/K5C and other domains CI must pass.

Release gate: Source migration set 001–017; actual staging SQL 010–017 **NOT AUTHORIZED**, K5F root/off-host restore OPEN; ADR-031 Finance and ADR-032 activation still PROPOSED. Old public synthetic Salon demo untouched. No live salon onboarding or claim of deployment.
