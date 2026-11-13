# Salon S5-A — Shared Booking dated resource availability

**Implementation review:** new immutable migration `016_resource_dated_availability.sql`, Booking-owned K5 HTTP endpoints and a private Arabic Booking form. **Source/isolated SQL CI only, never VPS migration.**

## Architecture impact before change

- Resource scheduling belongs to **Shared Booking**, not HR or a custom Salon database. Each published resource window is tied to **Tenant/Business/Branch/Resource** with composite FK, private `booking.read/manage` and signed K5 session checked **inside SQL**. This first slice stores explicit UTC date/time intervals; browser local time is converted to UTC. **NO weekly recurring hours, DST timezone policy, employee shift identity, holiday generator, staff+chair composite allocation, or automatic reminders** are asserted.
- Existing 001–015 SQL migrations are immutable. Add SQL **016**, update source-manifest checks and SQL2022 tests to 001–016 while K5F's actual pre-migration 001–009 remains unchanged. Nothing goes on VPS unless separately approved.
- Publishing a resource's **first** window activates availability checks for future bookings for that Resource. Before first window, legacy resources continue to book as before. After first window, uncovered future dates are unavailable; new bookings must fit **entirely** inside one window. Never auto-enable this per resource. Publishing first window is refused if any existing upcoming BOOKED appointment falls outside it. All historical bookings are preserved.
- The resource-row `UPDLOCK,HOLDLOCK` lock is taken for window writes and bookings; a Booking-owned `AFTER INSERT` trigger checks coverage in the **same** insert transaction without replacing SQL013's original stored procedure. This also protects from a mistakenly bypassed API path. Windows cannot overlap. No financial posting or POS side effect.
- Strict `POST /booking/windows` accepts only `{resourceId,startsAtUtc,endsAtUtc}` (whole UTC minutes), request UUID idempotency + HTTPS Origin, min five minutes into future, max 90-day horizon, length 1 minute–24 hours, active scoped Resource. `GET /booking/windows` reads up to 300 upcoming windows. SQL app runtime only EXECUTES public procedures and has no direct table access. 409 for schedule conflicts/first-window stranded booking/outside-hours attempts, 404 wrong scope, 400 forged fields, 401 invalid Origin.
- **Limitations:** no window delete/edit in V1. No workaround using a dummy unconstrained Resource; publishing is explicit and operator-controlled. If a staff holiday or wrong schedule is recorded, separate carefully reviewed update/delete commands will be necessary. UI must not suggest recurring shifts or true appointment availability without considering all resources.

## Verification

Run root K0/K1, API Booking unit tests, real disposable SQL Server 2022 + Nest HTTP checks for: old resource compatibility, window creation/idempotency, inside-only/overlap, foreign Tenant+Branch, cross-scope, forged Origin, initial window refuses to strand future booking, restricted SQL principal and refreshed Web. No public `/demo/salon` linkage. Existing K5C default-404 remains unchanged.

**Open holds:** K5F trusted root and independent encrypted offhost backup/restore, ADR-032 module grants, separate operator SQL **010–016** migration approval and ADR-031 financial posting. This code cannot be used to activate a live Salon.
