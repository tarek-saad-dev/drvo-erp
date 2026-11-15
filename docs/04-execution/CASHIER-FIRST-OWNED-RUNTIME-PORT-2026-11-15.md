# Cashier -> DRVO: first executable shared Module rule ports and private POS preview

**Date:** 2026-11-15  
**Status:** **Code committed directly to `main`, tests must be reported by exact final SHA. This is not Cashier full parity, an actual main-DB migration or a verified VPS deployment.**

## Source baseline and honest progress

Cashier audited initial source `tarek-saad-dev/casher@a51101791c52bca90e45bd40ead3a46c08d78adb`. DRVO earlier unit fixtures pin `7a1d0218eec05ba541f65eaee4b665c782845704` for *specific pure* BusinessDay and Payroll functions. Current changes implement real domain library code, not merely characterization fixtures or copy/pasted legacy APIs.

| Module owner | Cashier source | DRVO implementation | Test / limitation |
|---|---|---|---|
| **Shared Operations / BusinessDay** | `src/modules/operations/domain/businessDayReconciliation.ts` | `packages/business-modules/operations/src/business-day.ts`: valid ISO day + scoped UUID guard, `NO_OP / ROLLED_OVER / OPENED_MISSING_DAY`, independent no-op/mutation planner | `tests/cashier-owned-module-port.test.cjs` compares supported inputs to actual pinned Cashier source; **NO DB writes, open/close execution or custody** |
| **Shared HR / Payroll** | `src/lib/payroll/payrollAgreementMath.ts` | `packages/business-modules/hr/src/payroll-agreement.ts`: scoped Branch Salary Agreement validation, monthly proration in **integer currency minor units**, retroactive branch-evidence difference preview | Pinned Cashier parity fixture examples, leap dates, invalid dates, cross-branch evidence and duplicate/invalid ids. **UNPOSTED_HR_PREVIEW** only; no employee master/attendance/payroll ledger payout |
| **Shared POS / Salon tip candidates** | `src/lib/pos/tipMath.ts` | `packages/business-modules/pos/src/tip-preview.ts`: hypothetical tender surplus/shortfall and revenue-ranked employee candidates by DRVO scoped UUID | Bounded integer math & candidate scope validation; **NOT_COLLECTED**, no assigned tips or settlement |
| **Private scoped POS UI/API adjustment preview** | `src/lib/sales/service-line-totals.ts` (explicit header discount model), `src/lib/pos/tipMath.ts` | `apps/api/src/pos-preview/pos-preview.service.ts` and `pos-preview.controller.ts` add `POST /workspaces/:businessId/branches/:branchId/pos-preview/adjustments-preview`; `apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/pos-preview-client.tsx` adds localized fields and visual preview | `apps/api/test/pos-preview.test.cjs` + `apps/web/test/pos-adjustments-preview.test.cjs`. **DRAFT_ADJUSTMENT_PREVIEW_ONLY**, signed session, exact Origin, Server authorized fresh scoped Catalog prices, no persistence or money received |

## Semantics and deliberate non-parity

- Sale **list price** recalculated from fresh authorized server Catalog via existing `computeListPricePreview`, which validates UUID, active offering, line quantity, currency and aggregate cap.
- **Explicit fixed header discount** supplied in nonnegative minor units (the old Cashier invoice supports value or percentage, line and header discounts). DRVO **does not yet support % or line discounts** and rejects discount larger than current subtotal rather than silently clamping it. Intended stronger operator feedback.
- **Presented amount** is a hypothetical counter value, NOT a captured/verified payment. Possible tip is `max(0, presented - afterDiscount)`, shortfall is the reverse. Refunds, approvals, tax, tip sharing/employee ledger and actual sale posting are intentionally absent.
- Existing POS DRAFT persistence stores **only original line references and quantities**, explicitly **does not store previewed discounts, presented amounts or tips**. UI resets stale adjustments on cart changes or input edits.
- This route is already behind existing K5/Catalog/POS Preview feature switches, browser Origin guard, login token and scoped Catalog permission. The change **does not** add a Public Auth permission or provide an HR privilege grant.
- Root shared module packages are pure domain functions, not yet wired to a persistent HR/Operations API/SQL implementation; the Nest POS adjustment calculation is its own authoritative module-side adaptation and UI.
- Tests include negative Tenant/Business/Branch reference checks where applicable. All external Salon P1–P7 and paid C1–C3 remain OPEN.

## Architecturally required integration to reach full functionality

1. Map Cashier employee, scheduling, paid payroll, shift/day movement persistence to per-Branch scoped DRVO SQL, and add K5 role permission and UI for HR and Operations.
2. Extend POS discount/coupon/tender flows with reviewed tax/financial policy; only integrate real sale/refund/Tip → HR/Treasury/Accounting after ADR-031 source-of-truth + safe idempotency approval.
3. Add Income/Expenses, Treasury balances, Inventory/Purchasing, Reports and rest of Cashier per [full matrix](CASHIER-FULL-FUNCTIONAL-PARITY-MATRIX-V0-2026-11-15.md); **these are not implemented by this change**.
4. Before updating the founder-approved primary DRVO dev DB per ADR-039: verify database identity, backup/checkpoint, migrations and post-change evidence; no live SQL or deploy occurred here.

**Changed code:** `packages/business-modules/{hr,operations,pos}/src/*.ts`, `tests/cashier-owned-module-port.test.cjs`, `apps/api/src/pos-preview/{pos-preview.service.ts,pos-preview.controller.ts}`, `apps/api/test/pos-preview.test.cjs`, `apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/pos-preview-client.tsx`, `apps/web/test/pos-adjustments-preview.test.cjs`.  
**No SQL files or migrations were changed.** Rollback is an exact Git revert of code/UI, no schema rollback needed. Do not claim staging/deployed behavior from a CI pass.

## Verification checklist

- Root `npm test` + `npm run typecheck` + `npm run lint` via K0.
- Nest API build and POS preview tests via K1 / triggered POS workflow.
- Next private UI build/typecheck via K5C and actual Browser+disposable SQL when triggered.
- Inspect **exact latest `main` SHA** for all relevant successful checks, not preceding intermediate direct commits.
