# ADR-031 — Founder / Finance first-journal decision packet (2026-11-12)

**Status: PROPOSED; NO FINANCE OR FOUNDER ACCEPTANCE RECORDED.** Engineering owner instructed to prepare ADR-031 in parallel with staging-readiness hardening. This document and test-only evidence do **not** change ADR-031's status, invoice/GL policy, tax treatment, SQL, runtime API, payment providers, or existing POS DRAFT-only flags. [ADR-031 proposal](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) · [Financial Account Mapping](../02-architecture/FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md).

## Architecture impact before implementation

- **Sales/POS** owns source sale identity/version, immutable final business document and human-visible source status. A saved PL-1b `DRAFT` is never a financial document. Real POS `POSTED` status needs Accounting's first-journal proof.
- **Accounting** exclusively owns the first balanced, mandatory GL and accounts receivable/period rules; **Treasury** owns cash custody and separately verified external tender. No POS route writes Accounting tables.
- **Catalog, Customers, Booking, Salon Extension, Inventory, HR** retain their boundaries. Barber/commission attribution only in bounded Salon Extension; optional Inventory/HR effects never substitute for mandatory GL. Messaging/BI asynchronous.
- **Multi-Tenant safety:** transaction or consumer must enforce trusted Tenant/Business/Branch scope, source+effect immutable replay IDs, current RBAC/entitlement; all posting, reversals, close and background repair SQL need negative isolation and race tests. No Customer or Branch ID from a client can authorize records.
- A first-journal transaction proof must be benchmarked for small, multi-branch and larger Business loads before SLA/scale claims.

## Decision choices for approval

| Review | **A — co-located atomic first GL (conditionally preferred)** | **B — durable accepted source and asynchronous GL** |
|---|---|---|
| Source commit | Sale + mandatory first balanced GL + financial outbox in one DB transaction | Sale + outbox in one DB transaction; mandatory GL later |
| Before mandatory GL | Nothing financially committed or return reject/retry; never POSTED | `ACCOUNTING_PENDING` and never POSTED |
| After first GL | POSTED only after balanced journal and durable outbox verified | POSTED only after consumer commits balanced GL and confirms effect |
| Crash/retry | Atomic rollback or identical immutable source/GL replay | Idempotent source/outbox replay plus monitored recovery until first GL |
| Main risk | SQL lock contention and checkout latency, shared transactional coupling | pending backlogs, delayed accounting, close/refund races, repair/on-call burden |
| Recommendation | **Preferred for initial V1 IF** bounded transactions, SQL owner boundaries, tender/account policy and measured latency pass | Alternative if measured atomic design cannot meet accepted operational needs |
| Approval now | **NOT GIVEN** | **NOT GIVEN** |

## Finance choices that cannot be guessed

1. Jurisdiction-specific Chart of Accounts, tax/VAT timing, invoice legal numbering and rounding for EGP and other enabled countries.
2. Which mandatory first GL lines arise for **physical drawer cash**, identified credit customer, verified provider payment, partial tender, failed electronic confirmation, anonymous screenshot claim; define E1 (identified AR/open collection) vs E2 (unverified clearing) only with finance approval. **Never classify screenshot as verified provider funds.**
3. Period/shift close semantics and late-offline rules (ADR-013), prepayment/refund/reversal and tax credit-note policy.
4. Exact accounting `sourceOperationId` and `journalEffectId` + payload hash, duplicate key/race treatment, ledger ownership, monetary precision and exception policy.
5. Who signs Finance and Security acceptance, measured performance thresholds (p95 checkout, lock waits, throughput, queue catch-up if B), alerting/restore/reconciliation and effective date.

## Test-only acceptance seed implemented here

- `tools/finance/adr031-decision-evidence.cjs` is **a synthetic pure evidence classifier**, not an Accounting or Sales implementation. It has no IO, no SQL transactions, no financial account mapping and no ability to process a real transaction.
- `tests/adr031-decision-evidence.test.cjs` exercises all **32 combinations** of four commit/balance indicators across both Option A/B, pending truthfulness, outbox/GL integrity, tender evidence and injection rejection as part of root K0 CI.
- These tests are necessary examples only, not proof of SQL atomicity, ledger completeness, fiscal compliance, customer settlement, Tenant isolation or SaaS activation.

## Proposed founder decision record — requires explicit sign-off

**Decision requested:** `Select Option A / Option B / Defer`. Engineering recommends Option A **conditionally** for shared SQL V1 subject to approved Finance account maps, period policy, throughput tests, typed Accounting command contract and cross-Tenant negative SQL evidence. Do not change ADR-031 status without a recorded founder/Finance/Architecture decision. If Defer, continue nonposting POS draft versioned CAS behind OFF flags, no POSTED implementation.

**No SQL 010–014 deployment or flag activation** follows this packet. ADR-032 (paid Module activation) and K5F operational acceptance remain separate unapproved gates.

## Next gated PR sequence after approval

- F-1: Finance-approved typed Sale→GL command/result contract, historical snapshot and account mapping tests; dedicated `pos.sale.post` permission/entitlement separate from `pos.draft.manage`.
- F-2: One bounded transactional first-journal implementation per accepted A/B, with real disposable SQL/HTTP negative Tenant/Business/Branch, idempotency/crash, period-close and replay tests.
- F-3: Treasury proof states, refunds/credit, inventory costing, HR commissions and offline reconciliation with explicit independent owners; no false settlement state.
- F-4: K5F security, offsite backup + isolated restore, approved staging migration, synthetic Cut Salon parallel-run reconciliation, Finance release sign-off; then reconsider paid customer readiness.

**Blocking question for Founder/Finance:** Is A acceptable as the default V1 posting architecture, or is B required? Separately, which tender/AR/period policy is legally and operationally approved?
