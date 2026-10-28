# Employee Ledger — V1 Logical Draft
Date: 2026-10-29. Design proposal only, not deployed schema.

## Agreed business rules
Daily accrual, monthly close; flexible salary and commission plans per employee; Branch-separate targets/commissions; tips in employee ledger; advances deducted from entitlements with correct employee/Business policy; advances for early partial payout; documented correction of historical commission/target; refunds reverse relevant earnings; Owner or permissioned Manager approves payroll. Cash shortage charge needs independent approval separate from ordinary advances.

## Entry types (proposed)
SALARY_ACCRUAL, SERVICE_COMMISSION, SERVICE_OPENING_COMMISSION, TARGET_BONUS, TIP_PAYABLE, ADVANCE_DISBURSED, ADVANCE_OFFSET, PAYROLL_PAYMENT, REFUND_COMMISSION_REVERSAL, APPROVED_SHORTAGE_RECOVERY, MANUAL_CORRECTION.

Each entry records tenant/business/branch/employee, signed amount, currency, source_type/source_id, effective_business_date, posted_at, payroll_period, rule_snapshot, created_by and linked reversal reference. Append-only; no rewrite. Separate worker net balance and outstanding advance for clear reporting.

## Recommended workflow
1. Sales event posts once, calculates service target for executor and optional opener commission for other employee.
2. Compute eligible daily accrual from versioned Business + Branch + Employee plans.
3. Tips add liability to employee ledger; payable separately via Treasury.
4. Early payout creates an advance and cash/bank disbursement; next lawful payable offsets according to Business policy.
5. Payroll closes monthly after reviewed totals; Owner/permissioned Manager approves.
6. Refund after payroll close generates linked adjustment in eligible open cycle, preserving closed run.
7. Negative balance follows configurable Business policy, not assumed to mean an automatic cash deduction.

## Guardrails
Do not double deduct early advances; ensure money movement corresponds to actual disbursement; do not deduct disputed shortages automatically; approver scope and audit record required; idempotent event processing.

## Open details
Recovery caps, employee agreements/local labor compliance, salary cycle, negative carry-forward, effective plan rules, performance target period aggregation and payment medium.
