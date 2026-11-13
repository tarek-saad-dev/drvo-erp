# Salon S6 — secure availability correction + Booking→POS + roster filters

**GitHub verified on 2026-11-13:** [#88](https://github.com/tarek-saad-dev/drvo-erp/pull/88), [#89](https://github.com/tarek-saad-dev/drvo-erp/pull/89) and [#90](https://github.com/tarek-saad-dev/drvo-erp/pull/90) merged, product `main` commit `2b7d82f238e2c53ffa5a3c5ad2caaf4b4743d186`. Independent PR checks passed. **This document tracks source/CI, not customer onboarding.**

## Product changes and architecture evidence

**Shared Booking S6-A (#88):** new *forward-only* SQL `017_booking_resource_window_close.sql` extends SQL016 one-off resource windows with OPEN/CLOSED state, immutable per-Tenant/Business/Branch/Window UUID request audit, and a K5-guarded POST /booking/windows/:windowId/close API. State changes acquire the same Branch/Resource `UPDLOCK,HOLDLOCK` and transaction isolation as Booking creation; they refuse to strand a future BOOKED appointment. Every old window remains an opt-in marker: the **last CLOSED window never re-enables unrestricted bookings**. A replacement OPEN window re-authorizes only its own UTC interval. Private UI shows status, closure and idempotent retry. **32 real disposable SQL2022/Nest HTTP checks pass**, including four new close-window cases. The same SQL017 passed restricted **Staging DB Automation CI** including constrained migrator/restore after a review fix to a same-batch CHECK constraint, without any VPS changes. No new Salon-specific scheduler, no recurring shift/DST/HR availability claim.

**Booking→POS UX S6-B (#89):** existing authenticated Booking page can show *Prepare POS Draft* for COMPLETED appointments only after both POS Preview and POS Drafts GET are separately 200, plus exact Web gates. The link contains only an OfferingId, never customer/tenant or price. POS independently validates the active Catalog service and prepares an **unsaved** cart. No automatic payment, tax, invoice, posting, sale or cross-domain data ownership changes. Web/Next, K5C, K0/K1, Catalog, Customers, Booking and POS SQL CI all passed on PR head.

**Private Salon day roster S6-C (#90):** client-side Booking Resource and BOOKED/COMPLETED/CANCELLED filters built entirely from authorized last-200 Booking rows, alongside TODAY/UPCOMING/ALL device-local filters and independent POS Draft link gates. Not a shift/attendance/BI or complete analytics module; no new API, SQL, PII export or module permissions. K5C/default-404, public synthetic Demo, K0/K1 and Domain SQL CI passed on PR head.

## Why this remains aligned

- Shared Booking, POS and Customers/Catalog maintain their owners, within the Modular Monolith. Salon is a **private Industry Solution UI composition**; there is no parallel Salon Booking/POS domain.
- ADR-030 trusted K5 Session → Tenant/Business/Branch, composite FKs, SQL-scope default deny, Origin, separate booking.read/manage vs POS rights, restricted DB application principal and negative Tenant tests remain enforced.
- Source migrations 001–016 remain immutable; new **017** is incremental. Original K5F audit legitimate pre-migration history is still 001–009 and must not be inferred from CI. Source target 001–017 is **not** staging VPS applied state.
- ADR-031 real financial posting and ADR-032 commercial entitlement remain PROPOSED; no Public Auth, Business module activation, customer data or paid SALE POSTED is authorized.
- Cashier was reviewed previously for reusable cases; no legacy EmpID lock key, DB pool, or real PII was copied.

## Deployment and next explicit gate

The source and tests are merged, not necessarily **runtime-activated**. Code Staging Deploy, where green, is not evidence that VPS SQL 010–017 is applied. Operator still needs trusted root K5F, offhost encrypted independent backup+restore, proxy/Origin and security checks, then a separately approved SQL 010–017 window and narrowly-scoped private entitlement/identity test. **Do not run migrations on VPS or enable K5/Business flags from GitHub CI success alone.**

Next suggested product slices: edit/replace windows with careful booked-appointment preservation; availability display for selected Resource before booking; real browser Owner/Staff flow after authorization. Sale posting needs ADR-031 independent approval.
