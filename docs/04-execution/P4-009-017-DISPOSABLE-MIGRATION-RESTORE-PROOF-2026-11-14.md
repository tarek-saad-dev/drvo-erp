# P4 — Disposable SQL 009 → 017 migration/restore proof

**Date:** 2026-11-14  
**Status:** GitHub source-only P4 proof PR. **NOT a live K5F/VPS rollout, approval, or offsite recovery drill.**

## Scope and architectural impact
- Current P1/K5F operator readiness checker and `tools/staging-readiness/manifest-plan.cjs` intentionally support **observing only SQL 001–009**. Those checks must remain unchanged until independently reviewed operational migration and checker update.
- Reuse **the exact restricted staging SQL-only receiver/migrator** (`ops/staging/db-automation/receive-sql.cjs`) in disposable localhost SQL Server 2022 CI, not a new, privileged migration system or client-executable endpoint.
- Reproduce a clean K5F **001–009** in disposable CI, assert ordered migration filenames and SHA-256 source checksums, run **only 010–017** as pending via the same restricted migrator, assert idempotent full replay and source-drift denial.
- Assert the actual **pre-upgrade checksum COPY_ONLY backup** independently restores to a separate disposable DB with exactly **001–009**, no later Booking/Catalog/POS schema and identical migration checksums.
- Assert a separate disposable **post-017 backup** restores exact 17 migration checksums, existing POS Draft FK/Status, Booking Lifecycle procedures, Booking dated resource windows and close audit/state. No production data, remote SQL, tenant accounts or runtime feature-flag change.
- Staging SQL principal must be DB-only scoped DDL+backup; no `db_owner`, server `sysadmin` or `dbcreator`. Preserve K5F private flags OFF.

## How to review proof
- The existing `.github/workflows/staging-db-automation-ci.yml` job `guarded-sql-migrator` automatically runs `tools/staging-db-automation/verify.cjs` in **ephemeral SQL Server 2022**, with an isolated throwaway DB and backup volume.
- A green job proves **CI path 009→017 and disposable pre/post restore**, not that any real VPS already has 009, that root-owned K5F operator bundle passed, that a **remote offsite encrypted restore** succeeded, or that SQL migration was approved.
- This PR changes only the disposable CI verification script and docs; no migration SQL changed and no SQL deployed/applied on VPS.
- Required external gates remain: P1 trusted root-operator evidence of `release.sha`, live SQL 001–009 hashes and scoped roles; P2 encrypted off-host DRVO-only independent restore; P3 trusted proxy/Origin/identity tests; DBA/security/founder approval of SQL 010–017 maintenance; audited post-upgrade K5F checker transition and rollback/recovery plan. Do not invoke manual `staging-db-migrate.yml`.

## Negative test assertions
- Migration payload edited checksum/reordered index rejected.
- Historical source drift and repeated application cannot rewrite history.
- Restored pre-upgrade DB has **exact 009 baseline**, no post-009 tables.
- Restored post-upgrade DB has **017 checksum history**, scoped POS+Booking schema.
- Restricted SQL migrator cannot become sysadmin/dbcreator/db_owner.

**Operational status:** Salon [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) P4 remains NOT AUTHORIZED. No SQL migration executed on VPS, no Public Auth, no paid subscription, no first real salon GO.
