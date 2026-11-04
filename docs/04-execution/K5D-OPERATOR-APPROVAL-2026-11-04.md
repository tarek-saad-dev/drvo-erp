# K5D — First Owner operator-controlled approval & one-time mail

**Status (2026-11-04): implementation proposal; disabled by default. No live Owner, no email sent by CI.**

## New foundation
- Migration `006_owner_operator_approval_audit.sql` adds the `core.OwnerApprovalOperatorAudit` table linking each Owner approval to a **keyed** operator identity digest, without granting the ordinary app principal SELECT/INSERT/UPDATE.
- `issueOperatorApprovedOwner` validates an explicit username, canonical email, company and branch names, and operator identifier. In a SERIALIZABLE SQL transaction it writes:
  - operator-approved `OwnerBootstrapApproval` (24-hour approval validity);
  - a purpose-separated cryptographic `OWNER_BOOTSTRAP` email challenge (30-minute token validity);
  - operator attribution audit and a generic `SecurityAudit` event.
- Database stores **HMAC email and operator digests, token HMAC, not plaintext email, raw token or operator identity**.
- Existing `ClaimApprovedOwner` transaction remains the only allowed provisioner. Existing runtime SQL principal cannot issue approvals or read operator audit.
- `tools/k5d/operator-approve-owner.cjs` is a **root-only interactive VPS command**, not an HTTP API, job, or SSH backdoor. It requires explicit confirmation, a root-protected mail configuration and the separate database-scoped SQL migrator credential. It sends the verification link via the fixed Resend adapter, never logs token, email or secrets.

## Staging deployment prerequisites
- Operator must **review, merge, then manually apply SQL 006** using the already approved GitHub `staging-db-migrate.yml` on `main`, `confirm_database=DRVO_ERP_STAGING`. Code merge does NOT apply migration.
- Prepare `/etc/drvo-erp/k5d-operator.env` as a root-owned **0600** regular file, *not* in Git/GitHub/chat. Contents must include:
  - `DRVO_K5_OPERATOR_APPROVAL_ENABLED=YES`
  - `DRVO_K5_VERIFICATION_HMAC_KEY=<64 hex characters from cryptographically secure 32 bytes>`
  - `DRVO_K5_MAIL_ENABLED=YES`, `DRVO_K5_MAIL_PROVIDER=resend`
  - `DRVO_K5_RESEND_API_KEY=<private provider key>`
  - `DRVO_K5_FROM_EMAIL=<verified sender at provider>`
  - `DRVO_K5_ORIGIN=https://erp-stage.drvotech.com`
- The SAME HMAC secret must later be available only to the API server via a protected server secret, never embedded in code/client or CI. Do not enable auth endpoints until verification IP throttling, security review and routing are complete.
- On the VPS, update only the DRVO ERP `main` checkout; ensure `apps/api` dependencies are installed and compiled using the existing app build workflow; then from an interactive trusted root console run:
  `cd /srv/drvo-erp/repo && node tools/k5d/operator-approve-owner.cjs`.
- **Do not run this command yet**: the public verification completion endpoint is not implemented. Operator must first verify that email delivery and verified claim route are ready.

## Failure/operations
- The SQL approval is committed before contacting Resend, deliberately. A provider timeout or uncertain response leaves the approved identity and challenge pending; **never assume that an email was sent** and never log/reveal the raw token.
- Approval cannot silently be repeated for the same active email/username; a separately reviewed operator-only revoke/reissue path must be built before using this flow with real people.
- No account created until approved email proof, password and one-time SQL claim pass atomically; no Owner seeded or public signup/employee invite opened.
- CI tests use a disposable local SQL Server 2022, stubbed mail adapter and generated nonproduction HMAC; they do not make external mail requests.
