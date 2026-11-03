# DRVO ERP — Set up GitHub-controlled staging SQL migrations ONCE

**Scope:** only `DRVO_ERP_STAGING` on the existing DRVO ERP VPS. Keep `drvoerp-deploy`, `drvoerp-web`, `drvoerp-api`, Casher, DRVO AutoResponse and old Clinics staging untouched.

**Security:** This is **not** permanent AI root access. It is a separate fixed SSH receiver restricted to SQL migration payloads, database-local SQL DDL and backups. ChatGPT/connected GitHub can propose PRs and merge reviewed changes; any routine SQL execution is started by an authorized human from the GitHub Actions page using `Run workflow`. No new SSH shell or server-wide SQL privileges are exposed.

## Delivered source code

| File | Purpose |
|---|---|
| `prepare-once.sh` | One-time root installer, existing Admin hidden prompt, scoped login, SSH key and forced command |
| `sql-bootstrap.cjs` | Finishes outstanding K5A SQL DDL + independent pre/post restores, then creates the scoped SQL migration user |
| `receive-sql.sh` | Root-owned forced SSH command; allows only `migrate <40-hex-SHA>`, enforces exclusive lock |
| `receive-sql.cjs` | Root-owned data-only JSON SQL migrator with checksums, schema history drift guard, SQL backup and transaction |
| `build-payload.cjs` | GitHub runner serializes the reviewed `db/migrations/*.sql` without executing untrusted shell content |
| `.github/workflows/staging-db-migrate.yml` | Manually authorized staging DB deployment from main; separate `staging-db` environment secrets |
| `.github/workflows/staging-db-automation-ci.yml` | Disposable SQL Server 2022 integration and independent restore evidence |

## Step 1 — Review CI and merge the automation PR

Open the PR from the GitHub repository. Require both `DRVO ERP — Staging Database Automation CI` jobs (guarded-sql-migrator and root-bootstrap-proof), K0, K1 and staging artifact CI to PASS. Merge to `main` and allow the existing regular application deployment to finish.

Do NOT run this installer from an unreviewed PR branch. The installer refuses a dirty checkout and non-`main` branch.

## Step 2 — ONE LAST interactive VPS root session

```bash
sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
sudo bash /srv/drvo-erp/repo/ops/staging/db-automation/prepare-once.sh
```

You will be prompted for the **existing** SQL Admin login (default `sa`) and password **locally with input hidden**. Do not put a SQL password in chat, GitHub secrets, shell command arguments or files.

The installer first verifies the K4 `/api/health/db` status and that the repo is clean. It then pins the SQL client libraries into a root-owned folder. Using the existing Admin **in process memory only**, it applies the outstanding K5A migration `002_identity_sessions_and_roles.sql` if not already applied, with pre/post COPY_ONLY checksum backups and **independent restore to isolated throwaway DBs** (the reviewed K5A script). If K5A already exists, it checks its stored SHA-256 checksum.

Next it creates **only two new identities**, completely separate from the app runtime:
- Linux SSH account: `drvoerp-dbdeploy` with SSH `authorized_keys` forced command, no sudo permissions.
- SQL Server login: `drvo_erp_stage_migrator` in **`DRVO_ERP_STAGING` only**, with `db_ddladmin`, `db_backupoperator`, migration-history access, and `CONTROL ON SCHEMA::core` so future reviewed core-schema migrations can grant the app narrowly-scoped permissions. This principal is DDL-powerful within the isolated staging database, but not `sysadmin`, `dbcreator` or `db_owner`.

Its SQL secret stays **only** in `/etc/drvo-erp/staging-db-automation.env`, root-owned and group-read-only `0640` for the specific SSH user. The existing `/etc/drvo-erp/staging-sql.env` stays unchanged. `DRVO_K5_AUTH_ENABLED` stays OFF.

The installer generates a unique SSH key temporarily in:
`/root/drvo-erp-db-bootstrap/id_ed25519`.

## Step 3 — Configure GitHub Environment and FOUR secrets

Open:

- `https://github.com/tarek-saad-dev/drvo-erp/settings/environments`
- Create a new environment exactly named **`staging-db`**.
- Restrict deployment branches/tags to **`main`** only. If Required Reviewers are available on the account/organization plan, enable them. On many private-repo plans Required Reviewers are unavailable; in that case use manual `workflow_dispatch` with typed confirmation and a protected `main` branch, not an imaginary approval gate.
- Add the following **Environment secrets**:

| Secret key | Value |
|---|---|
| `DRVO_DB_STAGE_HOST` | `187.77.83.120` |
| `DRVO_DB_STAGE_USER` | `drvoerp-dbdeploy` |
| `DRVO_DB_STAGE_SSH_PRIVATE_KEY` | Entire private key printed by `sudo cat /root/drvo-erp-db-bootstrap/id_ed25519` **only in your own VPS console; paste directly into GitHub secret** |
| `DRVO_DB_STAGE_KNOWN_HOSTS` | One public `187.77.83.120 ssh-ed25519 ...` line printed by the installer. Do not improvise or use `StrictHostKeyChecking=no`. |

