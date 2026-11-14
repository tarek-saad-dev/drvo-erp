# Private Salon Pilot — non-commercial rights and operator decision request

**Date:** 2026-11-14  
**Status:** **PROPOSED / NEEDS FOUNDER + SECURITY + ARCHITECTURE APPROVAL**. This document creates **no** rights, user, real release, prices, billing, Public Auth, SQL migrations, or SC-2/SC-3 implementation approval. Maps to first-Salon [P5 gate #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106).

## Architecture constraints (accepted)
- **ADR-030:** only authenticated trusted Tenant→Business→Branch scope; Default Deny; current explicit BusinessMembership + BranchRole action checks, scoped SQL and negative isolation. Pooled SQL RLS still deferred separately.
- **ADR-032 ACT-01–07 V1 principles:** approved release and market eligibility precede any activation; immutable Required closure, owner-only paid approval, no payment/entitlement assumption from a quote, per-Business concurrency and stable audit; never disable Required dependencies of live dependents.
- **SC-0** production Verified Release Registry intentionally contains **zero** approved releases. **SC-1** real API returns **UNQUOTABLE**. K6C candidate rows are NOT rights. Code deployment/working private UI does not mean a commercial Module is ACTIVE. Never invent "Salon Starter" release, actual price, signed country eligibility or free subscription.
- **Business Modules remain shared:** Catalog, Customers, Booking, POS DRAFT only; Salon extension composes them, never copies Customer/Catalog/Booking domain tables. Merchant financial `POSTED` blocked on ADR-031.

## Explicit first-Pilot operating choices — founder must select

| Decision ID | Conservative recommendation for **restricted synthetic Pilot** | Must be approved/proven separately |
| --- | --- | --- |
| PILOT-01 Scope | Exactly one named test **Business**, max one authorized Branch, dedicated DRVO-controlled synthetic Owner and Staff users; no public self-signup, no real customer personal data before P7 consent | Business/branch identity and custody, account creation path, limits, privacy controls |
| PILOT-02 Rights | **Separate explicitly audited, non-commercial Pilot grant** only after a verified deployed and market-eligible reviewed release exists. Grant cannot be disguised as paid Entitlement or SC-0/K6C candidate row, and never bypasses K5+SQL authorization | Architectural/security approval of `PILOT_NON_COMMERCIAL` state, grant owner, creation/revocation path and negative tests. No implementation authorized in this packet |
| PILOT-03 Allowed actions | Explicit `catalog.read/manage`, `customers.read/manage`, `booking.read/manage`, relevant Booking resource/window actions, `pos.draft.*` **only when individually authorized**. Staff least privilege; Owner label is not automatic permission | Exact existing RolePermission action names, delegated owner/staff grants, actual SQL + HTTP negative proof, no blanket admin |
| PILOT-04 Forbidden | Paid activation, commercial billing/receipt, POS `POSTED`, journal/tax/tender claims, cross-Business access, self-service signup, marketing messages, automatic invoices or live personal records | Finance ADR-031 and SaaS SC-2/SC-3 independently later; no "trial is payment" assumption |
| PILOT-05 Expiry | Explicit reviewed short expiry, scope and maximum seats/branches; **fail closed on expiry, revocation, disabled release or stale Business membership**, with all history preserved | Security chooses actual duration, audited revoke/cache invalidation/worker gates, no hard-coded time in docs |
| PILOT-06 Audit | Immutable source + Tenant/Business/Branch + actor + action + grant version/reason, explicit approval and separate technical enablement; no raw PII/passwords in logs | Reviewers, custody, consent, traceability, incident response |
| PILOT-07 Go/No-Go | Staging first with fabricated synthetic records; P1–P4 + P5 rights negative proof required before P6 live browser test; P7 founder/security GO before first real Salon | Independent K5F bundle proof, encrypted offhost restore, Nginx/Origin/Owner-Staff tests, migration signoff |

## Two options, neither silently approved

**Option A — Wait for verified production release + audited Pilot-only grant (recommended).** Finish SC-0 trust anchor/release market approval and a separately reviewed narrowly scoped non-commercial Pilot-rights contract. Pros: consistent governance, never fake or bypass an entitlement; no paid policies required. Cons: additional engineering and independent security approval before real access.

**Option B — No private backend Pilot until commercial activation is ready.** Keep Salon Demo public synthetic only and perform tests entirely in disposable SQL/HTTP CI. Pros: smallest possible authorization surface; Cons: slower first real operator feedback.

**Not an option:** enabling public K5/Salon flags or seeding `RolePermission` to simulate Entitlement, adding hard-coded privileged Business IDs, declaring SC-0 Candidates paid ACTIVE, or allowing direct SQL/HTTP on VPS without P1–P4.

## Implementation impact if Option A later approved (NOT CODE NOW)

1. New **small, bounded pilot-grant owner** separate from cash/billing, reviewed country/release evidence and strict `PILOT_NON_COMMERCIAL` scope/expiry, **not** a paid entitlement; must clarify SC-0 release publishing without hard-coding compliance claims.
2. One scoped, audited operator-authorized creation/revoke workflow with independent reviewer, idempotent Business revision and no public mutation route.
3. Every API and worker checks current grant + K5 action + Business/Branch + release health independently; no UI-only permission or cache TTL bypass.
4. Negative test matrix: forged Tenant/Business/Branch, staff upgrade, expired grant, withdrawn release, membership/session revocation, missing per-action permission, stale revision/concurrent granting, service-worker/outbox privilege bypass; real disposable SQL before private staging use.
5. Separate staging K5F, off-host restore and SQL 010–017 approval still mandatory; test Owner/Staff/browser only when real security evidence is signed.

## Founder decision needed

**Choose PILOT-01–07 with Option A or Option B, or amend the scope; Finance/Security must approve audit/market policy and specific non-commercial rights.** This packet is for a later explicit decision. It does not alter ADR-032, authorize SC-2/SC-3, move the 7 Salon acceptance gates, authorize collection, or grant customer access.

**Related:** [Salon first real customer gates](SALON-FIRST-REAL-CUSTOMER-GATES-2026-11-14.md), [ADR-032](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md), [K5F security](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md).
