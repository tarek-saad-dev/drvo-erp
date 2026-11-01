# DRVO ERP staging: one-time VPS + GitHub setup (2026-11-01)

**One-time operator action — not yet executed remotely by ChatGPT.** No secrets belong in this repo or chat. Existing Cut Salon, DRVO AutoResponse and the **unrelated** `drvo-erp-staging.service` / `staging-erp.drvotech.com` are out of scope and MUST NOT be modified.

## Verified starting point (operator reports)
- The new DRVO ERP repo is `/srv/drvo-erp/repo`, Node 22.23.2, Ubuntu 24.04; the `drvoerp` runtime account already exists with **nologin**.
- `drvoerp-web.service` serves on 127.0.0.1:3310; `drvoerp-api.service` serves on 127.0.0.1:3311; both `/health` probes passed.
- New domain: `erp-stage.drvotech.com` (NOT `staging-erp.drvotech.com`). Operator reported Nginx/SSL, but **externally verified HTTPS 200 and exact source SHA remain outstanding** until first deployment report.
- SQL Server process exists for other products. **DRVO_ERP_STAGING DB does NOT exist yet** and MUST NOT be assumed; no real customer API/data exposure.
- Preview is currently **public without HTTP Basic Auth at owner's request**. It may only contain synthetic, non-sensitive foundation UI. Require authentication/access restriction before accepting any customer data, paid billing or sensitive endpoints.

## Architecture to be installed

1. GitHub PR checks: K0 + K1 + K3 and `DevOps Staging Artifact CI`; app lockfiles tracked and `npm ci`.
2. Manual GitHub Actions workflow `DRVO ERP — Staging Deploy`, on `main` only, with protected `staging` environment. Builds a self-contained Next.js standalone Web + NestJS API release on GitHub-hosted Linux runners — **no npm build on production VPS**.
3. GitHub sends a gzip archive via SSH **stdin** to the dedicated `drvoerp-deploy` account with an `authorized_keys` forced command `/usr/local/libexec/drvoerp-receive`.
4. Receiver only accepts `deploy <40hexsha>`, verifies archive paths and SHA, writes `/srv/drvo-erp/deploy/releases/<sha>`, atomically flips `deploy/current`, restarts **only** `drvoerp-api.service` and `drvoerp-web.service`, probes loopback health, and rolls back the symlink on failure when a previous managed release exists.
5. Runtime service processes continue under **drvoerp (nologin)**, with only group-readable releases. SSH deploy account owns releases and can restart exactly the two allowed services via root-owned sudoers; does not get shell or root access through that key.

## STEP A — VPS operator after PR is merged to main

