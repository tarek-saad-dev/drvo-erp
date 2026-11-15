# HR-S2: Cashier attendance → DRVO HR Core UTC punch sessions

**Date:** 2026-11-15  
**Status:** CODED on `main`; **[SQL2022/Nest HTTP + private Web CI PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43674411436)** on exact source SHA `5f4a3d2fa984af6ca650482e9178e4205be4f029` — 11/11 real SQL+HTTP groups, 90/90 API tests, 3/3 Web source tests and Next build/typecheck. Primary DRVO development DB and actual K5 private browser not verified; not full Cashier attendance/payroll parity.

## Source audit and architectural impact

The baseline Cashier at pinned `tarek-saad-dev/casher@a51101791c52bca90e45bd40ead3a46c08d78adb` contains:
- `src/modules/attendance/domain/attendanceSessionPolicy.ts`: distinct `ACTIVE_OPEN`, `STALE_OPEN` and closed sessions by work date; one active-open employee session globally per candidate work date; stale sessions must not be auto-closed by this rule.
- `src/app/api/employees/attendance/route.ts` and `src/modules/attendance/application/AttendanceCommandService.ts`: branch-scoped employee attendance, administrative/upsert variants, breaks, shift scheduling, BusinessDay locks, absence, payroll/late-deduction and notification dependencies.
- DRVO HR-S1 already owns `core.HrEmployee` and `core.HrEmployeeBranch` in SQL018 and the authenticated `hr.read/hr.manage` branch role policy. Salon Barber Extension only links employee to Booking PERSON resource. Reuse these HR IDs; **never create an independent Salon attendance employee table**.

This S2 **deliberately** only handles immutable UTC check-in/out sessions, NOT Cashier work-date semantics. **Strict one OPEN across all branches/dates** until a separately reviewed DRVO BusinessDay/Shift/Timezone model is implemented; an old OPEN must be expressly closed, never automatically reinterpreted as an absence or silently force-closed. This constraint is *stricter than Cashier's date-specific active/stale distinction*, transparently documented as temporary deviation.

## Delivered source implementation

- `db/migrations/020_hr_attendance_sessions.sql`: additive `core.HrAttendanceSession` FK (Tenant/Business/Branch/Employee), server-owned `SYSUTCDATETIME()` punches, unique filtered `TenantId, BusinessId, EmployeeId` when not checked out, checked-in/out actor/time. Immutable `core.HrAttendanceMutation` per branch/client request key. `core.ReadHrAttendance` / `core.RecordHrAttendance` bind to existing `core.AssertHrBranchAction` with scoped `hr.read` and `hr.manage` under transaction; direct app-principal table DML/SELECT denied, only scoped EXECUTE granted. No seeds, no Treasury/Accounting/Payroll effects.
- `apps/api/src/hr/attendance.service.ts`, `attendance.controller.ts`, `apps/api/src/app.module.ts`: production Nest GET/POST under `/api/workspaces/{businessId}/branches/{branchId}/hr/attendance`. Same-origin exact HTTPS POST only, strict body `{employeeId, action:IN|OUT, attendanceId:null|UUID}`, server-side idempotent SQL; no browser-supplied punch time or Tenant. Feature flags `DRVO_HR_ATTENDANCE_ENABLED`, `DRVO_HR_ENABLED`, `DRVO_K5_AUTH_ENABLED` default OFF. Return `UTC_PUNCH_SESSIONS_ONLY`, `NOT_CALCULATED` payroll, `NOT_LINKED` BusinessDay.
- `apps/web/src/app/workspace/[businessId]/[branchId]/hr/attendance/{page.tsx,attendance-client.tsx}`: private Light V1 list and manager check-in/out controls, Cairo timezone *display only*, bounded latest 200 branch sessions. K5/HR/HR_Attendance Web flags default OFF; HR roster links only if attendance flag ON. Business/Branch IDs resolve via already-verified K5 authenticated workspace and SQL authorization; no localStorage or synthetic persisted attendance.
- Dedicated `apps/api/test/attendance.test.cjs` (schema/body/origin/default-deny), `apps/web/test/hr-attendance.test.cjs` (private flags/UTC/permitted links), `tools/hr/attendance-verify.cjs` (disposable SQL Server 2022, full migration 001–020 replay, production Nest HTTP K5 scope, one OPEN, idempotent replay, checkout, cross-branch/Tenant deny, revocation), `.github/workflows/hr-attendance-ci.yml` (two parallel jobs), K5C private route default-404 regression.

## Critical limits / remaining work
1. No BusinessDay local-date attribution, shift scheduling, attendance correction, breaks/absence/leave, late deductions, rate agreements, tips, payroll accrual, salary calculation or paid payroll. These remain distinct Cashier parity matrix gaps.
2. No staff self-service punch without explicit HR manage permission; manager punches for assigned Branch employees only. No real external customer activation or Staff/Owner live sign-off.
3. **SQL019+020 deployment to primary DRVO development DB requires** real target verification, migration 001–018 historical checksums, independent restorable backup, reviewed scripts, authorized incremental execution, exact post-state verification and private K5/flags. No independent VPS access was granted to ChatGPT. Do not infer from CI/staging code deploy.
4. Domain truth remains HR-owned, Barber extension depends on it, no duplicate HR employee record. Cross-Branch OPEN lock implemented as filtered unique SQL index (even if the Manager has rights in more than one Branch).
5. Source and CI alone are not actual persisted operator acceptance. No financial POSTED activity or Cashier module parity certified.

## Hands-on internal acceptance target (not yet verified LIVE)
`https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/hr/attendance`

Authorized manager: open HR → حضور وانصراف → check in employee (SQL server UTC) → reload → observe OPEN → attempt duplicate in another authorized Branch (must reject) → check out → reload and observe CLOSED. Also test foreign Tenant denied and revoked role denied. Do not put real PII on public `/demo/salon`.

**Next:** HR schedules/BusinessDay and Payroll rules, separate Treasury owner and Expenses paid event only after ADR-031; Cashier attendance full UX/parity still OPEN.
