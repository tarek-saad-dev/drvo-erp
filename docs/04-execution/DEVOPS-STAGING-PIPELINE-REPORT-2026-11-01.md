# DRVO ERP — DevOps Staging Pipeline Stage Report

**Date:** 2026-11-01  
**Status:** Code/CI pipeline prepared; **VPS deploy is NOT activated until owner installs one-time receiver and GitHub Environment secrets**. This report is **not a claim that ChatGPT has direct SSH access**.

## Already achieved
- New DRVO ERP checkout, Node 22, separate Linux runtime user `drvoerp`, distinct running `drvoerp-web.service` / `drvoerp-api.service`, localhost 3310/3311: **confirmed by operator command output**. Existing `staging-erp.drvotech.com` / `drvo-erp-staging.service` is a separate legacy clinics service and must remain unchanged.
- Owner reports `erp-stage.drvotech.com` HTTPS/Nginx setup completed and chose temporarily **public read-only preview** with no Basic Auth. Production-ready login and DB endpoints are not enabled.
- Nested `apps/{web,api,worker}/package-lock.json` generated from GitHub-hosted Node 22 npm and CI now runs `npm ci`, ensuring exact transitive dependency tree on clean installs.
- Next.js 16 `output: standalone` with app-specific tracing root and CI smoke on port 3310; API compiled and tested.
- New protected manual workflow `.github/workflows/staging-deploy.yml` for branch `main` only: verify Kernel, build API/Web in hosted runner, create SHA-tagged release, stream over pinned SSH to a force-command account, switch release, perform loopback health checks, roll back to prior managed release on errors.
- Root-owned VPS installer `ops/staging/prepare-host-once.sh` and immutable deploy receiver `ops/staging/receive-release.sh` are committed for operator review and one-time setup. They do NOT affect unrelated services.

## CI evidence
- K0 Foundation CI: PASS
- K1 Runtime CI: PASS
- K3 Trusted Scope Proof CI (15 negative HTTP/SQL scenarios): PASS
- DevOps Staging Artifact CI: checks `npm ci`, Web standalone boot and shell syntax: PASS after correcting Next.js monorepo trace root.
- Actual GitHub Actions remote deployment: **NOT RUN** and secrets not configured.

## One-time operator setup remaining
1. Review [ops/staging/README.md](../../ops/staging/README.md) and execute signed-off one-time VPS account/receiver setup after PR merge. This is root-level code, do not run unreviewed sources.
2. Configure GitHub `staging` Environment with forced-command SSH private key, pinned host key and host/user values. Use required review protection where supported; credentials stored only in GitHub UI.
3. Run first manual `DRVO ERP — Staging Deploy` action from `main`; verify release SHA, HTTPS and both loopback health URLs. Record run/commit and rollback proof.
4. Finish actual DRVO SQL Server staged database, migrations and least-privilege runtime login only with ADR-030 approval. Current API remains **not connected to business DB**.
5. When real customer data is introduced, re-enable Basic Auth/IP controls and pass security tests; current public scaffold is for dummy data only.
6. Keep production authorization distinct; don't auto-deploy unreviewed commits to production.

## Routine future workflow
ChatGPT or Cursor creates PR on a feature branch → GitHub required CI → merge to main → manually dispatch staging deployment → site release verified. Further VPS login should be exceptional, not required for routine frontend/backend source edits.

See [VPS one-time instructions](../../ops/staging/README.md). This delivery is only a **deploy pipeline preparation**, not completion of Business Modules, subscription payments or staging SQL.
