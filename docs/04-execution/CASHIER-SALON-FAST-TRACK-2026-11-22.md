# Cashier / DRVO Salon SaaS fast track — 2026-11-22

**Strategy APPROVED; operational readiness NOT VERIFIED.** Owner-approved plan is [ADR-042](../05-decisions/ADR-042-CASHIER-INTERIM-SALON-LAUNCH-BRIDGE.md). Delivery checkboxes and live evidence live in [Cashier #333](https://github.com/tarek-saad-dev/casher/issues/333); legacy Cashier SaaS [#60](https://github.com/tarek-saad-dev/casher/issues/60), [#61](https://github.com/tarek-saad-dev/casher/issues/61), and DRVO replacement [#163](https://github.com/tarek-saad-dev/drvo-erp/issues/163) remain separate.

## Known reusable foundations (not launch certificates)
- Cashier main source reviewed as `f8fa67d2b1c8254e638cf89d95dcee75edc88598`.
- Cashier Tenant onboarding foundation [#48](https://github.com/tarek-saad-dev/casher/issues/48) is closed, as is commercial plan/industry pack/subscription lifecycle foundation [#52](https://github.com/tarek-saad-dev/casher/issues/52).
- Cashier runtime isolation [#61](https://github.com/tarek-saad-dev/casher/issues/61) remains OPEN, including authoritative Tenant context for APIs, sessions, workers, cache, locks and idempotency. Presence of a `Tenant` table or public Booking branch resolver is not cross-module isolation proof.
- Cashier has live business flows and customer-facing Booking code; DRVO has source/CI-proven private modules but VPS synthetic Pilot and financially posted Sale gates remain OPEN. Different codebases have different deployment, entitlement and finance gates.

## Parallel implementation lanes (read-only assessment first)
| Priority | Lane | Concrete acceptance | Main dependency |
| --- | --- | --- | --- |
| P0 | Stabilize Cashier | Cut POS/Booking/Treasury daily flows tested, P0 bug fixes, payment/refund regressions, frozen source baseline | source audit and CUT safety |
| P0 | Tenant/Business/Branch isolation | two synthetic tenants; denied cross-tenant/Business/Branch session/API/SQL/worker/caches; explicit legacy compatibility; zero Cut leakage | [Cashier #61](https://github.com/tarek-saad-dev/casher/issues/61) |
| P1 | Self-service signup | Owner verified; idempotent Tenant+Business/Location+Branch provisioning; denied unauthorized activation; no Cut templates | tenant isolation + [Cashier #48](https://github.com/tarek-saad-dev/casher/issues/48) |
| P1 | Free trial | reusable subscription state and configurable server-owned expiry, audited grace/suspension/no replay | [Cashier #52](https://github.com/tarek-saad-dev/casher/issues/52), signup |
| P1 | Subscription & billing | simple reviewed offer, approved jurisdictional terms, verified payment provider webhooks/reconciliation and support | finance/security/legal approval |
| Parallel | Light RTL UI/UX | compact Cashier workflows, new Owner setup, responsive keyboard/print and regression, no workflow loss | measured operator usability |

## Immediate safe vertical slice
1. Audit current source/metadata of tenant, business hierarchy, user memberships, setup, trial, subscription, payment hooks and core POS/Booking/etc. Reuse proved implementation; document gaps with path-level citations.
2. Produce a fail-closed permission matrix and staging-only two-tenant exercise with same branch-like identifiers. No prod writes and no PII.
3. Prove one synthetic Owner flow: provision → role/branch setup → Customer → Catalog → Booking → POS with actual persistence and negative foreign-tenant cases. Preserve Cut as only real financial writer.
4. Next connect Owner signup/trial on approved isolated test target; deploy only after independent restore, rollout and incident evidence.
5. Only then onboard the first **authorized** new Salon, initially limited; commercial collection requires separately approved provider/billing+tax policy.

## Non-goals now
- Do not create independent full HR, Treasury, POS or Accounting engines for every vertical.
- Do not mix Cashier Production/Cut and DRVO Pilot SQL data or run each other's migrations.
- Do not call existing DRVO DRAFTs invoices, announce GA or charge customers from provider metadata alone.
- Do not self-certify cross-tenant isolation or mark [DRVO #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) approved.

## Required reporting
For each completed lane, report changed paths, exact commit, tests/build, isolated SQL/browser proof, deployment (not attempted/attempted/verified), open risks and operator approval. Keep source/architecture/roadmap/current-state/changelog synchronized with each approved follow-up. Existing DRVO 2026-12-12 Cut replacement goal is not a guarantee and requires re-baselining after this direction change.

**Status when recorded:** docs-only; no runtime, CI, VPS, production data or financial authorization performed.
