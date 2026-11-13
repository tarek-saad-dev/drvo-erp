# Salon S5 — three equally prioritized working product slices (2026-11-13)

> **HISTORICAL S5 NOTE:** S5 at 001–016 accurately described source then. S6 [#88](https://github.com/tarek-saad-dev/drvo-erp/pull/88) added source-only SQL017 for safe closure of dated Booking resource windows. Actual VPS SQL 010–017 remains unauthorized; see [S6](SALON-S6-INTEGRATED-DELIVERY-2026-11-13.md).


**GitHub verified:** PRs [#84](https://github.com/tarek-saad-dev/drvo-erp/pull/84), [#85](https://github.com/tarek-saad-dev/drvo-erp/pull/85), [#86](https://github.com/tarek-saad-dev/drvo-erp/pull/86) have MERGED on main, latest product SHA at S5 merge `24c1a2e3338453816ff1820c7f89ac1a703fd38c`.

## Scope and domain ownership

### A. Shared Booking dated availability

- Forward-only **SQL migration 016** introduces scoped BookingResourceWindow rows (Tenant/Business/Branch/Resource composite FK, unique request key, created-by account, UTC range), independently guarded `booking.read/manage` stored procedures `ReadBookingResourceWindows` / `CreateBookingResourceWindow` and a Booking-owned INSERT trigger that prevents bookings outside the published window.
- Windows are **explicit one-off UTC periods up to 24 hours within 90 days**, not a weekly or country-specific recurrence engine; Web converts local device datetimes to canonical UTC. The first published window **opts a resource into availability enforcement**; existing resources remain unrestricted until their first publication, and publishing a first window that would strand any future BOOKED appointment is rejected. Subsequent windows can extend coverage; overlap is rejected.
- Existing SQL013 Booking create procedure is immutable; SQL 016 trigger participates in the existing booking transaction. Resource-row locking is preserved. Runtime app user retains only EXECUTE grants and explicit DENY table CRUD. Exact Origin, scoped K5 session and idempotency are enforced. No HR, Accounting or Cashier live data.
- [S5-A detailed design and limitations](SALON-S5-BOOKING-WINDOWS-2026-11-13.md). **28 real disposable SQL2022 + Nest HTTP Booking assertions PASS** on PR #84, including four new availability scenarios. Restricted DB-only CI migrator initially exposed incompatibility with `EXECUTE AS OWNER` trigger; fixed on PR before merge by removing dbo impersonation, and both Booking SQL CI and **Staging DB Automation restricted migrator CI passed** on revised PR head. No one executed SQL on VPS.

### B. POS DRAFT Booking service handoff

- Private POS Preview accepts optional `offeringId` untrusted query string as a convenience. Only after independently authenticated/authorized POS/Catalog GET does it validate the Offering is an active SERVICE and prepare one **unsaved** in-browser DRAFT line.
- Fresh Catalog price is server-owned at explicit eventual POS DRAFT save, never taken from URL. No automatic Booking update, POS save, charge, receipt, invoice, Treasury, GL, tax or loyalty. Existing POS DRAFT SQL and permissions are unchanged.
- [S5-B detail](SALON-S5-BOOKING-POS-DRAFT-HANDOFF-2026-11-13.md). PR #85 passed K0/K1, K5C, Demo/Web and independent Shared SQL module checks.

### C. Daily Salon operating view

- Existing private Salon Overview now supports **TODAY** (user device local date), **UPCOMING** and **ALL** filters over the last 200 already-authorized Booking records; limited counters are honestly identified as partial, not business ledger analytics.
- Only completed Booking rows expose a `Prepare DRAFT from service` link after POS Draft read **and separate POS Preview HTTP 200**, plus Web flags. The URL contains **Offering UUID only**, no customer/tenant/financial identifiers. The POS owner revalidates it (B). Booking remains separate from POS sales.
- [S5-C detail](SALON-S5-DAILY-OPERATIONS-2026-11-13.md). PR #86 passed K0/K1, K5C, Interactive Salon Demo CI, POS/Booking/Customer/Catalog SQL HTTP CI.

## Architectural fitness

Passed scoped ownership directions under ADR-017 (Shared Booking and POS, Salon only presentation), ADR-030 (server tenant scope, SQL composite key, default-deny), ADR-020 (incremental starter), SQL source migration forward-only discipline. Old `/demo/salon` stays a synthetic public UX sample; real private K5 remains OFF until authorized. **ADR-031 first financial journal and ADR-032 Business Module Activation remain PROPOSED**. Clinical/other industries can reuse Booking resource windows but not private medical records or country eligibility automatically.

## Deployment / operations — HOLD

Code PRs merged; Green Staging Deploy means **only code receiver accepted the compiled artifact** if reported by GitHub logs. **SQL 010–016 is NOT applied to VPS**, K5/paid module flags remain OFF, no real Salon accounts, no Production launch, no sale posting, no verified outside-host Backup/Restore or K5F root checklist. Restricted SQL Server 2022 CI migration is NOT staging DB deployment.

**Next safe private pilot gate:** independent offhost encrypted backup/restore, root-owned K5F security evidence, operator-approved controlled migration 010–016, explicit ADR-032 scope grants, then real private browser walk-through. No invented activation or Cashier data migration.
