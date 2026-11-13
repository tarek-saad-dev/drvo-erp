# Salon S2 — Integrated private-pilot handoff (2026-11-13)

> **HISTORICAL CHECKPOINT:** This document records the verified S2 001–014 source state as of its creation. On 2026-11-13 S4 PR #80 added *new immutable forward-only migration 015* for Booking lifecycle; do not read older source count as the latest target or VPS applied state. [S4](SALON-S4-PARALLEL-DELIVERY-2026-11-13.md). K5F still expects actual 001–009 before authorized migrations.


**Verified GitHub state:** PRs [#74](https://github.com/tarek-saad-dev/drvo-erp/pull/74), [#75](https://github.com/tarek-saad-dev/drvo-erp/pull/75), and [#76](https://github.com/tarek-saad-dev/drvo-erp/pull/76) merged to main. PR #74's real Nest + disposable SQL Server 2022 **19-case Shared Booking CI** PASS; K0/K1 PASS. PR #75's Next build, protected route/Booking/Customers/Catalog/POS Draft SQL CI and K0/K1 PASS. PR #76's pinned Cashier source characterization K0/K1 PASS. **No evidence of real customer-ready staging database activation.**

## Architectural impact and ownership

The existing **Modular Monolith** already had real scoped SQL and private APIs for Customer, Catalog Offering, Booking and DRAFT-only POS. This milestone **integrates existing owners** rather than introducing a Salon Backend, cloning Cashier SQL or duplicating customer/accounting logic. The test only broadens a disposable synthetic Scheduler's permissions. In real DRVO, trusted K5 Session → Tenant → Business → Branch + independent module read/manage permissions remain mandatory; no client-provided Tenant is authority.

- **Customers** owns Customer records and E.164 phone validation (synthetic fixture omits contact data).
- **Catalog** owns service list price/duration and current Offering state.
- **Booking** owns branch Resource and booked interval, reads Customer/Offering IDs under scoped FKs, and SQL resource-row exclusive locking prevents overlapping bookings. Customer/Catalog must not write Booking tables.
- **POS** owns saved immutable DRAFT-only snapshots, not Accounting/Treasury/settlement/invoice. POS may reference a Catalog Offering; draft replay is idempotent, with separate POS read/manage actions.
- **Salon** is a bounded UX composition, not a new universally shared domain or an alternative authorization path.
- **Cashier CU-3:** pinned source comparison determined that numeric global EmpID keys / 255-character truncation are unsafe to transplant. Keep DRVO's already tested Tenant/Business/Branch Resource-row locks; use legacy negative cases only.

## What was implemented and verified

1. In one disposable SQL2022 container, source migrations **001–014** apply/replay; synthetic active Business/Branch/Account/Role, Customer and Catalog data are set up. Real Nest HTTP endpoint `POST /api/auth/login` issues a scoped session cookie.
2. **Real HTTP create** of a synthetic Customer through Customers API; real HTTP create of an EGP-priced SERVICE Offering with 30-minute duration through Catalog API.
3. Booking resource creation; `POST /booking/appointments` with the newly created Customer+Offering+Resource under the authorized Branch; another `GET /booking` returns the same persisted booking, references and names. Overlap / parallel collision behavior remains tested.
4. `POST /pos-drafts` creates a DRAFT-only document using that Catalog Offering, integer-money snapshot and idempotent request; repeated `GET` returns the same ID and SQL stored price; replay conflict rejects a different payload.
5. Cross Tenant/Business/Branch GET/POST, malicious Origin, forged source reference and POS read-permission revocation fail closed while Booking read remains authorized.
6. Protected Booking Web now shows steps to **Customers → Catalog → Booking → POS preview**. The POS link requires both Web feature gates and a separately authorized HTTP **200**; Booking alone cannot confer POS rights. A refresh button reissues scoped `no-store` Booking GET. Existing public `/demo/salon` stays entirely synthetic.
7. A follow-on Web CI gate executes the new private navigation test and checks private Customer/Catalog/Booking/POS routes all **404** with K5 flags OFF.

## Open blocking gates — no shortcut

- **SQL 010–014 on VPS: NOT authorized / NOT performed here.** Existing staging code SSH deploy, even if green, is not proof of staging SQL or service readiness.
- K5F **root-owned immutable checker**, actual off-host encrypted backup and independently restored clone, Origin/reverse-proxy/trusted IP, mail and Owner/Staff negative auth tests **remain OPEN**.
- ADR-032 paid Module/entitlement activation and real customer invite **remain unapproved**. DRVO does not silently grant these broad CI-only permissions to an actual role.
- ADR-031 Option A/B mandatory first balanced GL, VAT, invoice, tender and Accounting mapping are **not accepted**. No POS POSTED, payment or invoice endpoint is implemented.
- Cashier legacy data/real PII never copied or touched; migration and business-day/payroll adaptations are separate work.
- No public demo route was wired to real API. The private navigation only becomes usable after independent security, SQL staging and entitlement approvals.

## Best next vertical slice

After K5F and Staging SQL approval, a human-authorized **private pilot** with one disposable or explicitly approved DRVO-owned test Tenant/Business/Branch can perform the same Customers→Catalog→Booking→POS DRAFT flow in a browser, including hard refresh and cross-Branch denial. Compare observed real UX to synthetic demo. Financial posting is a later separate gated slice.

**CI is proof of integration in an isolated environment, not a claim of rollout to live salons.**
