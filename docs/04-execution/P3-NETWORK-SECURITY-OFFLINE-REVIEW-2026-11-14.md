# P3 — Network, proxy, session and Origin readiness, redacted offline review

**Date:** 2026-11-14 · **Status:** GitHub-only security preparation, NOT a live Nginx/HTTPS/Origin attestation. Salon P3 [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) remains OPEN.

## Why the source-only parallel slice exists

A green K5/API/SQL CI or an SSH deploy receiver's success does not prove external HTTPS chain, trusted Nginx real-IP parsing, CSRF/Origin enforcement, private endpoints/flags, verified email sender/approved alternative, or direct HTTP negative Tenant/Business/Branch tests from outside the VPS. P3 requires independent operator and Security evaluation. This PR **does not interact with the VPS** and cannot grant access.

## Added offline tool and contract

`tools/salon-pilot/network-review.cjs` accepts only a **local bounded ≤8-KiB redacted JSON** summary, pins expected staging Origin `https://erp-stage.drvotech.com` as documented in existing K5F runbook, validates a reviewed source SHA, opaque external witness ID, UTC observation time, SHA-256 **reference digest** for Nginx policy, and nine exactly named operator controls. It does **not** inspect remote certificates, prove Nginx config, access the internet, execute shell scripts, read auth tokens, or sign an approval.

Safe local usage inside reviewed checkout:
```bash
node tools/salon-pilot/network-review.cjs --template > local-redacted-network.json
# Only after an authorized independent witness, fill local nonsecret summary fields.
node tools/salon-pilot/network-review.cjs --input local-redacted-network.json
```
Never commit or paste local evidence, cookies, tokens, reverse-proxy config with secrets, IP allowlists, customer names, private URLs or SMTP keys. CLI errors are generic and never include filenames/input. Even when every field is `OPERATOR_REPORTED`, output says `REPORTED_REQUIRES_INDEPENDENT_REVIEW`, `independentSecurityAttestationPerformed:false` and **every authorization field is false**.

## Independent operational tests that remain required

1. `externalHttpsCertificateAndHsts`: independently inspect TLS/redirect/HSTS and chain validity.
2. `trustedNginxProxyAndRealIp`: validate proxy hop trust, spoofed forwarded headers negative cases and observed actual client-IP handling.
3. `strictOriginCsrfAndCookie`: exact permitted origin, SameSite/HttpOnly/Secure cookie, rejected cross-site mutations.
4. `sensitiveResponseNoStore`: no cache disclosure of authenticated responses.
5. `privateK5EndpointsUnavailablePublicly`: K5/Salon/private Module flags remain OFF before explicit activation, verify external 404/deny.
6. `verifiedSenderOrApprovedInviteAlternative`: separately approved identity delivery sender or restricted alternative without external spamming.
7. `crossTenantAndCrossBusinessNegativeHttp`: synthetic T1/B1, T1/B2, T2/B3, foreign Branch negative tests.
8. `revokedSessionAndRoleNegativeHttp`: revoked session, membership and Branch action effective at next request (API and workers).
9. `externalNetworkWitness`: independent observation reference and Security/Operator signoff, not a self-reported successful test.

## Scope and tests

`tests/salon-network-review.test.cjs` proves strict input, no false acceptance from a perfect operator self-report, missing controls block, forged Origin rejected, untrusted witness/secret injection rejected, timestamp and checksum validation, safe local CLI. No API, SQL, migrations, live Nginx/Resend configs or TLS certificates changed. No external network or private access was tested by this PR.

Architecture remains ADR-030 trusted scoped auth + ADR-032 founder baseline; K5F3 source guard exists but hasn't been accepted via immutable VPS root review. P3 can be closed only by authorized real external evidence and independent Security review. P4 SQL010–017 and P5 non-commercial rights remain separate. Rollback: revert source files; nothing was activated.
