# Staging automatic deployment — final smoke test

2026-11-02. This harmless document is intentionally located under apps/web/ so a merge to main matches the existing GitHub Actions `push.paths: apps/**` filter.

This change contains **no application behavior changes, no private data, no credentials, and no database migrations**.

Expected verification after merging:
1. GitHub Actions `DRVO ERP — Staging Deploy` is triggered by push to `main` when the repository variable `DRVO_STAGE_AUTO_DEPLOY` is exactly `true`.
2. The workflow runs build/tests, sends only its release bundle to the isolated DRVO ERP forced-command SSH receiver.
3. The VPS `/srv/drvo-erp/deploy/current/release.sha` advances to the exact merge SHA, both local health endpoints return OK, and `https://erp-stage.drvotech.com` returns HTTPS 200.
4. If the workflow job is `skipped`, the variable is probably missing/false or the branch filter did not match. Do not claim success without these checks.
