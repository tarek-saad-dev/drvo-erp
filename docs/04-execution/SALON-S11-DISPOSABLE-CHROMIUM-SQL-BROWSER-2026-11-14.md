# S11 — Real private Salon Chromium browser over disposable SQL (CI ONLY)

**2026-11-14 — Engineering test; NOT P6 acceptance on the real VPS, NOT a private Pilot GO.**

## Architectural impact and reuse

The existing [Booking SQL/HTTP verifier](../../tools/booking/verify.cjs) already proves real Nest/K5 SQL Server 2022 persistence, Catalog → Customers → Booking → POS **DRAFT only**, scoped role+session revocation, Origin protection, Tenant isolation and Booking window/lifecycle behavior. This change does **not** copy business logic, create another Salon backend, add SQL migrations or change any production API/Web authorization.

A separate [disposable browser workflow](../../.github/workflows/salon-browser-disposable-ci.yml) opts into `BOOKING_BROWSER_DISPOSABLE=YES`, reuses that **same** SQL/Nest test fixture, starts production-built Next.js on loopback, and launches real Chromium against a one-run HTTPS reverse proxy. Browser test configuration uses `https://drvo-ci.test` with Chromium's forced loopback-only DNS mapping and a disposable self-signed test certificate. HTTPS binds only `127.0.0.1`. A disposable runner's unprivileged-port setting is changed **only in CI** to permit a non-root Node test gateway on 443. Neither production DNS nor real Nginx is touched.

The gateway forwards fixed paths to **127.0.0.1:3100** Next or **127.0.0.1:3403** Nest, without changing Origin or credentials. The actual K5 API exact-Origin policy is exercised with the synthetic browser origin. K5+Booking+Customers+Catalog+POS web flags are ON **in disposable CI child processes only** and stay OFF in live staging. No Public Auth or production feature flag is touched.

## Browser acceptance assertions (test-only)

1. Privileged synthetic Scheduler authenticates via real Next sign-in UI using a new K5 secure cookie; navigates /workspaces and valid Business/Branch /salon.
2. A browser reload of the private Salon Overview loads SQL-backed Booking, Customers, Catalog and separately authorized POS DRAFT count.
3. A **separate** real Staff K5 session with only `booking.read`, `catalog.read`, `customers.read` sees only allowed same-Branch summary, **no POS DRAFT counts**.
4. Same-origin Staff POST through the real Nest API returns 404 (no `booking.manage` action).
5. Foreign-Tenant/Business/Branch /salon displays denial and does not render prior Branch summary.
6. An anonymous browser is redirected to sign-in; no private data is shown.

The existing underlying SQL/HTTP harness additionally proves POST idempotency, booking conflict and cancel/complete, checkout-reload persistence, resource window rules and live role/Branch/session revocation. These are separate API tests; **not** claims that every scenario has been clicked in Chromium.

## Reproducibility and safe constraints

- Workflow is limited to GitHub-hosted ephemeral runner, SQL 2022 Docker loopback, exact `BOOKING_SQL_DISPOSABLE=YES` and `BOOKING_TEST_PORT=14342` guards, and pinned Playwright `1.56.1` browser package in test-only tool directory.
- Test generated TLS private key is file mode `0600` in `RUNNER_TEMP`; no source certificate, credentials, cookies, root env, CI private key or screenshots are committed/uploaded.
- Requires `CI=true`, refuses other SQL ports, never resolves external app host or connects to VPS, and kills spawned Next/gateway processes on exit.
- Revert the test files/workflow to roll back; no deployed code, database record, production schema or real rights have been modified.
- Require **Salon Private Browser + Disposable SQL CI** + K0/K1 PASS on PR SHA. CI failure is a blocker, not permission to relax Origin/isolation.

## Still required for actual P6 and P7

**P1** independent deployed K5F/root [#121](https://github.com/tarek-saad-dev/drvo-erp/issues/121); **P2** encrypted witnessed offhost restore [#122](https://github.com/tarek-saad-dev/drvo-erp/issues/122); **P3** external HTTPS/proxy/Origin test [#123](https://github.com/tarek-saad-dev/drvo-erp/issues/123); **P4** explicit DBA+Security+Founder-approved VPS SQL010–017; **P5** independently trusted signed released Modules/market and persistent audited scoped noncommercial Pilot Rights/worker enforcement. Only then independently run the Owner/Staff protected Browser Matrix on actual authorized staging. The synthetic Scheduler fixture is **not** a real Owner, and this CI is **not** the legally consented first Salon.

**Tracker:** [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106), 7 Private Pilot + 3 commercial gates remain OPEN. ADR-030 scope, ADR-032 ACT-01–07 limited baseline and ADR-037 Lean Kernel ownership all unchanged.
