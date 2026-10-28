# Current state

**As of:** 2026-10-28  
**Phase:** Founder Discovery / Documentation (Phase 0)  
**Implementation:** NOT STARTED  
**Production database, staging and deployment:** NOT VERIFIED / NOT DONE

## Confirmed product direction

- Complete modular ERP as vision; staged releases.
- Medium-sized multi-branch target customers.
- Egypt and Gulf countries intended from first commercial launch, with country details pending.
- First vertical: barber salons; **second: medical clinics**.
- **Cut Salon** first real-world pilot.
- **Responsive Web / PWA** as initial mobile channel.
- **Core + Extension architecture required for each module**; technical contracts not yet finalized.
- Modular Monolith, multi-tenant architecture, standalone repository and docs source of truth.

## Next steps

1. Complete detailed MVP discovery for the barber salon pilot.
2. Resolve cross-market launch/compliance and medical clinic scope.
3. Specify extension contracts and tenant model before scaffolding.
4. Decide technology stack, environments and data strategy.
5. Define measurable acceptance criteria.

See [Open questions](../04-execution/OPEN-QUESTIONS.md) and [Roadmap](../04-execution/ROADMAP.md).

## Verification

An accepted decision is not implementation; no feature is considered tested or deployed without evidence.

## MVP discovery update (2026-10-28)

Founder submitted 20 scope preferences: target one-month first test, broad Cashier replacement ambition, Cut Salon pilot alongside legacy, online subscriptions, offline POS, booking, full HR, inventory and accounting. Scope and deadline are not yet approved as feasible. Resolve operational risks and acceptance criteria before committing to delivery. See [MVP Discovery](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Release decision update — 2026-10-28

Founder + Cursor/AI team; one-month test target flexible. **One comprehensive commercial V1** following internal QA and Cut Salon all-branch validation. DRVO is to own bookings while Cashier remains in parallel; cash-only offline sales sync later. Full journals/ledgers/balances mandatory, manual subscription collection initially (gateway deferred). These are requirements, **not implemented or feasibility-proven**. See [release strategy](../01-product/MVP-RELEASE-STRATEGY.md).


## MVP scope closure (2026-10-28)

Confirmed: existing Cut Salon booking site will call the DRVO API; offline cash sales are accepted with post-sync stock shortage review; internal testing is permitted before one commercial V1 launch. Manual accounting journal entry remains undecided until Accounting Module design. This is documentation only; no code, migration or deployment performed. [Release strategy](../01-product/MVP-RELEASE-STRATEGY.md).

## Tenancy discovery checkpoint — 2026-10-28

Forty founder answers captured and reconciled in [Tenancy Discovery](../01-product/TENANCY-DISCOVERY-ROUND-3.md). [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md) records accepted logical boundaries. Technical schema, module dependencies and several lifecycle/access rules remain open. No application code or database implemented.

## Tenancy follow-up (2026-10-28)

Approved: Manager always sees profits and service costs in authorized scope; currency/language/timezone only at Business level. Module Dependencies unresolved pending design discussion. [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md).

## Identity & Access discovery — 2026-10-28

Twelve founder responses recorded. Platform-global usernames and username/password login, tenant self-registration, explicit Business Membership, one Role per Branch, email OTP recovery and mandatory employee first-login change approved. Explicit Deny and temporary permissions remain unresolved; session revocation must be enforced server-side. [Identity & Access](../02-architecture/IDENTITY-ACCESS.md).

## RBAC matrix discovery — 2026-10-28

Founder approved scoped Owner full access, customizable Manager role, restricted manager delegation, dedicated paid-invoice void, refund thresholds, Role discount limits, self-shift vs manager shift access, closed-day reopen permission. Ten questions remain undecided. New user ID / QR-linked discount concept requires clarification and security design. [RBAC Matrix](../02-architecture/RBAC-MATRIX.md). No implementation.

## Permission and QR discovery (2026-10-28)

Allow-only + Default Deny approved; other resource/scope checks remain mandatory. QR card owner-only with extra verification approved, but intended QR function and Discount Engine behavior remain open. Continue with POS Core + Salon Extension requirements; no code implemented.

## POS discovery (2026-10-28)

First 12 POS requirements captured: mixed product/service invoice, one service executor but potentially multiple attribution recipients, optional customer except credit, immutable paid invoice, draft persistence, split tender, temporary catalog line, credit limit and open shifts. Attribution details and payment/refund specs remain open. [POS Discovery](../03-modules/POS-DISCOVERY-ROUND-1.md). No code implemented.

## POS discovery round 2 — 2026-10-28

Approved: built-in/custom payment methods, cash-plus-receivable splits, hard credit limits, partial debt collections, separate employee tips, line/custom partial refunds, refund to customer credit or payment method, executed-service refunds with reason, Manager over-limit approval, employee-specific commission plans and automatic reversal of target/commission effects. Attribution, payroll reversal period and financial day reopening remain open. [Round 2](../03-modules/POS-DISCOVERY-ROUND-2.md). No code implemented.

## POS Round 3 discovery — 2026-10-28

Confirmed shared branch treasury with separate cashier shifts, actual cash counts and manager-reviewed shortages/surpluses; manager can make audited post-payment service-attribution adjustment; offline cash sales attach to same shift; tips accrue to employee ledger; financial day can close with open shifts (warning). Founder requests cashier liability for shortages and recording surplus as sales; accounting classification, investigation and lawful recovery require design, do not treat unverified surplus as real sales. [POS Round 3](../03-modules/POS-DISCOVERY-ROUND-3.md). No code.
