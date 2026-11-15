# Reports-R1 — real read-only Barber operations projection from independent HR and Booking owners

**Date:** 2026-11-15  
**Strategic mandate:** [ADR-040](../05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md) Cashier functional migration as shared Modules + Salon extensions, using [ADR-039](../05-decisions/ADR-039-FOUNDER-TEMPORARY-FAST-DEVELOPMENT-MODE.md) direct `main` pre-customer workflow.  
**Status:** **PRODUCTION-SOURCE MODULE + PRIVATE NEXT UI CODED, real scoped disposable SQL/Nest HTTP integration PASSED, NOT actual primary DB/VPS operator acceptance, NOT complete Reports/Cashier parity.**

## Source grounding / architectural impact

Legacy Cashier `tarek-saad-dev/casher@a51101791c52bca90e45bd40ead3a46c08d78adb`: `src/app/api/reports/monthly/route.ts`, `src/lib/reports/**`, `src/app/reports/**`, `src/app/income-review/**` contain legacy income/employee/reports workflows. This DRVO subfeature deliberately delivers a **new bounded operator read-model** powered by existing HR and Booking owner data. This is NOT claimed parity with Cashier's sales, payroll, profit, monthly/annual, revenue or tax reports.

**No new SQL migration and no direct Reports reads/writes to another Module's table.** `ReportsService` injects existing `HrService.list` and `BookingService.list`. Each underlying domain independently validates authenticated K5 current session, granted **`hr.read` and `booking.read`**, Tenant/Business/Branch scope through its own scoped SQL procedures; both required or entire report is denied. No implicit Manager or Owner bypass, no Public Auth, no customer PII, no finance posting. New feature flags `DRVO_REPORTS_ENABLED=YES` for Nest and `DRVO_REPORTS_WEB_ENABLED=YES` for private Next; both default **OFF**, plus existing K5/HR/Booking requirements. Release grants remain independently gated.

## Implementation details

- **Nest Reports owner:** `apps/api/src/reports/reports.service.ts` exposes `buildBarberOperationsReport` pure aggregation and `ReportsService.barberOperations`, typed `state: READ_ONLY_BOOKING_SAMPLE`. `apps/api/src/reports/reports.controller.ts` hosts `GET /workspaces/:businessId/branches/:branchId/reports/barber-operations`, `Cache-Control:no-store`, K5 actor identity. Wired in `apps/api/src/app.module.ts`.
- **Data semantics:** HR's active, assigned, **bookable** Employee+SalonBarberProfile references one Booking `PERSON` resource; Booking supplies up to latest **200** scoped appointments from SQL001–017. Tally `BOOKED/COMPLETED/CANCELLED` per mapped employee/resource, separate unassigned resource counts. No amounts, sales, revenue or commissions computed; no customer contact/name output. The source limit (200 HR roster + 200 Booking rows) is explicitly returned, `mayBeTruncated` warns if either hits 200. **Totals are not asserted to be business-wide or period-complete.**
- **Private Next UI:** `apps/web/src/app/workspace/[businessId]/[branchId]/reports/page.tsx` + `reports/reports-client.tsx` show branch KPIs, per-barber table and status filter, bounded-sample warning; verified K5 logged-in account, separately authorized workspace and exact-case-insensitive canonical branch scope. Workspace Home only links to Reports after authenticated reports API `200`. UI uses no payments, private browser storage or write method.
- **Safety:** strict canonical 5-group UUID validation API + Web, duplicate Employee/Booking/ref denial, fail-closed on unrecognized Booking status, independent HR/Booking permission and approval. No new DB table, no open POS/Accounting permission, no customer data copied.

## Verification (source and disposable CI)

- `apps/api/test/reports.test.cjs`: sourced groups by resource; counts, no PII/finance; mixed UUID case, malformed ID, duplicated resource, 200-row cap, default OFF, independent HR/Booking scope and denied-source behavior.
- `apps/web/test/reports-workspace.test.cjs`, wired in `.github/workflows/k5c-private-ui-ci.yml`: Web flags, canonical Business/Branch UUID, independently checked K5 scope, private route OFF returns 404, no write or browser storage.
- `tools/hr/verify.cjs`: additional **actual isolated SQL Server 2022 + Nest HTTP** checks seeded with synthetic Catalog Service, Customer, BOOKED appointment and actual HR Barber profile; performs GET read-model, verifies booked=1, no PII/finance, denies foreign/unassigned Tenant/Business/Branch and revoked `booking.read` despite `hr.read` still granted. No SQL migration beyond 018.
- **GitHub [HR SQL/HTTP CI](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43670019617) SUCCESS** on exact `main@3778012497b9ffbf26360de8fdb4b3b948aeccf3`; includes API unit and real SQL. Next/K5C source regression is verified separately on prior `795aa81e` (K5C **SUCCESS** after correcting Reports Web UUID). Verify **latest docs-only final `main`** K0/K1/Artifact separately before reporting all green.
- S13 *actual Chrome private HR create & Barber linkage* was added earlier in the independent Salon Browser CI, **its result must NOT be presumed while in_progress**; this Reports slice does not extend that Browser test or claim verified live site.
- Any GitHub Staging Deploy workflow success is **NOT proof of deployed root K5F/external live private UI/actual main DB**.

## Not implemented / follow-up

Cashier full Reports parity, monthly P&L, sales by tender, Treasury/Expense ledger reports, salary/commission by employee, stock cost, customer recurrence, authorized report-only role design and complete pagination need their own domain/evidence. Financial posting and paid collection must not be inferred (ADR-031 undecided). SQL018 primary dev DB, actual VPS release/backup, public real customer Pilot P1–P7 and commercial C1–C3 remain unverified/OPEN.

**Files:** `apps/api/src/reports/{reports.service.ts,reports.controller.ts}`, `apps/api/src/app.module.ts`, `apps/api/test/reports.test.cjs`, `apps/web/src/app/workspace/[businessId]/[branchId]/reports/{page.tsx,reports-client.tsx}`, workspace Home navigation/page, `apps/web/test/reports-workspace.test.cjs`, `.github/workflows/k5c-private-ui-ci.yml`, `tools/hr/verify.cjs`. No new SQL migration, production grants or persisted Financial transactions.
