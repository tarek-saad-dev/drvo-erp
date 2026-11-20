# HR-01 Employees admin UX (private Light) - source-tested only

Date: 2026-11-20. Branch `feat/cashier-hr-admin-ui-20261120` from `origin/main` 6b9c515. Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`.
Cashier reference read: `src/app/admin/hr/page.tsx` (main tabs, KPI strip, job filter, active/inactive employee tabs), `src/components/hr/EmployeeLedgerPanel.tsx`, `EmployeeTargetSettingsModal.tsx`.

## Landed (apps/web only; no API route, no SQL, no `db/migrations`, no inventory module changes)
- `.../hr/hr-client.tsx`: tabs `employees | ledger-preview | target-preview` (mirrored to `?tab=`, unknown values fall back to `employees`), KPI strip (total/active/inactive/barbers/freelance), search (code/name/Booking resource name), status tabs (active / inactive-archived / all), employment, payroll and barber filters, collapsible create form, per-row barber enable/disable with Booking PERSON resource, `TOP(200)` truncation warning. Create/barber keep Idempotency-Key + Origin checked server side.
- `.../hr/hr-admin-model.ts`: pure filters/KPIs/money-percent parsing and strict request builders that mirror the API bodies (no fetch, storage, clock or randomness).
- `.../hr/hr-ledger-preview-panel.tsx`: draft ledger rows live only in React state and are POSTed to the existing `ledger-preview`; shows per-employee buckets, liquidity and an advance/repayment proposal. Response is rendered only if `state=UNPOSTED_HR_LEDGER_PREVIEW`, `persisted=false`, `financialPostingState=NOT_AUTHORIZED`. Payout button is disabled `BLOCKED ADR-031`. The ledger tab only offers active roster employees.
- `.../hr/hr-target-preview-panel.tsx`: progressive MTD tiers -> existing `target-preview` (day delta = MTD target - prior MTD target). Preview only.
- `apps/web/src/app/drvo-light.css`: tabs/KPI/filter styles.

## Tests
- `apps/web/test/hr-admin-ui.test.cjs`: transpiles and executes the pure model (filters, tabs, money/percent, request bodies, safe-preview gate, ledger reason vocabulary equals `ledger-policy.ts`) and asserts source contracts (no browser persistence, no archive/payout/payroll/treasury call, preview panels carry no write key).
- `apps/api/test/hr-admin-ui-contract.test.cjs`: roster returns inactive rows unfiltered; UI-built bodies (every offered reason/direction) are accepted by `previewLedger`/`previewTarget`; HR controller still exposes exactly five routes (no archive/payroll/payout route).
- Existing `hr-workspace`, `hr`, `hr-ledger-preview`, `hr-attendance` suites unchanged and green.

## Hard limits / honest gaps
- No persisted ledger, payout, payroll posting, cash movement or Treasury link (ADR-031). Ledger/target tabs are calculators.
- Archive/reactivate is NOT implemented: `core.HrEmployee/HrEmployeeBranch.IsActive` exists but no write procedure does; adding one needs a new migration (out of scope here). The row button is disabled and the inactive tab is read-only. HR-01 stays `PORTING`.
- Not ported from Cashier HR-01: employee profile edit (WhatsApp/job type/English name), schedule (`branch-schedule`), compensation / advance-revenue category mapping, portal accounts, job-type filter (DRVO has no job-type field), bulk delete, branch transfer.
- Roster read is `TOP(200)` with no server paging/search; filtering is client side.
- Browser, data and pilot proof OPEN. `next build` not run in this worktree (node_modules junctioned from sibling checkout); `tsc --noEmit` for apps/web and apps/api build pass.
