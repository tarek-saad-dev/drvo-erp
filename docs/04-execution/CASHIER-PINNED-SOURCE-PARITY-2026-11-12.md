# CU-1 — Cashier pinned-source parity proof (2026-11-12)

**Status: GitHub review PR; test-only, not production parity or imported runtime code.** Founder authorized continuing the independent Cashier reuse workstream. Source revision: [Cashier 7a1d0218](https://github.com/tarek-saad-dev/casher/tree/7a1d0218eec05ba541f65eaee4b665c782845704).

## Source provenance and execution

Two **verbatim pure source snapshots** are kept under `tests/fixtures/cashier/` (not DRVO apps/modules):
- [BusinessDay source](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/modules/operations/domain/businessDayReconciliation.ts) — Git blob `e86e49fa7dea5f871c305d250622dea6f4d0fd0f`
- [PayrollAgreement source](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/lib/payroll/payrollAgreementMath.ts) — Git blob `9cc11108ffcfc1dcbe80a3574c37c8d15279f9ec`

`tests/cashier-pinned-source-parity.test.cjs` verifies the **exact Git blob identities** of the pinned snapshots, transpiles the fixture-only TS using the pinned project TypeScript compiler, runs pure exports in a restricted test VM (no runtime imports), then evaluates the original Cashier behavior. No Cashier SQL, network, sessions, PII or production dependencies are involved. No mutable source checkout at CI time.

## Findings and bounded compatibility

1. **Business Day:** seven supported scenarios (same day, before/after rollover, future, no open day, long gap) match an independent DRVO characterization candidate. Invalid dates intentionally diverge: legacy pure planner does not validate date values; proposed DRVO guard rejects them. The candidate remains test-only and is NOT adopted as an active Shift/BusinessDay module.
2. **Payroll:** real Cashier functions are executed for full/partial month and leap-year examples, retro-branch impact and invalid date rejection. These are **golden observations only**, not parity with a DRVO HR implementation; none exists. Financial precision and branch ownership must be redesigned before port.
3. **Explicitly not covered:** financial salary rounding at every boundary, DST/branch calendars, real payroll table effects, Booking SQL concurrency, production runtime behavior, all legacy combinations and multi-Tenant isolation. Passing tests do not certify the new ERP.

## Next independently reviewed slices

- CU-2: add scoped synthetic legacy-ID map design plus sample ETL import/reconcile with no live writes, guarded by data ownership and privacy review.
- CU-3: after HR/Shift domain specifications and finance policy, port the first **owned** pure rule + extensive parity/negative tests (including two-currency minor-unit arithmetic).
- Read [original reuse audit](CASHER-REUSE-DISCOVERY.md), [PL-1 POS preview track](https://github.com/tarek-saad-dev/drvo-erp/pulls), and ADR-030/031/032.

**No changes to Cashier production; no customer data, live ETL, SQL, public auth, flags or VPS work.**
