# DRVO ERP — K4B SQL Staging Cutover Implementation and CI Report

**Date:** 2026-11-03  
**Status:** **K4B VPS SQL CUTOVER PASS (operator output verified 2026-11-03); production-data security/backup gates still open**  
**Merged:** [PR #19](https://github.com/tarek-saad-dev/drvo-erp/pull/19), SHA `aa200158b6bc7aceef106ba8af8a102d7170c0b2`.

## Implemented
- No new SQL Server principal is required on the VPS. The existing authorized SQL administrator is used via ONE hidden interactive operator prompt for schema migrations/backup/restore. The existing `drvo_erp_stage_app` account remains the runtime identity with **read-only K4 core table SELECT grants** (not schema DDL/DML).
- `ops/staging/k4b-sql-cutover.cjs`: fail-closed target `DRVO_ERP_STAGING`, local SQL 127.0.0.1:1433 and root-only current app env; rejects unexpected tables / large DB; creates pre-migration COPY_ONLY checksum backup + verifies and restores it to a unique throwaway database; applies SHA-checksummed locked migration and replays; grants object-scoped read access and checks no DDL or write; creates post-migration backup + independently restores with schema verification. No Casher, old clinics or other system DB is targeted.
- `ops/staging/k4b-enable-once.sh`: operator-only root shell wrapper, fetches clean main, verifies new managed API bundle present, collects password without echo, runs SQL cutover; only after SQL proof succeeds adds `EnvironmentFile=/etc/drvo-erp/staging-sql.env` to **drvoerp-api.service** and enables `DRVO_SQL_ENABLED=YES`; checks local API DB readiness and Web/HTTPS, and reverts API systemd drop-in automatically if readiness fails. SQL migration remains forward-only; backups remain on the SQL Server.
- `apps/api/src/data/foundation-database.service.ts` + `database-health.controller.ts`: opt-in NestJS pool initialized only with explicit local staging SQL config and existing migration record. `GET /api/health/db` returns only a non-sensitive readiness result; no business data endpoints or login service have been opened.
- `tools/k4-db/verify-operator-ci.cjs`: CI runs the **exact same privileged SQL cutover module** with a throwaway SQL instance, a new throwaway app login, and a mounted ephemeral SQL data folder; this does NOT use VPS secrets or connection.

## Evidence
- K4 SQL Server Foundation CI: **23/23 base SQL checks passed** including verified API opt-in connection under read-only SQL and real backup/restore of the first disposable database.
- Additional exact K4B operator SQL script on disposable GitHub CI: **PASS**. Evidence includes two independent checksum backups and database restores, migrations/checksum replay, seven granted SELECT-only tables, and explicit denial of app UPDATE/CREATE TABLE.
- K0, K1, K3, DevOps Staging Artifact CI: all **SUCCESS** on PR head `94442fdd3068ea409f9d14d4b0173e5b7bbe3b16`.
- This evidence does **not** establish that the VPS `DRVO_ERP_STAGING` has been migrated, that the root-only app secret has been wired to systemd, that external backup rotation exists, or that business endpoints are secure.

## One operator step required
See [K4B one-time VPS runbook](../../ops/staging/K4B-ONE-TIME.md). After GitHub main auto-deploy finishes:

```bash
sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
sudo bash /srv/drvo-erp/repo/ops/staging/k4b-enable-once.sh
```

Admin login and password are entered hidden **locally** and are never sent to GitHub/ChatGPT. If any preflight fails, stop and inspect; do not bypass guards or widen production SQL privileges.

## Remaining full ERP gates
Real end-user authentication, Role/Action authorization, activity/audit, data writes, and business APIs belong to K5; the core schema is populated with **zero customer records**. ADR-030 physical isolation and support/Owner decisions remain awaiting sign-off. Before customer data, restrict public Staging, configure off-host backup rotation/restore policy and monitoring. All old services stay untouched.

## 2026-11-03 operator evidence — real VPS K4B cutover PASSED

**Authoritative evidence:** the owner pasted complete local root-shell output. This section supersedes the earlier **not-yet-run** checkpoint above; ChatGPT did not directly connect to the VPS.

- `/srv/drvo-erp/repo` fast-forwarded successfully from `bc3419c` to `07407c5`; the installed GitHub-managed API release contained the K4B database service.
- Script explicitly announced `Current database: DRVO_ERP_STAGING only`, accepted the existing SQL administrator through a hidden interactive prompt.
- `PASS: staging DB verified, no unrelated tables; size within bootstrap limit`.
- Pre-migration COPY_ONLY/checksum backup created at `/var/opt/mssql/data/drvo_k4b_f2f2a4fa38c3_pre.bak`; independent restored database verified.
- `PASS: K4 schema migration applied / replay verified`.
- Existing `drvo_erp_stage_app` granted SELECT on exactly seven core K4 objects and verified unable to UPDATE or CREATE TABLE.
- Post-migration checksum backup created at `/var/opt/mssql/data/drvo_k4b_f2f2a4fa38c3_post.bak`; independently restored and verified.
- SQL script returned `K4B SQL STAGING CUTOVER: PASS`.
- API-only systemd opt-in SQL connection enabled; both `GET /api/health` and `GET /api/health/db` succeeded with `{"status":"ok","service":"drvo-api","database":"ready"}` on the DB readiness endpoint. Frontend remained responsive.
- Final script returned **`K4B VPS DATABASE + BACKEND CONNECTION: PASS`**; it reports no restart of Casher or other projects.
- The server printed Node.js `DEP0123` TLS ServerName/IP deprecation warning. Not a failure; follow up TLS configuration and certificate validation.

**Milestone decision:** K4 Database Foundation staging migration, on-host double restore rehearsal, limited runtime permissions, and actual NestJS SQL connectivity are **COMPLETE based on owner-reported command evidence**. Distinct follow-up gates remain: approved ADR-030 roles and scope policy, K5 real authentication/authorization and protected business APIs, access restrictions before real tenant data, off-host backup/rotation with RPO/RTO and monitoring. The Web/API still report `mode=scaffold` on their liveness endpoints; DB readiness is not business readiness.
