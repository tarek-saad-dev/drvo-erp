# HR-S3 Employee ledger / advances / deductions / targets — non-posting preview

Date: 2026-11-20. Branch `fix/s13-hr-browser-k0-ledger-20261120`. Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`.

## Landed
- `packages/business-modules/hr/src/employee-ledger.ts` (+ byte-identical Nest copy `apps/api/src/hr/ledger-policy.ts`): integer minor-unit, branch-scoped, pure math for
  - ledger reason/direction vocabulary (Cashier 13 reasons; credit `adjustment` rejected on purpose),
  - per-employee summary buckets, withdrawal buckets (funding/repayment cover advances first), balance = credits − debits, outstanding advance = max(0, −balance),
  - per-employee statements with running balance (newest first), branch liquidity (cash required vs employee debt, no cross-employee netting),
  - advance disbursement / repayment preview (repayment capped at outstanding advance),
  - max inter-branch settlement and progressive MTD target tiers (basis points, one final half-up round, day delta = MTD target − prior MTD target).
- `POST .../hr/ledger-preview` and `POST .../hr/target-preview` on `HrController`: same `DRVO_K5_AUTH_ENABLED` + `DRVO_HR_ENABLED` + Origin gates, strict bodies, bounds (≤500 entries, ≤50 tiers), session/scope enforced through `core.ReadHrBranchRoster`; employees must be in the branch roster. No new flag, no SQL migration.
- Characterization: `tests/hr-employee-ledger-source.test.cjs` executes pinned Cashier fixtures (blob-checked) and compares DRVO results; `apps/api/test/hr-ledger-preview.test.cjs` covers gating, validation, roster scope, and unposted results.
- Ledger rows HR-03, HR-05, HR-07 got TargetPaths/DomainTest/Blocker text. All remain `BLOCKED` with UI/Browser/Data/Pilot proof OPEN.

## Hard limits (unchanged)
Responses always say `state: UNPOSTED_HR_LEDGER_PREVIEW`, `persisted: false`, `financialPostingState: NOT_AUTHORIZED`. No payout, cash movement, payroll close/post, persisted ledger or ADR-031 posting exists. No UI.

## Open
Persisted append-only ledger SQL (needs a free migration number after the CRM/inventory work), payout/void/monthly salary (HR-05/06/08), daily payroll generate/close/reopen (HR-03/12), target plans/versioning/recalc, late deductions, inter-branch settlement posting (HR-11), browser proof.
