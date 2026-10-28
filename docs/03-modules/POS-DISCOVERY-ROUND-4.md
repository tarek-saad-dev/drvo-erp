# POS Discovery Round 4 — Cash Reconciliation, Lifecycle and Salon Attribution

**Date:** 2026-10-28  
**Status:** Founder requirements captured; accounting controls and remaining policies not approved.

## Founder decisions

| # | Answer | Status |
|---|---|---|
| 1 | Cash shortage responsibility associated with **last employee receiving custody of the shared branch treasury** | Requested; custody evidence and shared-usage liability safeguards require design |
| 2 | Register shortage against employee, but **no deduction without separate approval** | Approved intent; labor-law and financial posting workflow pending |
| 3 | Cash surplus posted directly as **sales income**, labeled cash surplus | Founder requested; accounting treatment not approved (unverified surplus is not proven sale) |
| 4 | Closing day with open shifts: detailed Day Closing Workflow discussion first | Open |
| 5 | More than one open shift per cashier governed by Business setting | Approved |
| 6 | Offline sale synchronized after day close: retain **original sale date**, with day adjustment | Approved business intent; posting period and tax/audit design pending |
| 7 | Manager edits previously approved cash variance adjustment | Founder requested; implementation must preserve original and append audited correction/version, not silently rewrite posted entries |

## Founder-provided salon scenario — distinguish roles, not split sale

- **Mohamed** introduces/upsells the skin-care service to customer ("opens the work").
- **Youssef** actually performs the skin-care service. The service line must credit Youssef as **sole executor** and include the service in **Youssef's sales target**.
- Mohamed earns **10% opening/upsell commission** for bringing in the service. This is a distinct commission type; no instruction to give him 10% of executed-service target, and no instruction that revenue itself is split.
- Service revenue is counted **once** in POS/accounting. Separate attribution for executor target and opener incentive.
- Example if service net commission base = 300 EGP (illustrative only, unconfirmed base): opener commission = 30 EGP; service executor's separate commission plan, if any, remains independent.
- Which price base (gross/net discounts/tax/refund), eligibility, commission stacking, and adjustment behavior are not yet specified.
- The previously proposed arbitrary 70/30 revenue split is **not confirmed** and should not be inferred.

## Safety/design review

1. **Shared treasury:** last handover recipient is not automatically culpable for all shortages if others can access cash. Log handover count, time, signatures/approvals, cash movements and custody conflicts before attribution or deduction.
2. **Employee liability:** maintain pending investigation and separate approval for payroll deduction; account for local employment requirements.
3. **Cash surplus vs sales:** preserve founder request, but flag as accounting classification needing review. Prefer cash-over/short variance account then adjustment after evidence; fabricating an invoice/real sale is not permissible financial integrity.
4. **Edited approved adjustment:** managers may initiate corrections, but audit requires append-only versions/reversal, not overwriting original ledger record.
5. **Original offline sale date:** keep occurred_at and synced_at; closed accounting period treatment needs adjustment with clear effective/posting dates and immutable audit trail.
6. **Financial day vs open shifts:** warning is approved in earlier round; final/provisional closure mechanics still pending.

## Candidate module contracts (not final)

POS Core Sale/Invoice → Salon Extension {service_executor_user_id, opener_user_id, opening_commission_policy_id} → Sales Target Ledger (executor) and Commission Ledger (opener) → HR payable → Accounting postings. Avoid interpreting opener as service executor.

Shift / Treasury module: branch shared treasury, separate cashier shifts, explicit custody transfers, actual cash counts and variance review; Accounting controls on posted entries. Offline sync preserves source sale date and idempotency.

## Remaining decisions

Opening commission basis, eligibility, multiple openers, refunds, tax/discount interactions, cash variance classification, custody liability, retroactive journal corrections, day close with open shifts and offline backdated financial entries.

[Round 3](POS-DISCOVERY-ROUND-3.md) · [Open questions](../04-execution/OPEN-QUESTIONS.md).
