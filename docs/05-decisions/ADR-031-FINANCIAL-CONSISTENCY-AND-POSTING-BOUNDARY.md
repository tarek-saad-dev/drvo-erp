# ADR-031 — Financial Source-of-Truth Posting Boundary and Reconciliation (PROPOSED)

**Date:** 2026-10-30  
**Status:** **PROPOSED / FOUNDER + FINANCE + ARCHITECTURE REVIEW REQUIRED — NOT ACCEPTED**. Phase 0 docs only; no code/SQL/tests/deployment.  
**Severity:** Foundation Review FND-02 (P0 financial first-journal boundary), FND-04 (P0 domain contracts).  
**Previous accepted founder decisions:** ADR-009 SQL Server/PWA IndexedDB, ADR-010 offline credit+post-sync credit hold, ADR-011 customer electronic evidence is NOT settlement, ADR-012 last known negative-stock cost or COST_PENDING, ADR-013 late-offline posting in open period with original occurredAt preserved, ADR-029 national-scale reusable ERP Charter.

## Problem

In a modular ERP, a cashier's action may create a sale document, initial GL, Treasury tender claim, stock movement/cost, HR commission and optional WhatsApp notification. Those effects have different owners and may succeed at different times. V1 shared SQL Server allows an atomic financial transaction but an entirely asynchronous first journal may better isolate some latency. Neither pattern is safe if `success`, `paid` or `posted` is shown before verified evidence. Replayed offline operations and multi-tenant high concurrency intensify the risk.

## Agreed invariants carried from previous ADRs (not new approvals)

1. No fabricated payment settlement from an image/reference; pending/failed provider claims get collection-review and outstanding money tracked truthfully.
2. No duplicate invoice/journal/stock/commission effects on retries, offline reconciliation or worker restarts.
3. No silent credit-limit enforcement claim offline; preserve two offline credit sales, then hold future credit pending authorized Manager review on excess.
4. No zero-valued fabricated COGS when no historical cost; retain explicit `COST_PENDING`. Provisional cost reconciles with linked corrections.
5. No late offline journal inserted into a closed period; retain occurredAt and post with linked evidence in current permitted open period; applicable country tax law still controls obligations.
6. Immutable posted history and traceable reversal/adjustment; domain-owned writes, trusted Tenant/Business/Branch scope and versioned contracts.

## Proposed options to choose explicitly

### A — Atomic first sale + mandatory initial GL in one SQL transaction

Within V1 co-located Modular Monolith/shared SQL Server: use typed, domain-owned Accounting command participation so sale, first balanced mandatory journal/AR and outbox commit atomically. Optional/deferrable stock valuation adjustments, HR commission, BI and notifications follow independently through idempotent outbox/inbox; pending statuses are explicit. **Cannot finalize online/late-offline financial posting without atomic GL**, but local offline still recorded provisionally until sync. The exact Treasury/unverified tender classification and mandatory stock effects require separate mapping.

**Recommendation:** favorable for V1 simplicity and strong financial correctness **ONLY IF** the shared SQL/worker/cashier p95 and lock behavior meet measured requirements, and proper modular ownership remains enforceable. Future tenant deployment placement should keep the sale/first GL invariant co-located or migrate to explicit B-like workflow using a new ADR; it is not magically distributed across SQL pools.

### B — Durable accepted sale + accounting outbox + mandatory pending/reconciliation barrier

Commit source sale and outbox atomically; mark accepted but `ACCOUNTING_PENDING` until Accounting consumer commits its balanced GL idempotently. No `POSTED` until confirmed; monitor stuck queue, failed writes, closure and refund races. Accept complexity/operational cost for decoupled checkout and future scaling.

**No founder choice recorded.** Option A is the current **engineering recommendation**, NOT accepted implementation. Do not implement a vague halfway scheme: define exact initial mandatory GL boundary and list downstream obligations by operation/industry.

## Required separate confirmations before adoption

- The financial meaning and source owner for `sale accepted`, `invoice posted`, `cash counted`, `bank/provider verified`, `AR open`, `stock provisionally valued`, `commission accrued` and overall reconciliation; no single `complete`.
- Per-tender initial GL accounts incl. unverified electronic screenshot (do not credit verified bank); anonymous collection exception and later failed verification; tax/currency and legal receipt wording for Egypt/Gulf.
- Duplicate source+effect IDs, event ordering, refunds and partial-refund concurrency, outbox/inbox, DLQ and worker recovery; close-of-day/period blockers.
- Real target workloads and p95 latency/throughput, database consistency/lock/restore/security evidence; no market readiness guarantees.
- P0 Tenant isolation ADR-030 review, Module ownership boundaries, exact Salon minimum valid dependency/finance control sets.

## Decision consequences and next step

Until founder and Finance/Architecture reviewers select A or B and settle required account/receipt/status contracts, `FND-02 = OPEN`. Publication of this ADR or the linked design is **NOT approval to code**, and V1 existing financial product rules remain valid without an inferred implementation mechanism.

[Financial Consistency Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md) · [46 Negative/Recovery Tests](../02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) · [Foundation Review](../02-architecture/FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md).


## Detailed walkthrough and finance-review matrix added — 2026-10-30

[Sale-to-Ledger end-to-end design](../02-architecture/SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md) illustrates Option A and B side by side, source/effect replay, independent Treasury/stock/HR states and micro/SME/Enterprise stress lenses. [Financial Account Mapping & Close Gates](../02-architecture/FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md) explicitly separates physically received cash, verified provider/bank settlement, identified customer AR, unverified electronic screenshot and anonymous collection exception; E1/E2 classification is a Finance choice, **not an accepted GL account code**. This addition **DOES NOT SELECT A OR B**, and does not authorize code, SQL, tests or Production.
