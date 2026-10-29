# SQL Server Data Access — Pre-code Decision Memo
Date 2026-10-29. Status: RECOMMENDATION / NOT SIGNED OFF. No code, dependencies, database changes or benchmarks executed.

## Decision context
Founder approved SQL Server on VPS and Windows Browser PWA/IndexedDB. Recommended backend: NestJS modular monolith. Critical requirements: multi-tenant scoped access, reliable financial transactions, source-event deduplication, accounting decimal precision and outbox, transaction-safe credit, immutable journals, schema migrations.

## Compared options (current documentation checked 2026-10-29)
1. **node-mssql + tedious and explicit repository/data-mapper layer**: strongest direct control of SQL Server transactions, locking, query plans, indexes and parameterized commands; costs more SQL and mapping work. RECOMMENDED BASELINE for correctness-critical writes, subject to proof.
2. **TypeORM + SQL Server driver**: entity/migration convenience; SQL Server driver works, but documented pooled-connection transaction isolation state issue requires carefully verified transaction-level settings. Candidate for simple CRUD only if a single coordinated transaction strategy is demonstrated.
3. **Prisma ORM v7 + @prisma/adapter-mssql**: SQL Server supported in v7, schema and migrations require SQL Server-specific care; raw queries and migration operations have caveats. Latest Prisma ORM v8 preview initially does not support SQL Server; therefore pin a compatible major if chosen. Not recommended as default without validation of RLS/connection context and financial transaction behavior.

Sources checked:
- https://github.com/tediousjs/node-mssql (transaction connection behavior)
- https://typeorm.io/docs/drivers/microsoft-sqlserver/ (pool isolation known issue)
- https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sql-server (v7 support and Migrate caveats)
- https://www.prisma.io/docs/orm (v8 support caveat)

## Proposed standard (not approved)
Use **node-mssql with tedious** in a NestJS infrastructure module; a request-scoped business authorization context is validated before repository calls. Each financial command uses one explicit SQL transaction, parameterized statements, row-level locks/unique indexes where needed, and atomic outbox record. Do not rely on global mutable session state for tenant permission. SQL Server Row-Level Security is optional defense-in-depth after pooled-session tests. Keep TypeScript domain services independent of SQL driver.

Schema changes are **reviewed, versioned SQL scripts** with up/down/recovery strategy appropriate to irreversible accounting changes, executed on isolated DRVO DB only. No production destructive auto-sync and no migration generated/applied now.

## Verification plan before locking the choice
- Validate SQL Server version/edition and compatible Node + driver versions on staging, not production.
- Transaction tests: simultaneous credit updates, over-limit online, isolation, rollback on outbox failure, double submit, deadlock retry.
- Tenancy tests: wrong Tenant/Business/Branch scope for reads, writes, exports and worker.
- Numeric tests: DECIMAL and commission rounding; failed payment not settled.
- Migration tests: fresh DB install, repeat migration, rollback plan, schema drift and a tested restore.
- Load tests: pool connection exhaustion, transaction timeouts, isolation level contamination and tenant context leakage.
- Confirm observability, secrets, TLS and off-host backups.

## Unresolved before code permission
Actual VPS and SQL Server inspection, off-host backups and restore test, supported browser/Windows versions, offline auth session TTL and device profile policy, final technical choice (this memo is a recommendation), country tax integration constraints, owner explicit authorization for code.

No test executed. Do not call the architecture implemented.
