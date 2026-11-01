# K0 foundation scaffold — scope and limitations

**Status:** First runnable non-production TypeScript foundation PR only. This is *not* the full Next.js/NestJS application, SQL Server tenancy solution or usable ERP.

- `packages/contracts`: portable type contracts, no domain business models.
- `packages/kernel`: pure, in-memory **test fixtures only** for scope ancestry and Required module closure. Neither is a trusted authorization or activation service.
- `apps/api`, `apps/worker`, `apps/web`: explicit boundaries; API/worker compile to inert placeholders, web holds Next.js handoff note.
- `tests`: Node built-in tests run against compiled TypeScript. They test only pure functions, **not** HTTP, SQL, finance, RLS, concurrency or authenticated execution.
- `.github/workflows`: CI compiles TypeScript, runs fixture unit tests and basic dependency guard. No SQL or integration test stage yet.

Commands (Node 22, npm): `npm ci`, `npm run verify`. TypeScript 5.8.3 is locked in `package-lock.json`.

## Hard gates before adding protected code

1. Ratify ADR-030 authentication, tenant membership, authorization and actual SQL scope constraints with negative tests.
2. Compare SQL Server driver and migration tools on a disposable SQL Server before first schema. Confirm real backup/restore.
3. Ratify ADR-032 before implementing any paid or real persisted activation; this fixture has **no user accounts, commercial state or quote approval**.
4. Ratify ADR-031 financial source-of-truth and first GL contract before POSTED POS transactions.
5. Pin and test actual framework versions once Next/Nest dependencies are added. The TypeScript lockfile exists, but CI is not evidence of operational tenant security.

Read [Phase-1 Work Package](docs/04-execution/PHASE-1-FOUNDATION-IMPLEMENTATION-PACKET.md).
