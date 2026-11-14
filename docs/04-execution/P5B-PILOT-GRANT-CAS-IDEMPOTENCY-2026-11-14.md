# P5-B — Synthetic Pilot change protocol: CAS + idempotency + revocation

**2026-11-14 · GitHub-only engineering, NOT a live rights implementation.** Founder authorized Option A design and isolated tests, not actual release publishing, paid or noncommercial grants, SQL schema, per-Request enforcement, VPS migrations or Public Auth.

## Reason and architecture effect

P5-A already simulates grant eligibility, release/market scope, RBAC, expiry and revocation without runtime activation. P5-B adds a **pure, non-persistent transition model** for proposed grant and simulated revoke records so the eventual implementation has testable consistency rules for concurrency and retries. It resides in the **Lean Platform Kernel**; no Salon, POS, Customers, Catalog or Booking domain tables touched.

`planSyntheticPilotChange(history,command)` requires `SYNTHETIC_CI_ONLY`, exact 5-ID Tenant+Business+Branch+Account+Grant scope, independent Operator/Reviewer different from the target Account, immutable monotonic UTC event time, SHA-256 request payload digest, UUID idempotency request and strict per-grant revision.

- No existing grant: `PROPOSED` only at expected revision 0. **This does NOT create an approved or active grant.**
- A later `REVOKED` event must match the same scope, current revision and prior proposal; a second proposal over same grant and post-revoke reactivation are denied in this model.
- Same UUID/key+operation+payload returns `SIMULATED_IDEMPOTENT_REPLAY`; different digest or operation is rejected.
- Stale revision, malformed/foreign event history, scope splice, duplicate request key, non-monotonic time, self-review and missing claimed release reference fail closed. A claimed release evidence reference is **not** trusted proof of a deployed, eligible release.
- Every result includes **`canWriteGrant:false`, `canActivateModule:false`, `canApproveCommercial:false`, `auditWritten:false`**, including successful simulations.
- No SQL tables/migrations, endpoints, persisted audit/outbox, workers, keys, real Business/Owner users or feature flags introduced. No real CAS transaction occurs: concurrent events are modeled against sequential snapshots only.

### Security proof and next gate

`tests/pilot-grant-protocol.test.cjs` tests exact replay vs changed payload, stale concurrent request simulation, revoke-then-deny, cross-scope history, independent reviewer, invalid history and times, no runtime/write claims. Existing K0 CI builds and runs pure Node tests. **Real concurrent write safety needs independent SQL transaction/CAS, durable audit, approved release verifier/market evidence and current K5 DB membership/revocation checks — all separately gated under P5.** P1 K5F, P2 offhost restore, P3 external Origin, P4 VPS SQL, P6 browser and P7 first Salon GO remain open.

**Rollback:** revert the PR; no business data or user rights were modified. See [Salon launch gates #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) and [P5-A policy](P5A-SYNTHETIC-PILOT-ACCESS-CONTRACT-2026-11-14.md).
