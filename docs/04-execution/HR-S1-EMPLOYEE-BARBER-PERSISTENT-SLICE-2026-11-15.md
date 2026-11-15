# HR-S1 — Shared HR Employee + Salon Barber extension persistent vertical slice

**Date:** 2026-11-15  
**Decision context:** [ADR-040](../05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md) full Cashier target and [ADR-039](../05-decisions/ADR-039-FOUNDER-TEMPORARY-FAST-DEVELOPMENT-MODE.md) direct-main internal iteration.  
**Source:** [Cashier `a5110179`](https://github.com/tarek-saad-dev/casher/tree/a51101791c52bca90e45bd40ead3a46c08d78adb) `src/lib/hr/employee-hr-model.ts` and `src/app/api/employees/route.ts` (EmploymentType `full_time/part_time/freelance`, PayrollMethod `hourly/daily/monthly`, reject freelance monthly), plus `src/app/api/barbers/**` and `src/app/api/services/[id]/barber-durations/**` as still-to-audit extension candidates. This is **partial semantics**, not copy of Cashier Employee table or full HR source behavior.

## Product slice actually coded

1. **HR Core Business Employee record**: `core.HrEmployee` with immutable synthetic-friendly EmployeeCode, name, employment/payroll classifications and active flag; scoped to Tenant+Business; `core.HrEmployeeBranch` with explicit Branch assignment and composite foreign keys. Currently create+list only; no edit, archival, attendance or payroll posting.
2. **Salon Barber Extension**: `core.SalonBarberProfile` associates an assigned active employee in one Branch with one current **active PERSON BookingResource** in the same Tenant/Business/Branch. Bookable profile must have ResourceId; a filtered unique index prevents assigning one active resource to two barbers; `core.SalonBarberMutation` stores authorized actor and idempotency key for profile updates/retries. No writes to Booking's Resource owner.
3. **K5 Nest API**: `GET /workspaces/:businessId/branches/:branchId/hr/employees`, `POST /.../hr/employees`, `POST /.../hr/employees/:employeeId/barber`. Verified K5 token/session, current role permissions `hr.read`/`hr.manage`/`salon.barber.manage`, exact HTTPS Origin for POST, UUID and payload validation, scoped stored procedures ONLY; no anonymous, broad admin, or unscoped direct table permissions. Separate `DRVO_HR_ENABLED=YES` gate.
4. **Private Next Web**: `/workspace/[businessId]/[branchId]/hr` gated by `DRVO_K5_WEB_ENABLED=YES` **and** `DRVO_HR_WEB_ENABLED=YES`. Employee creation fields and current branch roster, barber binding dropdown populated from separately authorized Booking Resource `PERSON` list, permission-checked Workspace home link, stable Idempotency-Key retries. No real payroll/financial operations.

**SQL source:** `db/migrations/018_hr_employee_salon_barber.sql`. Additive; no data seeding, no change to historical SQL001–017; runtime principal is DENY table DML/SELECT and GRANT EXECUTE on owner-checked routines. Historic P4 post-017 report is intentionally frozen at 017; `tools/staging-readiness/manifest-plan.cjs` now validates full filename sequence while returning only the independently reviewed 001–017 prefix. **This is not authorization to apply 018 on the VPS**.

## Real automated evidence / limitations

- `tools/hr/verify.cjs` runs **actual disposable SQL Server 2022 + compiled Nest production API + authenticated HTTP**. Fresh SQL001–018, reapply unchanged checksums, no employee seed, SQL cross-tenant composite FK negative, denied direct SQL principal table access/internal assert proc, absent session denied.
- Actual HTTP: anonymous denied; authorized Employee create + list persists; exact replay does not duplicate; changed replay/code uniqueness rejected; freelance/monthly rejected; forged Tenant and foreign/unassigned Branch denied; cross-site Origin denied; forbidden ROOM/foreign resource denied; same booking Resource cannot be actively assigned to two Employees; branch role permissions and revoked session deny subsequent requests.
- `apps/api/test/hr.test.cjs` checks fail-closed off-by-default and invalid payload/scope, no SQL accessed; `apps/web/test/hr-workspace.test.cjs` checks correct scoped UUID and private UI contracts; Web and API compile via K1/K5C.
- **SQL+HTTP HR CI at source+test `0a71186a50a7289ac2c33e501bc4b67bf5715998`: PASS**. Subsequent `797a72f8c395f2170be4fc7e167e8ed5b8bb21e9` fixed independent source/SSR tests and at that revision K0/K1/K5C all PASS. Check latest final documentation HEAD CI before claiming final all-green.

## Current actual vs remaining

**WORKING IN DISPOSABLE CI:** HR employee create/list, branch assignment, barber connect/disable to an existing PERSON Booking Resource, role-restricted SQL+HTTP, private Web build and UI source tests.  
**NOT YET IMPLEMENTED:** employee edit/delete/archive/reassignment, attendance/check-in-out, weekly HR schedule, multiple branches for one Employee via authorized UI, HR salary/rates persistent, payroll run/target/commission, tip EmployeeLedger, payout, POS Posted, public booking, fully normalized migration from legacy IDs, complete legacy Cashier HR parity.  
**NOT PROVEN/EXECUTED:** primary DRVO database migration, live VPS deployed release, trusted operator K5F/backup/restore, external private Pilot/P1–P7 or paid SaaS/C1–C3. No real employees, phone numbers or payroll information copied.

## Next implementation handoff (prioritized)

1. Recheck latest commit CI and resolve red jobs; ensure no operator gates accidentally changed.
2. On source side: add **employee effective-dated rate/salary contracts and attendance/shifts** after reading current Cashier HR sources and pricing policy; keep posting/payout disabled.
3. Extend Barber eligibility/service and schedule mapping through Booking owner contracts, with active slot availability and integration tests.
4. Resume other independent owner modules POS/Treasury/Expenses and cross-module reports. Cashier parity is a long-running per-feature evidence matrix, not guaranteed by source file duplication.

**Rollback:** revert additive 018 only if unapplied; if previously applied, avoid destructive table drops and use separately reviewed restoration plan. No DB change was made by this GitHub documentation/code operation.