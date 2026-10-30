# DRVO ERP — Financial Consistency Contract: Sale, Ledger, Tender, Stock & Commission

**Date:** 2026-10-30  
**Status:** **PROPOSED TECHNICAL DESIGN, NOT FOUNDER-APPROVED OR IMPLEMENTED**. Prior founder decisions ADR-009–013 are already accepted at the product-rule level; this document must NOT silently redefine them. No code, schema, VPS, test execution or deployment.
**Priority:** P0 FND-02 / FND-04 from [Foundation Review](FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md).  
**Founder North Star:** [Three-Pillar Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md): correct shared invariants must be reusable across industries and tiny-to-enterprise operations, not Salon-specific SQL hacks.
**Related:** [Module Lifecycle](MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md); [Core Contracts](FOUNDATION-CORE-CONTRACTS-PROPOSAL.md); [Tenant Isolation](TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md); [ADR-031 (PROPOSED)](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md).

## 1. Purpose and invariant

For an authoritative financial operation, exactly one authorized business effect may be posted, all mandatory financial source-of-truth statuses must be honest, and downstream module effects must be traceable, retryable and reconcilable. An offline POS event is a local record, not yet proof of server posting. A provider settlement claim is distinct from receipt/authorization. Reversals/adjustments are linked immutable entries, not edits to posted money.

Never claim `POSTED` / `PAID` / `RECONCILED` solely because UI, IndexedDB or a queue says `success`. Likewise `InventoryCostPending` and `CommissionPending` must not be represented as completed.

This contract is reusable for Salon, Retail, Clinic nonclinical billing and future Manufacturing; specialized domain modules add scoped, typed effects without changing Ledger truth.

## 2. Founder-accepted financial product rules — preserved intact

| Decision | Existing accepted product intent | Technical interpretation STILL needing review |
|---|---|---|
| ADR-009 | V1 SQL Server VPS; Windows/PWA offline IndexedDB per-device queue; cash counts and shift/day can remain provisional pending synchronization | exact device identity, durability/eviction/security, acknowledgement/replay order, final close gate |
| ADR-010 | Offline credit recorded on device, excess across two devices accepted locally; after sync retain sales and **suspend further credit** for customer until authorized Manager review; online strict limit remains | receivable posting time, multi-branch limit coordination, review/hold event, duplicate credit |
| ADR-011 | Electronic tender remains selectable offline; **customer evidence ≠ provider settlement**; failed verification opens outstanding balance / collection-review case and different treatment for identified vs anonymous buyers | GL account classification, pending tender states, collection/review ownership, provider proof and reconciliation SLA |
| ADR-012 | Negative stock uses last known cost provisionally, difference adjusted on later receipt; **no known cost ⇒ cost PENDING** (never imaginary zero or COGS) | valuation matching/multiple receipts and accounting adjustment in open period |
| ADR-013 | Late offline sale retains original business date; linked journal adjustment/posts in **currently open accounting period**, not editing a closed period; no additional manual tax-review step by default but legal duties still apply | period determination and tax-point/returns compliance by market, FX, reversal |
| ADR-006/017/019 | Every Module has Core + Extension; stable finance/stock invariants are shared; independent industry domains may add their own aggregates | event interfaces, owner boundaries, consistency when extensions disabled |
| ADR-015/016/020 | Each user-facing App independent; Business starts with minimum valid module bundle, Required dependencies and costs shown for one approval | whether mandatory financial posting is a non-purchasable platform capability and what suspended app means for historical reconciliations |

## 3. Domain ownership and separate state dimensions (PROPOSAL)

| Authoritative owner | Owns | Must never infer |
|---|---|---|
| POS / Sales | sale intent, immutable price/tax snapshot, source sale/document, refund/correction linkage, origination device/operation | accounting fully posted, provider money settled, every inventory cost finalized |
| Accounting | GL journals, AR/AP, accounting periods, balanced posting, period linkage, reversals and tax/FX policy interfaces | payment provider settled from customer screenshot |
| Treasury / Payment | cash custody/shift cash count, tender claim, verified cash/bank/provider receipt and reconciliation | screenshot / offline receipt equals bank-cleared money |
| Inventory | stock movements, lot/location, provisional and final valuation and cost adjustments | negative stock automatically valued at 0 when missing cost |
| HR / Payroll | service attribution snapshot, commissions earned, linked reversal, payroll close | sale accepted => commission already accrued/paid |
| Platform / Outbox | trusted Tenant/Business/Branch scope, idempotency, dispatch, work queue and audit | own customer financial truth or fabricate posting |
| Optional WhatsApp/AI | consent-aware notification or analytics side effect | power to gate POS financial commitment |

