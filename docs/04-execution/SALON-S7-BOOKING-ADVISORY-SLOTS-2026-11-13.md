# Salon S7-A — advisory slots on private Shared Booking
**Scope:** review branch only. This change does not enable public Auth, SQL 010–017 on VPS, module flags or any financial posting.

The existing authenticated private Booking UI already receives scoped Resource windows (max 300 upcoming) and Booking appointments (last 200). It now composes an **optional local-day, Resource and SERVICE duration preview** from those authorized reads. CLOSED windows are excluded. BOOKED overlaps visible in the response are excluded; CANCELLED/COMPLETED do not block. The preview offers up to eight local device-time candidates and fills the existing form only when clicked.

**Non-authoritative by design:** returned windows and appointments can be truncated, changes can happen concurrently, and a Resource with no returned OPEN window may be unrestricted, closed, or omitted by the cap. The UI NEVER claims these slots are guaranteed free, never bypasses the existing POST /booking/appointments SQL/Origin/K5/tenant locks, and never auto-submits. Invalid dates or durations yield no suggestions. The SQL layer remains final source of truth.

**Architecture impact:** client-only Shared Booking composition; no new Salon backend, new API, PII export, SQL migration, Cashier employee identity, HR roster or payment. This is compatible with ADR-030; ADR-031/032 remain unapproved. Public synthetic demo is unchanged.

**Evidence:** new pure Node 22 tests under apps/web/test/booking-availability-preview.test.cjs, explicitly invoked by K5C CI alongside Next build/typecheck and private 404 checks. K0/K1 gates remain required. No deployment/merge/approval is implied by source changes.
