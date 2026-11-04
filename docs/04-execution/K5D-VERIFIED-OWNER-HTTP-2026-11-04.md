# DRVO ERP — K5D Owner verified-email redemption HTTP + UI

**2026-11-04 — code proposal, disabled by default.**

## Delivered
- `POST /api/auth/verify-email` is registered only to complete an already
  operator-approved Owner claim, **not** open signup or public account creation.
  The service requires all three server gates:
  `DRVO_K5_AUTH_ENABLED=YES`,
  `DRVO_K5_OWNER_BOOTSTRAP_ENABLED=YES`,
  `DRVO_K5_VERIFY_API_ENABLED=YES`.
  All remain **OFF** on Staging.
- Requires exact configured HTTPS Origin and JSON Content-Type, no-store/no-referrer
  response headers and exactly `{purpose:'OWNER_BOOTSTRAP',token,email,newPassword}`.
  No arbitrary tenant, workspace, account or role ID accepted.
- Verifies the email normalized by the same K5D HMAC function; delegates to
  `core.ClaimApprovedOwner` (migration 005, already applied to staging).
  That SQL procedure independently checks current approval, challenge,
  cryptographic purpose, expiry, attempt status, concurrency, replay and scope.
  Username, company/branch names and role grants originate ONLY from the
  separate operator-approved database row.
- A durable SQL rate limit reuses existing `core.LoginThrottle` under a SERIALIZABLE
  transaction, with purpose-separated HMAC hashes of IP (max 24/15min) and
  email (max 6/15min). No plaintext email or IP is stored. All invalid POSTs
  count against the IP limit. 429 is generic.
- When `DRVO_K5_TRUST_NGINX_REAL_IP=YES`, only a loopback upstream may supply
  a syntactically valid `X-Real-IP`. Ops MUST verify the Nginx reverse proxy
  **overwrites** client-supplied `X-Real-IP` with its actual `$remote_addr`
  before enabling this flag. Otherwise the socket address is used, possibly
  grouping a reverse-proxy's traffic under one conservative throttle bucket.
- Browser `/verify-email` uses the one-time token from a hash fragment,
  removes the fragment immediately, keeps token in ephemeral ref only,
  asks for the approved email + strong password/confirmation, then POSTs
  body over same-origin HTTPS. Token is NEVER stored in React state,
  URL query, localStorage or cookie. Invitation purpose deliberately remains
  unsupported. Verified Owner must sign in normally after completing claim.

## Verification evidence / incomplete gates
- Unit tests: proxy trust boundaries, HMAC non-PII keys, SQL-disabled gates,
  same-origin JSON and response security headers.
- Disposable SQL Server integration tests: real restricted app login with
  existing K5A throttle grants, six attempts followed by 429, one successful
  operator-approved Owner claim through service, replay denied.
- External Resend mail requests are stubbed in CI, never sent live.
- **Not a launch:** operator approval creation and mail are root-only
  (PR #38); SQL 006 still needs authorized separate Staging migration.
  Neither login nor new verify routes are enabled automatically.
- Password recovery, employee invitations, operator reissue/revoke,
  per-email resend expiry and Nginx real-IP confirmation remain open.
  Require E2E signed-off security testing of first Owner and second Tenant,
  approved sender domain, protected HMAC key provisioning, backups/restore,
  and explicit flag activation before any real customer use.
