# DRVO ERP — Stage Report K2: Disposable SQL Server Evidence

**Report date:** 2026-11-01  
**Stage:** Isolated SQL Server test infrastructure and relational safety spike  
**Outcome:** **DONE FOR THIS BOUNDED EXPERIMENT — NOT SQL architecture approval or production readiness**  
**Code change:** [PR #9](https://github.com/tarek-saad-dev/drvo-erp/pull/9), merged to `main` as commit `95d85599085e502fb1ad524d5d68c63754f98fa1`.  
**CI:** GitHub Actions PR head `c3424d7d0dc5c77362b2508686a050a6d36d6bd8`: K0 Foundation **SUCCESS**, K1 Runtime **SUCCESS**, K2 SQL Server Disposable Spike **SUCCESS**. Job: `isolated-sqlserver` **SUCCESS**, run ID `41335134286`. [CI evidence](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41335134286).

## Implemented

1. Added `tools/sql-spike` with disposable SQL Server 2022 (Developer edition) test tooling, node `mssql` driver **for the spike only**, and a separate SQL fixture.
2. Temporary container restricted to GitHub runner loopback `127.0.0.1:14333`. One ephemeral SA password generated per job; no Cut Salon credentials or SaaS customer data.
3. Composite relational keys for test-only Tenant → Business → Branch → Resources, scoped read example, SQL Server `rowversion` compare-and-swap, explicit transaction and financial `DECIMAL(19,4)` arithmetic.
4. Checksum-tracked fixture migration with idempotent replay and transactional DDL.
5. Real backup from test DB and RESTORE to a **second throwaway DB**, followed by data verification; cleanup step removed SQL container.

## Actual checks passed

| Test | Result |
|---|---|
| 01 Migration applies once, same SHA second run is no-op | PASS |
| 02 Cross-Tenant Business↔Branch relationship refused by composite FK | PASS |
| 03 Cross-Branch resource ownership refused | PASS |
| 04 Tenant/Business-scoped SELECT excludes another Tenant | PASS |
| 05 Rowversion stale update refused | PASS |
| 06 Transaction rollback leaves no persisted money row | PASS |
| 07 SQL DECIMAL(19,4) exact sum | PASS |
| 08 Backup and independent restore returns original data | PASS |

**Important:** a scoped SELECT is a proof of the query used, NOT that all APIs are securely scoped. No real authenticated context, RLS, roles/membership, storage/search/caches, production backup or financial sale+GL were tested.

## No hosting link yet

This stage changes backend test infrastructure only. No public website has been deployed. Existing Next.js web project is a **local-only non-production development preview**. [PR #6](https://github.com/tarek-saad-dev/drvo-erp/pull/6) is the web/API/Worker runtime checkpoint; a verified public HTTPS preview requires a connected hosting provider or a reviewed enabled deployment flow.

## Explicit remaining decisions

- **ADR-030** baseline trusted actor, Owner membership, branch delegation, support access, physical DB constraints/optional RLS and API/worker negative tests are **not signed**.
- This one SQL Server driver worked under the disposable fixture, but the **final data access/ORM/migration runner has NOT been selected** or benchmarked against alternatives.
- The real VPS SQL Server version, runtime sizing, backup RPO/RTO, secret isolation and restore procedure have **not been verified**.
- **ADR-031** finance first GL and **ADR-032** paid Module activation remain proposal decisions.
- A committed lockfile for `tools/sql-spike` is desirable before treating the test-tool build as reproducible; app lockfile hardening remains [Issue #8](https://github.com/tarek-saad-dev/drvo-erp/issues/8).

## Next stage

**K3 — Authoritative scope and identity preparation**: ratify in-scope ADR-030 permission/Owner/bootstrap design, add SQL Server integration checks for a trusted authorization path, and implement narrowly scoped development-only Tenant/Business/Branch and membership APIs with negative integration tests. In parallel complete production-ready app lockfiles and preview-hosting decision. Only then move to Kernel Module Registry, free test grant and subsequent SaaS Commercial Core.

**No VPS, production SQL Server, customer data, paid processing, online financial posting, or public deployment was changed or claimed in this phase.**
