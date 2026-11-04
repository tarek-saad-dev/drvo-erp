# K5D — DB-Scoped Owner Claim Procedure (Migration 005)

**Status: PR-only, NOT APPLIED TO VPS.** This is not public registration.

## Security improvement
The prior internal Owner claim primitive required broad application DML for
Tenant/Business/Branch/Account/Approval/Challenge/VerifiedEmail. That would
violate DRVO's SQL default-deny model. This slice replaces direct app DML
with a single reviewed `core.ClaimApprovedOwner` procedure.

- SQL `005_owner_bootstrap_claim_permission.sql` creates
  `core.ClaimApprovedOwner` with `EXECUTE AS OWNER`. The procedure alone
  performs a SERIALIZABLE, single-use transaction against already operator-
  approved `OwnerBootstrapApproval` and valid, purpose-scoped and unexpired
  `EmailVerificationChallenge` rows.
- The procedure never accepts usernames, company names, emails in plaintext,
  RoleCodes, arbitrary permission grants, or SQL identifiers from clients.
  It copies approved identity/names from trusted DB records. Callers can only
  supply digests, fresh GUIDs and scrypt bytes.
- Runtime `drvo_erp_stage_app` receives **EXECUTE on that one procedure only**,
  not SELECT/INSERT/UPDATE on K5D onboarding tables and not broad Account /
  Tenant creation privileges. No seed rows or default Owner access.
- Node computes HMAC digest from a server-only key, validates a purpose-bound
  256-bit token, hashes a strong user password before SQL and invokes the
  stored procedure using typed parameters.
- One transaction either creates all Tenant, Business, Branch, Account,
  Credential, membership, assignment, Owner role and minimal other roles,
  VerifiedAccountEmail, security audit, and consumes challenge + approval,
  **or none of these writes persists**.
- Disposable SQL Server CI uses `drvo_erp_stage_app` to prove permitted
  procedure execution, forbidden direct SELECT / INSERT, replay rejection,
  expired/revoked/stale/wrong-purpose denial, username collision rollback and
  simultaneous redemption collision safety.

## Activation gates
**Do not enable public Login, Owner Bootstrap, verification UI, email mailer,
or member admin on Staging because of this migration.** In particular:
- Operators must explicitly run the reviewed, manual
  `staging-db-migrate.yml` from `main` with exact
  `confirm_database=DRVO_ERP_STAGING` **only after CI/merge review**.
  This is a new migration 005, not part of the verified prior 004 run.
- There is **NO** public `POST /api/auth/verify-email` route, no approved
  first Owner issuance, no verified mail delivery, no operator authentication
  for approvals, no anti-abuse policy signoff, invitation acceptance or recovery.
- No live account creation, API feature flags or external emails are performed
  by this PR. Migration 005 changes SQL permission scope ONLY if separately
  applied by the authorized staging workflow. Keep all K5 public feature
  flags OFF. Offsite backup/restore and security audit remain open gates.
