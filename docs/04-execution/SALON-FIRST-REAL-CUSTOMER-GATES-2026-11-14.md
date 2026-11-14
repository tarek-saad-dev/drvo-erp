# First real Salon — bounded Pilot readiness and commercial path (2026-11-14)

> **2026-11-14 SOURCE PROOF UPDATE — ALL GATES STILL OPEN:** P4 [#115](https://github.com/tarek-saad-dev/drvo-erp/pull/115) proves SQL 009→017 under the restricted migrator with independent restored pre/post backups **ONLY in disposable CI**; P4 actual VPS SQL rollout and independent P1/P2/P3 signoffs remain unauthorized/unverified. P5 [#116](https://github.com/tarek-saad-dev/drvo-erp/pull/116) adds synthetic CAS/idempotency PROPOSED/REVOKED model, **not** scoped durable grants, release publication, active entitlements or K5/SQL enforcement. All **7 private Pilot gates + 3 additional paid gates** remain open. See [P4 plan](P4-009-017-DISPOSABLE-MIGRATION-RESTORE-PROOF-2026-11-14.md) · [P5 model](P5B-PILOT-GRANT-CAS-IDEMPOTENCY-2026-11-14.md) · [Tracker #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106).


> **2026-11-14 PREPARATION UPDATE, NO GATE CLOSED:** Founder selected **Option A for GitHub-only synthetic policy design**. [P5A #112](https://github.com/tarek-saad-dev/drvo-erp/pull/112) and [P3 #113](https://github.com/tarek-saad-dev/drvo-erp/pull/113) merged source-only policy tests and local network evidence reviewer. They do NOT prove P3 external Nginx/Origin security nor P5 real verified-release scope grants/audit/expiry enforcement, and cannot satisfy P6/P7. All seven Pilot gates below remain **OPEN**, plus paid C1–C3. See [P5A](P5A-SYNTHETIC-PILOT-ACCESS-CONTRACT-2026-11-14.md) and [P3](P3-NETWORK-SECURITY-OFFLINE-REVIEW-2026-11-14.md).


**Authoritative tracker:** [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106).  
**Current decision:** **NO-GO** for real Salon customer accounts or paid operation; no live authentication/private domain activation approved. This document is a portable summary, not runtime/SQL/operational authorization.

## Implemented in source — independently distinguish deployment and activation

- Shared Catalog, Customers, Booking (resource availability, appointment lifecycle and real disposable SQL permission/isolation tests) + Salon private composition are merged; POS has **DRAFT only**, no `POSTED` accounting sale.
- ADR-030 trusted server scope + scoped composite FK/default-deny baseline accepted; physical SQL RLS open.
- ADR-032 **ACT-01–07 accepted as V1 principles** only via PR #103. SC-0 reviewed release registry PR #104 **merged** (production registry **EMPTY**, never a commercial Release); SC-1 pure synthetic read-only price/Required closure PR #105 **merged** into `main` `98470283d7e239567f71e56417f9e9def7130450` (`UNQUOTABLE` for real API, no paid entitlement).
- SQL 001–017 exist in source and disposable CI; **NO approval/evidence of VPS SQL 010–017**. K5F legitimate pre-migration audit expects exact 001–009, root-owned operator proof still absent. Staging GitHub deployment job does not establish external HTTP, actual VPS schema/role flags, recovered backup, or live owner login.
- Existing S9 pilot remediation and S8 browser matrix are **inert** until real authorized operator evidence and browser execution.

## Minimal private Salon (no financial posting, restricted access): seven major gates

| Gate | Responsible reviewer | Evidence / Done condition | Status |
| --- | --- | --- | --- |
| P1 trusted K5F | VPS Operator + Security | Actual deployed SHA and trusted immutable root-owned checker audited, precise permission/flag checks; no secret leakage | **OPEN** |
| P2 offsite restore | Operations + Security | Independently restored encrypted off-host backup into isolated DB, tested recovery/RPO-RTO | **OPEN** |
| P3 network/auth boundary | Security + Operator | Verified HTTPS proxy/Origin/cookie/CSRF, private access and email/invitation process or approved restricted alternative; Tenant/Branch negative evidence | **OPEN** |
| P4 migrations | Founder + DBA + Security | Independently approved restricted SQL 010–017 plan and recovery; exact VPS history, restricted forward-only execution, post-migration checker review/verification | **NOT AUTHORIZED** |
| P5 private scoped rights | Founder + Architecture + Security | Explicitly reviewed *non-paid Pilot* entitlement & eligible module policy/implementation (not K6C candidate or SC0 empty releases), scoped Owner/Staff roles; nothing silently ACTIVE | **NOT AUTHORIZED** |
| P6 real private browser E2E | QA + Security + Operator | Authorized private synthetic Owner/Staff + foreign Tenant/Business/Branch negative cases; persisted Customer→Service→Booking→POS DRAFT after refresh | **BLOCKED P1–P5** |
| P7 single Salon GO | Founder + Operations + Security | Explicit one-Salon scope/consent/privacy/support/recovery limits, evidence reviewed before real invite, no POSTED/paid claims | **BLOCKED P1–P6** |

**7 are major acceptance gates, not 7 easy tasks or a delivery-time estimate.** Parallelize P1, P2, P3 and P5 architecture review while planning P4; never execute P4 or P6 before signoffs. First Salon Pilot means constrained, private, operations-focused Booking/CRM/Draft experience, not full Salon finance/HR/online paid subscription.

## First paid full-feature Salon — three more major gates

| Gate | Responsibility | Done / separation |
| --- | --- | --- |
| C1 DRVO SaaS subscription & actual activation | Founder + Finance + Security + Platform | Real reviewed price/tax/refund/collection evidence and operator separation, separately authorized SC-2 Owner approval/Entitlement and SC-3 Business Module activation with release/eligibility provenance |
| C2 Business POS finance | Founder + Finance + Accounting + Security | ADR-031 Option A/B first journal decision, COA/tax/tender/receivables policy and tested genuine POSTED sale/GL/Treasury evidence; `DRAFT` cannot substitute |
| C3 commercially compliant operation | Qualified Finance/Legal + Operations | Local requirements, agreements/data protection, invoicing/monitoring/recovery, customer support and commercial scope GO |

**Total: 10 major gates to paid/full operational Salon readiness** in this conservative scope, seven of which are private Pilot blockers. Price/tax/market approval and laws must never be guessed or covered by synthetic trial data.

## Next safe actions on GitHub versus on VPS

**Can do in parallel without VPS permission:** keep product improvements feature-gated, code+CI proofs, source-only migration/checker audit, review ADR-031/SC2/SC3 decision packets, redacted operator checklists. We deliberately do **not** create a second fake staging proof from GitHub CI.

**Must have independently authorized VPS access and separate signoff:** K5F immutable root bundle execution, encrypted independent offhost restore, proxy/Origin tests, reviewed forward-only SQL migration window and scoped K5/Module flag enable, authenticated browser acceptance. No workflow in this document may invoke or authorize those actions.

**Never upload:** real Customer names/phones, SQL credentials, API keys, payment evidence, backup archives, root env, cookies or JWTs. A complete operator self-report is not independent proof.

**References:** [S9 integrated](SALON-S9-INTEGRATED-DELIVERY-2026-11-14.md) · [S9 remediation](SALON-S9-PILOT-REMEDIATION-2026-11-14.md) · [K5F runbook](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md) · [S8 browser review](SALON-S8-BROWSER-REVIEW-MATRIX-2026-11-14.md) · [ADR-032](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) · [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md).

**This document only records a NO-GO acceptance plan. It neither provides release authorization nor claims successful live deployment or a verified test Salon.**
