# K4A — SQL Server Database Foundation (first bounded implementation)

**Status: development candidate, not an accepted live customer-data schema.**
Changes are intended for the NEW universal `tarek-saad-dev/drvo-erp` product only. Do not apply these migrations to Casher, DRVO AutoResponse, old clinics staging, or any other SQL database.

## Delivered
- One forward-only SQL Server migration in `db/migrations/001_platform_identity_foundation.sql`: `core.Tenant`, `core.Business`, `core.Branch`, `core.Account`, `core.BusinessMembership`, `core.BranchAssignment` and constraints/indexes.
- Global username uniqueness, composite Tenant/Business/Branch foreign keys, explicit business membership, structural branch assignment, revocable active flags, timestamp and `rowversion`.
- Transactional migration engine `migrate.cjs`: checksums, increasing IDs, exclusive transaction-scoped SQL application lock, rollback of failed migration, refusal to execute against unrecognized DB names, strict stage opt-in.
- Typed internal `apps/api/src/data/foundation-repository.ts` that looks up candidate branch assignments using only a verified server actor Account/session version and database-derived Tenant ancestry. **Not an authorization permission grant**.
- SQL Server 2022 CI container tests: repeat migration, drift, failed DDL rollback, cross-Tenant FKs, global username uniqueness, membership revocation, disabled actor/session, optimistic lock and backup-restore into a second DB.

## CI — already safe to run against disposable database
GitHub Workflow `K4 SQL Server Foundation CI` builds the NestJS API, creates a Docker container accessible only at `127.0.0.1:14334`, makes a throwaway database `DrvoK4Disposable`, and runs `node tools/k4-db/verify.cjs`. It uses a newly generated CI-only SA password, never the production VPS or DRVO staging SQL credentials.

To run migrations against **CI** deliberately:
```bash
DRVO_K4_TARGET=ci DRVO_K4_DISPOSABLE=YES SQL_TEST_PORT=14334 SQL_TEST_SA_PASSWORD=<ephemeral-test-password> \
  node tools/k4-db/migrate.cjs
```

## Staging is intentionally NOT migrated automatically by GitHub deploy

The isolated `DRVO_ERP_STAGING` database exists on the VPS, but app login `drvo_erp_stage_app` currently has **CONNECT ONLY**. GitHub Actions deploys the Web and API release binaries; it does not perform DDL or access a privileged SQL credential.

Applying this candidate to staging must wait until CI passes and a reviewed, separate SQL migration principal is available. It requires an explicit operator acknowledgment via environment variables (not secrets in CLI arguments or chat):
- `DRVO_K4_TARGET=staging`
- `DRVO_K4_APPLY_STAGING=YES`
- `DRVO_K4_SQL_HOST=127.0.0.1`
- `DRVO_K4_SQL_PORT=1433`
- `DRVO_K4_SQL_DATABASE=DRVO_ERP_STAGING`
- `DRVO_K4_SQL_USER=<isolated-DDL-operator>`
- `DRVO_K4_SQL_PASSWORD=<read-secret-from-secure-local-source>`

Run only after confirming a current **backup + restore test** and the ADR-030 physical design gates. A privileged migration operator should be narrowly scoped to DRVO_ERP_STAGING. Never reuse the restricted application login for DDL, and never grant unrestricted `db_owner` to the application runtime.

### Decisions still pending before treating this as production schema
- ADR-030 full scope semantics, Owner bootstrap and Manager delegation, support break-glass.
- Real identity authentication (password hashing, session issuance/revocation, actions/roles) is K5; current K3 proof route remains disabled in production.
- SQL security hardening/RLS vs scoped application queries, privileged migration login, backup RPO/RTO, DR rehearsal on actual VPS.
- Domain account identifiers and optional Enterprise grouping policy. The foundation physical schema is an engineering implementation candidate for these concepts.

**Security boundary:** structural branch assignment is never equivalent to effective `branch.read` permission. There is no new HTTP route or customer data exposed by this PR. Production startup remains in `mode=scaffold` until subsequent reviewed phases.
