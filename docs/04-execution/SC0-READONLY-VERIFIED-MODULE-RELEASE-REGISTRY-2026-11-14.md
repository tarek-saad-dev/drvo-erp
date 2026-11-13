# SC-0 — Review-gated Global Module Release read-only boundary

**Date:** 2026-11-14 · **Status:** GitHub implementation PR only; no real verified releases and **no publish/activate API**.

## Decision and architecture
- Founder explicitly accepted **ADR-032 ACT-01..07 as V1 baseline**, not prices, tax, payments, entitlements or live activation. This PR is limited to SC-0 read-only.
- Reuses Lean Kernel (ADR-037), immutable platform release metadata, K6B pure dependency graph validation **only as a graph algorithm**, not K6B test-candidate authorization; K6C candidate table remains strictly non-authoritative. No duplicate Salon/K5/POS owner.
- Introduces `packages/kernel/src/verified-release-registry.ts` with a release evidence descriptor (module key/version, REQUIRED/OPTIONAL/conflict, artifact SHA256 == independently deployed artifact SHA256, immutable approval ID, publisher ID/signature, explicit non-wildcard market `country+industry+evidenceId`).
- Registry construction **requires a trusted external signature verifier callback** (owned by separately reviewed DRVO release pipeline; a false/missing verifier fails closed) plus strict canonical fields and graph/market validation. This code **does not** magically prove country/industry compliance or actual operator approval: independent evidence review is mandatory. Only one version/key is permitted in this conservative first iteration. Compatible multiple versions and Extension ABI remain future separate policy.
- **Empty production registry** intentionally contains no trust roots, keys, production receipts or approved country/industry. No user- or Business-supplied market may be treated as independently validated. No approved publisher or commercial Release is registered by this PR.

## Private API
`GET /api/workspaces/:businessId/branches/:branchId/modules/releases`, requires `DRVO_K5_AUTH_ENABLED=YES` **AND** `DRVO_SC0_RELEASE_READ_ENABLED=YES`. Both are default-OFF. Parses current K5 HttpOnly session and rechecks current Business/Branch membership and `branch.read` on server. Response always `{ "releases": [], "status": "NO_VERIFIED_RELEASES" }` until a separately approved trusted Business market eligibility and DRVO publisher-attestation integration is implemented. Missing/unauthorized scope denied; `Cache-Control:no-store`. No POST, publish, change config, activate, billing or entitlement.
  
**Why deliberately empty:** K4 Business schema currently has no approved authenticated jurisdiction/industry eligibility source. Accepting a country from URL/client, or converting K6C candidate rows into releases, would violate ADR-030 and ADR-036. Never populate from synthetic fixtures; pure tests create locally signed *synthetic* records only.

## Negative tests and rollout
- `tests/sc0-reviewed-release-registry.test.cjs`: Node Ed25519-signed synthetic payload, tamper denial, no verifier, missing/deployed digest mismatch, duplicate/graph cycle/conflict/missing required, cross-country/industry missing dependency, immutable deep snapshots, no wildcard eligibility.
- `apps/api/test/sc0-releases.test.cjs`: default-OFF service/controller, branch authorization, no released claims, expired/no membership mock denial.
- No SQL file/migration, role grant, seed, real customers, runtime configuration or frontend tile. Build/unit CI only; SQL 010–017 on VPS and public K5 remain forbidden, K5F/offsite restore and ADR-031 remain OPEN.
- **Not a live release:** a functional read-model contract and private empty API is NOT production publishing, financial approval, country certification, SaaS activation or customer availability. A signer trust anchor, independent release attestation, Business eligibility source and deployed release proof require separate security/product approvals before returning non-empty results.
- Separate SC-1 PR may compose this registry with **trusted** price/entitlement/Business revision facts into a read-only preview. Unknown evidence => UNQUOTABLE. SC-2/SC-3 remain unauthorized.

**Rollback:** revert this PR before any feature is live; no SQL/data changes. No VPS activity.
