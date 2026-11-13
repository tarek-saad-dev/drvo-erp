# Salon S5-C — Fast daily appointment operating view

**Implementation review:** read-only private Salon overview improvements, **no API/SQL new owner**.

## Architecture impact and features

- Reuses the K5-validated Tenant/Business/Branch-scoped Shared Booking GET response and independently gated Customers/Catalog queries. Daily/Upcoming/All filter is **client-local** with explicit device-local date semantics, sorted and limited to the last 200 appointments emitted by the Booking API; counters do NOT represent complete monthly revenue, attendance, subscriptions or complete company analytics.
- Provides today visible bookings, currently upcoming BOOKED slots, filtered roster and quick links to Booking. Only COMPLETED Booking rows may show **Prepare DRAFT for service**, and ONLY after `DRVO_POS_DRAFTS_WEB_ENABLED`/POS Preview Web flags plus **independent POS Draft and POS Preview HTTP 200** succeeded for the same Branch session. A link includes only an OfferingId, no Customer name, Tenant, Branch or payment.
- POS validates that OfferingId again in its own authorized Catalog response, pre-populating an unsaved cart (S5-B). **No automatic invoice, payment, settlement, journal, Cashier import or cross-module write**. Public Salon Demo mock route remains standalone.
- No new database, role, module registry or entitlement activation; respects ADR-017 composable Industry Solution, ADR-030 tenant scope and ADR-031/032 holds.

## Verification

Next build/typecheck, existing K5C default 404, Interactive Salon Demo CI retains mock 200/private 404, overview no-posting/new link gating regression, K0/K1 and unchanged Shared SQL module CI. No live VPS SQL/flags changed.
