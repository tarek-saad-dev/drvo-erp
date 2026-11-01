# ONE-TIME DRVO ERP VPS + GitHub + Empty SQL Staging — Operator runbook

Date: 2026-11-02. **Do not use with real customer data until identity/access control, migration/backup policy, and staging access restrictions are approved.** Commands concern **only** the new `tarek-saad-dev/drvo-erp` project.

**NEVER touch:** unrelated `drvo-erp-staging.service`, `staging-erp.drvotech.com`, port 5501, `casher.service`, DRVO AutoResponse on port 3100, or existing business SQL databases. New DRVO ports: Next.js 3310, API 3311. New domain: `erp-stage.drvotech.com`.

## Phase A — VPS, once (root SSH session)

```bash
set -Eeuo pipefail
echo '=== Preflight: existing new DRVO ERP services ==='
systemctl is-active drvoerp-web.service drvoerp-api.service
curl -fsS http://127.0.0.1:3310/health
curl -fsS http://127.0.0.1:3311/api/health

echo '=== Update new project's source, never other apps ==='
sudo -u drvoerp -H git -C /srv/drvo-erp/repo status --short
sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
cd /srv/drvo-erp/repo
bash -n ops/staging/prepare-host-once.sh
bash -n ops/staging/receive-release.sh
bash -n ops/staging/start-web.sh
bash -n ops/staging/start-api.sh

echo '=== Generate separate deployment key, only if absent ==='
if [[ ! -e /root/drvo-erp-ci-deploy-key && ! -e /root/drvo-erp-ci-deploy-key.pub ]]; then
  sudo ssh-keygen -t ed25519 -a 100 -f /root/drvo-erp-ci-deploy-key -N '' -C drvo-erp-github-staging
elif [[ ! -s /root/drvo-erp-ci-deploy-key || ! -s /root/drvo-erp-ci-deploy-key.pub ]]; then
  echo 'One deployment key file is missing; STOP rather than replacing a partially provisioned credential.' >&2
  exit 1
fi

echo '=== Install restricted deployment receiver and safe boot fallbacks ==='
if [[ -f /etc/sudoers.d/drvoerp-deploy || -s /var/lib/drvoerp-deploy/.ssh/authorized_keys ]]; then
  echo 'Deployment identity appears to exist. STOP to audit current state; do not overwrite it.' >&2
  exit 1
fi
sudo bash ops/staging/prepare-host-once.sh /root/drvo-erp-ci-deploy-key.pub

echo '=== Check active/new services, no forced restart ==='
sudo systemctl is-active drvoerp-web.service drvoerp-api.service
curl -fsS http://127.0.0.1:3310/health
curl -fsS http://127.0.0.1:3311/api/health
sudo systemctl cat drvoerp-web.service
sudo systemctl cat drvoerp-api.service
echo 'VPS bootstrap done. Next: GitHub Environment secrets.'
```

If `git status --short` shows *tracked changes*, don't overwrite them: do not run `git reset --hard`. If the installer fails, stop and examine the partial setup; do not blindly retry. The installer only prepares the drop-ins and does not restart running services.

## Phase B — Set GitHub staging secrets (owner UI only)

Go to `https://github.com/tarek-saad-dev/drvo-erp/settings/environments`. Create **staging**, restrict deployments to `main`. Optionally require an independent reviewer (do not configure self-review prevention if there is no eligible independent reviewer). Add **Environment Secrets**:

- `DRVO_STAGE_HOST` = VPS public IPv4 (operator verified)
- `DRVO_STAGE_USER` = `drvoerp-deploy`
- `DRVO_STAGE_SSH_PRIVATE_KEY` = full content of root-only `/root/drvo-erp-ci-deploy-key`. Copy directly into trusted GitHub UI; **NEVER paste into a chat, CI log, PR, or issue**.
- `DRVO_STAGE_KNOWN_HOSTS` = one checked SSH ED25519 host public-key line. Create locally:
  ```bash
  sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
  sudo awk '{print "187.77.83.120 " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
  ```
  Independently verify the ED25519 fingerprint from a trusted SSH connection before accepting the value. Do not disable strict host key checking.

`sudo cat /root/drvo-erp-ci-deploy-key` is the means to view the private key for copy/paste **only into GitHub Secrets from an administrator terminal**. Do not include this command's output in shared logs. Prefer secure desktop terminal over shared screen.

## Phase C — First manual deploy, verify revision

GitHub → Actions → **DRVO ERP — Staging Deploy** → Run workflow on `main`. If configured, approve the `staging` Environment. This first run still needs direct human action.

After success, run on VPS:
```bash
sudo systemctl is-active drvoerp-web.service drvoerp-api.service
sudo readlink -f /srv/drvo-erp/deploy/current
sudo cat /srv/drvo-erp/deploy/current/release.sha
curl -fsS http://127.0.0.1:3310/health
curl -fsS http://127.0.0.1:3311/api/health
curl -sSI --max-time 10 https://erp-stage.drvotech.com/ | head -n 12
```
Check on mobile `https://erp-stage.drvotech.com`. GitHub SHA must match `release.sha`.

## Phase D — Turn on automatic deploy after first green manual run

In repo **Settings → Secrets and variables → Actions → Variables → New repository variable**, set:
`DRVO_STAGE_AUTO_DEPLOY` = `true`.

After this is set, `push` to `main` touching app/Kernel/deployment paths automatically triggers staging deployment. Workflow itself builds and tests first and uses the same restricted SSH identity. For maximum safety configure branch rulesets requiring successful PR checks and reviews before merging. There is **NO automatic deployment to Production**.

Routine flow: **ChatGPT or Cursor changes repo → PR tests → merge main → GitHub-hosted build + release → Staging website**. No manual SSH for routine source changes.

## Phase E — New EMPTY staging SQL DB (separate operator action)

Check: existing SQL Server 1433 is shared with live workloads; we NEVER reuse their databases or privileged credentials. Database bootstrap is optional before actual schema migrations, but prepares an isolated empty DB:

```bash
cd /srv/drvo-erp/repo
bash -n ops/staging/prepare-db-once.sh
sudo bash ops/staging/prepare-db-once.sh
```

This interactive script requires an **existing privileged SQL administrator login and password, entered hidden in SSH**, and a Microsoft `sqlcmd` client. It refuses existing DRVO database/login names, creates **only** `DRVO_ERP_STAGING` and `drvo_erp_stage_app` with CONNECT-only privilege, and saves a randomly generated app password in `/etc/drvo-erp/staging-sql.env` (root-only `0600`). **DO NOT share or print this file.** Stop if the SQL client is absent or a query fails, because a partially created DB/login should be reviewed, not overwritten.

This does **NOT** create real migrations/tables, connect the current NestJS API, add sensitive data, or claim staging security. Complete ADR-030 and migration/restore policy first, then implement SQL-backed Identity and RBAC as a separate engineering stage.

## Failure/rollback

- The deploy receiver automatically restores the previous managed release when health checks fail. If the *first* deployment fails, it reverts to the existing `/repo` runtime through root-owned fallback launchers.
- If the one-time install needs manual reversal, see `ops/staging/README.md` **Step D**. It only affects `drvoerp-web.service` and `drvoerp-api.service`.
- Never edit the old clinics `drvo-erp-staging.service`, the old `staging-erp.drvotech.com` Nginx vhost or other system-wide services.
- Current public preview has no Basic Auth at owner's request and may only use synthetic/demo content. Before any real customer information, require enforced login and staging access policy, audit, database backups/restores, and security tests.
