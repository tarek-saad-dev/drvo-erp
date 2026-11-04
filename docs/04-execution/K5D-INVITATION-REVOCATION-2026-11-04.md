# DRVO ERP — K5D Invitation List & Revocation (2026-11-04)

**Status:** source-only until separate SQL migration 008 and staging release.
All onboarding/auth/invite flags remain OFF.

## Delivered
- Migration `008_invitation_management.sql` adds `core.ListBranchInvitations`
  and `core.RevokeBranchInvitation` with `EXECUTE AS SELF` (reviewed
  DB-scoped migrator), granting ordinary API SQL principal only EXECUTE on
  those two procedures, not direct SELECT/UPDATE on invitation table.
- Both procedures re-check the live Account, AuthSession token hash,
  SessionVersion, current Tenant/Business/Branch membership and
  `users.assign_role` action. Revocation additionally holds a
  SERIALIZABLE transaction and atomically sets `RevokedAtUtc` plus writes
  an audit event; accepted or already revoked links cannot be cancelled.
- The listing is limited to 50 records in the exact branch and **only**
  returns InvitationId, RoleId, RoleCode, issue/expiry timestamps and state.
  Email hashes, plaintext emails and bearer tokens are never returned.
- HTTP: `GET /api/workspaces/:businessId/branches/:branchId/access/invitations`
  and exact-Origin `POST .../invitations/:invitationId/revoke`.
  No-store everywhere. Mutations require an authenticated and scoped
  user; parameters are validated GUIDs and never grant roles.
- Existing Arabic branch access UI lists recent invitations, allows
  cancellation for pending/expired ones, and lets staff invite again by
  explicitly re-entering the email. Old link remains invalid.
  The entire invite panel hides if the API is not activated/authorized.
- SQL integration tests use a disposable SQL Server 2022 and prove
  runtime principal can list sanitized metadata, authorized Owner
  revokes a pending link, invalid/cross-branch/Staff/replay revocation
  is denied, revoked tokens cannot redeem, and reissuing creates a
  NEW independent bearer token. Neither real emails nor Owner accounts
  are created outside the disposable test.

## Blockers and operator follow-up
- SQL 006/007: operator's previous run [#41769638419](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41769638419)
  was **SKIPPED**, not a confirmed applied migration. SQL must be
  re-run on `main` with exact input `DRVO_ERP_STAGING` and an
  independently verified log including all pending migration names.
- Staging deploy for old commit `21cc541` initially failed with
  `ssh: connect to host ... port 22: Connection timed out`.
  This is an SSH reachability issue, not a failed API/SQL test.
  A retry can be attempted; do not disable SSH host-key checking
  or broaden server network access in code as a workaround.
- When this PR is reviewed, merged, and CI is green, run
  the guarded manual migration to apply 006–008 in order, after
  pre-migration backup. Never claim success from a green/skipped
  workflow alone; inspect actual `APPLIED` lines.
- Approval Resend secret, verified mail sender, real staging Owner,
  proxy real-IP trust and isolated Tenant cross-check remain separate
  security activation gates. Keep all K5 public flags OFF until signoff.
