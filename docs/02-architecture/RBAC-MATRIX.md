# RBAC Matrix — Founder Discovery Round 2

**Date:** 2026-10-28
**Status:** Partial approvals; unresolved items must not become defaults.

| # | Area | Founder decision / status |
|---|---|---|
| 1 | Explicit Deny vs Allow | OPEN: requested concrete example before approval |
| 2 | Owner | Full permissions **within Businesses where explicit membership exists** |
| 3 | Manager | Permission set controlled by customizable Role; not unrestricted by title |
| 4 | Role authoring | Owner and Manager may create/edit Roles, subject to privilege-escalation safeguards (details open) |
| 5 | Manager delegation | A Manager **cannot grant a same-strength Manager Role** to another Manager; Owner required |
| 6 | Void paid invoice | Dedicated permission |
| 7 | Refund | Permission and transaction-amount threshold |
| 8 | Discounts | Discount limits vary by Role; additional user-ID/QR discount mechanism described below |
| 9 | Shift opening/closing | Cashier manages own shift; Manager may manage shifts within authorized scope |
| 10 | Reopening closed financial day | Owner and Manager within authorized scope; accounting control details open |
| 11–20 | Expenses, journal entries, payroll visibility, advances/payouts, branch stock transfers, prices, booking actions, approvals, protected permissions | UNDECIDED |

## New founder requirement — employee/user QR discount

- Each user has a unique ID; founder wants cards carrying a QR based on that ID.
- A user has a discount associated with their ID, configured by a Manager.
- Discount is applied based on the scanned/entered ID.

**Critical ambiguity:** this may mean an employee **authorizes a discount on a customer invoice**, or a user **receives a personal discount**, or both. Do not infer ownership, discount recipient, or final rates before clarification.

**Proposed safety design (not approved):** QR stores opaque revocable card token, not raw credentials / password / bearer authorization. The server resolves the user and permitted discount policy; sensitive discounts require logged-in cashier session and appropriate approval, thresholds and audit log. Physical card must not act as unrestricted login or authorization token. Record issuer, actor, recipient, amount, invoice, scope and timestamps. Prevent replay and spoofing.

## Conflicts / design guardrails

- Owner's full access is business-scoped and requires explicit membership, as previously accepted.
- Manager can create Roles but cannot self-escalate or create equal/higher privilege Managers. Formal policy for non-Manager Role creation is pending.
- Manager profit/cost visibility is always allowed in managed scope under existing tenancy decision; other Manager permissions remain customizable.
- Reopening financial periods may conflict with immutable posted journals. Define accounting correction/reversal and approval semantics before implementation.
- Cashier shift operations are own-shift only; manager authorization is scoped.
- A Role percentage limit and a QR/user-specific discount might conflict; define effective cap, priority and whether this discount is an authorization or customer benefit.
- Permission checks are server-side even when hidden in UI.

## Follow-up

Complete full permission matrix, example-driven Allow/Deny decision, QR discount purpose and model, approved workflows and accounting controls.

[Identity](IDENTITY-ACCESS.md) · [Tenancy](TENANCY-ARCHITECTURE.md) · [Open Questions](../04-execution/OPEN-QUESTIONS.md).

## Founder follow-up — Permission evaluation and QR (2026-10-28)

**Accepted:** Allow-only + Default Deny. Access requires an explicit applicable Allow grant; otherwise deny. No explicit Deny rules in approved V1 policy. Always enforce tenant/business/branch scope server-side, and do not treat approvals as implicit privileges.

**QR clarification:** founder says QR use is **different** from previously described options; purpose still needs founder explanation. Founder approves *owner of the QR card only, with additional verification* for use, but verification mechanism is open. Do not assume QR authorizes customer discounts or is a payment/identity credential.

**Discount Engine:** percentage, precedence with Role limits, recipient, rules and redemption mechanics **not decided**; require dedicated design discussion.