Propose **orthogonal** statuses rather than a single ambiguous `COMPLETED` flag:
- **Device capture:** `LOCAL_RECORDED` / `SYNC_RETRYING` / `SERVER_ACKNOWLEDGED` / `SYNC_CONFLICT_REVIEW`; never label a local event `server posted`.
- **Sale document:** `DRAFT` / `ACCEPTED_PENDING_POST` / `POSTED` / `CORRECTION_PENDING` / `REVERSED_OR_PARTIALLY_REFUNDED` (exact allowed transitions pending decision).
- **GL:** `NOT_REQUIRED` only for nonfinancial drafts, `PENDING` / `POSTED` / `FAILED_REVIEW`; `POSTED` only after authoritative balanced journal commit.
- **Tender claim:** `UNVERIFIED_EVIDENCE` / `VERIFIED_RECEIVED` / `FAILED_COLLECTION_REVIEW` / `REFUNDED`; cash custody/counts remain separate from actual bank/provider reconciliation.
- **Stock:** `QUANTITY_PENDING` / `MOVEMENT_RECORDED_COST_PENDING` / `PROVISIONALLY_VALUED` / `FINAL_VALUED` / `COST_ADJUSTMENT_REQUIRED`.
- **Commission:** `NOT_APPLICABLE` / `ACCRUAL_PENDING` / `ACCRUED` / `CORRECTED`; not synonymous with payroll paid.
- **Business reconciliation:** a derived view computed from required obligations and review tasks; never a manually set success boolean.

These are **candidate vocabulary/transition names**, not final enums/schema or UI approvals. Allow an operation with final source sale/GL but provisional tender or stock cost; show exactly which obligation is outstanding. A `POSTED` sale is not automatically `PAID` or `COST_FINAL`.

## 4. Main P0 decision: first mandatory Accounting journal — two options

### Option A — commit mandatory sale + initial GL in ONE SQL transaction (preferred V1 recommendation, not selected)

Within the accepted V1 shared SQL Server, POS calls typed Accounting domain contract under a single authorized application transaction. Accounting owns its journal rules/writes while POS owns its sale; both required authoritative records plus the outbox are committed **atomically**. If either fails, transaction rolls back and caller sees a known retry/review state. Optional stock/HR/WhatsApp effects use durable outbox, idempotent consumers and explicit pending statuses. **A does not mean all inventory valuation/payment clearing/commissions happen in checkout.**

**Advantages:** strong first journal/sale invariant and simpler correct `POSTED` claim; fewer windows for missing original journals; natural under existing one SQL DB.
**Costs:** tighter same-DB financial coupling, SQL locks/latency under contention, more careful service/transaction boundary in modular monolith; eventual isolated placement would require revisiting transaction strategy. Needs real POS p95/locking and failure tests before acceptance.
**Offline:** device queue stays local until sync; when synced, each operation enters this transaction once; backdated occurred_at and open-period posting ADR-013 preserved. Local receipt is provisional. Any missing-cost stock outcome remains independent cost-pending, not fictional COGS.
**Payment evidence:** first mandatory journal account treatment for unverified electronic tender **must be explicitly approved**. Do not credit bank/cash as verified when only screenshot is available.

### Option B — durable sale acceptance + mandatory GL outbox + hard reconciliation barrier

Accept authoritative server sale/outbox durably with `ACCOUNTING_PENDING`, then Accounting posts initial GL via idempotent consumer. Only after observed journal commitment can the operation be shown as `POSTED`, with a monitored retry/dead-letter and recovery process. Stock/HR/optional effects remain separately reconciled.

**Advantages:** less synchronous checkout coupling, supports independent worker scaling and later placement easier.
**Costs:** more complex accepted-but-unposted finance legal state, operational alert/SLA/backlog, potential customer confusion, tax period boundary drift and refund race while GL unposted; all paths need explicit recovery. Accounting outage cannot result in hidden financially final documents.

### Recommendation for founder/architecture review
**Prefer Option A for the *first mandatory sale + balanced GL journal* in V1 if measured latency, SQL contention and operational recovery meet agreed gates**, and keep idempotent outbox for noncritical/deferrable inventory valuation corrections, HR commissions, reporting and notifications. This is a **defined invariant boundary**, not an accidental half-A/half-B: enumerate which effects are **atomic-mandatory** versus **durable downstream obligations** per operation and industry. If benchmark/ownership semantics make A unacceptable, design B explicitly with hard pending/review states, no pretend posting and monitored recovery.

