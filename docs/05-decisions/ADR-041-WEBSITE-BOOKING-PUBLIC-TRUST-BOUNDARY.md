# ADR-041 — Website Booking public trust boundary (PROPOSED; NOT AUTHORISED)

**Date:** 2026-11-22
**Status:** PROPOSED / NOT APPROVED for Public Auth, anonymous writes or real customer data.
**Related:** ADR-030, ADR-040, ADR-031; BK-WEB1 [#171](https://github.com/tarek-saad-dev/drvo-erp/issues/171).

## Decision requested (not an implementation approval)
Website booking must be a separate client-capability trust zone, **not** an anonymous bypass into private K5 `booking.read/manage`. Caller-visible business/branch codes and resource UUIDs are untrusted selectors. Resolve server-side into a live, explicitly enabled, expiring/revocable public branch capability before any Catalog/Booking read. No cross-tenant phone search or account discovery. Public customer identity/consent must be independently verified and rate-limited; never accept client-provided TenantId, price, duration, status, invoice or payment decisions.

Require public capability binding Tenant/Business/Branch + business module entitlement + branch-active + consent policy + bounded expiry + revocation + independent audit, and anti-enumeration 404 on unknown/inactive/foreign/expired/revoked. Define Origin/CSRF/CORS strategy, per-IP+branch+customer throttles, plan/hold validation and verification, per-customer cancellation authentication, timezone/DST and notification/outbox ownership before Public Create.

Reusable Booking writer stays `core.CreateBookingAppointment` or a separately reviewed Booking-owned public-call adapter under least privilege, not direct SQL writes from Site, no extension-specific duplicate Booking table. ADR-031 remains BLOCKED.

**Current safe bridge:** SQL043 / K5-only Website Booking preview never grants public access, reads full scoped availability, and uses existing private Booking create. Dual flags default OFF. No public endpoints included. Founder/security approval and synthetic SQL/browser negative-tests plus Owner evidence are prerequisites for follow-up.
