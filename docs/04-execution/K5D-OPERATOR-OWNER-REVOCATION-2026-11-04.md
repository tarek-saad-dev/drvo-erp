# DRVO ERP — Operator Owner Approval Revocation & Reissue (K5D)

**Code-only pending SQL migration 009.** All public K5 flags still OFF.

## Failure being addressed
An operator can approve a specific first Owner and send a one-time Resend
email, but provider failure/timeout can leave a valid committed approval
with no recoverable raw token. The system intentionally stores only
purpose-separated token HMACs, so the old link cannot be reconstructed.
A fresh approval must never implicitly reactivate or reuse that token.

## Reviewed, internal recovery path
- Migration `009_operator_owner_approval_revocation.sql` adds an
  append-only `core.OwnerApprovalRevocationAudit` with ApprovalId,
  keyed operator-identity digest and restricted reason code. It
  gives **NO** direct grants to the ordinary staging application login.
- `revokeOperatorApprovedOwner(pool,{approvalId,email,operatorId,reasonCode},key)`
  is internal, not injectable as a public NestJS endpoint. It only accepts
  `MAIL_FAILED`, `REISSUE`, or `OPERATOR_REVOKE`.
- Requires explicit Approval UUID **and** the matching canonical email and
  trusted operator identifier. HMAC digest binds the email; no plaintext
  email, raw token, or operator name is stored or logged.
- In one SERIALIZABLE SQL transaction, it locks an unconsumed, unrevoked
  approval; marks it revoked; invalidates all related unused
  OWNER_BOOTSTRAP challenges; inserts the audit record and a security
  event. Replayed/wrong-email revocations fail. It cannot revoke an
  already claimed Owner/account.
- The new `tools/k5d/operator-revoke-owner.cjs` requires an interactive
  **root-only** console, protected local staging DB + K5D operator files,
  strict local SQL migrator target `DRVO_ERP_STAGING`, and explicit
  `REVOKE <UUID>` confirmation. This is NOT a public API, staff route,
  SSH receiver, GitHub automated action or production procedure.
- After successful revocation, a trusted operator can use the existing
  root-only `operator-approve-owner.cjs` tool to approve the same email
  and username anew, creating a fresh independent one-time token and
  a new mail dispatch. Do NOT print or copy raw tokens.
- CI uses disposable SQL Server 2022 to show the normal runtime
  principal has no rights to revoke, the old token cannot create an Owner,
  the subsequent new token can, and a fully claimed Owner cannot be
  revoked by this recovery path.

## Activation dependencies
1. Confirm SQL migrations **006–009** actually applied on staging through
   the manual protected GitHub workflow. A previous run #41769638419
   was SKIPPED; **do not interpret that as a successful migration**.
2. Validate private HMAC key custody and equal value on operator and
   API server, verified Resend sender, operator identity, Nginx trusted
   real IP, and full tenant isolation test. No provider key should ever
   be pasted into GitHub PRs, test logs or chat.
3. Only then enable reviewed gated staging auth and invitation paths
   and exercise verified Owner and Staff E2E. No K5 feature flag is
   enabled by this migration or code merge.