**Status today: Neither A nor B founder-approved. FND-02 remains OPEN.**

## 5. Idempotency / event correctness contract (PROPOSAL)

- **Source operation identity**: trusted `TenantId/BusinessId/BranchId`, `DeviceId`, immutable `LocalOperationId` or online `ClientOperationId`, `OperationType`, and source version; use a persisted dedupe/unique constraint on a precisely defined scope to handle repeated sync and race.
- Same operation replay with **same canonical payload** returns the original source/receipt/status, not a second invoice, journal, commission, stock movement or payment claim. Same key and **different payload hash** is a conflict/review, never silently accepted.
- Distinguish idempotency of **source sale**, **Accounting posting effect**, **Inventory movement/cost adjustment**, **HR accrual**, **Treasury verification** and **refund/correction**; each uses a unique causal operation/effect reference. Event ID alone may be insufficient for retries re-emitting a new event ID.
- Durable **outbox recorded in authoritative SQL transaction**, worker delivery **at least once**, inbox/consumer business-effect dedupe in same local transaction as consumer's authoritative mutation. Do **not** promise exactly-once message delivery.
- Per-aggregate ordering/version rules handle out-of-order SalePosted/Refund events and compensations; stale/repeated messages never reverse newer corrections accidentally. Persist audit and correlation/causation.
- No cross-module arbitrary SQL write; all writes through domain-owned transactions/contracts; trusted Tenant/Business/Branch context verified by consumer per [Isolation Contract](TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md).
- A failed optional WhatsApp delivery must never roll back/hold a Sale/GL journal; a failed **mandatory** financial effect must be retried or presented as a blocking pending/review obligation, not silently dropped.
- Design data export/migration/enterprise placement to preserve source operation IDs, processed effects, outstanding queues and journal lineage across pools without duplicate posts.

## 6. Canonical operation journeys (proposed outcomes, not UI sign-off)

### 6.1 Online sale, cash payment
1. Authorized POS operation accepts immutable product/service/price/tax/discount/customer/executor snapshot, active Business/Branch/shift context; server validates current rights.
2. If A selected, sale+initial balanced Accounting journal+outbox commit together; otherwise B persists sale+outbox and exposes pending GL. A **cash received** record needs domain-owned Treasury custody invariant; cash is not automatically bank reconciled.
3. Inventory and HR optional/mandatory-by-workflow effects consume typed events; show cost/commission pending until verified.
4. Customer-facing receipt and operations UI must distinguish accepted sale, journal posted, cash-in-drawer vs bank settled and outstanding review.

### 6.2 Offline credit, two terminals
- PWA device A/B each locally registers receivable under authenticated cached operator and selected Branch. Offline global credit limit cannot be guaranteed.
- Upon sync, stable operation keys dedupe and authoritative credit/AR effects occur once; both sales preserved as accepted founder rule.
- If 800 + 800 exceeds a 1,000 credit cap, **future credit is suspended** pending an authorized Manager review, with audit; no silent deletion or fake global approval. Online cap remains strict.
- If journal posting fails, preserve pending/retry visibility rather than fake AR balance; exact credit exposure before the Accounting boundary needs founder/finance review.

### 6.3 Offline electronic payment with customer screenshot
- Locally record selected configured method, customer-reported amount and evidence reference **as an unverified claim**. Do not record `VERIFIED_RECEIVED` or unconditional bank credit.
- After server sync, create source sale and valid financial obligation; held tender verification status remains visible until trusted independent proof.
- If claim fails, authorized review opens **outstanding amount / collection-review** as already approved; identified customer receivable differs from anonymous sale collection exception. No duplicate AR nor double settlement when later payment arrives.
- Exact initial GL account and what receipt wording is legally/financially permitted require a separate finance and country review; status is not automatically `PAID`.

### 6.4 Negative stock and unknown cost
- Selling against negative quantity records stock movement exactly once. With known last cost, create provisional cost and adjust via linked immutable correction when later acquisition cost is matched.
- Without known cost, mark `COST_PENDING`; do not invent zero, ungrounded COGS or a false complete gross-profit margin. Quantity and GL revenue can have different readiness from valuation.
- Later purchase/receipt may trigger one or multiple cost adjustments; deterministic matching, period/rounding/returns need final policy. Corrections never overwrite posted journal.

