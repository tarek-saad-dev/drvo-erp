# DRVO ERP — VPS Isolated Staging & Web Preview Handoff V1

**Date:** 2026-11-01  
**Status:** **READY FOR OPERATOR PREPARATION / NOT EXECUTED ON VPS.**  
**Goal:** A separately secured DRVO ERP preview and eventual dedicated staging environment using the existing VPS if its resource review passes. **Never reuse the live Cut Salon/Casher or DRVO AutoResponse database/process/ports.**

> **Operator verification — 2026-11-01 (actual VPS outputs; READ BEFORE ANY COMMAND):** Existing `staging-erp.drvotech.com` is an **unrelated existing deployment**: Nginx proxies to `127.0.0.1:5501`, protected with Basic Auth (HTTPS returns `401`); `drvo-erp-staging.service` runs as Linux user `casher` from `/home/casher/drvo-clinics-work`. **DO NOT replace, reload with altered proxy, reuse its domain/service/port, or change its files.** This is NOT the new `tarek-saad-dev/drvo-erp` repository. The actual new repo was cloned under `/srv/drvo-erp/repo` as `drvoerp` and built successfully; its independent units `drvoerp-web.service` (loopback `3310`) and `drvoerp-api.service` (loopback `3311`) both passed local `/health`. New intended public preview remains **`erp-stage.drvotech.com`**: its DNS lookup returned NXDOMAIN and Certbot failed until an A record is added; a separate Nginx **HTTP only** `/etc/nginx/sites-available/drvo-erp-stage.conf` is installed, with Certbot webroot `/var/www/letsencrypt`. Node 22.23.2, Ubuntu 24.04.4, Nginx 1.30.4, 15 GiB RAM / 7.5 GiB available, 112 GiB disk available, and **swap 2 GiB/2 GiB used** were observed. Existing production services, MySQL/PostgreSQL/SQL Server and DRVO AutoResponse remain live. UFW default-deny inbound, with port 1433 allowed only from a specific source IPv4 (do not publish the IP in this document). Nginx syntax test passed with pre-existing warnings. **Next safe action: add DNS A record for `erp-stage`, verify public resolution and the ACME webroot challenge BEFORE retrying certificate issuance.** Use the distinct new `drvoerp-*` services only; do not reuse the old `drvo-erp-staging.service`. This is an operator-observed status, **not** remote SSH access granted to ChatGPT.

## 1. Proposed isolated namespace — NOT current live facts

| Item | Proposed value / rule |
|---|---|
| DNS/HTTPS preview | `erp-stage.drvotech.com` **proposal only; no DNS or live URL confirmed** |
| Linux service principal | `drvoerp`, separately owned, no sudo privileges; start after operator review |
| Code/release directory | `/srv/drvo-erp/`; releases separate from `/var/www` of other apps |
| Next.js web preview | **127.0.0.1:3310**, not port 3100 used by another DRVO service |
| NestJS staging API | **127.0.0.1:3311**, separate from existing services |
| Staging database | `DRVO_ERP_STAGING`, brand-new SQL Server database only after security/migration approval |
| SQL credentials | Brand-new restricted SQL login, NEVER `sa` or a reused Cut Salon/AutoResponse login |
| API runtime | K3 proof route MUST remain off for Production (`NODE_ENV=production`); initial preview is frontend-only without real identity |
| Deploy | GitHub Actions protected Staging environment/manual authorized deploy, not PR auto-deploy to VPS |
| Reverse proxy | New Nginx virtual host and TLS certificate for proposed stage domain only |
| Basic access | Preview protected by Basic Auth/access policy until actual DRVO login is production-grade |

