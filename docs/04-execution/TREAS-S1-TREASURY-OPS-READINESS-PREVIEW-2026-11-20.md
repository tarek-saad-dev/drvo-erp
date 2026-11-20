# TREAS-S1 Treasury / Operations movement filters + day-close readiness + handoff plan (non-posting)

Date: 2026-11-20. Branch `feat/cashier-treasury-movements-20261120` (from `origin/main` `8bc3be3`). Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`.

## Landed
- `_cashier_source/operations/` and `_cashier_source/treasury/` gained byte-exact, git-blob-locked excerpts of the pinned Cashier files: `shiftOwnership.ts` (`42b64d15`), `shiftOperationalGate.ts` (`ab056c07`), `viewOperationalState.ts` (`9b6f06bc`), `handoffShiftSession.ts` (`55b380f4`), `closeBusinessDay.ts` (`0f6a7fb3`), `liveCashMoveSql.ts` (`dc5184f7`), `treasuryGroupDailyTypes.ts` (`3a5ff62b`), `treasuryGroupDailyService.ts` (`884c3765`). The earlier `invariants.ts` / `treasuryCashMoveFilters.ts` excerpts were lossy (encoding drift); they are re-pinned byte-exact (`971a74e0`, `63eb2c9c`).
- `packages/business-modules/treasury/src/treasury-readiness-rules.ts` (+ byte-identical Nest copy `apps/api/src/treasury/treasury-readiness-rules.ts`): pure, NON-POSTING
  - strict movement filters (day, shift, direction, rail, currency, live/all, UTC date range) and the "live" predicate (cancelled rows never count - the DRVO analog of `liveCashMovePredicate`),
  - per-rail/currency totals with the exact SQL030 sign convention (IN adds `ToRail`, OUT subtracts `FromRail`, TRANSFER both),
  - per-shift summaries (system amount per rail, recon rails, variance),
  - day-close readiness: blockers `NO_OPEN_DAY` / `OPEN_SHIFTS_PRESENT`; warnings `STALE_BUSINESS_DAY`, `CLOSED_SHIFT_WITHOUT_RECON`, `RECON_VARIANCE_PRESENT`, `MIXED_CURRENCY_RECON_AMBIGUOUS`, `FORCE_CLOSE_SKIPS_RECON`, `EVIDENCE_TRUNCATED`; catch-up plan from the pinned planner decision table,
  - shift write gate (`classifyShiftWriteGate`, same decision order as Cashier) and handoff plan,
  - group-daily aggregation math (per currency, round2 percentages, rails sorted by net) fed one branch only.
- `GET .../treasury/ops/day-close-readiness`, `POST .../treasury/ops/movements-preview` (TreasuryOps) and `POST .../operations/shift-handoff-preview` (Operations). Flags: `DRVO_K5_AUTH_ENABLED` + `DRVO_TREASURY_OPS_ENABLED` (+ `DRVO_OPERATIONS_ENABLED` for readiness/handoff); Origin gate on POST; strict bodies validated before any SQL; only `core.Read*` stored procedures are ever executed (asserted by test). POST is only a body carrier.
- Tests: `tests/treasury-readiness-source.test.cjs` (blob locks; differential tests of the DRVO gate vs the executed pinned Cashier `classifyShiftWriteGate` over the full matrix, planner vs `planBusinessDayReconciliation`, filter vocabulary vs executed `appendTreasuryCashMoveFilters`; SQL030 formula lock), `apps/api/test/treasury-readiness-preview.test.cjs` (13 cases); workflow `.github/workflows/shared-treasury-readiness-ci.yml` (no SQL).
- Ledger: OPS-03, OPS-05, TR-06, TR-07 `SOURCE_IDENTIFIED` -> `PORTING`; TR-01, TR-02, FIN-05 rows refreshed; OPS-02 / OPS-04 stay `SOURCE_IDENTIFIED`; TR-08/09/10, POS-17, HR-04/05/07/11 stay `BLOCKED`. All browser/data/pilot/SQL proof OPEN.

## Hard limits (unchanged)
Every response carries `persisted: false`, `accountingState: NOT_POSTED`, `glPostState: GATED`, `settlementState: NO_SETTLEMENT`, `financialPostingState: NOT_AUTHORIZED`, `closeMutation`/`mutation: NOT_PERFORMED`. No day close, shift close, force-close, handoff, cash movement, recon adjustment, GL, journal or paid settlement is reachable from these routes. Rail totals are movement-derived, not true till/bank balances. **No migration**: next free number after 031 is 032 and was deliberately not consumed.

## Findings from the pinned source / DRVO SQL (kept honest)
- SQL030 shift recon sums `AmountMinor` per rail **across currencies**; the readiness preview warns (`MIXED_CURRENCY_RECON_AMBIGUOUS`) instead of silently "fixing" it.
- `CloseBusinessDay(forceCloseShifts=1)` closes OPEN shifts with no reconciliation row; Cashier documents the force-close reason as "not persisted (no column yet)". Readiness surfaces `FORCE_CLOSE_SKIPS_RECON` and the shift ids it would close.
- Cashier handoff atomically closes the user's open shift (any branch) and opens one on the target. DRVO has `UX_OperationalShift_OneOpenPerAccount` (tenant-wide) but no handoff SQL, so the plan is `CLOSE_ELSEWHERE_AND_OPEN_HERE` with `atomicHandoff: NOT_IMPLEMENTED_IN_DRVO`. The elsewhere-branch id is caller-supplied and reported `CALLER_SUPPLIED_UNVERIFIED`; trusted local evidence wins over a contradicting claim.
- Reads are bounded (200 movements / 50 shifts / 50 recons); filtering is in memory over that window and the response flags truncation. Closed days are not read (only the OPEN day), so the daily summary is `SINGLE_BRANCH_OPEN_DAY_ONLY`.
- Day dates use the UTC interim (BusinessClock branch timezone is still OPEN).

## Open / next
Tenant-wide multi-branch read (TR-06 group endpoint, partial ACL), actor-open-shift read across branches + atomic handoff SQL (OPS-03), holds model (TR-07), server-side filters/pagination, schedule-control (OPS-02) and flow-board/alerts (OPS-04) ports, UI for readiness, private browser proof, primary DB apply (SQL029/030 still unapplied there).
