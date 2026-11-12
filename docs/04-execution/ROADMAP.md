# Roadmap

> **2026-11-12 POS→LEDGER ENGINEERING TRACK OPEN (REVIEW ONLY):** Non-posting [decision/acceptance seed](POS-LEDGER-EXECUTION-GATE-2026-11-12.md) models ADR-031 A/B truthful financial states in synthetic tests. Next independently reviewed PL-1 is default-OFF scoped POS Draft/Checkout Preview (no POSTED), PL-2 needs explicit Finance/Founder/Architecture ADR-031 signoff, PL-3 actual Sale→GL implementation only after that signoff. Commercial ADR-032, K5F, SQL 010–013 VPS and public auth gates unchanged.


> **2026-11-12 BOOKING DELIVERY (INDEPENDENT REVIEW PR):** Following verified merges of Shared Catalog PR #55 and Customers PR #57, build first scoped Booking v0: Branch Resources, Customer+Catalog SERVICE-linked appointments, UTC times with overlap rejection, idempotent create/list, RBAC and cross-Tenant/Business/Branch negative tests, private RTL workspace. [Booking Core](../03-modules/BOOKING-CORE-V1.md) · [Booking implementation](BOOKING-SLICE-2026-11-12.md). SQL 013 stays CI-only; none of 010–013 authorized for VPS. No live bookings, emails, public flags or paid activation. Next after PR: formal security review; separate ADR-032 approval for SaaS Commercial Core, and ADR-031 for financially posted POS/Salon scope. Previous status text below is historical.

> **2026-11-12 CUSTOMERS NEXT SLICE (STACKED):** After Shared Catalog PR #55, a separate feature branch/PR implements Business-owned Customer contact create/list, minimal personal data, K5 sessions and default-deny Branch RBAC with `customers.read/manage`, SQL 012 and private UI. Booking follows on a **third independent PR** referencing stable Catalog Offering and Customers IDs. All migrations remain CI-only until separate K5 gate/security review, all public auth and domain flags OFF. [Customers scope](CUSTOMERS-SLICE-2026-11-12.md).

> **2026-11-12 EXECUTION — three separate product PRs, ADR-032 decision in parallel:** Founder explicitly approved accelerated development of Shared Catalog (Categories + Product/Service list prices, private SQL/API/UI), then Customers/CRM and Booking/Queue as distinct, complete, tested PRs. Preserve Shared Core; Salon industry adaptations remain bounded Extensions. **First PR:** [Shared Catalog implementation](SHARED-CATALOG-IMPLEMENTATION-2026-11-12.md), feature-gated OFF and SQL 011 CI-only; **next PRs are NOT complete yet**. ADR-032 is for structured founder/billing review only (no activation code approval). K5F remains OPEN; never apply SQL 010/011 or enable Public Auth on VPS without separate sign-off. No change to comprehensive Salon V1 scope.

> **2026-11-11 K6C AUTHORIZED REVIEW-ONLY VERTICAL SLICE:** After K6A/K6B landed on main, founder accepted ADR-030 baseline, with SQL RLS deferred. Build **private read-only Business Module Candidate Registry** (SQL composite FK + scoped EXECUTE-only procedure + existing K5 session/RBAC, double feature flags OFF + disposable SQL/HTTP isolation CI) as an independent PR. **No SQL 010 on VPS** and no live K5 public auth activation; the existing K5F checker expects 001–009 and must be reviewed/updated before a later permitted schema deploy. After K6C review: seek separate ADR-032 approval before actual Business activation/entitlements/billing; then shared Salon Catalog → Customers → Booking. See [K6C review](K6C-SCOPED-BUSINESS-MODULE-CANDIDATES-2026-11-11.md).

