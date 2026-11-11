# K6A Engineering Spike — Read-only Fixture Module Preview

**Recorded:** 2026-11-11
**Status:** experimental code on a review branch; NOT accepted K6 runtime implementation or a new accepted ADR.

## Why this small slice

To accelerate DRVO platform engineering without bypassing open K5 staging security gates or prematurely adopting proposed ADR-032, add a deterministic, in-memory, **fixture-only** dependency preview on the existing Kernel dependency planner. It demonstrates approved product-level requirements from ADR-007 / ADR-016: complete Required closure; Optional choices never auto-installed; conflicts and invalid graphs fail closed.

## Exactly what this spike adds

- `previewRequiredFixtureModules` takes caller-provided **non-authoritative fixture** manifests, requested keys and previously active fixture keys.
- It produces a dependency-first read-only list including manifest version, selected/required/existing reason and already-active marker, plus a list of newly needed fixtures.
- Validates fixture identifiers, duplicate keys, Required/Optional/conflict edge syntax; normalizes input order for deterministic results. Missing modules, dependency cycles and conflicts use the existing planner's rejection behavior.
- Uses pure memory only. The function never reads or mutates accounts, SQL, subscriptions, user scope, pricing, release state, filesystem or HTTP. The `Booking` examples in unit tests are **illustrative**, not approved released Salon dependencies.
- New negative/behavior tests run under the existing root `npm run verify` / K0 Foundation CI.

## Non-goals — remain BLOCKED

This is **NOT** a commercial quote, activation state machine, production release registry, approved module inventory, industry eligibility certificate, authorization engine, Tenant/Business/Branch membership check, billing entitlement or public UI endpoint.

No activation, migration, new API/worker, K5 flag, email, real Owner, VPS command or production deployment. Never bind this fixture helper to customer requests or advertise output as a payable bundle. A real preview must only be designed after ADR-030/032 scope and payment/entitlement decisions, reviewed release evidence, negative Tenant isolation tests and explicit implementation authorization.

## Architectural impact / recovery

- Kernel: one pure fixture function exported from `packages/kernel/src/index.ts`. Reuses existing `module-planner.ts`; no new dependency on domain Modules or apps.
- Contracts: no new persisted/API or cross-module contract.
- Platform Modules: none changed.
- Security: no trusted customer context or access grant is accepted or returned.
- Rollback: revert this PR; no DB/data/runtime rollback or feature flag changes.
- Deployment: PR CI may run; successful CI does not imply K5 or K6 runtime acceptance.

## Acceptance checklist

- [ ] `npm run verify` passes on PR head (typecheck, boundary lint, fixture tests).
- [ ] Negative cases: missing/duplicate releases, cycles, conflicts with active fixtures, malformed keys, Optional never forced.
- [ ] Existing fixture planner tests unchanged and passing.
- [ ] No changes to API/Web/SQL/deploy code; no staging activation.
- [ ] Architecture owner reviews ADR-030/032 before any real Business activation implementation.
