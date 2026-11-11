# ADR-032 — Founder / Billing / Security decision packet (2026-11-12)

**Status: FOR REVIEW, NOT ACCEPTED.** This packet prepares concrete choices based on the existing proposed [ADR-032](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) and accepted ADR-007/015/016/017/020/030. **This is not authorization to implement activation, collect a payment, create accounts or grant an entitlement.**

## Decisions to approve separately before real activation

| ID | Decision | Recommended conservative V1 | Alternatives / open proof |
| --- | --- | --- | --- |
| ACT-01 | Scope and release gate | One activated Module graph per **Business**; Tenant from authenticated server; only released, signature/compatibility-reviewed binary; each country/industry eligibility independently approved | No arbitrary customer-uploaded executable Module or Business-specific fork |
| ACT-02 | Exact price and approval | Immutable `ActivationPlan` with full transitive **Required** closure, available/active items, per-item quote, tax/currency/recurrence and expiry. One explicit approval of **exact** bundle and price. No hidden paid prerequisite, optional never silently enabled | Approver: Owner vs specifically permissioned Manager; visibility into tax/proration; exact seat/branch limits |
| ACT-03 | Entitlement/payment truth | Default `PENDING`; manual collection verified by a separate authorized DRVO commercial operator with evidence before entitlement grant. Do not treat approval, invoice issue, screenshot or pending gateway callback as settlement | Minimum audit evidence, refund/credit rules, trial/grant policy, recurring invoice model |
| ACT-04 | Concurrency and replay | Transactional Business revision CAS or short Business-specific lock; immutable idempotency key/payload hash; stale plan/price forces new quote and consent; unrelated Businesses don't serialize globally | SQL Server implementation/performance proof; duplicate gateway callback and failed initializer recovery |
| ACT-05 | Activation visibility and safety | `ACTIVE` only if deployed/eligible, dependencies/config initialized and verified entitlement current; role/action enforced on each request. No dependent App appears ACTIVE while any Required prerequisite fails. Keep previously active data and financial history | Final lifecycle enums, suspension, grandfathering, async init transitions, event schema |
| ACT-06 | Role delegation and audit | Default Deny. Initiation/approval separate privileges; re-check session, business membership, action and entitlement **at commit**; append-only scope-labelled audit | Exact roles, support escalation and 40 Tenant negative test coverage |
| ACT-07 | Dependency disable/upgrade | Block disabling any Required prerequisite of an active dependent by default. Price impact/upgrade needs fresh preview and consent; never remove legally retained posted history | Future explicit cascade operation with separate review and cross-version extension tests |

## Proposed minimum technical contract — NOT implementation approval

1. `PlatformModuleRelease` is globally published **by DRVO only** after signed code/DB migration deployment, with stable `moduleKey/version`, target country/industry and dependency graph.
2. `BusinessActivationPlan` is an immutable snapshot of Business revision, exact deployed release IDs, full Required closure, optional consent and quote revision/expiry. Hash ties approval to plan.
3. `CommercialEntitlement` records a verified, scoped grant distinct from invoice/request/payment evidence; no entitlements from unverified claims.
4. A Business-scoped Coordinator atomically re-checks trusted actor scope and entitlement, then starts/retries activation with an idempotency key, CAS and audit. Activation can become ACTIVE only after all required initialization checks pass.
5. App Launcher grants **no rights**: every API/worker operation checks current Tenant, Business, action, entitlement and sensitivity constraints.
6. Security and finance negative tests for stale quote, expired entitlement, dependency cycle/conflict, mixed Tenant, same-Tenant different Business, concurrent activations, replay/double payment callback, failed initializer/compensation, downgrade-with-dependent, and rollback/restore.

## Explicit unresolved founder/billing choices

- Who can approve **paid** installation: Owner only, or named Manager with `modules.activate_paid`?
- Does V1 use manually verified collection only, or trial grants with time-bound audit? Must define evidence and operator separation.
- Per-Business currency/tax model and what is a valid activation quote vs draft estimate.
- When suspended/expired, do users get limited read/archive of historic business data?
- Whether any initial Salon Starter modules are mandatory; no list is implied by K6A/B fixture or K6C candidate metadata.
- How eligibility for multi-industry Businesses and countries is verified before publishing Module releases.
- Exact locking/CAS SQL schema and recovery states; RLS remains a separate ADR-030 review.

## Engineering checkpoints (hold)

- [ ] Founder approves ACT-01–ACT-07 or records exceptions.
- [ ] Billing/security owners approve manual payment proof, retention and data access.
- [ ] Update ADR-032 to **ACCEPTED only after explicit approval**, specifying final choices and limitations.
- [ ] Implement activation as separate Backend/SQL/eligible UI slice, with 50-case adversarial matrix and scoped real SQL E2E.
- [ ] No public K5 auth, VPS migrations, real customer access or paid activation until operational sign-off.

**Relationship to ongoing development:** Catalog/Customers/Booking may be engineered behind disabled flags with private, currently scoped SQL/API/UI. **They are not automatically commercially activated**. Never treat the K6C candidate list or test fixtures as released rights.
