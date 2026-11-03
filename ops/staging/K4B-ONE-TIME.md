# K4B — One-time DRVO ERP SQL cutover on VPS

**Status: operator action still required. The code CI cannot access privileged VPS SQL.**

## What is already present

- VPS has **DRVO_ERP_STAGING** (empty) and existing SQL app login `drvo_erp_stage_app` (CONNECT-only), with root-only `/etc/drvo-erp/staging-sql.env` (0600). This new DRVO database is NOT the Casher database.
- Both DRVO ERP systemd services and GitHub CI/CD are running successfully on loopback 3310/3311; app code deploys from GitHub Actions on main.
- `db/migrations/001_platform_identity_foundation.sql` was tested in disposable SQL Server CI but has NOT yet been applied to VPS.
- This K4B change introduces optional DB connectivity and a non-sensitive `GET http://127.0.0.1:3311/api/health/db` readiness check. The default is OFF until this script explicitly enables it.

## One operator command — only after K4B PR is merged and staging auto-deploy is green

From an **interactive root SSH session on the VPS** (NOT Cursor/GitHub Actions):

```bash
sudo bash /srv/drvo-erp/repo/ops/staging/k4b-enable-once.sh
```

**Note:** You must first ensure the VPS checkout contains this new script. The currently installed GitHub deployment transports compiled Web/API releases, NOT the Git source tree. To fetch this one-time operator script, run from the VPS:

```bash
sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
sudo bash /srv/drvo-erp/repo/ops/staging/k4b-enable-once.sh
```

You will be prompted for the **existing SQL Administrator login and password**, same account already used to initialize the isolated DRVO staging database. Password input is hidden. Do NOT copy this secret to chat, GitHub or application environment.

The cutover automatically:
1. Validates exact new DB name, server=127.0.0.1, port=1433, existing root-only app credentials, and that the SQL DB has NO unrelated tables.
2. Creates **pre-migration COPY_ONLY checksum backup**, verifies checksum and **RESTOREs to a unique disposable DRVO-only database**, validates table counts, then drops just that disposable DB.
3. Applies versioned SHA-checked SQL migration with transaction+lock, validates replay, and checks final tables.
4. Grants only explicit SELECT on K4 core tables to the **existing** `drvo_erp_stage_app`; no third SQL login, no runtime DDL permissions.
5. Connects with the existing app credential, confirms SELECT/readiness and verifies no db_owner/db_ddladmin/db_datawriter/CREATE TABLE/UPDATE privilege.
6. Creates **post-migration checksum backup**, independently restores into a second uniquely named DRVO test DB and validates schema history, drops only that test DB.
7. Adds a drop-in **only** to `drvoerp-api.service`, with `EnvironmentFile=/etc/drvo-erp/staging-sql.env` and `DRVO_SQL_ENABLED=YES`. systemd reads the root-only file. This does NOT touch Nginx, DRVO AutoResponse, old Clinics staging, Casher or any other service.
8. Restarts **only** the new DRVO ERP API, checks `/api/health/db`, standard Web and API liveness, plus HTTPS 200. On readiness failure the new API drop-in is automatically removed and the prior API runtime settings restored. Applied migrations are forward-only: they are not silently rolled back; backups remain available.

Expected successful output:
```text
PASS: staging DB verified, no unrelated tables; size within bootstrap limit
PASS: backup + checksum verify (pre): ...
PASS: independent restore + schema verification (pre)
PASS: K4 schema migration applied / replay verified
PASS: granted existing app login SELECT on seven K4 core tables only
PASS: existing app login can SELECT only; cannot UPDATE or CREATE TABLE
PASS: backup + checksum verify (post): ...
PASS: independent restore + schema verification (post)
K4B SQL STAGING CUTOVER: PASS
...
{"status":"ok","service":"drvo-api","database":"ready"}
K4B VPS DATABASE + BACKEND CONNECTION: PASS
```

## Preflight caveats and recovery

- The fixed SQL backup/restore path is **`/var/opt/mssql/data`** on the SQL Server host. If SQL Server is containerized or data lives elsewhere, the script intentionally stops BEFORE DDL. Do not manually create a directory or change global DB settings to force it.
- The operator script intentionally refuses to run if SQL DB is over 512 MB, has tables outside the approved 7-table K4 schema, if the runtime app is over-privileged, or if the new API release hasn't deployed yet. Investigate and review the exception instead of bypassing it.
- The backup files are retained on the SQL server, but **storage-local backups alone are not a full DR policy**. Later configure rotation/off-host copy, recovery objectives and scheduled restore drills.
- If failure happens after DDL migration but before the backend starts, the schema is retained; the API config is rolled back, and you can fix the error without undoing financial/customer data (none has been seeded here).
- **Do not rerun the one-time systemd setup** if the `30-k4b-sql.conf` drop-in exists. Inspect status and health first.
- Preview remains publicly viewable but shows synthetic / scaffold content only. Login/RBAC and protection before sensitive customer data are distinct follow-up gates.

## Limitations after successful K4B

**K4B provides a real SQL connection but NOT business API, K5 authentication, data writes, financial accounting, worker authorization, or full production readiness.** The new `/api/health/db` returns readiness only. K5 will add role-specific SQL grants and trusted scoped write transactions after security sign-off.
