# S12 — Actual private Salon UI write journey on disposable SQL

**2026-11-14 · Test-only, no live Pilot or VPS access.**

## Architecture and delivery

Reuses S11's Chrome → localhost HTTPS Next → K5/Nest API → **disposable SQL Server 2022 with migrations 001–017** and synthetic `SCHEDULER` (not real Owner) / read-only `STAFF_READ` accounts. Does not create another Salon backend, bypass any Module-specific business authorization, or change the persisted SQL schema, privileges, or production feature flags.

Adds `tools/salon-browser/operations.cjs`, loaded only by the **CI-guarded** browser script `check.cjs`. Browser actions are real Playwright clicks/inputs against the private UI, not direct test fixture inserts or mocked responses. Creates only ephemeral, labeled synthetic data:

1. **Catalog**: create Category and EGP Service by actual forms, verify persisted service survives a full Browser reload.
2. **Customers**: create synthetic Customer (no phone/email/PII) by actual form, verify reload.
3. **Booking**: create Branch Resource, select exact new Customer/Service/Resource in the booking form, confirm a future Booking, verify its row survives reload.
4. **POS**: select the new Catalog Service, add quantity 2, save via **“حفظ مسودة فقط (بدون بيع)”**, verify message expressly denies sales/collections, reload and assert persisted status `مسودة فقط`.
5. **Isolation**: return to Salon Overview, then separate Staff browser authenticates independently and sees the new SQL Booking while POS Draft summary remains unavailable. Existing S11 foreign-Tenant and anonymous negatives remain.

## Operational and security boundaries

- All services/API/Web flags enabled **in runner child processes only** by `BOOKING_SQL_DISPOSABLE=YES`, `BOOKING_BROWSER_DISPOSABLE=YES`, `CI=true`, local fixed port 14342. Never use a real Salon account, external app URL, live DB or customer PII.
- Reuses shared Catalog/Customers/Booking/POS module owners; K5/SQL server enforcement remains authoritative (ADR-030 scope, ADR-032 limited ACT-01–07 baseline, ADR-037 Lean Kernel).
- No real Publisher/Market trust, P5 grant, Account Owner, VPS SQL010–017, Public Auth, customer onboarding, posted sale, payment, Accounting or commercial SaaS entitlement.
- S12 proves Browser flow on disposable SQL, **not** P6 independently authorized private staging acceptance. P1–P7/C1–C3 in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) all remain OPEN.

## Verification / rollback

Require `Salon Private Browser + Disposable SQL CI` (real Chrome/SQL2022), `Shared Booking SQL API HTTP CI`, K0/K1; ideally all triggered domain/web checks on exact PR SHA. Any failure blocks merge. Revert only test source and this doc; no live rollback needed.

Real operational work remains P1 [#121](https://github.com/tarek-saad-dev/drvo-erp/issues/121), P2 [#122](https://github.com/tarek-saad-dev/drvo-erp/issues/122), P3 [#123](https://github.com/tarek-saad-dev/drvo-erp/issues/123), then separately approved P4/P5, actual staging P6 and P7 signed GO.
