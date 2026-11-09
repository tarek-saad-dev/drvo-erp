# K5F — Staging Security Validation & Real Onboarding E2E

**Date:** 2026-11-10  
**Status:** IN PROGRESS / NOT ACCEPTED. This report covers a proposed read-only security hardening PR. No live Owner, Staff, email, flag change, SQL migration, restore or VPS execution is implied by a merged PR or green isolated CI.

## Verified GitHub baseline

- `main` checked on 2026-11-10: `dba53acace2db2005a44d1a3103394a257bed40d` (K5E PR #44).
- [Staging Deploy run #42713547571](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/42713547571) completed successfully for that SHA; this confirms deploy workflow outcome, **not** live config correctness.
- [K5D SQL CI #42713547751](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/42713547751) passed against disposable SQL Server.
- [Manual SQL run #41973725981](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41973725981) proved forward-only 001–009 on **DRVO_ERP_STAGING** and a local pre-migration COPY_ONLY backup, **not** offsite restore.
- K5E root-only checker has **no VPS execution evidence**. Authentication, verification, private Web, role admin and invitations must stay OFF pending acceptance.
- ADR-003 accepted tenancy direction and ADR-037 accepted lean Kernel; [ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) remains **PROPOSED**. No implicit acceptance of RLS or cross-boundary technical choices.

## K5F code hardening (this PR; CI and review required)

- `tools/k5d/check-staging-readiness.cjs`: keep operator-only, read-only, no secret output, no SQL writes. Validate the **exact** set of nine migration records and block on unknown/duplicate history. For each of six confidential onboarding tables, query `HAS_PERMS_BY_NAME` as the **actual runtime SQL login** for `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CONTROL`. Any positive, NULL or missing permission result blocks. Independently require `SELECT TOP (0)` to raise expected permission denial. Required audited procedure EXECUTE checks remain. Prefer the deployed, packaged `mssql` dependency when running on the VPS; use checkout dependency in disposable CI.
- `tools/k5d/check-staging-readiness.test.cjs`: negative coverage of all six prohibited direct privileges, unknown metadata, existing config/flags/secret/target tests.
- **Impact:** no schema, API routes, accounts, migrations, mail delivery or business modules changed. A failure in the stronger SQL test is an intentional **fail-closed operational blocker**, not permission to broaden `drvo_erp_stage_app`. Review any unexpected grants before acting.
- **Rollback:** revert the proposed checker/test and doc commits. Does not roll back a database or service; never loosen SQL runtime rights to force PASS.

## Safe, ordered VPS operator runbook — PRE-ACTIVATION, READ ONLY

Only a trusted administrator on the **new DRVO ERP VPS** should run these. **Never paste env contents, JWT/HMAC, SQL passwords, Resend keys, token links or raw `/proc` output into issues, CI or chat.** No remote shell or environment access is available to this report.

1. **Compare exact reviewed and deployed SHA.** After PR review/merge and a separately verified `main` Staging Deploy (do not use a PR commit as a deployment proof), use:
   ```bash
   sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
   sudo -u drvoerp -H git -C /srv/drvo-erp/repo rev-parse HEAD
   sudo systemctl is-active drvoerp-api.service drvoerp-web.service
   sudo test -r /srv/drvo-erp/deploy/current/release.sha && sudo cat /srv/drvo-erp/deploy/current/release.sha
   ```
   Review that the two SHAs match the verified `main` deploy run; if not, **stop**. Do not reconfigure or restart unrelated systems.
2. **Run hardened root-only local preflight** with the same exact reviewed SHA; do not substitute a guessed value or bypass a BLOCK:
   ```bash
   cd /srv/drvo-erp/repo
   sudo node tools/k5d/check-staging-readiness.cjs --expected-sha=REPLACE_WITH_VERIFIED_40_HEX_MAIN_SHA
   ```
   Check only `PASS/BLOCK` labels and exit code. The tool reads protected env, `/proc`, live loopback health and read-only SQL privilege metadata. It does NOT validate external DNS or sender deliverability.
3. **Nginx + Origin + real client IP** (independent trusted-console inspection): run `sudo nginx -t`, review only the `erp-stage.drvotech.com` server block and its effective included files, verify `proxy_pass` to **127.0.0.1:3311** for `/api`, `proxy_set_header X-Real-IP $remote_addr;` (overwrites untrusted client input), and a reviewed Host/Origin/TLS policy. Confirm API 3311, Web 3310 and staging SQL are loopback/internal-only as appropriate using `sudo ss -ltnp`; do **not** change shared SQL Server or other vhosts to make the check pass. Verify any proxy/CDN layer explicitly; `$remote_addr` is only a true client IP if the upstream trust chain is correct.
4. **Access restriction:** inspect current staging vhost exposure and apply a separately reviewed **vhost-only** IP allowlist or equivalent authentication gate before enabling real auth. Static public preview can remain public only while no private account/employee data or enabled auth flows exist. Do not edit existing Cashier/Clinic/AutoResponse vhosts.
5. **Resend:** inspect the sender domain and DNS verification status in the provider dashboard and authorized synthetic test mailbox **without pasting API keys**. An API-key-format check is NOT proof that mail is accepted, delivered or inbox-visible. Confirm Sender and `DRVO_K5_ORIGIN` privately and independently.
6. **Secrets + SQL:** verify root-owned protected files (expected `0600` operator, `0640` max migrator), service credentials are not exposed in code/release/logs, API/operator 256-bit HMAC matches using the checker only, distinct migrator/app principals, and no unreviewed grants. No `ALTER ROLE`, SQL `GRANT`, privilege expansion or secret printing to resolve a failed check.
7. **Backup and restore:** verify an encrypted **off-host** backup and retention policy. Restore independently to an isolated, owner-approved **new DRVO-only test target** with a separate database name; record validated integrity, RPO/RTO and cleanup. Do not issue `RESTORE DATABASE` against `DRVO_ERP_STAGING` or any Cashier/other production database. The staging COPY_ONLY job is not restore proof.
8. **Flags and observation:** confirm checker says all API/Web K5 flags OFF. `curl -sS -o /dev/null -w '%{http_code}\\n' https://erp-stage.drvotech.com/sign-in` and `/verify-email` must show a disabled private UI before activation. Do not submit POST tokens or login from public networks at this stage.

**If any prerequisite fails:** record only the failing check label and non-secret relevant configuration diagnosis; leave all flags OFF. No real onboarding is authorized by completing the checklist.

## Real E2E acceptance matrix (synthetic identities only; NOT executed on live staging)

After a **separate explicit founder approval** for a bounded staging activation, conduct a witnessed, limited run with only two synthetic Tenants (T1/T2), Businesses (B1/B2) and two Branches for T1. Existing accounts or customer data must never be used.

| ID | End-to-end action and required proof | Current proof |
|---|---|---|
| 01 | Root operator approves exact T1 Owner only; audit and no public signup | Isolated K5D tests; VPS pending |
| 02 | Verified sender accepts mail and synthetic mailbox receives intended Owner link | Real delivery pending |
| 03 | Owner consumes one-time purpose-bound link once, atomic Tenant/Business/Branch + membership | Isolated SQL; live pending |
| 04 | Owner logs in with secure cookie, valid session, correct account/Tenant | Isolated SQL/HTTP; live pending |
| 05 | Owner can read B1/authorized Branch only; unrelated scopes indistinguishably denied | Isolated SQL/HTTP; live pending |
| 06 | Authorized Owner invites Staff into exact branch with non-Owner subordinate role | Isolated SQL/HTTP; live pending |
| 07 | Staff receives invite, verifies same email and creates restricted account | Real mail/acceptance pending |
| 08 | Staff login and allowed vs denied actions/role delegation prove least privilege | Isolated SQL; live pending |
| 09 | T1 vs T2 and T1 branch A vs branch B ID spoofing denied on reads/writes | Isolated negative suites; live pending |
| 10 | Expired, revoked, replayed, mismatched-purpose Owner/invite tokens denied, no side effects | Isolated SQL; live pending |
| 11 | Operator revoke/reissue invalidates old Owner link; consumed approvals not revocable | Isolated SQL; live pending |
| 12 | Audit event references for approve, claim, invite, accept, revoke, login/role changes correct and scoped | Isolated SQL; live pending |

Capture sanitized response status, correlation references, bounded SQL audit counts and checker exit status; no bearer, username/email, key or password values in GitHub artifacts. Observe issuer permission revocation and concurrent replay under disposable SQL first. Cleanup only these synthetic DRVO test identities under a reviewed SQL/retention procedure; never use ad hoc DELETE on staging.

## Required explicit authorization before live E2E

The project owner must authorize (a) the exact synthetic staging test identities and mailbox, (b) narrow environment/network access restrictions, (c) temporary non-public K5 flags in the new staging API/Web, (d) bounded test email volume and account creation, (e) monitoring + cleanup/rollback, and (f) independent security reviewer. **No blanket public signup**, no production or other database access.

## K5 closure verdict and K6 entry

**K5 = OPEN / BLOCKED for closure** until: new PR CI and review; deployed current SHA verified; local checker PASS; Nginx trusted-peer chain + external Origin/access guard reviewed; verified mail sender + receipt; runtime permission denial; offsite restore evidence; full 12-case 2-Tenant/2-Branch live synthetic E2E with audit; known security gaps closed; ADR-030 scope/policy signoff or explicit recorded exception. Document links and signed owner/security approval before closure.

**K6 may start only as a separately authorized design exploration while K5 remains OPEN**, not as a claim that the Kernel activation runtime is security-cleared. Production/customer onboarding is explicitly not authorized. Platform Kernel / Module Activation stays within ADR-037 lean shared Kernel + ADR-032 proposed activation boundaries; no premature microservices or broad SQL grants.
