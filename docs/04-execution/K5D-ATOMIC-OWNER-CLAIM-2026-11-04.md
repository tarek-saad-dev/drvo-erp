# DRVO ERP — K5D Atomic Approved Owner Claim (INTERNAL / OFF)

**2026-11-04.** SQL migration `004` was confirmed applied to `DRVO_ERP_STAGING` by owner-triggered GitHub run [#41752093757](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41752093757):
`APPLIED: 004_verified_onboarding_foundation.sql`,
`DRVO DB MIGRATION PASS: 1 applied; 4 total`, with a pre-DDL COPY_ONLY backup.

## Delivered by this change
- `claimApprovedOwner(pool,{email,token,newPassword},env)` is an INTERNAL TypeScript service primitive, **not exported through HTTP or registered in NestJS**.
- Strictly requires BOTH `DRVO_K5_OWNER_BOOTSTRAP_ENABLED=YES` and `DRVO_K5_AUTH_ENABLED=YES`, plus an operator-supplied 256-bit `DRVO_K5_VERIFICATION_HMAC_KEY`. **Do not set any of these flags on VPS yet**.
- Looks up a current nonrevoked, unconsumed `OwnerBootstrapApproval` linked to an unconsumed, nonexpired OWNER_BOOTSTRAP `EmailVerificationChallenge` by purpose-separated HMAC token digest and canonical email HMAC digest. Challenge must have been created after approval.
- Uses a SERIALIZABLE SQL transaction and UPDLOCK/HOLDLOCK, creating exactly one Tenant + Business + Branch + Account, scrypt credential, active membership + branch assignment, four minimal BusinessRoles and RolePermissions, actual Owner BranchRole, VerifiedAccountEmail and immutable security-audit record, before consuming both approval and challenge.
- Failed transaction (including username collisions, replay and concurrent attempts) rolls back EVERYTHING, including challenge/approval consumption. SQL errors are replaced with a generic client-facing invalid-link error.
- Existing ordinary application SQL principal has no read/write grants on onboarding records, so even with code merged it cannot bootstrap Owners. No grants/migrations/provider calls were changed in this PR.
- Disposable SQL Server 2022 integration tests validate forward-only schema, successful Owner with real password login/branch navigation, replay denial, revoked/expired/stale/challenge-purpose and mismatched email denial, collision rollback, concurrent claims and ordinary principal denial. API unit tests check default-off gates.

## Deliberately NOT done
- No operator-only approval creation, email challenge issuance, sender configuration or live verification emails.
- No `POST /api/auth/verify-email` or public registration.
- No role/invitation acceptance or password recovery lifecycle yet.
- No user or company created on Staging / Production, no app account grants.
- No public flags enabled, no online SQL writes or DDL. All integration test writes target disposable SQL Server in CI.
- A privileged, narrowly-scoped stored procedure / execution principal and thorough threat model remain REQUIRED before wiring the public route. Do not simply GRANT INSERT/UPDATE on core onboarding tables to the normal app login.

## Next security-gated slices
1. Design and review operator approval path and challenge issuance with constant-time verification, signing-key custody, idempotent mail dispatch and anti-abuse.
2. Add narrowly scoped stored procedure or equivalent signed execution permission, preserving SQL default-deny for ordinary app credentials.
3. Wire an audited, IP-rate-limited, strictly Origin-checked one-time email verification endpoint, never using bearer tokens in query parameters.
4. Implement scoped invitations and recovery, full adversarial E2E tests, key rotation, encrypted offsite backup and independent restore.
5. Authorize first Owner on Staging only after security signoff and explicit owner approval.
