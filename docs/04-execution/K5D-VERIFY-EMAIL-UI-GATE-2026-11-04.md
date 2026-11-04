# DRVO ERP — K5D verification receiver UI slice

**Date:** 2026-11-04
**Scope:** Gated, non-operational verification receiver. No Owner provisioned; no customer login activated.

## Implemented
- `/verify-email` exists as an Arabic RTL page but returns 404 unless **both**
  `DRVO_K5_WEB_ENABLED=YES` and `DRVO_K5_VERIFY_UI_ENABLED=YES` are configured.
  Both remain OFF in Staging and must not be enabled by this pull request.
- Existing optional mail adapter now builds fragment links as
  `/verify-email#token=<opaque>&purpose=<OWNER_BOOTSTRAP|ACCOUNT_INVITE>`
  so the later server can validate the intended cryptographic purpose.
  It sends zero real emails in automated tests and stays OFF by default.
- Client parses only known-purpose 43-character base64url tokens, immediately
  removes the complete URL fragment before any request, never persists the bearer
  token to browser storage/React state, does not render it, and sends it only
  in a **same-origin POST body** to the reserved `/api/auth/verify-email` endpoint.
  The endpoint is **NOT implemented** by this slice. The UI requires the future
  endpoint to return `{ "verified": true }` before showing success.
- No-referrer and no-index metadata on the private page. No external scripts.
- CI adds strict parser unit tests, checks disabled route HTTP 404,
  continues Next.js build/typecheck and existing API mailer tests.

## Hard BLOCKERS before any activation
1. Operator approval and secure issuance of first Owner challenge.
2. Atomic, idempotent SQL verification and Owner creation + consumption with
   strict expiry, attempt limits, audit and appropriate principal permissions.
3. Branch-scoped invitation issuance/acceptance and reviewed recovery.
4. Application + IP abuse throttles, public Origin/CSRF checks and secrets rotation.
5. A tested backend `POST /api/auth/verify-email` with an explicit security review.
6. Confirm SQL 004 has been applied to DRVO_ERP_STAGING via approved **manual**
   GitHub SQL workflow and verified backup / restore. No workflow triggered here.

No account, email address, verification token, provider secret, SQL principal
privilege, or production environment is changed by merging this UI work.
