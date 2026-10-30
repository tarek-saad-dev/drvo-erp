# DRVO ERP — Financial Consistency Failure, Replay and Recovery Test Matrix

**Date:** 2026-10-30  
**Status:** FUTURE TEST PLAN ONLY; **0 TESTS RUN**. Does not authorize code/SQL/production. References [Financial Consistency Contract (PROPOSED)](FINANCIAL-CONSISTENCY-CONTRACT.md), [ADR-009](../05-decisions/ADR-009-SQLSERVER-PWA-OFFLINE.md), [ADR-010](../05-decisions/ADR-010-OFFLINE-CREDIT.md), [ADR-011](../05-decisions/ADR-011-OFFLINE-ELECTRONIC-PAYMENT-EVIDENCE.md), [ADR-012](../05-decisions/ADR-012-NEGATIVE-STOCK-COSTING.md), [ADR-013](../05-decisions/ADR-013-LATE-OFFLINE-POSTING-CLOSED-PERIOD.md), and [Isolation Test Matrix](TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md).

## Fixtures (conceptual)
- Tenant T1 with Salon Business B1, Branches L1/L2, Windows POS terminals D1/D2 and operator grants; Tenant T2 with independent B2. Never share account authorization.
- Product P1 has available cost; P2 has no known historical cost; credit customer C1 limit 1,000; anonymous sale; real/claimed electronic tender; period Oct CLOSED and Nov OPEN.
- Sale S1 online, S2 offline, credit operations C1/D1=800 and C1/D2=800, stock-negative sale S3; payroll commission executor and opener eligible under approved Salon policy.
- Inject HTTP lost response, app process crash, SQL rollback/deadlock, worker restart, duplicate/out-of-order events, stale authorization and offline storage eviction.
- Declare **chosen Option A vs B** and expected status invariants before a test runs. Do not invent benchmark or pass results.

## A. Source-of-truth, transaction & replay

| ID | Failure or adversarial case | Required invariant / expected result |
|---|---|---|
| FIN-001 | Online POS sale fully succeeds | Exactly one source sale and one first mandatory balanced GL effect; tender/stock/HR status independently truthful |
| FIN-002 | Client retries same identical operation 20 times in parallel | One authoritative invoice, no duplicate journal/stock/commission, same returned operation reference |
| FIN-003 | Same idempotency key reused with *changed* amount/lines | Conflict and review, never original receipt silently replaced or another invoice issued |
| FIN-004 | HTTP response lost after SQL commit | Retry finds already committed operation; returns existing immutable records, no double revenue |
| FIN-005 | Process crashes before source DB commit | No partial durable sale/GL in A; or B handles durable pending under approved contract; safe retry |
| FIN-006 | Accounting validation fails during initial sale | A rolls back mandatory source+GL; B retains explicit ACCEPTED_PENDING_POST with recovery; never “Fully posted” |
| FIN-007 | SQL deadlock/timeout during critical journal transaction | Bounded idempotent retry/review; no partial posting or invented success |
| FIN-008 | Journal balanced invariant fails debit≠credit | Reject or quarantine before `POSTED`; never commit unbalanced entry |
| FIN-009 | Worker receives SalePosted 20 times with changing event delivery IDs | Deduplicate *business effect* by scoped source/effect identity; at least-once transport is allowed |
| FIN-010 | Worker commits stock/HR effect but ACK fails | Next message does not produce new stock/commission effect; inbox/effect transaction dedupes |
| FIN-011 | Refund delivered before original sale event | Defer/sequence/reconcile safely; no negative phantom postings or unlinked reversals |
| FIN-012 | Same sale re-emitted after a worker DLQ repair | Ledger lineage stable and exactly one mandatory effect after recovery |
| FIN-013 | A previously POSTED sale is changed in UI without correction event | Reject mutation; post linked correction/reversal with audit only |

## B. Offline POS, credit & provider claims

| ID | Failure or adversarial case | Required invariant / expected result |
|---|---|---|
| FIN-014 | PWA offline creates sale, user reopens browser | Local ID and queued status preserved when storage survives; no claim of server sync |
| FIN-015 | Device IndexedDB storage evicted before sync | Detect possible data loss; incident/reconcile cash/shift, never claim synchronized; durability guarantees must be realistic |
| FIN-016 | Two disconnected terminals each extend credit C1 by 800, global limit 1,000 | Both founder-approved offline records retained; post-sync excess recognized and **future credit suspended** until Manager review |
| FIN-017 | Online customer exceeds strict credit cap | Online hard stop; offline override must not leak into online behavior |
| FIN-018 | Sync request from D1 replays customer credit 20 times | Single AR/credit exposure effect; no double debt or duplicate hold |
| FIN-019 | Customer screenshot shows payment but processor reports no transfer | Tender stays unverified/failed, collection-review/outstanding balance created, never bank-cleared |
| FIN-020 | Same screenshot used for two different sales | Evidence is not settlement; duplicate evidence flagged and each source obligation independently reviewed |
| FIN-021 | Offline electronic tender later independently verifies successfully | Transition only on trusted verification; settled effect once, correct linked original claim |
| FIN-022 | Anonymous buyer's unverified tender fails | Collection incident distinct from identified-customer AR; neither auto-cleared |
| FIN-023 | Cash shift local count contains unsynced sale | Shift/day provisional stays truthful; final close only per approved reconciliation gate |
| FIN-024 | Local device clock/timezone incorrect | Preserve evidence and normalized occurredAt/committedAt; no illegal closed-period posting from device clock |
| FIN-025 | Disabled cashier sends previously queued data after revocation | Trusted service and already-recorded-obligation rules applied; no arbitrary new user authorization by payload alone |

