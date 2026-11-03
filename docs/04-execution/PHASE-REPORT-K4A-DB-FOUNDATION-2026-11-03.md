# DRVO ERP — K4A Database Foundation Implementation Report

**Date:** 2026-11-03  
**Status:** **K4A implementation and disposable SQL integration verified; staging DDL NOT applied**  
**Pull request:** [#18](https://github.com/tarek-saad-dev/drvo-erp/pull/18)

## What is implemented
- `db/migrations/001_platform_identity_foundation.sql`: physical tables `core.Tenant`, `core.Business`, `core.Branch`, `core.Account`, `core.BusinessMembership`, `core.BranchAssignment`. Names and tenancy boundaries follow DRVO ERP architecture, not copied tables from Casher.
- Composite foreign keys for Tenant/Business/Branch and Account/BusinessMembership/BranchAssignment prevent inconsistent parent ancestry; a globally unique, case-insensitive username and versioned Account sessions are provisioned, but real login is not.
- `tools/k4-db/migrate.cjs`: sequential SHA-256 checksummed, transactional, lock-serialized SQL migrations. Strict explicit CI or DRVO_ERP_STAGING-only target selection; no automatic production DB migration.
- `apps/api/src/data/foundation-connection.ts`: internal opt-in connection factory refuses absent flag, non-loopback host, non-allowlisted database, sa runtime credentials.
- `apps/api/src/data/foundation-repository.ts`: typed, parameterized **structural** Branch assignment query using server-supplied Account identity/version and database-derived Tenant. This is NOT permission validation; authorization needs K5 Role/Action checks.
- A dedicated `K4 SQL Server Foundation CI` workflow runs a disposable SQL Server 2022 test container (bound to 127.0.0.1:14334); no live VPS SQL access, no customer data.

## Tested evidence — 2026-11-03
- **22 SQL checks PASS**: migration apply and unchanged replay; SHA drift rejects tampered migration; failed DDL rolls back; cross-Tenant/Business composite FK rejection; duplicate username rejected; valid branch assignment scoped to actor; other Tenant/Business and missing membership rejected; revoked membership and assignment denied; disabled Tenant/Business/Branch/Account denied; malformed actor/scope/session fail closed; CAS rowversion stale write denied; CONNECT-only app login denied table SELECT; full BACKUP+RESTORE into a second isolated database preserved schema/data/migration history; runtime DB config refuses misrouting.
- API build and all K0 Foundation / K1 Runtime / K3 Trusted Scope / DevOps Staging Artifact CI checks PASS on PR head. K3 proof remains test-only and production-disabled.
- No SQL schema or records in `DRVO_ERP_STAGING` were changed by this code/CI activity.

## Reference review
Existing Cut Salon Casher `scripts/drvo/migrations/index.ts` provided precedent for a numbered migration manifest and checksum checks; `src/modules/messaging/campaigns/infra/campaignRepository.ts` showed explicit parameterized Tenant predicates. The new ERP retains its own universal domain model and independent SQL database. This review did not copy Casher SQL or data.

## Pending K4B — separate operator and security gates
1. Approve ADR-030 physical scope and K5 authorization semantics. Structural BranchAssignment is not an authorization role.
2. Before executing any staging DDL, establish a **DRVO_ERP_STAGING-only migration login**, create a restorable backup and test recovery with an isolated target, and confirm SQL edition/resources. Never reuse Casher databases.
3. Apply checked migrations to the already provisioned **empty** `DRVO_ERP_STAGING` using explicit local operator credentials. The current `drvo_erp_stage_app` CONNECT-only login is intentionally not authorized to apply migrations.
4. Verify idempotent replay and migration checksums on staging, independent restore, DB permissions and smoke checks.
5. Implement K5 login/session/Role policy and connect the API only with least privileges and complete authorization gates; staging must be access-restricted before real customer data.
6. Define backup RPO/RTO, alerting, and watch VPS swap utilization before adding persistent jobs.

**Conclusion:** K4A engineering candidate is implemented and integration-tested; K4 overall remains OPEN until the operator-facing staging migration, recovery and runtime integration gates are verified.
