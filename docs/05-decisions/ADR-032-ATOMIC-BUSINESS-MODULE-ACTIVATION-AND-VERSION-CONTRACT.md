# ADR-032 — Business-Scoped Module Activation, Immutable Bundle Approval & Version Contract

> **2026-11-14 DECISION UPDATE — FOUNDER-ACCEPTED V1 BASELINE (ACT-01–ACT-07 ONLY):** [Founder/Billing/Security ACT-01–ACT-07 decision packet](../04-execution/ADR-032-FOUNDER-DECISION-PACKET-2026-11-12.md) documents the V1 choices approved on 2026-11-14 and links the [SaaS Commercial Core staged engineering plan](../04-execution/SAAS-COMMERCIAL-CORE-ENGINEERING-GATES-2026-11-12.md). Founder explicitly accepted the seven V1 principles, **NOT** commercial prices, tax, collection procedure, billing operator access, detailed roles, payment/entitlement mutation, Public Auth, VPS migrations or production readiness.

**Date:** 2026-10-30  
**Status:** **FOUNDER-ACCEPTED V1 BASELINE — ACT-01 through ACT-07 (2026-11-14).** Finance/security policies, physical activation schema, paid billing/entitlement mutation, operational release and full ADR-032 signoff are **OPEN**. No live implementation/activation authorization beyond SC-0/SC-1 read-only PRs.
**Scope:** Foundation Review FND-03 P0 (activation concurrency), FND-05 P0 (extension/version compatibility), FND-09 P1 (entitlement/visibility).
**Related accepted decisions:** ADR-006, ADR-007, ADR-015, ADR-016, ADR-017, ADR-019, ADR-020, ADR-021, ADR-029.
**Blueprint:** [Activation & Dependency Contract](../02-architecture/MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md), [50 Adversarial Tests](../02-architecture/MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md).

## Problem
The SaaS must allow any Business, from one-person shop to large Enterprise, to add Modules/Extensions over time without forking the system, billing invisibly, breaking Required dependencies, destroying historic data or exposing data across Tenants. Platform code release is global whereas Business activation and payment are scoped. Multiple concurrent actors, changing quotes, mid-flight failures, suspended entitlements and version upgrades create material correctness risks.

## What founder already approved (not a new proposal)
- Every Module supports Core and bounded Extension points; Required/Optional dependencies and conflict checks.
- One preview of selected Module + full transitive Required closure with **all applicable charges**, followed by a **single explicit approval** (ADR-016).
- Each authorized activated user-facing Module is an independent App tile (ADR-015).
- Recommended, customizable Industry Starter; progressive optional additions to existing Businesses (ADRs 020/021).
- Shared/independent Domain Module boundaries by invariant, not one per customer or industry; no unauthorized arbitrary customer plugin execution.

## Proposed architecture decision requiring sign-off
1. All activation requests produce an immutable, versioned, Business-scoped `ActivationPlan` and `ActivationQuote`; preview explicitly separates deployed/active prerequisites, new Required modules, optional additions, incompatible items, exact billing/currency/recurrence and how consent binds to plan+quote revisions.
2. Activation Coordinator **revalidates** fresh scope/role, release graph, version/extension compatibility, price/expiry, paid entitlement/grant and required dependencies at commit. A materially stale plan requires fresh preview and approval.
3. Concurrent mutations of the **same Business** use a transactional revision/CAS or bounded serialized graph mutation protocol and immutable idempotency key+payload hash; unrelated Businesses need not share a global lock.
4. A logical activation bundle is complete only when all required newly initialized Modules are truly ready and authorized; no dependent App may become ACTIVE with a failed prerequisite. Existing active modules/data never rolled back by unrelated failed activation.
5. An **external payment provider or manual collection is not atomically committed with SQL**, so approval ≠ payment settlement ≠ entitlement granted ≠ Module ready. Use explicit pending/repair/credit workflows, audited billing ledger and idempotent callbacks; do not promise impossible exactly-once remote charge.
6. Disabling a Required prerequisite with any ACTIVE dependent is **blocked by default as a proposed safety-first V1 behavior**; future explicit safe cascade/preview or approved downgrade rules may replace it. Financial posted history and mandatory reconciler cannot be turned off as ordinary billable UI.
7. Module release/migration precedes Business activation. Support compatible versioned Core/Extension/Event/Solution references, supervised migration/rollback and deterministic extension hook conflicts. No runtime downloaded customer code or customer-specific schema forks.
8. Enforce Tenant/Business RBAC + entitlement at **server command time**, not solely at App Launcher. Test with direct API, workers, caches and support accounts and finance provenance.

