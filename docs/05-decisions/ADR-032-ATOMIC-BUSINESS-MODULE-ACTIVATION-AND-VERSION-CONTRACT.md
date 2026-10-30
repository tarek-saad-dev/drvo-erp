# ADR-032 — Business-Scoped Module Activation, Immutable Bundle Approval & Version Contract

**Date:** 2026-10-30  
**Status:** **PROPOSED / NEEDS FOUNDER + BILLING + ARCHITECTURE SIGN-OFF**, NOT ACCEPTED OR IMPLEMENTED.
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
