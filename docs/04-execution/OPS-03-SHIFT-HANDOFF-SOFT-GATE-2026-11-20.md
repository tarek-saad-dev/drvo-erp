# OPS-03 Cashier shift handoff soft-gate (NONPOSTING custody)

Date: 2026-11-20. Branch `feat/ops-shift-handoff-soft-20261120` (from `origin/main` `d0a5d06`). Cashier pin `046bf19` / `handoffShiftSession.ts` blob `55b380f4`.

## Landed
- Additive `039_operations_shift_handoff.sql` — `core.HandoffOperationalShift` atomically closes the actor's tenant-wide OPEN shift (any branch) and opens on the target `BranchId` + OPEN `DayId` under `operations.shift.manage` (target assert only). `ClientRequestId` idempotent. Stale `expectedSourceShiftId` / concurrent races → 51493 conflict. No Treasury / cash settlement / ADR-031 GL.
- Nest `POST .../operations/shift-handoff` (`Idempotency-Key`, Origin gate, strict body `{dayId,expectedSourceShiftId}`). Responses always `accountingState: NOT_POSTED`, `glPostState: GATED`, `financialPostingState: NOT_AUTHORIZED`.
- Private Arabic/RTL Operations UI soft handoff control on the existing day/shift page.
- Handoff plan preview (`shift-handoff-preview`) now reports `atomicHandoff: AVAILABLE_VIA_SQL039` but remains `mutation: NOT_PERFORMED`.
- Disposable SQL/HTTP cases in `tools/ops-treasury/verify.cjs` (open A → handoff B → only B open; replay; stale/concurrent 409; foreign 404; movement count unchanged). Nest unit + web source guards.

## Numbering / merge order
- **SQL038 owned by Package draft** (`038_pos_draft_package_line_snapshots.sql`). This PR ships **039 only** — no stub/placeholder 038.
- **Merge after Package 038** so K4 consecutive migrator accepts the chain. Rebase/merge when 038 lands; do not invent a reserved no-op 038.
- BusinessClock timezone table not shipped; UTC interim expected-day gate unchanged (refuse handoff if target day not OPEN; no invented paid day-lock KPIs).

## Hard limits
No ADR-031 posting, no cash settlement, no force financial close, no primary/VPS apply in this PR, no claim that BusinessClock is complete.

## Ledger
OPS-03 remains `PORTING` with SQL039 handoff + Nest/UI soft-gate; browser/primary/pilot proofs stay OPEN.
