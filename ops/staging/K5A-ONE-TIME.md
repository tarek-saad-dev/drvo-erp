# K5A one-time SQL Server Migration (existing administrator; no new SQL login)

**This is NOT public authentication activation.** The goal is to migrate the structural identity/role tables into `DRVO_ERP_STAGING` and give the existing application identity the minimal SQL grants needed for later guarded auth.

Prerequisites:
- K4B successful and `GET http://127.0.0.1:3311/api/health/db` returns `database:ready`.
- Latest GitHub K5A PR merged and staging Web/API code auto-deploy successful.
- Shell is an interactive root session on the **existing DRVO ERP VPS**. Do not run on Casher or other app servers.
- The existing SQL Admin account that was used for K4B is available. Do **not** paste its password into chat, GitHub secrets or files.

Run exactly:

```bash
sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
sudo bash /srv/drvo-erp/repo/ops/staging/k5a-apply-once.sh
```

The script checks the correct isolated database `DRVO_ERP_STAGING`, the staged K5 release, and K4 readiness; prompts for the **existing SQL Admin password (hidden)**; makes a checksum backup, independently restores the backup to a temporary DRVO-only database and checks migration history; applies the new K5 forward migration transactionally and replays it; grants **read and only specific auth-related writes** to the existing `drvo_erp_stage_app`; confirms the application principal has neither db_owner, db_ddladmin, db_datawriter nor Business UPDATE/CREATE TABLE; then makes and independently restores a post-migration backup.

Expected:

```text
PASS: checksum backup verified: pre ...
PASS: independent backup restore verified: pre
PASS: existing application identity has only reviewed auth permissions
PASS: checksum backup verified: post ...
PASS: independent backup restore verified: post
K5A SQL STAGING MIGRATION: PASS
K5A VPS SQL FOUNDATION: PASS
```

No business records, owner accounts or employee logins are created. No API service is restarted by this script, and **`DRVO_K5_AUTH_ENABLED` remains OFF**. The public site still shows only scaffold/demo content.

Backups remain on the SQL host under `/var/opt/mssql/data/drvo_k5_*_{pre,post}.bak`. They are not a replacement for off-site copies, scheduled backups, retention and recovery drills.

If any step fails, stop and share only the *non-secret error summary*; do not rerun blindly after partial DDL. K5 is not complete until owner onboarding/verified email, user management, full RBAC matrix and production security tests are delivered. There is no automatic production SQL DDL deploy via GitHub.
