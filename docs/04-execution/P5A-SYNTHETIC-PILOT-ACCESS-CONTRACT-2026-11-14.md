# P5-A — Non-commercial Pilot security contract (synthetic-only implementation)

**2026-11-14 · Founder choice:** **Option A ACCEPTED FOR GITHUB-ONLY ENGINEERING PREPARATION.** No live grant, entitlement, authenticated Pilot account or activation is approved. P5 still **NOT operationally accepted**, and the other P1–P7 Salon gates are unchanged.

## Architecture impact before implementation

- Keep the accepted **ADR-037 Lean Kernel**: a small, industry-neutral authorization **policy simulation** belongs to `packages/kernel`, not to Salon/Booking, and **does not** copy Customers/Catalog/Booking/POS records.
- Keep ADR-030 trusted Tenant→Business→Branch isolation: actual identity/membership/BranchRole and SQL enforcement must be verified by the future server/worker/DB adapter, not by user-supplied input or the browser.
- Keep ADR-032 separate paid approval/verified entitlement rules. This module does **not** grant an App ACTIVE state and cannot replace a verified DRVO SaaS payment or commercial quote.
- SC-0 production release registry is still **EMPTY**. Synthetic Ed25519/fixture approvals in K0 tests are not real deployed market-eligible releases. No production trust keys or approved Egypt-Salon release metadata added.

## What actually exists in this PR

`packages/kernel/src/pilot-access-simulation.ts` exports `evaluateSyntheticPilotAccess` under an explicit `provenance:"SYNTHETIC_CI_ONLY"` contract, never called from Nest controllers, SQL, workers or Web.

It evaluates a *synthetic* scoped Actor and one *synthetic* `PILOT_NON_COMMERCIAL` Grant per Account+Business+Branch, with:
- exact Tenant/Business/Branch/Account binding and simulated live Session/BusinessMembership/BranchAssignment/Account flags
- explicit current `effectiveActions` intersection with Grant `allowedActions` and hard-denied financial/unknown actions (no wildcard; Owner/Staff label never grants rights)
- independent simulated reviewer reference and explicit approved marker; never a real audit/signature
- positive start, expiry and a trusted policy-provided maximum duration (duration amount itself **not approved**), fail-closed revocation even if future-dated, current matching grant revision
- only release keys present in a supplied independently constructed `VerifiedReleaseRegistry` with exactly eligible country/industry and full transitive REQUIRED closure included in the grant, with withdrawn releases denied
- a **read-only immutable audit preview**, marked `recordWritten:false`, no IP, name, email, phone, money or secrets.

**Every return has `status:"SIMULATION_ONLY_NOT_AUTHORITY"`, `canIssueGrant:false`, `canEnableRuntime:false`, `canBill:false`**. A synthetic positive condition is named `wouldAllowInSyntheticScenario:true`, never real `allowed:true`. There is no API, feature flag, SQL migration, signing service, authenticated policy object, persistent audit table, user seed or runtime linkage.

## Negative tests

`tests/pilot-access-simulation.test.cjs` covers valid simulation that still cannot grant, empty production SC-0 registry, forged Tenant/Business/Branch/Account, revoked K5 session/membership/assignment, expiry/before-start/maximum duration, revoked Pilot, stale grant revision, missing role+grant action intersection, explicitly forbidden financial actions, wrong country/industry or unknown released Module, missing Required closure, withdrawn dependency, self-approval, duplicate or malformed IDs/lists/audit references, and immutable deterministic output.

## Security gates BEFORE real Pilot grants can even be proposed for runtime

1. **Independent signer and real release eligibility:** SC-0 publisher trust roots, actually deployed artifact/version verification, lawful Business country/industry evidence and release withdrawal lifecycle. CI fixture callback does not count.
2. **Trusted server-side scope/role:** obtain K5 immutable Session/Tenant scope, current membership, Branch assignment, role/action, expired account and revocation from server/SQL, never browser/query or a manually typed fixture.
3. **Real Pilot approval + revocation:** separately security-reviewed noncommercial grant owner, scoped SQL, revision/CAS, audited operator approval, independent reviewer evidence, legal limits and expiration, append-only audit, worker/cache access denials and restore/replay tests. No self-asserted `approved:true` or signed fixture accepted.
4. **P1–P4 operational:** immutable K5F root audit, encrypted independently restored off-host backup, trusted proxy/Origin/network and expressly authorized SQL010–017 run on VPS; this PR provides none.
5. **P6/P7 real test & launch:** independent synthetic Owner/Staff and foreign-Tenant Browser E2E after all gates, then one-Salon founder/security GO and consent/privacy/support. No customer access from this PR.

**No public auth, real activation, paid entitlement, POS POSTED, SQL010–017 on VPS, live data or deployed trust signer.** Rollback: revert this source-only PR; nothing persisted. See [Option A founder packet](SALON-PRIVATE-PILOT-RIGHTS-DECISION-2026-11-14.md) and [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106).