### 6.5 Late offline synchronization after closed accounting period
- Preserve local occurred_at, device event ID, sync_at, original business date and real posting time. Confirm target current **open** period on processing (ADR-013).
- Post linked/open-period journal with audit/correction reference; never rewrite closed-period entries. Tax point, VAT filing and FX rules by Egypt/Gulf remain legal/accounting review blockers; no *extra manual* tax workflow by default does not waive statutory requirements.
- Replayed delayed events cannot post again or shift to a new period once posted.

### 6.6 Refund, partial refund, replay, and worker failure
- Refund has its own authorized unique operation ID and invariant `refunded <= eligible`, with atomic compare against concurrent refunds. Linked reversals and stock/HR effects should never mutate original sale/GL record.
- If refund occurs while initial GL is pending under B, explicitly queue/restrict/refund-as-pending until ledger lineage is resolved; do not let it silently overtake original.
- Crash before commit: retry leads to one authoritative effect. Crash after DB commit before HTTP response: retry returns same effect, not a duplicate. Crash after consumer write before ACK: inbox recognizes already applied effect. Delivery 20x must remain one financial effect.
- Suspend optional Module: its absence cannot erase already-posted data or required financial obligations; pending optional effects use explicit retained/review/cancel rules.

## 7. Recovery, reconciliation and operations (proposals)
- Source of truth: owning Module's authoritative records and append-only journal/revision/audit; never rebuild money from frontend success toast.
- Automatic reconciler checks source operations vs mandatory ledger postings, tender verification, stock moves, cost adjustments, HR accrual, outbox/inbox backlog, dead-letter queue and period consistency by Tenant/Business/Branch.
- Alerts for aged `GL_PENDING`, duplicate attempts, same key payload mismatch, cost pending, unverified e-tender, failed credit hold and reconciliation gaps; true thresholds and on-call ownership TBD.
- Authorized reviewer can **retry idempotently**, link a compensating adjustment, resolve collection issue, or escalate with documented evidence; must not manually edit a posted journal/sale to “fix” mismatch.
- Period close and final shift/day close must use a designed policy for unresolved mandatory pending financial obligations. Offline provisional close can remain provisional under ADR-009; exact final blockers and controlled exceptions need signoff.
- Enterprise scalability: isolate slow reports/notifications from critical sale/GL path, monitor locks and per-Business backlog, load/restore test large Tenant and cross-Tenant noise; never equate more Modules with throughput.

## 8. Design acceptance scenarios — detailed future tests in [Financial Negative/Recovery Matrix](FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md)

The matrix specifies duplicate replay, outages, payment verification mismatch, negative stock no cost, late period, double refund, different Industry Extensions and cross-Tenant events. **No tests executed.**

## 9. P0 decisions required before implementation
1. **A vs B**: choose and record when a sale qualifies `POSTED`; define initial ledger/AR/tender custody atomic list, and coherent failure/UX semantics.
2. Approve complete **operation state machine** with orthogonal dimensions and accepted cash/electronic/card/credit representations, refund concurrency and reconciliation derivation.
3. Finalize per-Module ownership, typed commands/events and source/effect dedupe keys, ordering and replay/retention strategy; policy when optional Modules are suspended or historically sold.
4. Approve first GL accounts for **unverified customer electronic evidence**, anonymous collection exception and unverified-vs-cleared receipts, including jurisdictional tax rules.
5. Specify stock cost matching and late-period tax treatment; online/offline credit and Manager hold/review interaction already have founder-approved behavioral intent.
6. Set realistic POS p95 latency, DB contention, throughput, reconciliation deadline, incident/RPO/RTO targets; validate V1 shared SQL and future isolated pools during actual engineering testing **after authorization**.
7. Complete Tenant/Business/Branch P0 [ADR-030 (proposed)](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) isolation and least-privilege verification.

**Today:** `DESIGN READY FOR REVIEW; FND-02/FND-04 OPEN; 0 TESTS RUN; NO CODE AUTHORIZATION`.


## End-to-end financial operation / accounting decision supplements — 2026-10-30

[Sale-to-Ledger Walkthrough](SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md) now documents the full candidate Option A vs B transaction sequencing, source-owned state vector, double-refund and outage cases, plus reuse for different-sized and different-industry Businesses. [Financial Account Mapping and Close Gates](FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md) separately proposes the accounting questions for cash custody, **unverified electronic evidence**, credit AR, anonymous collection, negative stock cost, late-period tax and close procedures. Neither document changes founder-approved ADR-009–013, **nor approves journal mapping, A/B choice, exact enum/schema or executable tests**. FND-02/FND-04 remain OPEN.
