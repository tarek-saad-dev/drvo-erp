# SaaS Commercial Core — staged engineering plan and acceptance gates

**Date:** 2026-11-12  
**Status:** **PROPOSED ONLY — pending ADR-032 founder decision + Finance/Security signoff**. This is a build sequence, **not authorization** for SQL migrations, public access, customer activation, payments, or a production release.

## Why now (verified GitHub checkpoint)

PRs #55 Shared Catalog, #57 Customers and #58 Booking are merged into `main`; private code and disposable SQL + HTTP proof exist. They are **not Business-activated, published or entitled**. ADR-030 trusted Tenant/Business/Branch scope + Default Deny baseline is accepted; RLS and broader production isolation review remain open. K5F readiness and root checker still expect **SQL migrations 001–009**, so **010–013 cannot be applied on VPS** without an independently authorized upgrade, backup/restore proof and security operations. ADR-032 is proposed and its [ACT-01–07 decision packet](ADR-032-FOUNDER-DECISION-PACKET-2026-11-12.md) is awaiting founder choice; **ADR-031** on merchant financial posting is separate.

## Ownership — Lean Kernel versus DRVO SaaS billing versus Business Modules

| Owner | Owns | Absolutely must NOT own |
| --- | --- | --- |
| Kernel release / eligibility | Versioned reviewed global release metadata, compatibility, industry/country eligibility, trusted scope and role gate | Settled money, merchant POS records, invented jurisdiction approvals |
| DRVO SaaS Commercial Core | Plan/quote/price versions, subscriptions, SaaS invoice/collection verification, credit/refund and evidence | Business Customer service sale, cashier payments, merchant GL or tax posting |
| Kernel entitlement/activation | Business-specific validated rights/state and CAS coordinator; checks requested action versus active rights | Deciding whether receipt screenshot proves payment, silently writing business records |
| Shared Catalog/Customers/Booking | Their own authoritative Business domain records and workflows | Auto-grant of SaaS rights, publishing new global release definitions |
| Salon Extensions | Reviewed bounded service/resource policies on top of Booking and Catalog contracts | Replacing shared Booking Core, bypassing Tenant scope |

## Vertical slices once decisions receive explicit approval

### Slice SC-0 — Release evidence and eligibility: reviewed read-only contracts

- **Purpose:** prevent an installed binary or K6C candidate row from masquerading as a commercially supported release.
- Introduce a reviewed immutable `PlatformModuleRelease` source/contract with validated version, required dependency graph, country/industry eligibility and compatible Extension versions; document release attestation/withdrawal lifecycle and DRVO-only publisher role.
- Contract/tests for unsupported country/industry, obsolete version, dependency cycle, missing release and denied unverified publisher. **No public activation and no live entitlement mutation**.
- No automatic grants; publish/eligibility must not be inferred from SQL 010 candidate rows.

### Slice SC-1 — Immutable read-only Business quote/plan preview

- **Purpose:** preview one exact valid, *already-released* Business Module selection, full transitive Required closure, active prerequisites, selected Optional items and itemized commercial exposure.
- Quote includes Business scope, graph and price revision, currency, tax treatment and duration/expiry/seat/branch constraints **only when Finance provided reviewed price facts**. Unknown tax/price/eligibility => explicit `UNQUOTABLE`/Default Deny, never fake zero.
- Existing K6A/K6B pure graph logic may be reused only after actual source review; no unapproved hard-coded dependency edges. Work behind OFF flags and synthetic disposable CI. No activation mutation.

### Slice SC-2 — Commercial approval & independently verified rights

- **Purpose:** keep **APPROVED != COLLECTED != ENTITLED**. Owner receives full immutable preview and explicitly signs exact bundle hash; re-check current K5 session/Business membership and allowed action.
- Paid license remains `PENDING` until separate authorized DRVO commercial verifier records acceptable evidence under signed Finance policy and audit; then a trusted, scoped grant can be issued. No screenshot/pay-reference-only auto-grant.
- Price/currency/tax/charge revisions must be versioned; retries idempotent, no duplicate collection claims; expired/revoked entitlements deny new commercial operations. Refund/dispute handling specified before real money.
- Never add or mutate merchant POS/Accounting journal in these flows.

### Slice SC-3 — Business activation coordinator and independent App Launcher

- **Purpose:** `ACTIVE` only when release/eligibility/entitlement/required dependencies/initialization/configuration/current scope all valid.
- Per-Business revision/CAS or short scoped serialized mutation, payload hash + idempotency key, audit/outbox with explicit failure/recovery states; no unrelated Business blocked globally.
- Preserve existing Active Modules and all historical Business records on bundle failure. Prevent disabling a Required prerequisite with active dependents; re-plan/re-approve charged changes.
- Launcher exposes one independent authorized tile per user-facing Module (ADR-015), but every API/worker/event gate independently rechecks entitlement and Tenant/Business/Branch scopes.

## Minimum proof before any merge of *mutation* slices

1. **Architecture:** ACT-01–07 founder decisions recorded in ADR-032, specific graph/role/limit semantics and ADR-036 market eligibility checks; clarify how Salon Starter is classified without inventing initial module prices/edges.
2. **Security:** scoped Tenant T1/B1, T1/B2, T2/B3 cross-access denial, branch-only Manager denial, revoked Owner/membership/session, direct API bypass, worker/outbox provenance, Support access, caching.
3. **Finance:** price revision/tax/rounding, manual payment source and independent verifier, explicit pending/payment failure, refunds/cancellations, no merchant ledger mutations.
4. **Concurrency:** 20 simultaneous same-key activations, conflicting key/hash, stale quote/release/role, dependency upgrade/disable races, init failure and resumed retry. Reference [50 adversarial cases](../02-architecture/MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md) and record exact case IDs/tests.
5. **Operational:** offsite restore, staging network/source-IP, Resend sender, K5F operator/security gate, root checker compatibility with actual migration count, exact production identity/roles/flags. No VPS or Public Auth changes without separate written authorization.
6. **Delivery discipline:** independent PR for each slice; CI test SQL in ephemeral disposable local runner; no customer data, real invoice, email or entitlement until approval. State in PR: changed files, tests, release/deployment verification, rollback path and remaining work.

## Delivery order and stop points

1. Review and explicitly decide V1 choices in **PR #56**; no auto-merge signifies consent.
2. Finance/Security confirm evidence/approval/pricing/retention; record gaps and do not simulate settled money.
3. Founder's separate engineering approval for SC-0/SC-1 **read-only** PR; code/tests only, feature OFF.
4. Separate approval for SC-2/SC-3 mutations and financial integration **after** proofs and accepted ADR-032.
5. Independent **K5 operational and SQL migration-readiness gate**, outside the new SaaS code PR. Until then, only CI disposable SQL and private review builds; no flags on VPS.
6. Only then decide private synthetic staging acceptance, full end-to-end QA and eventually release eligibility per market/industry.

**Operational conclusion:** code-only GitHub PRs can accelerate development but cannot bypass the security gates required to make DRVO ERP an accessible Business Operating System. Full Salon V1 still needs cancellation, staff/shift availability, POS/finance and relevant extension work as separately approved modules.
