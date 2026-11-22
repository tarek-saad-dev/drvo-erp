# ADR-042 — Cashier as interim DRVO Salon go-to-market application (Founder-approved strategy)

**Date:** 2026-11-22 (Africa/Cairo)
**Status:** **ACCEPTED — strategic product/delivery direction only; NO production/real-data/commercial release authorization**
**Owner:** Founder
**Source of approved delivery intent:** [Cashier Fast Track #333](https://github.com/tarek-saad-dev/casher/issues/333)
**Related:** [ADR-033](ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md), [ADR-040](ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md), [ADR-031](ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md), [DRVO execution #163](https://github.com/tarek-saad-dev/drvo-erp/issues/163), [owner actions #166](https://github.com/tarek-saad-dev/drvo-erp/issues/166).

## Why
Cashier already operates substantial Salon workflows while DRVO ERP's shared multi-industry Modular Monolith is not ready for real customer onboarding or paid financial posting. Rebuilding every used Cashier action before attracting any new Salon carries material time-to-market risk. However forking full ERPs per industry duplicates HR/POS/Booking/Accounting and increases security/maintenance risks. The interim path must not compromise tenant safety or erase long-term ERP investments.

## Decision
1. Prioritize **Cashier** as the *interim delivery application* to harden and offer under **DRVO Salon** branding, **after its own independent readiness evidence**. Improve Cashier Light/RTL operator UI and bug fixes while preserving high-value existing POS/Booking/Treasury/etc workflows.
2. Continue **DRVO ERP** as the authoritative **long-term multi-tenant, multi-business, multi-industry shared-module destination**, not abandon it. Keep Modular Monolith, ADR-033 Industry Solutions as composable Module/Extension configurations, and Tenant→Business→Branch ownership. Do not automatically create separate complete ERP backends for Hotels, Clinics or Retail.
3. Cashier currently has closed foundational issues for Tenant Onboarding [#48](https://github.com/tarek-saad-dev/casher/issues/48) and commercial-plan/trial/subscription model [#52](https://github.com/tarek-saad-dev/casher/issues/52), but its authoritative Tenant runtime isolation [#61](https://github.com/tarek-saad-dev/casher/issues/61) and [GA epic #60](https://github.com/tarek-saad-dev/casher/issues/60) remain OPEN. **Closed issue ≠ verified second-tenant operational readiness; do not duplicate source models or claim they are production proven.**
4. Deliver in six tracked workstreams: **stabilization, isolation, Business onboarding, free trial, paid subscription, UX/UI**. A configurable 14-day trial and a minimal paid plan are *candidates*, not approved pricing/tax/provider or active charge permission. Validate legacy mapping before promising first-class Business hierarchy in Cashier.
5. Treat Cashier and DRVO as **two independent release and financial authorities until authorized migration**. Cashier owns its live Salon/Cut financial records; DRVO nonposting DRAFT/Owner Pilot and ADR-031 restrictions remain unchanged. No automatic data sync, double posting, shared customer PII exports or direct cross-repo DB writes. Publish source pin and behavior-provenance when porting reused logic.
6. Re-baseline [#163](https://github.com/tarek-saad-dev/drvo-erp/issues/163) as **DRVO migration/architecture delivery tracking**, not as an unconditional requirement that Cashier be replaced before any first safe Cashier Salon customer. Its original 21-day replacement window remains a *historical target, not a fresh launch commitment*. Keep DRVO pilot [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) and [#166](https://github.com/tarek-saad-dev/drvo-erp/issues/166) operator gates unmodified and separate.
7. Before any real new Salon: prove two-tenant isolation end-to-end, independent recovery and safe rollback, reviewed production release/migrations, verified Auth/roles/branches, finance regression, customer privacy and support, and explicit Owner/Security/Operations GO. For paid subscription also obtain pricing/tax/terms/refunds and verified provider/payment/reconciliation approvals. **Do not equate UI or passed unit tests with launch authorization**.

## Architectural impact
- **DRVO Kernel:** no new Salon business logic, duplicate identity or entitlements.
- **DRVO Modules:** shared ownership (HR, POS, Booking, Catalog, Customers, Treasury, Accounting) continues; Cashier ports must respect existing ADR-040 source audit, scope/money/security contracts and ADR-031 posting boundary.
- **Cashier:** preserve existing CUT production writes as a single authority; harden per-Tenant/Business/Branch authorization and worker/caches/idempotency before additional customers. UI/application changes must be backward-compatible.
- **Hotels / Clinics:** remain DRVO-specific composition/extension work, not separate forked monoliths by default. Protected healthcare information requires independent review.
- **Marketing:** distinguish DRVO Salon interim supported scope from full DRVO ERP feature/industry availability.

## Exit/review conditions
Revisit this bridge once DRVO proves all **actually used** Salon P0/P1 workflows, data migration+reconciliation, recoverability, Security/Finance/Operations sign-off and one-writer Cutover. At that point select formal consolidation/migration; never promise automatic replacement based solely on code parity.

## Proof and status
- 2026-11-22 source baseline: `casher@f8fa67d2b1c8254e638cf89d95dcee75edc88598` and `drvo-erp@695f485b3b8b8b420c709fd52d378067600c075f`.
- [Cashier #333](https://github.com/tarek-saad-dev/casher/issues/333) is the implementation/checklist tracker; [DRVO #163](https://github.com/tarek-saad-dev/drvo-erp/issues/163) remains the long-term destination tracker.
- **No code, SQL schema, runtime flags, VPS activation, customer onboarding, sale/financial posting, billing provider, production deploy or cutover authorized or performed by this ADR.**
