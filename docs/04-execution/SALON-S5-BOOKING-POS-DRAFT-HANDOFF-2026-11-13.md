# Salon S5-B — Completed Booking → fresh POS DRAFT cart

**Implementation review:** private POS preview optional untrusted OfferingId query and protected client prefill, with focused K5C regression.

## Impact and safety

- The **Booking owner** is NOT allowed to create sales, invoices, POS drafts, tender or GL. From a Booking management view with separately approved POS permissions, a user can follow a link carrying only an Offering UUID. The POS preview screen accepts `?offeringId=<UUID>` as an **untrusted suggestion**.
- A client must successfully fetch the existing independently authorized POS Preview/Catalog API with K5 cookie, and only if OfferingId is present, active and `kind=SERVICE`, prepare one line **in browser memory**, once. If not authorized/invalid/inactive, the requested item is ignored and no draft is created.
- Catalog price is never read from URL and any later explicit Save DRAFT uses the existing POS owner and SQL snapshot, with a new UUID idempotency key. **No automatic save, invoice, payment, settlement, tax or financial GL; no hidden Booking completion or cross-domain writes.** Once the source Booking is completed, this is still not proof a service was paid.
- No new SQL, endpoint, customer PII in query, paid entitlement or K5 flag. Public `/demo/salon` remains disconnected.

## Verification

K5C Web default-404 CI, Web build/typecheck, focused static binding regression and existing POS Drafts SQL HTTP CI. Parent Booking UI/overview link is a separate independently gated S5-C workstream. Same runtime scopes as existing POS Preview; ADR-031/032 and K5F operational gates remain open.