## Unresolved before adoption
- Exact release manifest and Salon recommended Module graph/price; whether Catalog/Accounting/Treasury app tiles are required or platform-protected features.
- Roles for Business-paid installation (Owner or specifically privileged Manager), manual payment proof and verification, refund/proration/downgrade/expiring plan semantics.
- Physical implementation of business graph CAS/locks, atomic initialization vs staged activation, final lifecycle enums and deactivation policy.
- Core+Extension hook deterministic ordering, API version compatibility, cross-version event schema handling and grandfathering old Business configurations.
- Actual observed capacity/latency under multi-Tenant concurrent activations, security isolation, rollouts and backup/restore. No benchmarks run.

## Outcome
**Recommendation:** versioned immutable Business-scoped plan/quote, exact one-bundle consent, per-Business concurrency guard, idempotent replay, verified entitlement and protected historical/domain correctness; don't let `ACTIVE` represent a partially paid/partially configured app.

**Not an acceptance:** this proposal does not silently decide approver role, billing/tax policy, initial Salon starter contents, financial Option A/B (ADR-031) or implementation start. FND-03/FND-05 remain OPEN until explicit adoption and security/billing proofs; app code/SQL/production not authorized.


## Founder-confirmed V1 baseline — 2026-11-14

The founder **explicitly approved ACT-01–ACT-07 only**, based on [decision packet](../04-execution/ADR-032-FOUNDER-DECISION-PACKET-2026-11-12.md), with the following bounded outcomes:

1. **ACT-01 — Business scope + release/eligibility first.** Trusted authenticated Tenant/Business scope; DRVO-reviewed/deployed compatible Module release and independently verified country/industry support before any future activation. K6C candidate metadata is NOT a released Module.
2. **ACT-02 — Immutable exact full-bundle preview.** All transitive Required prerequisites, itemized applicable prices/tax/currency/recurrence/limits and chosen Optional items; one explicit approval of that entire exact, current quote. Unknown prices or eligibility **must fail closed**, not silently become free.
3. **ACT-03 — Separate financial truth.** `APPROVED` ≠ verified collection ≠ commercial Entitlement ≠ Module `ACTIVE`. Independently verified DRVO collection/evidence is required before paid entitlement; specific payment evidence/checkers/refunds remain Finance/Security decisions.
4. **ACT-04 — Concurrency and idempotency.** Per-Business revision/CAS or scoped lock and key+payload hash; stale quote or permission means fresh preview/approval, never duplicate billing/rights.
5. **ACT-05 — Honest lifecycle.** `ACTIVE` requires approved eligible deployed release, ready required dependencies, valid configured Business, current verified entitlement and authorized action; no partially initialized paid Module.
6. **ACT-06 — V1 paid approval: Business Owner only.** Must have current explicit Business membership/action and trusted server-side scope; a separate DRVO commercial verifier handles financial evidence. Branch Manager or support user does not acquire paid rights by role label alone. Exact actor/role permission mapping still needs Security review.
7. **ACT-07 — Safe deactivation/upgrades.** Block removal of Required prerequisites of active dependents; re-preview/reapprove material price/version changes, preserve financial/history truth.

**Authorized engineering next:** SC-0 verified **read-only** global release catalog and SC-1 **read-only** Business activation plan/quote preview, separate GitHub PRs with unit/negative tests and default OFF flags, without live published offerings. No PR may **activate**, charge, seed live Entitlements, issue paid grants, change real Users, or write VPS SQL as part of this baseline.

**Explicitly OPEN:** final price/tax/rounding/currency/recurrence/proration/trials/refund/chargeback, independent verifier evidence/audit/retention, commercial legal account ownership and separation, exact Owner action/role delegated permissions, compliance eligibility per country/industry, CAS physical SQL protocol, recovery states, offline and worker semantics, Owner post-expiry read/access, RLS, ADR-031 merchant ledger policy, K5F/offhost backup and migrations 010–017. **No false claim of Billing or production approval.** The 2026-10-30 “Proposed” section above is the historical proposal; this section records the later *bounded* accepted baseline.
