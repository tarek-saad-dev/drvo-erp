# P5 — Synthetic dual-signer release and market attestation review

**2026-11-14 · GitHub-only CI proof, NOT a production signing system.**

## Architectural impact and trust separation

- ADR-030 Tenant/Business/Branch authorization and ADR-032 ACT-01..07 stand: a release must be **reviewed, actually deployed, compatible and eligible in a specific country+industry** before a separately approved Pilot rights grant can exist. K6C candidate metadata is NOT a release, SC-1 UNQUOTABLE isn't a grant. ADR-037 keeps universal release governance in the Lean Kernel.
- SC-0 `createVerifiedReleaseRegistry` already validates the platform release graph, SHA256 deployed-artifact equality, and expects a **trusted external** signature-verifier callback. It does **not** have production trust keys/approved market receipts and its production registry remains **EMPTY**.
- This PR adds `tools/salon-pilot/release-attestation-review.cjs`, a **standalone offline, synthetic-only** Ed25519 test of two distinct attestations:
  1. **Publisher signature** over exact canonical `drvo-sc0-release-v1` body, key/version, artifact/deployed digest, release approval ID, dependency graph and sorted market references.
  2. **Independent market-reviewer signature** over `drvo-market-approval-v1` body binding the same release approval ID+SHA256 to an exact country, industry, evidence ID and separate reviewer.
- Public keys are supplied by the **same untrusted synthetic fixture packet** and consequently prove ONLY cryptographic consistency, not actual publisher identity, reviewed DRVO deployment, legal/compliance eligibility, genuine independent authorizer, or the integrity of the operational key store. The code explicitly requires `provenance:SYNTHETIC_CI_ONLY` and rejects `PRODUCTION`.
- Rejects tampered release version/module/dependencies/digest, mismatched deployed SHA, bad or noncanonical signature, wrong algorithm, same signer key for both roles, self reviewer ID, missing/duplicated market receipts, altered country/industry/evidence ID and unknown schema keys (including secrets).
- Tests verify canonical SC-0 signed bytes match **exactly** what this offline tool validates; if SC-0 signed schema changes, CI fails closed rather than accepting an unsigned/incorrect payload.

## Absolute NO-GO invariants

**Every successful synthetic review returns** `status=SYNTHETIC_SIGNATURES_MATCH_UNTRUSTED_KEYS`, `independentOperatorTrustEstablished=false`, `realDeploymentVerified=false`, `realMarketComplianceVerified=false`, `canPublishProductionRelease=false`, `canGrantPilotRights=false`, `canEnablePrivateAuth=false`, `canActivateModules=false` and `canApplySql=false`.

No private/public API, database, signer service, production public key, real country policy, Publisher Release seed, actual verified entitlement, paid Subscription, business/customer record or runtime grant is introduced. The reviewer does not connect to the VPS, send emails or use a crypto private key except randomly generated ephemeral keys **inside tests**.

## Before a true release or pilot entitlement can be approved

1. Founder/Security and release owner approve a **real trust-anchor and rotation/revocation policy** with immutable independently held keys and reviewed issuer identity (never loaded from a request or a self-signed packet).
2. Independently verify exact deployed artifact digest/version, approved release graph, Business country/industry from trusted server data and reviewer evidence for every market; reject withdrawn approvals at runtime.
3. Approve, implement and test K5-scoped audited SQL Pilot grant and revoke path with independent approver, CAS/idempotency and current worker/HTTP authorization. No synthetic fixture may be replayed into live SQL.
4. Finish P1 K5F, P2 encrypted offhost independent restore, P3 HTTPS/Origin and P4 signed VPS SQL rollout before actual P6 browser acceptance. P7 owner/privacy/support pilot GO remains separate.

**CI:** `tests/p5-synthetic-release-attestation.test.cjs`, K0/K1. [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106): P5 still OPEN; 7 first Salon Pilot gates + 3 paid gates not closed by this PR. Rollback: revert test utility+docs, no data or active rights to undo.
