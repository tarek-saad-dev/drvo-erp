# DRVO ERP — K5D optional email delivery adapter (DISABLED)

This code is a **server-side-only** transactional email adapter, not a live account registration endpoint. It never runs unless a separately reviewed onboarding service calls it. No provider request, DNS operation, signup, email or Owner account is executed by GitHub CI.

## Provider selection: optional Resend integration

- Fixed endpoint `POST https://api.resend.com/emails`, no remote URL from user input. Official [Resend OpenAPI](https://github.com/resend/resend-openapi/blob/main/resend.yaml) documents `Authorization`, `Idempotency-Key` and email body.
- Server-only configuration for future, deliberately NOT configured by this change:
  - `DRVO_K5_MAIL_ENABLED=YES` and `DRVO_K5_MAIL_PROVIDER=resend`
  - `DRVO_K5_RESEND_API_KEY` (server secret; never in GitHub source, browser or logs)
  - `DRVO_K5_FROM_EMAIL` from an independently verified sender domain
  - `DRVO_K5_ORIGIN` fixed public HTTPS host.
- The adapter normalizes recipient email, validates a 43-character cryptographic challenge token + UUID challenge ID + allowed purpose, sends plain text only, uses `Idempotency-Key: drvo-k5d-<challengeId>`, enforces 10s timeout, and emits generic errors without leaking API keys, provider payloads or bearer tokens.
- Token goes in the URL **fragment** `/verify-email#token=...` (not ordinary HTTP request query), but that route is not yet implemented. The future browser UI must clear the fragment on first paint, POST to the verified-email endpoint and never load third-party scripts before clearing it.
- Adapter purpose support is deliberately limited to `OWNER_BOOTSTRAP` and `ACCOUNT_INVITE`. Password recovery remains separate until a reviewed recovery policy is implemented.

## MUST NOT turn it on yet

The project still lacks an operator-approved first Owner provisioning service, email challenge issuance/consumption SQL transactions, verified receiver page, IP+username delivery and brute-force rate limiting, outgoing domain configuration, abuse monitoring, recovery rotation and test account workflow. It is not safe to send these links until those components exist. All feature flags and stage API customer auth remain OFF.

## Proof

Unit tests stub `fetch` and never contact Resend. They verify the disabled/default behavior, reject missing provider credentials and invalid origins, assert fixed endpoint + idempotency headers + canonical recipient + fragment bearer token, and check sanitized errors.
