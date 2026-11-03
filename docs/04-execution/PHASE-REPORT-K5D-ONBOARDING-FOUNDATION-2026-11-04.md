# DRVO ERP — K5D Verified Onboarding Security Foundation

**Date:** 2026-11-04  
**Status:** SQL schema and automated security proofs only; **no operational owner bootstrap or public auth activated**.

## Newly introduced SQL schema

- `004_verified_onboarding_foundation.sql` adds `core.OwnerBootstrapApproval` to capture an explicit operator-approved first Owner *identity* (username and email hash), initial display names, expiry, and one-time consumption metadata. An approval is not a globally privileged user.
- `core.EmailVerificationChallenge` reserves purpose-scoped, SHA-256 token digests for proof-of-email, with expiry, bounded attempts and one-time consumption; neither raw OTPs nor magic-link tokens are stored.
- `core.VerifiedAccountEmail` binds a verified email digest to one Account in one Tenant using composite account FK.
- `core.AccountInvitation` reserves Tenant/Business/Branch scoped invitations, issuer and intended BusinessRole composite FKs, token digests, expiry, revoke and acceptance fields.
- The migration intentionally grants **NO SELECT/INSERT/UPDATE/DELETE** on any of these tables to the ordinary API SQL user, and creates **NO owner, no business, no user, no seed, no invitations**.
- SQL foreign keys enforce reference isolation and uniqueness/check constraints reject obviously malformed, duplicated or invalid-lived approvals and tokens.

## What the schema does NOT deliver

- No public or private API routes are added and no verification emails are sent.
- No Owner provisioned. A separate reviewed system must authenticate an authorized operator, collect/validate owner identity and email ownership, support actual mail delivery, and atomically consume an approval only upon successful provisioning.
- No invitations are sent or accepted yet. Current Manager permissions and existing default-OFF flags are unchanged.
- Email hashes are placeholders for the model; a reviewed threat model must determine keyed/HMAC email normalization, retention, delivery, throttling, constant-time comparisons and safe re-issue rules before use.
- Database constraints **do not** replace transaction logic for time-based expiry, one-time consumption, brute-force mitigation, invitation acceptance or Owner non-escalation.
- Existing Owner bootstrap, invite acceptance, recovery, registration and workspace UIs remain disabled for public usage.

## Test evidence

New dedicated K5D SQL 2022 GitHub Action runs migration 001–004 twice (apply + idempotent replay), empty-table checks, approval uniqueness/expiry constraints, challenge token uniqueness and purpose checks, Branch-scoped FK invite checks, verified email uniqueness, and denies ordinary SQL app login read/write. Tests use a **disposable localhost SQL Server Docker container**, never VPS or other project databases.

Existing CI migration tests limited to historical migration counts continue to run separately. Operators must run the existing, manually approved `staging-db-migrate.yml` from `main` to apply `004` to the real `DRVO_ERP_STAGING` after successful CI/merge; code deployment alone does not execute SQL DDL.

## Next: K5D service and approval

- Design a controlled provisioning mechanism that can't allow public first-registrant takeover; approve Owner identity out-of-band with operator access and mail delivery.
- Implement verified-email challenge lifecycle with secure token issuance, max attempts, expiry, delivery via provider, rate limits, single-use SQL transaction and precise audit.
- Implement atomic first-Owner creation (Tenant, Business, Branch, Account, AccountCredential, role/permissions, explicit Membership + BranchAssignment) with idempotence and no forbidden elevated grants.
- Employee invitations, multi-user role assignments, recovery and Owner audit plus backup/restore monitoring.
- End-to-end HTTP/SQL tests across 2 Tenants, 2 Businesses, separate Branches; secrets and authentication never enter GitHub logs. Security sign-off before enabling `DRVO_K5_AUTH_ENABLED`, `DRVO_K5_ROLE_ADMIN_ENABLED`, `DRVO_K5_WEB_ENABLED`.