**Important:** The Next.js shell from [K1 PR #6](https://github.com/tarek-saad-dev/drvo-erp/pull/6) is a development showcase with **no real account/login/business data**. Health URLs show process liveness only, not a secure ERP.

## 2. What owner/operator should do FIRST: harmless read-only audit

Run **on the intended VPS** and share only the sanitized output (remove public IP, usernames, secrets and any private hostnames where unnecessary):

```bash
date -Is
uname -a
node --version
npm --version
git --version
nginx -v
df -h
free -h
sudo ss -ltnp | grep -E ':(3100|3101|3310|3311|1433)([[:space:]]|$)' || true
sudo systemctl --no-pager --type=service --state=running | grep -Ei 'nginx|sql|drvo|cut|casher' || true
```

This inspection is not authorization to restart/remove any existing process. In particular, **do not stop or rebind DRVO AutoResponse's existing 3100 service** and do not point the new ERP to existing Cut Salon production SQL.

Before allocating stage SQL memory/CPU, assess actual VPS available RAM/disk against existing SQL Server and production load. Do not start an extra SQL Server instance just because the CI test used Docker; **a separate database inside the existing SQL Server instance may be appropriate** after the isolation review.

## 3. Staging preparation, only after audit and explicit operator approval

- Reserve ports 3310 (Web) and 3311 (API) ONLY if `ss` confirms they're free.
- Create a dedicated `drvoerp` non-admin operating account, dedicated `/srv/drvo-erp` tree and a clean Git checkout/release directory; do not grant it ownership of other services.
- Configure a separate protected secret file (e.g. `/etc/drvo-erp/staging.env`, root-owned `0600`) with no credentials committed, logged or pasted to the chat.
- Build from pinned/lockfile-dependent source; note [Issue #8](https://github.com/tarek-saad-dev/drvo-erp/issues/8) still requires app-specific dependency lockfiles and `npm ci` before staging.
- Only create `DRVO_ERP_STAGING` after approving DB strategy (ADR-030), minimum privileges, migrations and backup/restore plan. Grant the runtime SQL account scoped rights to this database only.
- Set up dedicated systemd units `drvoerp-web.service` and subsequently `drvoerp-api.service` / `drvoerp-worker.service` after real jobs exist. Use `User=drvoerp`, read-only service paths, restart limits and separate journals.
- Set up a fresh Nginx `server_name erp-stage.drvotech.com` (proposed) proxy to **loopback 3310** only; verify no existing name collision. Prefer restricted access (`auth_basic` with credentials stored on VPS; HTTPS required). Keep APIs unexposed until authenticated operations and rate-limits are implemented.
- Add DNS A/AAAA only for the intended VPS IP after confirming domain ownership and network policy, then use Certbot with staging host only and verify a new TLS certificate. **Never claim the proposed hostname is already live.**
- Manually smoke-test the site from a remote browser and mobile, plus `GET /health`. Record actual HTTPS URL, certificate and timestamp in the next Stage Report.
- Introduce release/rollback, health monitoring, disk/SQL memory alerts, and backup restoration evidence before any real customer data.

## 4. How to connect ChatGPT development work to VPS without sharing passwords

**Preferred developer workflow:** I can work with the connected GitHub repository and CI. For VPS changes, use a separately authorized remote deployment path or the VPS provider integration **when actually connected**. Current tools **do not grant me SSH shell access to the VPS**.

If using GitHub Actions for staging:
1. Set up a **restricted deployment-only SSH identity** as `drvoerp`, with an allowlisted key and no sudo; keep the private key in **GitHub Environment Secrets**, not chat/messages/commits.
2. Create a protected GitHub `staging` environment with manual approval and secrets such as `DRVO_ERP_STAGE_HOST`, `DRVO_ERP_STAGE_USER`, `DRVO_ERP_STAGE_SSH_PRIVATE_KEY`, and pinned `DRVO_ERP_STAGE_SSH_HOST_KEY`. Never paste the values into ChatGPT.
3. Add a *manual* `workflow_dispatch` deployment workflow that builds on GitHub, sends only signed/verified artifacts to the dedicated directory, switches a release symlink atomically, restarts only `drvoerp-*` units and checks the preview health endpoint.
4. Avoid giving that deployment identity root permissions, production DB logins, access to other app directories or authority to run arbitrary PR changes from untrusted contributors.
5. Get explicit approval of the staging deployment before using the workflow; production requires a separate approval.

**If you're using Cursor/VPS terminal instead**, the initial setup can be run once under your review, after which GitHub CI and a protected staging deploy pipeline can keep the preview updated without repeated manual IDE work.

## 5. Stage sign-off evidence before calling a URL live

- [ ] DNS ownership, records and HTTPS actually verified from outside VPS
- [ ] App lockfiles / deterministic build and passing K0/K1/K3 tests
- [ ] No port, Nginx, systemd or SQL principal overlap with existing production apps
- [ ] Non-root deployment user and least-privilege secrets
- [ ] Staging Web smoke, rollback and isolated logs verified
- [ ] Public preview has basic access policy and no live customer data
- [ ] DB/identity/API security stages independently approved before real Tenant activation

**Until checked, there is no verified live DRVO ERP website URL.**
