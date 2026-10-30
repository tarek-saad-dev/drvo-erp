# DRVO ERP — First-GL Atomicity Decision and Performance Gate

**Date:** 2026-10-30  
**Status:** PRE-CODE DECISION GATE / PROPOSAL, not benchmark evidence, founder adoption or implementation authorization.
**Related:** [ADR-031 PROPOSED](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md), [Sale-to-Ledger Walkthrough](SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md), [Financial Contract](FINANCIAL-CONSISTENCY-CONTRACT.md), [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md).

## Executive result
**No measured performance can be asserted in Phase 0**, so no claim that Option A is fast enough or that Option B is necessary. **Conditional preferred design:** same-V1-SQL atomic Sale + first mandatory balanced GL + durable outbox (**A**) with clear separate Treasury/Inventory/HR effects, *only if* accounting domain ownership, tender account mapping, SQL lock contention and POS latency meet later approved gates. Otherwise select deliberately modeled durable Sale+Outbox with GL_PENDING and mandatory reconciliation barrier (**B**).

**FND-02 remains OPEN.** “Let's proceed with architecture documentation” is not an acceptance of a particular posting transaction or an instruction to execute benchmarks/code. A founder/finance/architecture ADR adoption and separately authorized implementation/testing are still required.

## Critical invariant decision matrix

| Aspect | A: same SQL transaction | B: durable sale, async first GL |
|---|---|---|
| Atomic durable unit | Authoritative sale + first valid balanced journal/AR + outbox | Authoritative accepted sale + outbox; first GL separate atomic consumer |
| Cashier server acknowledgment | Sale+GL posted ONLY after shared commit; network loss returns query/retry by immutable operationId | Sale ACCEPTED, GL_PENDING (not posted) until consumer confirms |
| Failure before commit | Neither sale nor first GL commits | Neither source sale nor outbox commits |
| Failure after source commit | Retry shows same sale+GL | Retry shows same accepted/pending operation; required consumer recovers |
| Slow Accounting | Checkout blocked/failed under critical bounded transaction | Checkout can accept with truthful GL_PENDING, risk of accumulating obligations |
| Extra effects | Independently tracked tender verification, Inventory cost/quantity, HR commission, analytics/notifications | Same, plus mandatory first journal consumer |
| Future enterprise placement | Keep Sales+GL co-located per tenant stamp or formally change contract | More naturally asynchronous, still not an unlimited SLA |
| Finance/UX risk | Lock contention/latency; must not claim tender paid | Accruing accepted unposted invoices/refunds and period-close race |
| Decision status | **RECOMMENDED CONDITIONALLY, UNAPPROVED** | **VIABLE ALTERNATIVE, UNAPPROVED** |

## Non-negotiable product-rule consistency
- ADR-009: POS PWA IndexedDB local operations must be explicitly local/unconfirmed until server acknowledgment; storage eviction is possible.
- ADR-010: offline two-device customer-credit exceeding limit preserves both prior sales; suspend *future* credit until authorized Manager review; online strict cap.
- ADR-011: screenshot evidence is NOT verified bank receipt; separately approve identified-AR vs permitted unverified-tender clearing account and anonymous collections.
- ADR-012: last known negative-stock cost provisional; no known cost means pending — never fabricated zero.
- ADR-013: retain sale occurrence date; late synchronized sale journals in open period with linked audit and local tax-compliance check.
- [Tenant scope ADR-030 PROPOSED](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md): no cross-Business/Branch SQL journal/AR or worker scope.

## Owner-level sign-off sequence (design-only now)
1. **Finance:** approve per-tender source truth, VAT/tax/invoice and AR/collection categorization, cash custody atomicity, refunds, fiscal/shift close rules for Egypt and actual target markets; no fake bank clearing.
2. **Architecture:** define exact typed Sales→Accounting transaction interface and owner-written tables, idempotent key/payload hash, full exception/retry semantics and scope enforcement.
3. **Product/founder:** approve Option A or B, required visible statuses and failure UX (one failed checkout must never issue a ghost duplicate).
4. **Performance QA, *after development/testing permission*:** set and test explicit per-tier workload fixtures and measurable targets (numbers intentionally TBD) for p50/p95/p99 total checkout latency, SQL deadlock/lock waits/IO, outbox lag, worker recovery and cross-Tenant noisy-neighbor impact.
5. **Security/Operations:** observe cross-Tenant isolation, failure rollback, reconciliation, restore/recovery and enterprise placement data correctness.
6. **Decision:** publish accepted/rejected ADR-031 with observed metrics and failure modes. If A fails, B must have operational aged-GL alerts and close/refund barriers, not a silent switch.

## Proposed workload fixtures — these are not completed tests
- W1: one-chair salon with one cashier and occasional local-device offline events.
- W2: multi-branch salon network with simultaneous POS close/returns/shift changes and stock/commission workers.
- W3: large retailer/manufacturer Sales→GL workloads with high write concurrency and simultaneous imports, reporting and enterprise batch.
- Cross scenario: Tenant A bulk export or invoice storm must not produce Tenant B data leaks or violate agreed p95/p99 budgets.
- Failure windows: SQL deadlock, server crash before/after commit, HTTP ACK loss, missing first GL journal, repeat source operation 20x, ledger period closing between sale origin and sync.
- Measure against **future signed numeric targets**; don't invent TPS or “100% certain” results.

## Conclusion
**Recommended next design choice:** Option A *if* no hidden performance/accounting tradeoff is observed in authorized tests; use separate durable outbox for deferrable effects. Cannot formally “close” transaction decision without product/finance signoff, actual legal account mapping and performance validation. Continue independent [Module Activation Contract](MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md) review without allowing Module disabling to bypass mandatory GL safeguards.

**No code, SQL, benchmark, migrations or deployment.**
