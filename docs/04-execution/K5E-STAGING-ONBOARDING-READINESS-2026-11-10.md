# K5E — Read-only Staging Onboarding Readiness Gate

> **K5F follow-up checkpoint — 2026-11-10:** K5E PR #44 is merged and the exact `main` revision `dba53acace2db2005a44d1a3103394a257bed40d` has a verified successful [Staging Deploy #42713547571](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/42713547571). The earlier `3c07f...` deploy remains historical. A [proposed K5F patch](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md) strengthens direct SQL permission denials on six onboarding tables and adds a synthetic E2E acceptance runbook; **neither K5E nor K5F has a verified VPS checker run or live activation at this checkpoint**. K5 remains OPEN; all public K5 flags OFF.


**Recorded:** 2026-11-10. **Status:** implemented as a proposed operator check; **not a customer-access approval**.

## Verified baseline (not inferred from earlier documentation)

- The latest verified Staging Deploy completed successfully on commit `3c07f817192b6240dd6123b47c0f36e910a045e8`: [run #41876109076](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41876109076).
- The authorized, manual Staging SQL run [#41973725981](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41973725981) completed **both** jobs successfully. Its database job recorded a verified `COPY_ONLY` pre-migration backup, migrations **006, 007, 008, 009 APPLIED**, prior migrations 001–005 UNCHANGED, and `DRVO DB MIGRATION PASS: 4 applied; 9 total`.
- There is still **no verified Resend sender, live Owner, real invitation, independent Nginx real-IP inspection, off-VPS restore exercise or cross-Tenant live E2E signoff**. All K5 public auth, verification and invitation paths must stay OFF.

## Scope of this PR

`tools/k5d/check-staging-readiness.cjs` is an **operator-only, READ-ONLY local VPS check**. It does not send mail, toggle flags, change files, issue SQL writes, approve owners, create credentials or issue any user-facing HTTP POST.

It verifies:
1. It runs as root, against the **exact expected 40-character `main` commit**, with the checked-out repo SHA and the managed deploy `release.sha` both matching.
2. The two **root-owned protected environment files** exist, with disallowed permission bits rejected: `/etc/drvo-erp/k5d-operator.env` (0600) and `/etc/drvo-erp-db-automation/staging-db-automation.env` (0640 max).
3. Live `drvoerp-api.service` and `drvoerp-web.service` process environments are read locally via `/proc/<MainPID>/environ`. The checker **never prints values**, including password, email, raw key or bearer.
4. The API's HMAC equals the operator's valid 256-bit HMAC via constant-time comparison. Both API and operator mail adapters have the fixed Resend provider, structurally valid server credentials, the **same fixed sender and** `https://erp-stage.drvotech.com`. This is **configuration shape only**, not proof that the external sender domain is verified.
5. The API and Web use **production mode + local ports 3311/3310**, trusted Nginx real-IP mode is explicitly configured, and **all public K5 authentication/onboarding/role/invitation/Web flags remain OFF**.
6. Both SQL principals use loopback **`DRVO_ERP_STAGING` only**, with distinct `drvo_erp_stage_migrator` and `drvo_erp_stage_app` accounts.
7. With read-only SQL queries, migration history contains all **001–009**. Under the actual limited runtime SQL login, `SELECT TOP(0)` is **denied** for the six sensitive onboarding tables; reviewed Owner/invitation stored procedures are **EXECUTE-only**. A missing table or unexpected SQL error fails the gate, not silently treated as a valid denial.
8. Local API/Web health GETs return 200 while private `/sign-in` and `/verify-email` Web pages still return 404 with their flags off.

**Outputs:** only `PASS: <check name>`, `BLOCK: <check name>` and separate `REVIEW REQUIRED` text. Exit nonzero if technical checks fail. An all-PASS output explicitly says *local technical preflight only* — **not complete K5 security acceptance**.

## Operator procedure (not executed by the assistant)

**SECURITY UPDATE:** The root-owned operator bundle installation and dependency review in [K5F](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md) are mandatory BEFORE the command below. Direct root execution from `/srv/drvo-erp/repo` is intentionally blocked by K5F; do not fall back to the old command.\n\nFirst verify the PR is reviewed/merged, the dedicated Staging Deploy for the final `main` SHA succeeded, and your **local checked-out repo** matches it. On the VPS's trusted root console:

```bash
sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
cd /srv/drvo-erp/repo
git rev-parse HEAD
sudo node /usr/local/libexec/drvo-erp-k5f/check-staging-readiness.cjs --expected-sha=<copy-the-verified-40-character-main-sha>
```

The `--expected-sha` argument is **not secret**. Replace the placeholder only with the reviewed GitHub commit. The command does **not** synchronize Git automatically or perform deployments; if it reports a mismatch, inspect both revision histories rather than bypassing the check.

**Do not run `operator-approve-owner.cjs` yet.** If any local preflight step fails, fix only the narrowly scoped missing configuration after independent operator review and rerun. Never copy/paste secrets, SMTP key, environment files, private SSH key or `/proc/.../environ` into chat, GitHub logs or an issue.

## Mandatory human security checks, even after PASS

1. **Nginx source IP:** independently inspect the exact `erp-stage.drvotech.com` vhost and upstream routing, ensure traffic goes only to loopback API, and the trusted proxy **overwrites** client-provided `X-Real-IP` with its genuine peer `$remote_addr`. `DRVO_K5_TRUST_NGINX_REAL_IP=YES` is merely a necessary configuration flag, NOT inspection evidence.
2. **Resend:** verify the sender's real domain with the provider and review the authorized test mailbox; a key matching the expected format is not deliverability proof.
3. **Secrets:** protect, provision and rotate the **same** server HMAC on the API and root-only operator path, ensure it is not accessible through web, cache, logs or GitHub CI.
4. **Staging access:** implement an independently reviewed IP allowlist/HTTP access guard or equivalent before any real person/customer data. Keep unrelated DRVO products, existing Casher and old Clinic services untouched.
5. **Offsite restore:** verify off-host encrypted backup, restore to a separate DRVO test target and establish retention/RPO/RTO; GitHub's successful local COPY_ONLY backup is not proof of this.
6. **Owner/Staff real E2E with synthetic/staging-only identities:** operator approval → provider-accepted email → link redeem once → login → scoped branch → invite/accept/revoke → invalid/replayed token denial → second Tenant/Business separation. Record independent reviewer signoff, defects, and rollback.
7. **Explicit activation approval:** only after all above review can the owner separately authorize a bounded staging activation of the K5 flags. No auto-activation or public signup in this PR.

## Impact & rollback

- **Architecture:** no change to Modular Monolith, Tenant/Business/Branch hierarchy, ADR-030, runtime RBAC, schema, prod endpoints or mail adapter. This adds a **read-only operations gate**, not an authorization mechanism.
- **Files:** checker, pure unit tests, K5D CI invocation, staging deploy path filter, roadmap, changelog, current-state and this runbook.
- **Tests:** pure negative configuration/secret/domain/flags checks in GitHub Actions; existing SQL K5D integration tests remain isolated and cannot connect to the VPS.
- **Deployment:** workflow is eligible to deploy an artifact after PR merge if the approved `DRVO_STAGE_AUTO_DEPLOY` variable is true; **not verification that live flags have changed**.
- **Rollback:** revert the checker and associated workflow trigger changes. No SQL migrations or data rollback necessary.
