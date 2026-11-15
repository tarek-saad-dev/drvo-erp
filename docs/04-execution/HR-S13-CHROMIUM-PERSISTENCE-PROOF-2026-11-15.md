# HR-S13 — private Chromium employee + barber profile persistence proof

**Date:** 2026-11-15  
**Status when authored:** **SOURCE COMMITTED TO MAIN; verify exact CI result before claiming browser proof PASS.**  
**Scope:** only disposable SQL Server 2022 + synthetic K5 Scheduler/Staff + Next/Nest at CI loopback HTTPS; **not VPS, actual primary DRVO DB, external customer onboarding or a validated live UI deployment**.

## Implementation

- `tools/booking/verify.cjs` uses **SQL001–018 only when both `CI` and `BOOKING_BROWSER_DISPOSABLE=YES` test setup**; regular shared Booking SQL test continues to use SQL001–017 and is not affected by HR rollout. Synthetic Scheduler/Owner-like role gains `hr.read`, `hr.manage`, `salon.barber.manage` **only in disposable browser CI**; synthetic Staff gets **hr.read only**. No real permissions granted.
- `tools/salon-browser/run.cjs` and `.github/workflows/salon-browser-disposable-ci.yml` enable `DRVO_HR_WEB_ENABLED=YES` only inside isolated test Next process; `tools/booking/verify.cjs` enables `DRVO_HR_ENABLED=YES` only in test Nest child.
- `tools/salon-browser/hr-operations.cjs` called from `check.cjs`: actual private Chrome UI creates an active `PERSON` Booking resource, creates synthetic HR Employee with valid Cashier-derived EmploymentType/PayrollMethod and unique code, selects that PERSON resource in HR UI, activates the Barber profile, reloads the browser and asserts persisted state.
- Separate independently authenticated Staff session reads persisted HR roster + active Barber profile but **cannot POST employee create or modify Barber**, and original S12 verifies foreign-Tenant Salon denial and anonymous sign-in.
- All requests go through loopback-generated HTTPS `drvo-ci.test` → real compiled Next → K5/Nest → **disposable** SQL; this is not a mocked API, frontend static check or fake-only public demo.

## Proof checklist

- Source regression tests: K0 Foundation, K1 Runtime and DevOps Staging Artifact.
- Reused Shared Booking SQL API HTTP CI: stable 001–017 regular mode.
- **Salon Private Browser + Disposable SQL CI**: exact-main-SHA success is required before marking S13 proven. Logs must show completion of Browser step; no inference from status `in_progress`.
- Independently approved live operator P1–P7 and full Cashier HR/source parity remain OPEN. DB 018 actual primary execution has not been verified.

## Remaining

Employee edit/archive, attendance, scheduling, salaried/commission plans, Treasury/Accounting payout, real permissions rollout and public external salon access are not present. Future modules must not bypass domain ownership, tenant isolation or ADR-031.
