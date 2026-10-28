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