> **2026-11-11 K6B STACKED DELIVERY (REVIEW ONLY):** Following K6A PR #50, implement an in-memory [candidate Module Registry](K6B-CANDIDATE-REGISTRY-DECISION-GATE-2026-11-11.md) with immutable validated fixture manifests and dependency previews. This is preparatory developer code, NOT real Business activation. Next production milestone must explicitly resolve ADR-030 trusted Tenant/Business scope, ADR-032 Business-scoped approval/payment/entitlement semantics and security tests, then deliver one guarded API+SQL+UI vertical slice. K5 stays operationally OPEN; no mail/signup/flags/deployments enabled by this work.

> **2026-11-11 ACCELERATION WORKSTREAM (non-prod, review only):** While operational K5 stays BLOCKED/open, prepare parallel bounded development in a review branch: first pure, read-only [K6A Module Preview spike](K6A-READONLY-MODULE-PREVIEW-2026-11-11.md); then separately approve ADR-030/032 and deliver the actual secured Module Registry/Business activation vertical slice. After platform scope/activation authorization, implement SaaS Commercial Core and shared Catalog/Customers/Booking slices for the Salon-first pilot. **Prototype != approved K6 Runtime; no activation, production, flags or customer operations authorized by this line.**

> **2026-11-10 K5F gate (proposed branch; NOT K5 closure):** K5E now has a verified successful code deploy at [#42713547571](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/42713547571) for `dba53acace2db2005a44d1a3103394a257bed40d`, and prior manual SQL 001–009 proof remains valid. K5F adds stronger **read-only** runtime SQL permission checks and the [staged 12-case synthetic onboarding acceptance matrix](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md). Complete PR CI/review → reviewed SHA deploy → VPS checker proof → Nginx trusted IP + Origin/staging access restriction → Resend domain and inbox validation → offsite restore → **explicitly authorized** synthetic 2-Tenant/2-Branch Owner/Staff E2E + audit → security/ADR-030 signoff before declaring K5 CLOSED. Auth/Invitations/Web flags OFF until approved. **K6 runtime implementation not authorized by this checkpoint.**


> **2026-11-10 implementation checkpoint:** Staging K0–K5D code and migration 001–009 are verified deployed/applied (Staging Deploy [#41876109076](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41876109076), manual SQL run [#41973725981](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41973725981)). **K5 operational acceptance is still OPEN.** K5E adds a read-only operator readiness gate for live protected secrets, runtime permissions, disabled feature flags and deployed SHA; sender verification, Nginx source IP trust, offsite restore and approved synthetic Owner/Staff E2E remain manual/security gates. Next after K5 signoff is Platform Kernel Module Registry/Activation prototype followed by SaaS Commercial Core, then comprehensive Salon Business Modules. This current checkpoint supersedes the historical "Not started" status labels below as evidence of *specific foundation slices only*; it does not claim functional ERP modules exist. [K5E details](K5E-STAGING-ONBOARDING-READINESS-2026-11-10.md).


**Updated:** 2026-10-28. **Phase 0: Discovery and documentation.** No timeline committed.

> **2026-11-01 development sequencing update:** The non-production K0 TypeScript scaffold is merged; K1 Next.js/NestJS runtimes are being built and tested. **SaaS Commercial Core moves immediately after Platform Kernel**, before full Salon Business Modules: minimum DRVO plans/subscriptions, audited commercial grants, Business-scoped entitlements and activation, and onboarding/Industry Starter. Business Catalog/POS work may overlap with commercial work, but must obey entitlement contracts. Do not confuse *SaaS billing* with customer Business Accounting. Later advanced marketplace/online gateways can follow full V1. ADR-030/031/032 technical sign-off, SQL Server spike and security/financial tests remain separate gates. This note takes precedence over earlier phase numbers below but does not reduce the approved Salon V1 commercial scope or authorize Production.

## Corporate brand / market readiness (2026-11-10)

- **Founder-approved corporate DRVO ERP logo and pictured variants** are recorded under [ADR-038](../05-decisions/ADR-038-DRVO-MASTER-LOGO-AND-VARIATIONS.md); use one parent multi-industry brand.
- Salon is the **initial marketing segment**; do not replace master logo with Salon symbols. Clinics remain second planned vertical pending validation.
- Remaining marketing deliverables before public activation: exact logo export QA, trademark checks, company account handles/ownership, reviewed social cover templates, landing-page truthfulness, early adopter/lead workflow.
- **Product staging K5 operational acceptance and commercial feature readiness remain independent and OPEN.**

## Commercial industry sequence (founder-approved)

1. **Barber salons** — first real pilot at **Cut Salon**.
2. **Medical clinics** — second commercial vertical; launch gated on appropriate clinical privacy/compliance and functional scope.
3. Beauty/aesthetic sectors and supermarkets — subsequent order not yet decided.

The earlier **Retail second** assumption is superseded. Retail remains a future supported vertical and may inform architectural test scenarios, but **is not the second commercial release**.

## Engineering phases (planning, not code completed)

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Founder discovery, MVP, architecture decisions and documentation | In progress |
| 1 | Scaffold, CI/CD, tenant/business/branch identity, permissions, reusable UI foundation | Not started |
| 2 | Catalog, POS sale/payment, receipt and session-close vertical slice | Not started |
| 3 | Barber salon operational workflows + Cut Salon pilot and validation | Not started |
| 4 | Medical clinic discovery, domain, privacy/security, integration and compliance-specific release plan | Not started |
| 5 | Medical clinic edition implementation **after design and safety gates** | Not started |
| Ongoing | SaaS plans, entitlements, subscriptions, support and observability, prioritized before commercial launch as needed | Not started |

**Global-first launch intent:** Egypt and Gulf countries are both targeted for initial commercial launch; specific countries and launch-readiness requirements are outstanding.

**First mobile channel:** responsive web/PWA. Comprehensive ERP is the product vision, not first-release scope. The mandatory core/extension structure for all modules requires explicit technical contracts.

[Open questions](OPEN-QUESTIONS.md) · [Product vision](../01-product/VISION.md).

## MVP discovery note — 2026-10-28

Founder requests a comprehensive Cashier-replacement feature set in one month, including full HR/accounting/inventory, offline POS and SaaS billing. This is a **desired scope/timeline**, not an approved or validated delivery forecast. Queue and printing can be deferred, so **limited pilot**, **Cashier replacement** and **external commercial launch** require separate acceptance gates. See [MVP Discovery Round 2](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Release strategy update — 2026-10-28

Founder confirmed **one comprehensive commercial V1**, not separate pilot/replacement/commercial editions. Development, internal QA and Cut Salon all-branch validation are pre-launch quality gates. The previous split into separate release acceptance stages was a proposal, not approved. One-month first-test goal is flexible, with quality prioritized. Scope includes full GL accounting, HR parity, inventory, booking, cash-only offline POS, and SaaS subscriptions with manual collection; external online subscription payments can follow. No timeline is guaranteed. See [release strategy](../01-product/MVP-RELEASE-STRATEGY.md).


## Final MVP clarification — 2026-10-28

Keep Cut Salon's existing booking website and integrate against the new DRVO API. Cash-only offline sales may result in stock shortages after synchronization; surface these for review. Accounting journal-entry workflow awaits detailed module design. Test internally throughout development, but launch one comprehensive commercial V1 after all release gates. [Decision](../01-product/MVP-RELEASE-STRATEGY.md).


## Product line strategy expansion — founder-approved direction (2026-10-29)

DRVO uses Shared Core and industry-specific Domain Modules/Extensions composed as **versioned Industry Solutions** (ADR-017), not a customer-specific software fork or a single all-industry data model. Adding a new industry follows discovery, Fit-Gap, domain/contract design, UX, build (only after authorization), QA, cutover and reusable productization (ADR-018). The initial release order is **unchanged**: Salon commercial V1 with Cut Salon validation, then Clinic as second vertical. Education, Real Estate and Timber Manufacturing are illustrative future opportunities, **not scheduled releases or commitments**. Capacity scaling or enterprise dedicated placement requires measured demand and new operational design, not automatic V1 promises. [Playbook](NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md); [SaaS Scale](../02-architecture/SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md).
