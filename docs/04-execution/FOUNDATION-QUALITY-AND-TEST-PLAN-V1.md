# DRVO ERP — Foundation Quality & Evidence Plan V1

**Date:** 2026-11-01  
**Status:** **TEST SPECIFICATION / NOT EXECUTED; no passed CI, SQL, security or load results claimed.**  
**Purpose:** Convert broad architecture principles into repeatable acceptance evidence per safe, small engineering milestone.

## 1. Tests mandatory on first persisted Kernel slice

| ID | Test fixture and action | Must prove |
|---|---|---|
| SCOPE-01 | Tenant A principal swaps Tenant B record/business/branch IDs | Denied without any B data or side effects |
| SCOPE-02 | User with Business A membership probes Business B **within same Tenant** | No permission or data leak absent explicit distinct grant |
| SCOPE-03 | Branch 1 cashier accesses Branch 2 shift/sale/file or wrong parent FK | Unauthorized; SQL parent-child integrity rejects cross-scope links |
| SCOPE-04 | Membership revoked after session login; direct API attempted | Next protected request fails closed |
| SCOPE-05 | Malicious job/event/worker changes Tenant/Business scope or duplicates event | Trusted provenance/authorized scope rechecked, no cross-scope effect |
| SCOPE-06 | Cache, search, report, file/export with swapped scope/cross-tenant same names | No cross-scope resource exposure and safe keys |
| SCOPE-07 | Manager creates Manager with broader/Owner scope | Cannot self-escalate or grant beyond delegation |
| SCOPE-08 | Owner first Business provisioning and recovery | Explicit membership, no orphan/implicit universal access |
| SCOPE-09 | Platform support/break-glass test | Least-privilege scoped, auditable, no default access to medical/payroll data |

Use existing [40 negative cases](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md) as expanded test inventory; rows here are the minimum gate summary.

## 2. Registry / activation integrity tests

| ID | Failure experiment | Expected |
|---|---|---|
| MOD-01 | Free test Module with approved compatible manifest and valid explicit grant | Only authorized Business/user can activate and use |
| MOD-02 | Transitive Required A→B→C preview | One explicit complete bundle approval; no hidden items or costs |
| MOD-03 | Cycle, version mismatch, incompatible Extension, unapproved country | Refuse activation with clear reason and no partial side effects |
| MOD-04 | Simultaneous activate/disable for one Business, 20 identical requests/retries | One logical outcome, no duplicate initializations/charges |
| MOD-05 | Quote/prerequisite/role changes between preview and commit | Detect stale approval, revalidate before side effect |
| MOD-06 | Activation fails during prerequisite initialization | Never show dependent ACTIVE; preserve preexisting Module data |
| MOD-07 | Required prerequisite disabled with active dependent | Prevent invalid graph or execute separately approved safe plan |
| MOD-08 | Entitlement expired, revoked, manual proof pending | No fabricated settled/entitled/active status; legal history preserved |
| MOD-09 | Same Tenant multiple Businesses different plan/Industry Solution | No accidental cross-Business release/activation/rights |

For adversarial detail see [50 Module Activation Cases](../02-architecture/MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md). Paid provider cases require a non-production fake provider and separately signed commercial policy.

## 3. Financial correctness (gate before implementing POSTED POS)

| ID | Failure experiment | Expected |
|---|---|---|
| FIN-01 | Crash just before mandatory sale+first GL transaction commit (Option A target) | Neither POSTED source nor mandatory journal committed |
| FIN-02 | Crash after commit before HTTP response, repeated 20x | Exactly one sale and one balanced mandatory GL effect |
| FIN-03 | Provider payment screenshot but no verified settlement | Pending/collection state, not Bank verified or paid receipt |
| FIN-04 | Duplicate/reordered commission/stock/notification event | Exactly once business effect; notification cannot roll back source sale |
| FIN-05 | Negative stock without known cost | COST_PENDING, no invented zero-cost financial truth |
| FIN-06 | Late offline event after financial period close | Preserve occurredAt, post linked correction in permitted open period; tax validation |
| FIN-07 | Two offline credit sales exceed online cap when synced | Preserve prior sales and hold future credit for Manager review |
| FIN-08 | Refund/partial refund, period closed, retry and GL reversal | No over-refund, no unbalanced/duplicate correction or silent historical mutation |

Use [46 Financial Failure Cases](../02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) and [Posting Gate](../02-architecture/FINANCIAL-ATOMICITY-DECISION-GATE.md). These are specs, **not tests run**.

## 4. Technology / runtime gates

- **SQL Server integration:** real disposable version of intended edition, connection pooling stress, composite scoped FK, chosen ORM/driver, decimal precision, deadlocks/retries, migration checksums, rollback/restore.
- **Security:** independent negative-scope review, permissions, secrets/privileged support, event provenance, API/fake JWT tests, RLS pool hygiene if RLS selected.
- **Transactions:** balance invariants, unique source effects, idempotent correction, queue crash/retry, reconciliation, last known cost, amount rounding, late posting.
- **Operational recovery:** real backup+restore to isolated instance, version upgrade rehearsal, worker heartbeat and delayed job alerts, lost/offline device tabletop, separately isolated test data.
- **Scale:** micro Salon, multi-branch concurrent checkout, enterprise-shaped bulk import/report fixture. Define *numeric* p95/p99 checkout, DB lock/CPU, worker lag, RPO/RTO and maximum workloads **before benchmarking**; result must show measured load, not architecture promise.

## 5. Incremental CI gates

**Every PR:** format/lint/typecheck, unit tests, contract version checks, dependency/secret scanning, migrations reviewed, named data owner + scope, and no cross-owned-table writes.

**Persisted Kernel PR:** disposable SQL Server migration + negative isolation/integration tests, worker/transaction scope checks, privilege matrix approval and restore review.

**Financial/paid activation PR:** FIN/MOD failure/replay suites and documented reconciliation plus finance/billing signoff.

**Staging / Production:** observed metrics/alerts, backup restore evidence, release and rollback plan, independent security/finance review appropriate to use, Cut Salon pilot coexistence and branch validation before public launch.

**Status must be recorded as** SPECIFIED / IMPLEMENTED / TESTED PASS / TESTED FAIL / BLOCKED; do not use "ready" for unrun tests.

## 6. Definition of Done for first engineering slice

- Folder/code owners and contract versions documented; no accidental module internal imports.
- Tenant, Business, Branch, identity and membership behavior enforced server-side for sample commands, with failed malicious-scope tests.
- Free noncommercial Module fixture registers, activates and appears only to an authorized user; conflicting selection rejected.
- CI executes the selected slice's real SQL Server migrations/negative tests after driver and scoped FK design signoff.
- No production customer data, no real payment billing and no claim of finance posting correctness until their separately scoped gates pass.

**This test plan authorizes no code/SQL/deployment and records NO executed test results.**
