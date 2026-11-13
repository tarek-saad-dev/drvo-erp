# ADR-032 — Founder / Billing / Security decision packet (2026-11-12)

**Status: ACT-01–ACT-07 FOUNDER-ACCEPTED AS V1 BASELINE on 2026-11-14; all Finance/Security and implementation approvals below remain OPEN.** This packet prepares concrete choices based on the existing proposed [ADR-032](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) and accepted ADR-007/015/016/017/020/030. **Founder now authorizes SC-0/SC-1 as separate READ-ONLY PRs only, not activation, collection, customer accounts, entitlements or VPS changes.**

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


---

## 2026-11-12 — Founder-ready **V1 proposal**, after Booking PR #58 merged

**Evidence update (not release approval):** source-only Shared Catalog #55, Customers #57 and Booking #58 are merged into `main`. Booking's latest PR CI proved scope and two concurrent same-resource booking attempts in disposable SQL. None of migrations **010–013** is approved for VPS; existing K5F operational checker expects 001–009. GitHub code deploy success does not imply commercial activation or customer use.

### Exact decisions requested (recommended V1 policy — NOT APPROVED)

| Decision | Recommended founder choice | What must be proven before changing status |
| --- | --- | --- |
| ACT-01 | **Business-scoped; reviewed platform release first.** Release Registry must use signed/reviewed deployed version + validated jurisdiction/industry compatibility; the K6C candidate list alone is NOT a released catalog | Release evidence, versioned compatibility check, default deny |
| ACT-02 | **One immutable complete bundle preview, one approval.** Include every transitive Required dependency and line-item applicable price, tax treatment, currency, recurrence, expiry, limits and explicitly chosen Optional items. If a value isn't approved/known, **do not label it an exact billable quote** | Finance-approved price/tax/rounding policy; immutable quote hash; stale/expired plan gets new consent |
| ACT-03 | **No auto-paid activation from screenshots.** V1 can use manual collection **only after** a separate DRVO billing operator verifies evidence and an approved audit/reconciliation policy. Before that: status PENDING; no paid entitlement or activation. No automatic free trial, self-asserted admin grant or gateway payment claimed | Document acceptable payment evidence, independent verifier, dispute/refund/correction/retention policy. Finance owner signoff required |
| ACT-04 | **Per-Business revision/CAS + idempotency.** Same key+same approved payload is repeatable; same key with different payload rejected; concurrent graph mutations serialize per Business, not per Tenant or platform | Disposable SQL concurrency proof; failure/retry/compensation tests |
| ACT-05 | **Strict ACTIVE truth.** Release deployed + eligible + same Business configuration valid + all Required dependencies ready + verified current entitlement + session/RBAC; visibility never an access grant | Failure-state truth table, outage/expiry/recovery tests, role revocation after preview |
| ACT-06 | **Paid approvals: Business Owner only in first V1** (explicit valid Business membership and action), with separately authorized DRVO billing verifier; no Manager delegation until permission matrix is reviewed and explicitly approved | Negative Branch-only Manager tests, scope checks at commit, dual-control audit. This is a new recommendation, not an existing founder rule |
| ACT-07 | **Block prerequisite disable** while any dependent active. A materially priced upgrade gets a new bundle quote/consent. After expiry, preserve historical business records and mandatory obligations; any read-only access policy is a separate consent/privacy/security decision | Dependency downgrade, retention, read/archive access and recovery matrix |

**Questions to close outside the platform code:** actual Egypt Salon Starter module list and mandatory finance controls, which Modules carry charges, per-Business tax/currency/proration and cancellation/refund policy, quote validity window, operator proof/retention rules, paid entitlement limits (seats/branches), release compatibility matrices, and optional Manager delegation. **No hard-coded price, required module list or tax rate is approved by this document.**

### Product vs Kernel financial separation

- **DRVO SaaS commercial billing:** quote, subscription charge, manual payment confirmation, refund/credit and entitlement evidence for using DRVO Modules. Its source of financial truth belongs to the **DRVO commercial owner**, not Salon POS or the Lean Kernel's identity tables.
- **Customer Business sales:** salon service sales, receivables, tender claims, cash, inventory costs, commissions and financial journal belong to **Business-domain** POS/Treasury/Accounting Modules. **ADR-031 is still PROPOSED**; do not use SaaS activation to silently decide first journal posting or mark customer invoices paid.
- **Kernel:** checks only trusted scope, valid reviewed release/eligibility, activation state, current entitlement and role/action in each API/workflow. It **does not** determine payment settlement, compute tax or change a merchant's ledger.

### One approval action versus engineering/operations approvals

A founder may approve **ACT-01–ACT-07 as a product/architecture V1 baseline** with stated exceptions, but that **does not** approve prices, actual money collection, entitlements/Activation API implementation, migrations, Public Auth, VPS work, or real users. Require separate finance/security review and a specifically authorized engineering PR for any mutation path. Existing business product policies in ADR-007/015/016 remain unchanged.

**Suggested single decision record:** “أوافق على توصيات ACT-01 إلى ACT-07 كـ ADR-032 V1 Baseline فقط: التفعيل لكل Business، Owner فقط للاعتماد المدفوع، عرض الباقة وسعرها كاملين وموافقة واحدة، PENDING قبل تحقق مالي مستقل، CAS+Idempotency، Default Deny، ومنع إيقاف Required Dependencies؛ وأبقي التسعير والضرائب والتحصيل والتفويض والصلاحيات الدقيقة وVPS Migration/Public Auth لموافقات منفصلة.” Do NOT record as accepted until founder actually says so.

**Next engineering sequence after approval:** [SaaS Commercial Core guarded delivery plan](SAAS-COMMERCIAL-CORE-ENGINEERING-GATES-2026-11-12.md). In the meantime, develop only code-free review plans and isolated tests; do not grant entitlements or emit paid invoices.


## Founder decision receipt — 2026-11-14

Founder explicitly chose ACT-01–ACT-07 **as V1 baseline only**, including Owner-only paid approval, separate independently verified DRVO commercial collection and Default Deny. See [ADR-032](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) for bounded acceptance. The prior “questions to close” now mean **detailed policy**, not undecided high-level principles. SC-0 and SC-1 read-only implementation PRs are explicitly authorized; SC-2 / SC-3 remain **UNAUTHORIZED**. No production publication, SQL on VPS, payment processing, entitlement or Public Auth is authorized.
