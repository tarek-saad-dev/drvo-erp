# DRVO ERP — K5D scoped employee invitations

**2026-11-04. Implementation proposal, NOT a public release.**

## Delivered in SQL migration 007
- `core.IssueBranchInvitation`: typed, purpose-separated 256-bit invitation token digest; validates actual, nonrevoked, versioned server-issued issuer session; current Tenant, Business and Branch membership/assignment/role; exact `users.assign_role`; requested role only `MANAGER`, `STAFF` or `VIEWER`, with all requested actions a subset of issuer grants.
- Daily abuse guard (max 30 invitations per branch/day, 3 per recipient/day), plus filtered unique active invitation per branch-email.
- `core.AcceptBranchInvitation`: purpose-bound token and keyed email hash, not expired/revoked/accepted; issuer must STILL have active scoped permissions and the role must remain a subset; atomically creates a new Account + salted scrypt credential + VerifiedAccountEmail + BusinessMembership + BranchAssignment + BranchRole, then consumes invitation and records SecurityAudit. A replay/collision rolls back all writes.
- Both procedures use `EXECUTE AS SELF` bound to the restricted SQL migration creator, with ordinary staging app principal receiving **only EXECUTE on these two procedures**, not direct Account/Invitation DML.
- Existing Owner cannot delegate the Owner role. Existing registered email accounts are not supported by this first-new-employee invitation slice. Future expansion should bind existing-account membership with explicit consent and duplicate-account protection.

## API and interface
- Gated `POST /api/workspaces/:businessId/branches/:branchId/access/invitations` with current HttpOnly session, strict HTTPS Origin, only `{email,roleId}`; SQL procedure repeats authorization transactionally.
- Server-only Resend notice with purpose `ACCOUNT_INVITE`, link in URL hash; provider delivery errors are sanitized.
- `POST /api/auth/verify-email` accepts purpose `ACCOUNT_INVITE` with `{email,token,username,newPassword}`. It shares the existing durable per-IP/per-email HMAC SQL limiter.
- Arabic branch access UI offers an employee invitation form; verification UI asks invited person for email, username and strong password. Both private routes remain gated OFF.
- Disposable SQL 2022 tests: real Owner session issues one Staff invitation, cannot invite an Owner or into another branch, employee accepts once and can authenticate into exact authorized branch; direct app SQL invitation table access stays denied.
- All feature gates OFF; no real invitations/emails sent in CI.

## Activation remains blocked
- `DRVO_K5_INVITATIONS_ENABLED=YES` must NOT be enabled before 007 is
  reviewed, merged, manually deployed to `DRVO_ERP_STAGING` with the
  existing protected SQL migration workflow and full security signoff.
- The Owner bootstrap flow requires SQL 006 plus verified Resend sender,
  private HMAC key, IP proxy confirmation and an operator-approved first
  Owner. No Owner or customer has been created by this PR.
- Operational reissue/revoke, invite listing, session revocation on invitation
  issuer demotion, deliverability telemetry and recovery are still open.
- No general public signup, no arbitrary permission editing or cross-Tenant joins.
