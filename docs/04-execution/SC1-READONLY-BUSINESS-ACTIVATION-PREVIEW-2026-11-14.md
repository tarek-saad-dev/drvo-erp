# SC-1 — Business-scoped read-only activation and quote-preview boundary

**Date:** 2026-11-14 · **Status:** stacked engineering PR; **NOT** an approvable commercial quote, active Module, settlement, or entitlement.

## Architecture impact and ownership

- ADR-032 **ACT-01–ACT-07 V1 baseline accepted**. Detailed V1 tax, prices, currency conversion, proration/refunds, commercial verifier policy, published releases, country eligibility, live Business graph/entitlement state and K5F gates remain OPEN.
- No separate service, schema or Salon fork. This is a pure **Lean Kernel** numerical/dependency planner plus a scoped, private K5-authorized Nest read-only API. SC-0 reviewed release-evidence registry is its prerequisite.
- Uses **existing K6A/K6B deterministic Required graph algorithm** only after SC-0 release evidence is trusted, to compute complete transitive Required dependencies; existing active prerequisites are shown but never recharged in the technical simulation; Optional add-ons never silently included.
- This version deliberately permits a priced calculation only under the strongly typed **`provenance: SYNTHETIC_CI_ONLY`** source; outputs are tagged **SIMULATION_ONLY, approvable=false**. It never produces an immutable approval hash, real quote expiry, signed price, payment state, entitlement, activated Module or actual customer onboarding.
- Rejects missing/unreleased/ineligible target or prerequisite, untrusted/missing Business scope or graph revision, unknown active Module, missing price/tax evidence, mismatched currencies/billing periods, invalid/duplicated price evidence and unsafe arithmetic. Money represented as integer minor units; no fabricated zero-price substitution. No mixed recurrence/currency totals.

## Real private API, intentionally unquotable

`GET /api/workspaces/:businessId/branches/:branchId/modules/activation-preview?moduleKey=Booking`

- Requires **both** `DRVO_K5_AUTH_ENABLED=YES` and **new default OFF** `DRVO_SC1_PREVIEW_READ_ENABLED=YES`.
- K5 HttpOnly session actor, live `branch.read` Tenant/Business/Branch authorization, strict Module key, `Cache-Control: no-store`; wrong Business/Branch is denied.
- Returns `{status:"UNQUOTABLE",moduleKey:"Booking",approvable:false,reasonCodes:[NO_VERIFIED_RELEASES,BUSINESS_MARKET_UNVERIFIED,PRICES_NOT_APPROVED,BUSINESS_ACTIVATION_STATE_UNVERIFIED]}`. No price/quote, no data read from untrusted catalog or route-supplied country. **No POST, approval, charge, entitlement, activation, subscription or role grants.**
- Why always UNQUOTABLE for real API now: no approved global publisher/release or signed commercial price source, the SQL Business model has no authoritative market+graph revision/licensed active state, and Finance has not signed tax/refund/verification requirements. Test fixture amounts are never installed in runtime.

## Verification and handoff

- Pure kernel tests: full A→B→C closure, deterministic sorted lines, all new line fees + explicitly provided tax, existing active prerequisite shown without rebilling, optional exclusion vs explicit inclusion, unsupported market, fabricated active, missing/invalid prices, currency/interval collision, huge number overflow, duplicate source, inconsistent Business scope, conflicting active releases.
- API unit tests: default OFF before touching auth/DB, explicit 404 cross-scope, invalid key, unauthenticated/forged K5 session boundary and no actual price/approval claims.
- K0 root test/lint, K1 API test/build and existing K5/Catalog/Customers/Booking regressions should PASS on the exact PR head.
- Feature PR **stacked on SC-0 PR #104** until SC-0 is reviewed and merged. After SC-0 merge, retarget SC-1 to `main` and review isolated diff before merging. Do not merge SC-1 first.
- No SQL migrations added, no VPS SQL 010–017, no actual Public Auth, country, price, paid grants or production feature-flag changes. **SC-2 owner approval/payment verification and SC-3 mutation coordinator remain NOT AUTHORIZED.**
- Rollback before any real data: revert PR; no SQL changes or entitlement state to reverse.

## Next authorization/verification gates

Before any real commercial preview or SC-2/SC-3, separately approve Finance-backed versioned Price Catalog with correct currency/recurrence/tax and evidence/expiry, verified Business industry/country and revision/active rights, independently signed published release deployment compatibility, exact paid Owner action checks, K5F operator/security and off-host backup restore. ADR-031 financial source-of-truth stays separate for merchant sales.
