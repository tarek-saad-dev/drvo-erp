# P5-C — Synthetic independent trust-anchor enrollment boundary

**2026-11-14 · OFFLINE SOURCE / CI TEST ONLY. No real trust keys, release, market eligibility or access rights.**

## Why this exists

P5 [dual Ed25519 signatures](P5-SYNTHETIC-RELEASE-MARKET-SIGNATURES-2026-11-14.md) prove only integrity against **the packet's own public keys**. The independent trust decision requires a Publisher and Market reviewer whose enrolled identities and public keys come from a separately reviewed security source, with custody, revocation and approval signatures verified by independent operators. [P5 acceptance](P5-PRODUCTION-TRUST-ANCHOR-ACCEPTANCE-2026-11-14.md) defines future operational checks.

This PR adds a **synthetic-only caller-supplied snapshot** comparison. `tools/salon-pilot/anchored-release-review.cjs` accepts a separate test enrollment snapshot, strictly validates Ed25519 SPKI public keys, issuer and role separation, canonical test UTC validity and explicit revocation state, compares the packet's keys to the fixture, then re-verifies all existing release and market signatures.

**The snapshot is still untrusted input.** A passing result is **not** an independently enrolled production trust anchor; snapshot time is not a trusted clock. Neither an approval by a user nor possession of a test private key creates production authorization.

## Security acceptance illustrated in negative tests

- Unknown/forged Publisher or Market key (even if attacker signs a complete valid packet) ⇒ deny.
- Same key, key ID or issuer used for both Publisher/Market ⇒ deny.
- Mismatched release Publisher, independent Market Reviewer issuer, country or industry ⇒ deny.
- Expired/future-dated keys, any non-null revocation, invalid UTC instant or stale key ⇒ deny.
- Changed release version, dependency/digest or receipt signature ⇒ deny.
- Additional unknown/secret field, production provenance or invalid key type ⇒ deny.

All successful fixtures return `SYNTHETIC_ANCHORED_SIGNATURES_MATCH_UNTRUSTED_SNAPSHOT`, plus `canPublishProductionRelease=false`, `canGrantPilotRights=false`, `canEnablePrivateAuth=false`, `canActivateModules=false`, `canApplySql=false`, `independentOperatorTrustEstablished=false`.

## Architecture & deployment impact

- **Only** standalone offline Tool + Node test; no new Kernel, API, Web, worker, SQL, flags, production trust store or signing service.
- ADR-030 Tenant/Business/Branch enforcement, ADR-032 ACT-01–07 accepted baseline and ADR-037 Lean Kernel remain unchanged.
- Zero permission for live Salon, scoped grant, public Login, financial POSTED or customer data. SC-0 Production Registry stays EMPTY; P1–P7/C1–C3 all open.
- Test command: `node --test tests/p5-synthetic-trust-anchor.test.cjs`; K0/K1 CI required. Reverting these two files creates no runtime or data rollback.

## Required external work before real Pilot GO

Complete #121 (independent actual K5F root review), #122 (off-host encrypted witnessed restore), #123 (external network/K5 validation), separate authorized P4 SQL/window/release attestation, **real** trusted key-custody/issuer enrollment and reviewed country/industry release, plus approved persisted scoped rights with revocation/HTTP/worker audit; then P6 authenticated staging browser and P7 founder/security/privacy signoff. See [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106).
