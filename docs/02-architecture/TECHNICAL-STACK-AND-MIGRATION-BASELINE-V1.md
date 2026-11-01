# DRVO ERP — V1 Technology, SQL Server & Migration Baseline (Pre-Code)

**Date:** 2026-11-01  
**Status:** **RECOMMENDED V1 ENGINEERING BASELINE; existing SQL Server/VPS/PWA founder choices remain accepted; remaining stack tools are engineering recommendations pending technical validation.**  
**Source:** [Technology Architecture](TECHNOLOGY-ARCHITECTURE.md), [ADR-002](../05-decisions/ADR-002-modular-monolith.md), [ADR-009](../05-decisions/ADR-009-SQLSERVER-PWA-OFFLINE.md) or authoritative ADR register, [ADR-037](../05-decisions/ADR-037-LEAN-PLATFORM-KERNEL-BOUNDARY.md).

## 1. Keep V1 boring, measured and modular

| Layer | V1 preferred design | Decision status |
|---|---|---|
| Web App / role-specific PWA | Next.js + React + TypeScript; responsive Arabic-first with RTL/LTR | Engineering baseline proposal, exact version to lock at scaffold |
| Authoritative API / domain | NestJS + TypeScript Modular Monolith; dedicated versioned REST/OpenAPI DTOs; no money writes in Next.js routes | Engineering proposal |
| Background | Independent Node/NestJS worker process with scoped service identity, DB-backed outbox/inbox/retry and observable health | Engineering proposal; transport/queue implementation not selected |
| Database | **SQL Server** on VPS, shared tenant-aware database for V1, with Business-owned ledgers and Branch data | **Existing founder-approved V1 direction**; edition/host/restore still verify |
| Data access | Typed domain repositories with mandatory server scope and explicit transaction control; benchmark parameterized SQL Server driver/ORM candidates before selection | **Not selected**: do not claim Prisma/TypeORM/`mssql` is already approved |
| Migrations | Source-controlled, ordered migrations with checksum, transaction/lock policy, backward compatibility and a restore rehearsal; no tenant-specific code/schema forks | Required strategy; migration runner/driver OPEN |
| Client offline POS | PWA + IndexedDB durable per-device intent queue as an initial direction, with loss/eviction constraints, sync replay and clear unconfirmed status | **Founder-approved initial direction**; device security/TTLs/open auth/printing/cutover still open |
| API integration | Official typed/versioned scoped external APIs; reviewed in-platform Extensions; no direct third-party SQL | Accepted platform principle; SDK/rate limits/OAuth implementation later |
| Operations | Isolated dev/staging/production, environment secrets, least-privilege DB principals, migrations & backups, health/metrics, controlled deploy/rollback | Required before production, exact hosting/build pipeline OPEN |

**No microservice, broker, Kubernetes, enterprise sharding or multi-region requirement in the first build.** This is a design restraint, not an eventual scale guarantee.

## 2. Data-access spike (must occur before real SQL migrations)

Evaluate **A: driver-level parameterized SQL in typed repositories**, **B: established SQL Server-compatible ORM/query layer** against a real disposable SQL Server instance of the intended edition/version. Both may be used to assess performance but **choose one primary per-module policy** after results; avoid disparate uncontrolled SQL patterns.

Test: composite Tenant/Business/Branch FKs, strong decimal precision/rounding, cross-module mandatory transaction, `rowversion`/locking/CAS, transaction deadlocks and retries, SQL Server RLS/session context if being considered, batch queries/projections, migration reversible rehearsal, connection-pool resets, type generation and test maintainability. A SQL Server-specific approach may be required for critical finance even with an ORM.

**Acceptance evidence:** version-locked packages/edition, small code spike, test output, performance comparison, migration+restore result and ADR selecting the actual tool. No technology selected merely by confidence.

## 3. Database and release guardrails

1. Owned tables/migrations per Module with declared Tenant/Business/Branch scope classes; no app, extension, tenant or country creates arbitrary schema at click-time.
2. Relational protection against cross-parent references; scoped repository queries; owner restrictions; optional RLS evaluated as defense-in-depth.
3. Migration history lives in platform release, applied before a compatible Module version becomes AVAILABLE; avoid non-reversible destructive changes without verified recovery.
4. Transaction and outbox ownership enforce financial truth and idempotent effects; never use floating-point for money.
5. Worker health, failed events, aged unsettled GL/tender, sync lag, DB lock contention and Tenant-specific load must be observable.
6. For staging, isolate secrets/accounts/data from production. Never use customer exports in test without compliant masking/authorization.

## 4. Minimal CI and project conventions (pre-code proposal)

- Strict TypeScript, lint/format, compile/typecheck, unit tests and contract-version checks.
- Test real SQL Server migrations and protected scope queries in disposable CI database.
- Negative security tests and concurrent activation tests at integration level; money/replay suite on actual transaction implementation.
- Schema compatibility, restore rehearsal, dependency/secret scans and build artifact integrity before staging and production.
- Small feature PRs with source-of-truth ownership, ADR reference, migration/rollback plan, evidence and required review.

## 5. Dev start vs staging/production

**Safe first authorized development scope:** create the repository structure, shared contract interfaces, core identity/tenant/Business/Branch logic against disposable test fixtures, and tests, **subject to signed ADR-030 security baseline and chosen DB access spike before persisted schema**.

**Not safe until additional gates:** production real customer accounts, payments, POS posting, clinical data, business-critical offline acceptance or paid module activation. These require relevant ADR-030/031/032 sign-offs, privacy/finance/commercial review, migration/backup/restore, negative tests, latency/capacity evidence and founder release authorization.

**Status:** this file is not executable code, test evidence or a commitment to any specific Node/Next/Nest/SQL version. Pin and review versions when implementing.
