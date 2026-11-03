# K5D verification crypto policy — private foundation, not public sign-up

These utilities support **future** approved-Owner and invitation flows but provide no registered accounts, HTTP endpoints, email delivery or SQL write access on their own.

## Implemented

- `normalizeVerificationEmail()` accepts a conservative ASCII-only email profile; lowercases and trims outer whitespace. No Gmail dot removal, alias stripping or unsupported Unicode canonicalization. Future international email support must preserve existing identity-digest invariants.
- `verificationEmailDigest()` computes a **secret-keyed HMAC-SHA256**, not an unkeyed `SHA256(email)`; prevents naive dictionary recovery if the SQL digest table is disclosed alone.
- `generateOpaqueVerificationToken()` creates 32 random bytes (256 bits), encoded as a 43-character base64url token.
- `verificationTokenDigest()` hashes bearer tokens with a domain-separated HMAC keyed to one explicit purpose: `OWNER_BOOTSTRAP`, `ACCOUNT_INVITE` or `ACCOUNT_RECOVERY`. The same token cannot be passed as a token for another purpose.
- `matchesVerificationDigest()` uses constant-time digest comparison after rejecting invalid lengths and characters.
- `loadVerificationSecret()` rejects absent, malformed, not-256-bit or all-zero keys. **No real secret is committed or initialized**.

## Required before using this in operational onboarding

1. Generate a stable high-entropy `DRVO_K5_EMAIL_HMAC_SECRET` as 32 random bytes in hex **outside GitHub source files**. It must be kept only in server-side secret management; never placed in browser JS, database rows or GitHub CI test logs. Careful: losing/rotating this key invalidates existing email digests and pending verification tokens. A key-version rotation policy is required.
2. Use an email provider with domain ownership, safe sender reputation, delivery auditing and controlled failure handling; never return raw email verification tokens to an unauthenticated browser as a substitute for actual mailbox verification.
3. Complete **atomic SQL transaction**: verify approved Owner identity, nonexpired and unconsumed challenge, same verified email digest, consented unique username, per-IP/per-account rate limits, single-use mark; then provision Tenant/Business/Branch/Owner with auditable one-time approval consumption. The existing `004` migration intentionally gives the runtime SQL app identity no rights on approvals/challenges/invitations yet.
4. Complete verified employee invitation issuance/acceptance and recovery flow with per-Branch permission subset and no Owner self-promotion.
5. Preserve `DRVO_K5_AUTH_ENABLED`, `DRVO_K5_WEB_ENABLED`, `DRVO_K5_ROLE_ADMIN_ENABLED` **OFF** until approved end-to-end tests and incident-response procedure exist.

## Automated tests

`apps/api/test/verification-crypto.test.cjs` covers normalization and invalid-address boundaries, keyed (not public) email digests, 256-bit token format/uniqueness, purpose separation, invalid-token fail-closed behavior and constant-time hash comparisons. `K5D Verified Onboarding SQL Foundation CI` and the existing K5 API CI run the tests from a compiled NestJS API, with no real provider or live database.
