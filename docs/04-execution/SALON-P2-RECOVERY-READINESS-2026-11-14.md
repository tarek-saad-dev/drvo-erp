# Salon P2 — Isolated Recovery Evidence Review (non-executing)

**Date:** 2026-11-14 · **Status:** source-only preparatory CLI and tests; independent backup and restore remain **NOT DONE/NOT ATTESTED**.

## Why this matters
Successful staging code deployment and a local SQL `COPY_ONLY` backup do not prove that an encrypted copy exists offsite, that a separate DRVO-owned recovery DB can be restored safely, that permissions/schema checks pass, or that acceptable RPO/RTO have been demonstrated. No first real Salon can be onboarded before an operator and independent reviewer verify that evidence.

## Exact safe scope
The new `tools/salon-pilot/recovery-review.cjs` consumes **only a bounded local REDACTED JSON**. It validates syntax, intentionally opaque references (no paths or secrets), reviewed SHA, timestamps and exact control vocabulary. It compares *reported* source vs restored manifest digests and lists missing controls. It **never** connects to a DB, reads a backup, touches a VPS, launches a restore, runs commands or verifies an external reviewer's identity. Even a complete, matching operator report returns `REPORTED_NOT_ATTESTED` with all `can...=false`.

Run in a trusted checkout:
```bash
node tools/salon-pilot/recovery-review.cjs --template > local-redacted-recovery.json
# Fill local non-secret IDs/checksum references only after operator-approved independent review.
node tools/salon-pilot/recovery-review.cjs --input local-redacted-recovery.json
```
Never upload `local-redacted-recovery.json`, backup content, file system paths, credentials, env, actual customer data, raw logs, key material, or access URLs to GitHub or chat. CLI errors are generic and suppress the input/file path; local JSON is at most 8 KiB. It does not need root privileges.

## Eight controls independent operator must prove outside GitHub
1. `offHostCustody`: encrypted backup persisted offsite, custody access policy.
2. `encryptionAtRest`: encryption/key escrow and secret rotation, without exporting keys.
3. `independentIsolatedRestore`: actual restore into an **isolated DRVO-only DB**, never over `DRVO_ERP_STAGING`, never touching Cashier.
4. `schemaHistoryReconciled`: independently inspect migration history and schema without granting real users.
5. `scopedPermissionsReconciled`: runtime/migrator scoped roles and expected confidential table denials after restore.
6. `retentionReviewed`: retention/delete windows and offsite custody/recovery owner.
7. `rpoRtoReviewed`: achieved RPO/RTO measured against **separately approved** thresholds; this CLI does not invent numbers.
8. `sourceDatabaseConfirmed`: backup provenance explicitly verified as DRVO ERP staging database, not Cashier or legacy Clinics.

Operator must use an authorized DRVO-only protected environment, obtain backup owner + independent recovery witness evidence, record redacted timestamp/hash reference and attach to a separately controlled operational signoff. Only actual reviewed results (not the local report) can satisfy P2 in [Salon tracker #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106). A complete report never sets `canApproveSqlMigration` true.

## Code/test boundaries
- No SQL migrations, scheduler, live password, SSH, API/Web route, auth/session, finance, full database restore operation, or feature flag change.
- `tests/salon-recovery-review.test.cjs`: missing controls, complete self-report still denies, checksum mismatch, stale timestamps, foreign DB, injected sensitive field, opaque ID path injection, CLI non-leaking invalid evidence.
- K0/K1 CI required; no claim of backup success, secure retention, real customer onboarding or K5F acceptance.
- Rollback before any activation: revert this PR; no data or live configuration to undo.