The installer prints the server's ED25519 fingerprint; compare it with the independently known VPS fingerprint before trusting the public host-key line. Do not send your SSH private key or SQL password back to ChatGPT, screenshots, or GitHub issues.

**Do not place SQL Admin credentials in GitHub.** These four secrets authorize only the new forced-command SSH route.

## Step 4 — Run GitHub's SQL workflow (no VPS SSH)

Open:

`https://github.com/tarek-saad-dev/drvo-erp/actions/workflows/staging-db-migrate.yml`

Choose **Run workflow → Branch: main**. In the `confirm_database` text input, type exactly:

`DRVO_ERP_STAGING`

Then run the workflow. It runs repo checks and API tests, builds a checksummed SQL-only JSON payload from the checked-out main SHA, and sends it using the **dedicated SSH key**. The forced command cannot execute `bash`, `sudo`, `whoami` or arbitrary files. It can execute only its installed migration engine.

If K5A was installed during Step 2, the **first run should normally be a safe NOOP**:

```text
DRVO DB MIGRATION NOOP: all 2 checksums match
```

For a new reviewed migration (e.g., `003_*.sql`) the expected lines are:

```text
PASS: pre-migration COPY_ONLY checksum backup: /var/opt/mssql/data/...
APPLIED: 003_example.sql
DRVO DB MIGRATION PASS: 1 applied; 3 total; commit ...
```

**Important:** Normal SQL workflow does `BACKUP DATABASE ... COPY_ONLY, CHECKSUM` before DDL. It does **not** automatically execute independent `RESTORE` on every run because the dedicated SQL login intentionally lacks `dbcreator`/server-wide RESTORE privileges. The one-time K5A bootstrap performs the independent restore test; future recovery drills need a separate controlled operator workflow.

## Step 5 — REMOVE THE TEMPORARY VPS PRIVATE KEY

Only after the GitHub workflow has successfully authenticated and completed its first run:

```bash
sudo shred -u /root/drvo-erp-db-bootstrap/id_ed25519
sudo rm -f /root/drvo-erp-db-bootstrap/id_ed25519.pub
sudo rmdir /root/drvo-erp-db-bootstrap
```

This is the one extra security-cleanup command after GitHub verification. Your SSH private key remains in GitHub Environment secrets, not a loose file on the VPS. Secure SSD deletion by `shred` is not guaranteed on every filesystem, but it removes the normal on-host copy.

## How future work happens

- ChatGPT/Cursor creates reviewed migration `003_*.sql`, tests it on disposable SQL Server, and merges to main after CI.
- Regular Web/API code already auto-deploys via the **unchanged** `staging-deploy.yml` and existing `drvoerp-deploy` key.
- For DB changes, you click **Run workflow** and type `DRVO_ERP_STAGING`; no VPS session.
- The fixed runner refuses wrong DB/principal, payload hashes, filename gaps, historical edits and arbitrary SSH commands, backs up and applies pending migrations.
- New SQL schemas other than `core`, OS changes, new privileged permissions, live production databases, offsite backup services and emergency restore may still require deliberate administrator review and possibly a separate one-time host operation.
- Business authentication, Owner bootstrap and public access remain disabled until K5B/K5C security gates pass.

## Troubleshooting

**Wrong SSH key or known_hosts:** check the *environment secrets*, expected host fingerprint, and that the Unix user is `drvoerp-dbdeploy`; never turn off host-key checking.

**SQL role error:** use a DBA to review `DRVO_ERP_STAGING` database principal only. Do not grant `sysadmin` or `dbcreator`.

**Checksum drift:** someone changed or removed an applied migration. Never delete or overwrite `core.SchemaMigration`. Investigate and add a **new forward-only migration**.

**Backup fails / disk full:** stop, check SQL disk capacity and backup strategy. Do not bypass the pre-migration backup guard. Local backups are not an off-host disaster-recovery plan.

**Migration fails after applying some versions:** SQL transactions protect each migration, not an entire multi-migration chain. Inspect the logged applied version and fix with a new reviewed migration. Don't automatically restore old DB over customer data.

**Auth remains closed:** correct by design. This infrastructure phase does not activate `DRVO_K5_AUTH_ENABLED` or make the ERP customer-ready.

## Security boundaries

GitHub environment and branch protections are access control, not a substitute for reviewing SQL changes. The private repository and manually initiated database workflow minimize risk; they do not make arbitrary SQL automatically safe. If the SSH key or migration SQL account is compromised, an attacker could modify the **isolated staging database**, although the credentials do not confer OS root, SQL sysadmin, or Casher access. Rotate credentials promptly if compromise is suspected. Maintain offsite backup/retention and production-grade monitoring separately.
