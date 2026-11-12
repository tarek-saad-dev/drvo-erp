# K5F-3 — Post-migration isolated restore rehearsal (2026-11-12)

**Status: DISPOSABLE CI REVIEW ONLY — NO VPS DISASTER RECOVERY OR STAGING SQL APPROVAL.** This follows [K5F-2](K5F2-STAGING-ACTIVATION-READINESS-2026-11-12.md). K5F operational acceptance is still OPEN; ADR-032 commercial activation and ADR-031 financial posting remain PROPOSED.

## Architecture impact (before implementation)

This changes only the SQL Server **CI harness**, `tools/staging-db-automation/verify.cjs`, already exercised by `DRVO ERP — Staging Database Automation CI`. There is **no change** to its privileged forced-command migration receiver, database migration payload/build logic, SQL roles or permissions, API/Web runtime, Cashier, or VPS. One disposable SQL container is created by GitHub Actions for this proof and destroyed; the real `DRVO_ERP_STAGING` database remains untouched.

## Why this matters

Existing automation CI already verifies a COPY_ONLY backup and independently restores the **pre-migration** database (one migration). That is necessary but insufficient evidence of recovery after all proposed SQL 001–014 objects exist. This PR extends the **same** disposable CI to:

1. Apply source migrations 001–014 via the restricted migration principal in disposable SQL, check exact hashes and no-op reruns.
2. Take a **second backup after all migrations**, using SQL checksum, and `RESTORE VERIFYONLY`.
3. Restore it into a **separate** throwaway DRVO CI database, never overwrite the source.
4. Compare the complete 14-row `core.SchemaMigration` IDs and checksum history between original and recovered copies.
5. Assert the restored `PosDraft`, `PosDraftLine`, create/read SQL procedures and scope-defining line foreign keys exist, with DRAFT-only status constraint.
6. Close the probe connection and remove only the separately created restore target.

**Deliberate limitations:** CI SQL backup directory is local to the disposable GitHub runner, not encrypted/offsite VPS storage. The proof does not measure RPO/RTO, validate production backup retention, Nginx trusted-client IP chain, K5F operator checker installed bundle, future migrations, tenant data integrity or actual customer onboarding. No flags activated.

## Required real-operator K5F runbook (separate approval)

- Verify exact source/deployed SHA and immutable root-owned K5F checker installation hash, then run the checker **read-only** on trusted VPS root console using the existing [K5F runbook](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md). The merged source code alone cannot invoke root audit.
- Confirm live migration history and runtime-only SQL principal without exposing SQL secrets. The K5F checker still requires **exact SQL 001–009** until an independently reviewed safe upgrade; this CI proof does not alter it.
- Verify mail sender, Origin/TLS/proxy Real-IP, private access policy and controlled synthetic Owner/Staff branch E2E. Do not turn on public auth via PR or ChatGPT.
- Arrange encrypted **off-host** backup with an authorized administrator and independently **restore to a new isolated, named DRVO-only recovery database**, recording retained backup, checksum, object permissions, access controls, RPO/RTO and deletion policy. Never restore into `DRVO_ERP_STAGING` or any Cashier/Clinic/AutoResponse DB.
- Obtain explicit owner/operator approval, signed security/backup evidence and validated migration checker before any future manually dispatched workflow for SQL 010–014. Always preserve existing schema history. **No migration authorization is implied here.**

## CI acceptance

The existing `.github/workflows/staging-db-automation-ci.yml` triggers on `tools/staging-db-automation/**` changes and runs the restricted migrator + independent SQL restore. Require its guarded-sql-migrator and root-bootstrap-proof jobs, along with K0/K1, to PASS on the exact PR HEAD. Verify that the newly added post-migration restore line is present in successful CI logs.

**Next:** K5F operator checks + independent offsite recovery on VPS are **external/manual blockers**, not tasks completed by source CI. Keep all private Module API/Web flags OFF.