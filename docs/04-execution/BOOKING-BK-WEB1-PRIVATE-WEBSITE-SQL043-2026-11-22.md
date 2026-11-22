# BK-WEB1 — Cashier Website Booking → DRVO Booking Core, private source-backed P0 (2026-11-22)

**Status:** Stage 1 MERGED [PR #173](https://github.com/tarek-saad-dev/drvo-erp/pull/173), `main@40175c59` (29/29 PR-head CI PASS); public capability NOT implemented or approved, no public customer endpoint. Exact Cashier pinned source `tarek-saad-dev/casher@f8fa67d2b1c8254e638cf89d95dcee75edc88598`. [#171](https://github.com/tarek-saad-dev/drvo-erp/issues/171).

## Cashier source review and ownership
- `src/app/book/[branchCode]/page.tsx` and `src/lib/booking/hostedBookingPage.ts`: tenant/branch public eligibility must be explicit (unknown, disabled, inactive => non-disclosing denial). Not ported into a public DRVO route.
- `src/app/api/public/booking/create/route.ts`: `branchCode`, tenant binding, plan/hold, customer identity, idempotency, prevent caller-supplied price/status/branch. DRVO SQL013 already has atomic scoped idempotent Booking creation; no copying numeric legacy IDs or Cashier's legacy `dbo` writes.
- `src/lib/booking/publicBookingCreate.ts`: concurrency/locks and after-commit notifications are real source capabilities. **No equivalence claimed** for plans, holds, addon packages, website identity, WhatsApp, cancellation or notifications.
- DRVO Core ownership: Catalog defines active service/duration, Booking owns explicit dated Resource availability, overlap and appointment, Customers owns registration/identity. Site integration is a consumer, never a new source of truth.

## Implemented P0 slice for private QA
- SQL043 `core.ReadWebsiteBookingSlots`: K5 `booking.read` under **trusted Tenant/Business/Branch**, `SERIALIZABLE` no-write read of all scoped windows/BOOKED rows (not the truncated board); only explicitly published `OPEN` windows appear. At most 24 early slots, 15-minute starts, exact UTC day, 90-day window; returns **advisory** availability only. No customer PII, prices, write permission, or public SQL principal. EXECUTE-only existing app user.
- Protected API `GET /api/workspaces/:businessId/branches/:branchId/booking/website-preview/slots?resourceId=&offeringId=&dayUtc=`, both existing K5/Booking flags and NEW `DRVO_WEBSITE_BOOKING_PREVIEW_ENABLED=YES` flag required. Default OFF, no `/api/public` route.
- Private Next `/workspace/:businessId/:branchId/booking/website-preview` gated by K5+Booking+Catalog+Customers and NEW `DRVO_WEBSITE_BOOKING_PREVIEW_WEB_ENABLED=YES` flag. Uses genuine scoped Catalog/Customers/Booking APIs, includes Business Customer phone/name search and Customers Core quick-create, offers SQL slots, and uses existing `POST .../booking/appointments` **with Idempotency-Key** to save a real `BOOKED` record. Conflict recheck and idempotency replay remain authoritative in SQL013, no new domain booking writer, no fake financial posting.
- Strict UTC-day contract prevents pretending a business timezone has been defined. Public website later needs Business timezone/DST, consent, branch capability issuance, expiry/revocation, anti-abuse, CSRF/Origin, public customer identification and independent security sign-off. Explicitly don't expose this private route as public.

## Testing / evidence
- Source and pure parser validation `apps/web/test/bk-web1-website-preview.test.cjs`; Nest unit in `apps/api/test/booking.test.cjs`.
- Disposable SQL2022 `tools/booking/verify.cjs` with `BOOKING_SQL_043=YES` (runs SQL001–043) tests no window, OPEN window, foreign Business/Tenant/Branch, no cookie, invalid day/resource/service, complete SQL conflict visibility, existing appointment POST collision (409), EXECUTE-only SQL principal; fixture contains only synthetic generated GUIDs. K0/K1, private Browser, Purchasing, Pilot automation CI also required. **Verified PR-head `63c70756` 29/29 CI PASS**; no live deployment or VPS Owner Pilot evidence.

## Operator, deployment and limits
- `DRVO_ERP_PILOT` isolated once-only activation now expects SQL001–043 on a **fresh** verified preflight; update #166 only after merge. Never re-run activator on partial failure, and never touch `DRVO_ERP_STAGING` or Cut production without separate authorization.
- No public booking endpoint, public tenant branch capability, public customer authentication, plan/hold, notifications, automatic POS draft conversion, payments, invoicing or finance write. ADR-031 remains BLOCKED. This is **BK-WEB1 Stage 1**, not complete Website Booking parity.

**Future trust-boundary decision:** [ADR-041](../05-decisions/ADR-041-WEBSITE-BOOKING-PUBLIC-TRUST-BOUNDARY.md) PROPOSED. Next slice subject to review: branch-scoped public capability + disposable public-read API, then explicit customer consent/identity and **only then** public create with abuse/rate limits and authorization.
