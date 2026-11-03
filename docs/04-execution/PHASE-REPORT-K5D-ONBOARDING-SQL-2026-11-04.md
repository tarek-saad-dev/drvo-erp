# K5D — Verified Onboarding Persistence Foundation (staging-only)

Date: 2026-11-04

**Status: schema-only, behind the existing authenticated app feature gates. No public Owner registration; no actual Owner has been created.**

## Scope delivered
- `004_verified_onboarding_foundation.sql` creates four **empty** `core` tables:
  1. `OwnerBootstrapApproval` — explicit, limited-time operator intent for the **first Owner**, bound to a globally unique candidate username, approved email digest, and intended Tenant/Business/Branch names. Contains optional consumed account references and revocation state. A pending email and username cannot be approved more than once. **No automatic first-registrant ownership.**
  2. `EmailVerificationChallenge` — SHA-256 token and email digests, allowed purpose only, short-lived expiry supplied by trusted server, bounded failed-attempt counter and single-use consumed timestamp.
  3. `VerifiedAccountEmail` — FK to the canonical scoped Account and unique email digest.
  4. `AccountInvitation` — scoped Tenant/Business/Branch inviter and BusinessRole foreign keys, hashed invite token, expiry, acceptance and revocation.
- No plaintext passwords, email addresses, invite URLs, OTPs or bearer tokens are seeded in SQL.
- No `GRANT` to the existing application SQL principal on these tables. No SMTP/email provider/API/user-facing endpoint is enabled.
- Existing K5A CI remains pinned to 001–002 and K5B tests to 001–003; the dedicated K5D workflow tests the 001–004 chain on throwaway SQL Server 2022.
- The manual Staging SQL workflow remains the **only approved path** to apply migration 004 to `DRVO_ERP_STAGING` after code review; it is not applied merely by PR merge.

## Threat boundaries / still-open gates
- **Approval authenticity:** reviewed operator must create/approve a specific first Owner intent. An email-only magic link can never become a global Owner without this pre-existing trusted approval.
- **Email possession:** no mail provider or rate-limited verification service is configured yet. Do not accept a request body flag such as `emailVerified=true`; proof must be generated and validated on server.
- **Challenge use:** single-use token verification, expiry/attempt throttling, replay concurrency and generic non-enumerating responses require a separate audited K5D service.
- **Principal grants:** new tables remain unreadable/unwritable to the ordinary application DB login until the service has completed full transaction/permission testing. Least-privilege stored procedures should be preferred for first-Owner provisioning rather than granting broad CREATE/INSERT rights to a public runtime identity.
- **Approval issues:** operator-controlled creation/revocation, approval audit, password recovery and anti-fraud must be implemented before activating any signup/invite UI.
- **Operational recovery:** database local backup is not a substitute for independent offsite copies and periodic restore drills.

**Do not toggle `DRVO_K5_AUTH_ENABLED`, `DRVO_K5_WEB_ENABLED`, `DRVO_K5_ROLE_ADMIN_ENABLED`, or any future Owner-bootstrap flag just because this migration exists.**
