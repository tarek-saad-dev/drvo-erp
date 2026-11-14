# P4 — Independent post-017 migration source reconciliation (offline)

**2026-11-14 — GitHub CI preparation only.** No VPS SQL applied, no post-017 K5F root bundle approved, and no operator evidence independently verified.

## Why this is separate from K5F 001–009

- The current **root-owned K5F pre-activation checker** and `tools/staging-readiness/manifest-plan.cjs` intentionally observe only the **001–009** baseline. We **do not modify** them or quietly accept a later schema.
- P4 [#115](https://github.com/tarek-saad-dev/drvo-erp/pull/115) proved the restricted SQL 009→017 migration, pre-010 and post-017 independently restored DBs **only inside disposable SQL2022 CI**.
- This source-only follow-up adds `tools/staging-readiness/post-migration-review.cjs` to validate an *untrusted, redacted* operator-submitted **post-017 history** against the source migration SHA256 checksums, exact ordered 001–017 filenames and exact `DRVO_ERP_STAGING` target. Missing 017, drift, reordered/extra rows, foreign DB and leaked extra properties are rejected or reported blocked.

## Offline operator interface, never a migration command

```bash
node tools/staging-readiness/post-migration-review.cjs --template > local-redacted-p4.json
# Do not fill with or upload secrets, SQL logs, backup files or customer data.
node tools/staging-readiness/post-migration-review.cjs --input local-redacted-p4.json
```

The input may contain only an observed source/deployed commit SHA, timestamps, exact ordered `{name,checksum}` migration records and **opaque non-secret** references for operator observation, independent reviewer, separately verified restore and approved migration window. These fields **do not prove their own authenticity**. No SHA claim or complete checklist can substitute for independent DB/root Security review.

Even when all 17 hashes and claimed signoffs match, result is **`REPORTED_MATCH_NOT_ATTESTED`**, with `independentSqlInspectionPerformed=false`, `independentRestoreVerified=false`, `rootK5fPost017CheckerApproved=false`, `canApplySqlOnVps=false`, `canEnablePrivateAuth=false`, `canGrantPilotRights=false`, `canInviteSalon=false`. No SQL client, network, auth, secret, credential, migration application, activation or operational server call exists. This is a source consistency **checklist** only, not a trust-root installer.

## Separate operational steps before any live approval

1. Independent root operator validates actual `release.sha`, K5F bundle/root permissions and live 001–009 source checksums **before** a separately authorized SQL migration window.
2. Independent encrypted off-host backup and isolated restore (P2); verify recovery plan.
3. Security reviews proxy/origin/membership, DBA/founder authorize staged SQL 010–017; no self-report counts as approval.
4. Only after permitted maintenance, separately install and security-review an immutable **post-017 root checker** before using its proof. Do not modify historical K5F checker by guesswork.
5. Independently read live `core.SchemaMigration` and object permissions; compare redacted checksum evidence to GitHub; run new authenticated Owner/Staff/browser negative tests only after P5 grant release approvals.

**Tests:** `tests/p4-post-migration-review.test.cjs`, K0/K1 Node CI. [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) P1–P7 still OPEN. Rollback: revert this PR; nothing live was touched.
