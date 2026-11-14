# P5 — Production Release Trust Anchor: Independent Acceptance Contract

**2026-11-14 | DESIGN / REVIEW ONLY | NO PRODUCTION AUTHORIZATION**

Source of truth: [ADR-032](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md), [Salon gate #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106), [P5 synthetic signatures](P5-SYNTHETIC-RELEASE-MARKET-SIGNATURES-2026-11-14.md).

## Motivation and boundary

PR #119 verifies Ed25519 signatures using **public keys embedded in a synthetic untrusted input packet**. Signature validity alone cannot establish authorized Publisher/Market Reviewer identity, independent approval, deployed-release provenance, jurisdictional eligibility or a private Pilot right. SC-0 production Registry remains EMPTY. No activation, publication, entitlement, Owner/Staff login or real grant is approved here.

This document defines *reviewable* acceptance evidence, not a deployment plan or approved key management implementation. Separate Founder, Security, Release and Market/Legal signoffs are mandatory before engineering or operational activation.

## Proposed independent trust chain (NOT implemented)

1. **Trust anchor enrollment:** authorized Security custodian keeps an independently approved, versioned trusted Publisher key registry and a distinct Market Reviewer key registry outside user-supplied release packets. Record issuer, permitted roles, key identifier, custody reference, valid-from/until, explicit revocation and rotation history. Never treat a key carried in a signature packet as a trusted anchor.
2. **Publisher approval:** verify canonical SC-0 artifact manifest signature against pre-enrolled trusted Publisher key; bind exact release ID, module/version, artifact SHA-256, Required/Optional graph and immutable approval reference. Reject unknown, revoked, wrong-role, expired or rotated-out key.
3. **Market eligibility approval:** separately verify approved Country/Industry and independent market evidence against trusted Market Reviewer key. Bind signed market approval to **the same exact release ID and artifact digest**, scope, revision and expiry; no Publisher self-review.
4. **Deployed artifact binding:** independently verify actual reviewed GitHub SHA, deployed `release.sha`, artifact checksum, installed dependency graph and runtime provenance before production eligibility. CI success, a release record and an attested staging build are distinct proofs.
5. **Freshness and revocation:** fail closed on changed release graph, withdrawn market approval, key revocation, future/expired timestamps, unknown issuer, duplicate/replayed approval ID and stale evidence; re-evaluate at the authorization boundary.
6. **Rights boundary:** even an eligible Release is **not** a Pilot grant or a paid entitlement. Separate trusted server-resolved Tenant/Business/Branch/Account, K5 membership/role/session, exact action, explicit time-bounded scoped rights, transactional revision/CAS and durable audit requirements still require approved persistent implementation.
7. **No production side effects:** this design must not introduce API/worker toggles, production trust stores, SQL, Pilot grants, public Auth, financial POSTED or any server changes.

## Adversarial acceptance matrix before P5 live GO

| Case | Expected |
| --- | --- |
| Self-supplied key with valid synthetic signature | DENY: no enrolled authority |
| Publisher key used as Market Reviewer | DENY: distinct trusted issuer role |
| Unknown, expired or revoked key | DENY |
| Canonical manifest hash differs from deployed artifact | DENY |
| Market approval references another release/version/digest | DENY |
| Market approval for another Country or Industry | DENY |
| Required dependency not independently eligible | DENY |
| Previously valid release or market approval withdrawn | DENY immediately at authorization check |
| Valid release, but no current scoped Pilot grant | DENY |
| Expired/revoked grant or stale grant revision | DENY |
| Cross-Tenant, cross-Business, cross-Branch, wrong Account/action | DENY |
| Owner or reviewer tries to self-approve disallowed role | DENY |
| Offline fixtures pass without independently owned signing identities | SYNTHETIC ONLY — no production GO |

## Independent signoff package (no secrets)

- [ ] Approved trust-custody model with separate Publisher and Market reviewer identities and key rotation/revocation evidence
- [ ] Auditable enrollment/revocation authority and independent reviewer attestation; trusted issuer identities not loaded from the tested packet
- [ ] Canonical SC-0 release artifact with hash, dependency graph, exact version and independent deployment provenance
- [ ] Signed jurisdiction/industry eligibility decision bound to the same artifact
- [ ] Independently exercised adversarial matrix using test identity and disposable infrastructure
- [ ] Separate approved SQL persistent grant lifecycle, K5/HTTP/worker fail-closed action enforcement and durable audit review
- [ ] P1–P4 actual operator evidence accepted before P5 live activation; P6/P7 must still be completed
- [ ] Explicit Founder + Security + Release + Market/Legal decision reference for any later production implementation, followed by a separately authorized rollout

**Status:** UNAPPROVED DESIGN CHECKLIST. All P1–P7 stay OPEN. No claim of live trust anchors, issued Release or rights. This file is portable to other development environments and does not contain secret material.