Run only after checking [PR #13](https://github.com/tarek-saad-dev/drvo-erp/pull/13) is merged with green CI. Read `prepare-host-once.sh` and `receive-release.sh` before executing as root.

```bash
sudo -u drvoerp git -C /srv/drvo-erp/repo pull --ff-only origin main
cd /srv/drvo-erp/repo

# Create a fresh deployment-only key. Never paste it in ChatGPT or commit it.
sudo ssh-keygen -t ed25519 -a 100 \
  -f /root/drvo-erp-ci-deploy-key \
  -N '' -C drvo-erp-github-staging

# Installs a separate drvoerp-deploy account, forced-command receiver,
# fixed restart-only sudoers and systemd drop-ins.
# Does NOT restart either service; current 3310/3311 processes stay running.
sudo bash ops/staging/prepare-host-once.sh /root/drvo-erp-ci-deploy-key.pub

# Confirm staging units, drop-ins and existing processes.
sudo systemctl cat drvoerp-web.service
sudo systemctl cat drvoerp-api.service
sudo systemctl is-active drvoerp-web.service drvoerp-api.service
curl -fsS http://127.0.0.1:3310/health
curl -fsS http://127.0.0.1:3311/api/health
```

**IMPORTANT:** Do NOT restart `drvoerp-web`/`drvoerp-api` immediately after preparing the drop-ins. The new `deploy/current` symlink is created by the FIRST authorized GitHub deploy. If a first deploy fails before there is a prior release, operator restores the original units with the rollback procedure below.

## STEP B — GitHub Environment settings (manual UI, NOT chat)

Open repository: `https://github.com/tarek-saad-dev/drvo-erp/settings/environments`.

Create environment **`staging`**. Where available, restrict deployment to `main` and require reviewer approval (prefer a reviewer other than the deploy actor). Add **Environment Secrets**, NOT repository-wide credentials:

| Secret | Value placed only in GitHub UI |
|---|---|
| `DRVO_STAGE_HOST` | Verified VPS IPv4/DNS reachable by GitHub Actions over SSH port 22 |
| `DRVO_STAGE_USER` | `drvoerp-deploy` |
| `DRVO_STAGE_SSH_PRIVATE_KEY` | Complete contents of `/root/drvo-erp-ci-deploy-key` generated above, including begin/end delimiters |
| `DRVO_STAGE_KNOWN_HOSTS` | Exact **verified ED25519 SSH host key line** matching `DRVO_STAGE_HOST` |

For host-key verification, on the VPS check `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. From a trusted operator machine, run `ssh-keyscan -t ed25519 YOUR_VPS_IPV4 | ssh-keygen -lf -` and verify fingerprints match **before** placing the complete `ssh-keyscan -t ed25519 YOUR_VPS_IPV4` line into `DRVO_STAGE_KNOWN_HOSTS`. Never use `StrictHostKeyChecking=no`.

To copy the private key into the GitHub UI use a secure administrator terminal/browser session, NEVER this chat, a PR comment, CI log, .env or source control. Keep the file root-only (`0600`).

Do not connect the existing self-hosted GitHub runner for Cut Salon to the new repository; do not reuse an AutoResponse deploy key or Root SSH access.

## STEP C — First manually approved deploy

In GitHub Actions open **DRVO ERP — Staging Deploy**, select branch `main` and click `Run workflow`. Approve the `staging` environment when prompted.

The workflow installs exact lockfiles, checks the root Kernel tests, builds API and Next standalone, packages the `GITHUB_SHA` and uses the restricted SSH key to activate it. **Merge to main does NOT deploy automatically.** This is intentional while staging is public and business auth is incomplete.

After the workflow succeeds:

```bash
sudo systemctl is-active drvoerp-web.service drvoerp-api.service
sudo readlink -f /srv/drvo-erp/deploy/current
sudo cat /srv/drvo-erp/deploy/current/release.sha
curl -fsS http://127.0.0.1:3310/health
curl -fsS http://127.0.0.1:3311/api/health
curl -sSI --max-time 15 https://erp-stage.drvotech.com/ | head -n 10
```

Compare deployed SHA with GitHub Actions workflow commit and validate public preview on mobile. If HTTP returns `401`, an access policy is active; if returns `200`, site is publicly viewable. Do not infer business readiness from health checks.

## STEP D — Stop/restore (only if needed)

The receiver automatically restores the prior managed release on health failure. For a **failed first deploy**, there is no prior managed artifact. Restore the original /repo-based units:

```bash
sudo rm -f \
  /etc/systemd/system/drvoerp-web.service.d/20-managed-release.conf \
  /etc/systemd/system/drvoerp-api.service.d/20-managed-release.conf
sudo systemctl daemon-reload
sudo systemctl restart drvoerp-api.service
sudo systemctl restart drvoerp-web.service
```

These commands affect **only** the two new DRVO ERP services. Do not apply them to `drvo-erp-staging.service` from the unrelated clinics project.

## STEP E — Database and real application security: NOT yet completed

Staging deploy readiness is not the same as ERP database readiness:

- Create a new `DRVO_ERP_STAGING` SQL database and least-privileged DRVO-only credentials only after ADR-030/migration policy and SQL edition/backup review; do NOT reuse existing prod DB logins, SaaS credentials or `sa`.
- Continue K4 real identity (username/password, session issuance, explicit Business membership/role, audit, rate limits and revocation); K3 proofs are **test-only and disabled in production**.
- Introduce real migrations, versioned rollback/restore, separately protected production environment, DB alerts/backups, and staging security before any real customer data.
- Review 2 GiB used swap and existing production workload before adding SQL workloads or persistent worker. Worker is **idle** and is not deployed here.
- Once private data or a functional login is in scope, protect `erp-stage.drvotech.com` by HTTP Basic Auth/IP allowlisting or a reviewed equivalent, and test all endpoints for auth.

## Routine work after the one-time setup

`ChatGPT / Cursor → feature branch → PR → K0/K1/K3 + DevOps CI → merge to main → GitHub Actions manual Staging Deploy → verified preview`.

Production deployment stays separate and requires its own approval gates; a green staging deploy does not imply financial/account security or production readiness.
