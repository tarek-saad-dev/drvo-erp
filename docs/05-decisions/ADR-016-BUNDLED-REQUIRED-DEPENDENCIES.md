# ADR-016 — Explicit Bundled Activation for Required Module Dependencies

**Date:** 2026-10-29
**Status:** ACCEPTED — founder decision (Option A), implementation design pending.
**Related:** ADR-006 Core+Extension; ADR-007 Required/Optional Dependencies; ADR-015 independent visible Apps.

## Decision (approved)
When a user selects a Business Module whose required Modules are not yet active, DRVO ERP will show **the selected Module plus its complete Required dependency set in one activation preview**, including any prices or added charges, and seek **one explicit approval to activate the bundle together**.

- Do not force users to navigate away and manually install each prerequisite separately.
- Do not activate and charge for Required dependencies invisibly.
- Optional dependencies are distinguishable from Required ones; they are not silently included as compulsory purchases.
- The approved outcome applies to the selected Business, not all Businesses under the Tenant.
- The Module launcher still displays each user-facing Module as an independent App (ADR-015).

**Example:** User chooses POS while Catalog is inactive. Preview shows POS + Catalog, what is already active, required relationships and any applicable charges. After authorization and confirmation, the platform activates the compatible bundle.

## Not decided by this ADR
Who is authorized to approve installations, which Modules are billable, exact pricing and proration, method of settlement/charge, checkout failure policy, whether every zero-cost dependency still requires manual confirmation (bundle preview decision does require explicit approval of the bundle), and concrete dependency edges.

## Implementation guardrails — design proposal
- Compute **transitive required-dependency closure**, stable topological order and conflicting/version-incompatible modules before presenting the preview.
- Clearly show cost per module, current entitlement, total price and billing consequences; no invented prices and no prechecked paid Optional add-ons.
- Bind quote to Business, requested version(s), graph/config revision, currency, expiry and requesting actor. Re-check RBAC/entitlements/pricing/graph immediately before commit.
- Treat approval and activation as **one logical operation** with idempotency key. If activation fails partway, do not claim full success; resolve compensation/rollback for configuration and any billing claim without deleting financial history.
- Protect preexisting active Modules from accidental rollback, even if newly requested bundle fails.
- Audit request, preview, approver, priced items, activation result and failures.
- No Business-specific DB schema migration on install; platform-wide code and schema migration must already be deployed and verified.
- If dependent needs to be disabled later, prevent disabling its required prerequisite without previewing affected apps and authorized resolution.

## Test scenarios
1. POS requires inactive Catalog: one preview, one approval, separate visible apps after activation.
2. Transitive dependencies A→B→C all presented and activated in correct order.
3. Existing prerequisite is recognized as already active and never recharged.
4. Cycle, incompatible versions or conflict: nothing activated; actionable error.
5. Price or permissions changed between preview and confirmation: reject outdated approval and refresh preview.
6. Two tabs submit activation: one logical result and no duplicated billing.
7. Partial failure: no false ACTIVE status; preexisting apps and financial history safe.
8. Paid dependency: no activation or charge without explicit confirmed approval.
9. Tenant A cannot authorize the bundle in Tenant B's Business.
10. Optional module remains uninstalled unless separately selected/approved.

**Documentation only. No application code, migration or deployment authorized.**