## C. Stock, costing and accounting periods

| ID | Case | Required invariant / expected result |
|---|---|---|
| FIN-026 | Sale sends stock below zero, last known cost=100; later receipt cost=120 | Quantity effect once; provisional cost and linked immutable +20 adjustment **only if** validated matching policy confirms this mapping |
| FIN-027 | Negative stock product has **no last known cost** | Quantity movement exists; costing `PENDING`; do not invent 0 COGS/gross margin |
| FIN-028 | 2 later purchases could match 1 negative sale | Only deterministic approved allocation; no duplicate cost adjustments or overwritten journal |
| FIN-029 | Late offline Oct sale synced Nov after Oct closed | Original Oct date retained; first posting/linked adjustment in current permitted open period, not closed Oct; correct tax-point exception policy |
| FIN-030 | Replay late sale after first successful Nov posting | No new posting in Dec or double journal; stable original posting period |
| FIN-031 | Refund after original inventory value was provisional | Linked stock/COGS/AR/commission correction follows specified policy; never erase financial history |
| FIN-032 | Closed financial period amended by generic import/retry | Reject illegal mutation; explicit approved correction workflow only |
| FIN-033 | Foreign currency sale crosses closing period | Currency/FX rate origin, conversion and tax compliance reviewed; no fabricated rate |

## D. Role, tenancy, Modules and growth

| ID | Failure / scale condition | Required invariant / expected result |
|---|---|---|
| FIN-034 | T2 event reuses an ID from T1/B1 | Scoped source/effect uniqueness and authorization; no cross-tenant journal |
| FIN-035 | Branch L1 source sale references L2 treasury drawer | Enforce correct branch custody/authorized transfer semantics |
| FIN-036 | Disable optional WhatsApp / AI consumer | Sale+GL still correct; no financial obligation depends on optional integration |
| FIN-037 | Pause HR/Inventory worker temporarily | Sale status/GL can be correct per approved boundary, HR/stock remains pending and reconciler catches backlog |
| FIN-038 | Suspend an app with unresolved historical financial event | Required ledger/correction recovery must continue with audit; no silent data loss |
| FIN-039 | Parallel partial refunds attempt > original refundable amount | Atomic concurrency guard; never more than eligible refunded |
| FIN-040 | Multi-branch peak concurrency and DB contention | p95/p99, lock timeouts, correct money and cross-Business isolation against **future approved** workload targets; no invented PASS |
| FIN-041 | Future Manufacturer MRP extension receives Sales event | Typed ownership, no cross-industry ledger mutation/unsafe data leak, versioned compatibility |
| FIN-042 | Tenant migration to future DB pool replays old outbox | Preserve operation/effect/journal IDs and period; no duplicate posts after placement move |
| FIN-043 | One Tenant creates heavy BI export while other posts POS sale | Measure isolation and latency vs future SLO, not claim automatic horizontal scaling |
| FIN-044 | Mixed version event from prior platform release | Defined version compatibility/upcaster/deprecation strategy and safe quarantine if unsupported |
| FIN-045 | Provider settles after manual collection-review correction | Unique settlement/reversal chain; no twice-applied AR or cash |
| FIN-046 | Audit/debug/export accesses private customer tender evidence | Tenant/Business/Branch and permission filters, redaction and retention; no card secrets |

## Evidence template to fill after explicit authorization
| Field | Required |
|---|---|
| Test ID/environment/build & SQL Server edition | actual |
| Chosen financial boundary | Option A or B + approved ADR |
| Input and injected fault | repeatable fixture/steps |
| Expected vs observed ledger/stock/HR/tender state | concrete record refs, totals, statuses |
| Replay/count and reconciliation aging | evidence |
| Tenant/Business/Branch authorization | positive/negative |
| Measured p95/p99 and SQL cost (when relevant) | actual benchmark |
| Result | PASS / FAIL / BLOCKED; no pass asserted without running |
| Owner, reviewer, date, issue and recovery | actual |

**Sign-off gate:** complete and approve required finance/source-of-truth policies, then implement and execute test cases under separate founder authorization. A written matrix is not proof of correct accounting or enterprise scale.
