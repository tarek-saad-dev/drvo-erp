# Salon Pilot S2 — Shared Customers, Catalog, Booking and POS DRAFT SQL HTTP proof

**Status:** PR source/CI-only. Real Nest HTTP + real disposable SQL Server; **not public or live staging data**. This builds on existing independent Shared modules instead of copying Cashier routes or faking a new API.

## Architecture impact before implementation

- No new platform module, runtime API, SQL migration, table, permission code or public route. Extend only `tools/booking/verify.cjs` using migration **001–014** in disposable SQL; include existing Customers, Catalog and POS DRAFT endpoints under a **single already authenticated K5 Branch scope**.
- CI-only synthetic Scheduler role gains `customers.manage`, `catalog.manage`, `pos.draft.read/manage` and already possessed `booking.read/manage`, `customers.read`, `catalog.read`. These are **test fixture only**; production/staging roles and feature flags remain OFF. Never grant broad rights through Booking.
- Create Customer using Customers-owned HTTP, create service+price/duration using Catalog-owned HTTP, create Resource/Booking via Booking-owned HTTP, and create POS DRAFT via POS-owned HTTP. The cross-Module integration is through each domain's **publicly defined private API contract**, not through direct cross-domain SQL writes in real application code.
- Execute actual SQL resource scheduling, read after another request (proof of persistence within CI), idempotent POS replay, price snapshot integer math, and independent RBAC revocation. Forged Origin, tenant/business scope and customer/offering references are rejected.

## Acceptance & limitations

- `Shared Booking SQL API HTTP CI` on the PR must run real disposable SQL 2022, apply 001–014, launch Nest API on loopback, and pass both pre-existing booking negative tests and Salon E2E additions. Test also runs root K0/K1. Synthetic fixtures have no real contact PII.
- **Not** a manual browser/Next E2E; matching private Web route proof is a separate PR. The public `/demo/salon` must remain standalone/in-memory. No customer-facing SQL behind its path.
- **Not** a Cashier data migration, payroll, shift, posted invoice, payment, Accounting GL, commercial module activation or user acceptance. ADR-030 Tenant/Business/Branch security baseline still governs implementation; ADR-031/032 and K5F remain open.
- SQL 010–014 **not authorized to apply on VPS**, no Public K5 Auth or Module flags enabled. Do not imply this ephemeral SQL test is a deployed authenticated salon.

## Immediate next safe steps

Integrate the independently tested private navigation and verify real K5F root-only preflight, off-host backup/restore, ADR-032 activation before deploying actual SQL and inviting pilot users. Explicit Finance policy/ADR-031 required before SALE POSTED.
