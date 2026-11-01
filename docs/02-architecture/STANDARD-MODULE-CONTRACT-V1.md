# DRVO ERP — Standard Module Contract V1 (Mandatory Spec Template)

**Date:** 2026-11-01  
**Status:** **PRE-CODE TEMPLATE / ENGINEERING PROPOSAL, not an adopted schema or finalized executable interface.**  
**Applies:** EVERY Shared Business Module and independent Industry Domain Module. Each gets a deliberate Core + Extension design per ADR-006; there is no obligation to generate useless empty plugins. Universal Kernel itself is not a business-domain Module (ADR-037).

## 1. Required one-page Module manifest (fill before first module PR)

```yaml
# EXAMPLE ONLY — NOT REGISTERED MANIFEST SCHEMA
moduleKey: <stable-key>
ownerTeam: <owner>
classification: shared-business | independent-domain | integration
purpose: <one-sentence>
authoritativeAggregates: [<records-and-lifecycles-this-module-owns>]
scopeClasses: [TENANT, BUSINESS, BRANCH]  # as actually applicable
sensitiveData: <types-and-purpose-limits>
actionsPermissions: [<resource.action/scope>]
coreContractVersion: <reviewed-version>
extensionPoints: [<real-hooks-with-typed-policy-boundaries>]
requires: [<declared-capability/compatible-range>]
optional: [<declared-capability/compatible-range>]
conflicts: [<declared-incompatible-capability>]
publishedCommands: [<typed-command-or-query-name/version>]
publishedEvents: [<redacted-versioned-event-name>]
consumedContracts: [<owner-and-contract/version>]
historyRetentionAndCorrections: <policy>
activationReadinessAndDisableRisks: <policy>
countryIndustryEligibilityEvidence: <supported-releases-only>
deploymentMigrationAndRollback: <plan>
testsAndFailureCases: <links>
```

The field names above are a **checklist**, not final JSON, YAML SDK, generated database entity or fixed code layout.

## 2. Every Module design MUST answer

| Area | Required answer / proof |
|---|---|
| Owner | What ONE module owns each aggregate, lifecycle and protected invariant? Name reads vs authoritative writes |
| Core | Which invariants truly generalize across industries? No `industry === salon` switches inside shared immutable rules |
| Extensions | Which stable, typed extension points allow bounded industry variations? Which combinations/conflicts and priority rules? |
| Scope | Tenant/Business/Branch resource ownership, action permissions, sensitivity, manager scope, server guard and negative tests |
| Contracts | Owned typed synchronous commands/queries, version compatibility, failure semantics; no direct writing to another Module's tables |
| Events | Producer/consumer, payload minimization, consent, trusted Business scope, outbox/replay, consumer idempotency and compensation |
| Finance | Which money/source documents/events are authoritative? What must commit together, what may be PENDING, how are refunds/reversals reconciled? |
| Dependencies | Required/Optional/conflicts and **actual graph**; no speculative dependency merely because Modules share an event |
| Activation | Released version vs Business activation vs entitlement vs user permission; historic data preserved on suspend/disable |
| Lifecycle | Upgrades/migrations/config revisions, compatibility, support/rollback and data retention |
| Country | Verified region/sector combination and allowed limited capabilities; no automatic tax/compliance promise |
| Observability | Expected error reporting, failed event monitoring, meaningful lag/reconciliation/health signals |
| Testability | Scope negatives, duplicate command/replay, failure after commit, cross-version, partial failure, performance hypotheses |

## 3. Module source-of-truth rules

1. **No Module writes another Module's canonical tables** even in the shared V1 SQL Server database. Read-only projections are permitted only through explicitly authorized, versioned owners/contracts.
2. **Kernel grants no business truth**: it resolves identity, permission and effective capability, not the meaning of InvoicePosted, GL, stock, salary or clinical consent.
3. **Module records and revisions are never erased** merely because a subscription expires, Module is suspended or another industry variant is chosen. Actual retention is defined by legal/domain policy.
4. **Cross-module critical transaction guarantee** must be signed before implementation. No undefined mix of synchronous writes and eventual events for mandatory financial invariant; ADR-031 remains a distinct decision.
5. **One change, one accountable owner.** A feature touching multiple Modules must list primary command owner and each participating contract/effect.
6. **Direct module-to-module imports** may be supported internally only through public interfaces/facades and dependency direction, never internal repository/entity coupling. Specific package layout requires technical review.
7. **New sector adds Modules only for distinct lifecycles** (ADR-019). A Solution packages compatible released modules/extensions; not a Module fork or a sector-specific ERP.
8. Every used data/workload operation must be Tenant/Business/Branch safe, including workers, caches, files, search, exports and reports.

## 4. Required PR description and review checklist (copy per Module)

```markdown
### Capability and scope
- Owner / moduleKey / released version:
- Industry/country eligibility and limitations:
- One canonical aggregate and invariant:
- Tenant / Business / Branch scope class:
- Required / Optional / conflict edges:
- Real Core + Extension hook decisions:
- Commands/queries/events and consumer owners:
- Financial posting / tender / tax / audit consequence:
- Sensitive records/consent/retention:
- Module activation / entitlement / disable behavior:
- DB migrations / data backfill / rollback:
- Exact unit/integration/negative/replay/contract tests:
- CI result and real SQL Server evidence:
- Known open ADRs / blocks / operational measurements:
```

Do not check a box without evidence. If a domain is independent, create the independent Module; do not distort the Core contract to avoid adding it.

## 5. Required before code vs deferable

**Before coding this Module:** owner and scope, canonical entities/invariants, exact external contract used, first-version dependencies, accepted permission model, defined financial criticality where applicable, version/migration approach and test expectations. **Before production:** negative security tests, money/replay correctness, verified market support, migrations/recovery and observed capacity/latency.

**Defer:** speculative optional hooks, every future industry, giant generalized SDK, full external Marketplace, multi-region deployment and live enterprise extraction until evidence warrants them.

See [Master Architecture Map](DRVO-UNIVERSAL-ERP-ARCHITECTURE-MASTER-MAP-V1.md), [Kernel 01–04](PLATFORM-KERNEL-BOUNDARY-MAP-V1-PROPOSAL.md), [Phase-1 Implementation Packet](../04-execution/PHASE-1-FOUNDATION-IMPLEMENTATION-PACKET.md).

**This template does not grant implementation, migration or production permission.**
