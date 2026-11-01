# K2 — Disposable SQL Server Scope & Recovery Experiment

**Not application persistence. Not accepted SQL schema. Not proof of ADR-030 tenant authorization.**

This tool tests one sample composite Tenant→Business→Branch foreign-key layout, explicitly scoped resource reads, rowversion compare-and-swap updates, transaction rollback, DECIMAL precision, migration checksums/replay and an actual SQL Server backup/restore into a second disposable database.

## Execution

GitHub Actions [K2 SQL Server Disposable Spike](../../.github/workflows/sqlserver-spike.yml) starts `mcr.microsoft.com/mssql/server:2022-latest` in a temporary container with a generated test-only SA password, binds only localhost port 14333, installs `mssql` within this **test tool only** and runs `verify.cjs`. It then removes the container.

No production SQL service, customer data, shared VPS, payment account or SaaS subscriptions are connected. A clean PASS verifies only these specific physical SQL experiments, **not** HTTP authentication, signed trusted context, Business membership, RLS, cross-module contracts, SQL Server enterprise capacity or production recovery.

## Following gates

- Review real SQL Server edition/host/storage as well as alternative ORM/query builder and transaction ergonomics.
- Authorize final SQL design/authorization matrix and explicitly sign ADR-030 before protected data code.
- Expand negative tests to application, API, jobs, files, cache, exports and support.
- Perform a real backup restore on the chosen operational environment and define RPO/RTO.
- Pin the test-tool dependency lockfile when selecting the production DB driver.
