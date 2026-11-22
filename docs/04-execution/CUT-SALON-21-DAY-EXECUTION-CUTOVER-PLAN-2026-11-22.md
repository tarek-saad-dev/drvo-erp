# DRVO ERP: 21-day Cashier migration and Cut Salon cutover execution plan (PROPOSED)

**Planning window:** 2026-11-22 → 2026-12-12 (21 calendar days). **Status: Execution target / not a delivery guarantee or approval for Cut production data or financial posting.**  
**DRVO reviewed baseline:** `b22aaa2eb99ebd01ff45239bfb2b66968478c432`. **Cashier source baseline:** `f8fa67d2b1c8254e638cf89d95dcee75edc88598` (supersedes `046bf19`).  
**Change scope:** plan, evidence and backlog only; no DB mutations, feature flags, Cut access, external customer launch, or ADR-031 posting authorization.

## North star and the honest 21-day contract

1. **Primary outcome:** Cut Salon operators can completely replace all **actually-used** Cashier P0 workflows and P1 workflows (or explicit, tested, owner-approved operational alternatives) in protected DRVO, with complete authorized Cut data lineage, reliable printed/posted sales, shift close, payroll balances and rollback.
2. **Conditional production cutover:** only if every security/finance/privacy/recovery/migration and operator gate below passes. If not, **Cashier remains the single live financial writer**. The 21-day date does not override a NO-GO.
3. **Secondary outcome:** reusable Booking, Customers, Catalog, HR and finance boundaries support **Hotel and Clinic starter packs** in controlled *synthetic/noncommercial* private pilots, scoped to bookings/rooms/providers. **Not** an assurance of a fully operational hotel, clinical EMR, property management, medical records, commercial billing, or sector compliance in three weeks.
4. **Architecture:** retain DRVO Modular Monolith / Lean Kernel and tenant→business→branch scope. Avoid redesign, extra services or additional parallel DRVO implementations. Cashier is the source of tested workflow logic/UX; DRVO is the destination and system of record after proven cutover.
5. **Acceptance source:** [Replacement workflow ledger](CUT-SALON-OPERATIONAL-REPLACEMENT-BASELINE-2026-11-22.md) + [SQL structural audit](DRVO-CASHIER-DATABASE-STRUCTURAL-AUDIT-2026-11-22.md) + Cashier pinned source and tests, never screenshots/demos in lieu of verified behavior.

## Days 1–21: calendar and deliverables

| Days / Dates | Primary delivery | Independent proof / gate | Parallel owners |
| --- | --- | --- | --- |
| **D1–D2 · Nov 22–23** | Lock current Cashier source SHA, diff the six post-`046bf19` commits, inventory all operator routes/dialogs/jobs and used features; update priority P0/P1/P2 with Cut operators. Run read-only SQL schema audit and plan source export. | Workflow ledger covers all discovered Cashier actions or carries explicit `OPEN`; source provenance and scope documented. No claim of exhaustive audit from route counts. | Coverage lead; Data/DB lead |
| **D1–D3 · Nov 22–24** | Authorized operator activates the **isolated synthetic** `DRVO_ERP_PILOT` per existing runbook; check exact deployed SHA, SQL001–040, restricted K5 scopes, independent backup+restore and actual Owner browser journey. | Customer→Catalog→Barber→Booking→POS DRAFT→reload retained in SQL, cross-tenant/branch denial, Owner signed evidence. External operator/root action required. | Platform operator + security |
| **D3–D7 · Nov 24–28** | Port mature Cashier application/UX workflows through DRVO owner APIs (not legacy global SQL). In parallel: POS & Sales UI/cart/pricing, Booking+public website bounded access design, HR/attendance/payroll, Operations/Treasury/Inventory, scoped customers/catalog. | Pinned source characterization + DRVO SQL/HTTP E2E, negative tenancy and race/idempotency per workflow; UI buttons invoke real protected behavior. Financial posting stays OFF. | Four file-disjoint module workstreams + one schema integrator |
| **D5–D9 · Nov 26–30** | Decide ADR-031 sale→first-GL Option A/B with founder/finance/architecture/security; implement approved sale, tender, Treasury, Inventory, reversals, outbox, Accounting in one owner-controlled dependency chain. | H1–H4/E1–E4 approval and proof, balanced ledger, exactly-once retry, atomic failure/rollback, negative auth, printable receipt, reconciliation and p95/lock tests. **No paid-posted implementation is declared live until accepted.** | Finance/DB lead; independent reviewer |
| **D7–D12 · Nov 28–Dec 3** | With Cut administrator authorization, discover actual *read-only* source DB, full data inventory and lineage; approved mapping `SourceSystem+Tenant+Branch+Entity+LegacyId→DRVO UUID`, duplicate policy, historical immutable archive, resumable import to dedicated authorized DRVO test target. | Counts and totals by source branch/date/payment, active bookings and open balances exact-match; orphan/FK/duplicate report; imported historic sales must NOT reissue payments, commissions, stock or loyalty. Secure off-chat PII transfer only. | Data/DB + module data owners |
| **D10–D15 · Dec 1–6** | End-to-end **synthetic + authorized scrubbed-data** rehearsal: public website booking→availability→staff/queue→POS→money and inventory; HR attendance/commission; expenses→Treasury→day/shift close→reports. Index/query-plan and concurrency tuning on representative workloads. | Real DB + protected browser evidence for every Cut P0; operator payroll/day-close comparisons; zero unexplained accounting or stock differences; restored backup drill and realistic print/error paths. | All module leads; QA/operator |
| **D13–D18 · Dec 4–9** | Shadow/Cut Salon operator acceptance: Cashier retains one real writer, DRVO produces isolated comparisons and read-only replay/reconciliation; verify all actual shifts, exceptional refunds/voids, staff roles, printers, connectivity, and reporting. | Signoffs per P0, P1 alternates accepted or resolved, tested recovery and data freeze/delta import method. No dual real sales. | Cut owner/managers + operator QA |
| **D18–D21 · Dec 9–12** | **Conditional** Cut Salon cutover rehearsal and approval: maintenance window, freeze Cashier writes, final deltas, unique writer flip, smoke bookings/sales/ledger/inventory/closing; monitor; keep Cashier read-only for history and a tested compensating rollback/reconciliation path. | Actual operational GO only upon all gates. If any fails, default **NO-GO**, return Cut to Cashier; do not represent DRVO as full live replacement. | Founder + finance + security + operations |
| **D12–D21 · Dec 3–12 (parallel but lower priority)** | **Hotel Pack v0**: rooms as Booking resources, guest/contact profile with privacy, room availability, reservation calendar and arrival/departure operational status in segregated test tenant. **Clinic Pack v0**: professionals, appointment slots, minimal patient scheduling/contact without clinical records, visit status and provider assignment in a separate test tenant. | Only synthetic/private workflow pilot with verified cross-industry isolation; no hotel folio/payment settlement, patient medical/clinical records or commercial launch by implication. | Shared domain + pack owners only once salon P0 not delayed |

**Dates are targets, not credible guarantees without staffing, credentials, operating evidence, finance approvals and source DB access.** At D3/D7/D14/D18 publish actual DONE/BLOCKED per source, not percentages invented from file counts. Escalate any critical blockage immediately; do not defer Cut safety gates to the end.

## Critical dependency graph (cannot simply parallelize everything)

1. Pilot trusted scope and real SQL target → protected UI/source E2E.
2. Customer duplicate policy + authoritative read-only Cut source + consent/privacy → approved data mapping → import.
3. Financial ADR-031 decision → immutable sale/initial GL contract → Treasury/Inventory effects/reversals → accurate reports/day close → live checkout.
4. Booking/WFM availability and multi-service conversion → exactly-once POS sale handoff → customer receipt, payroll and reports.
5. Actual money/stock/employee opening balances → deterministic historical cutover baseline → shadow and final delta.
6. Release/recovery/security and operator signoff → Cut switch. No calendar deadline can skip these.

## Workstream ownership and architecture rules

- **Workstream A — Commerce:** Cashier POS UI/behavior, Customers/Catalog, Sales document owner, vouchers/prices, printing, receipts, returns. Owns POS code and tests. Salon-specific rules are extensions on shared POS/Catalog.
- **Workstream B — Booking & Operations:** Calendar, availability, public website booking, queue, booking→POS composition and cancellation. Resource type/identity remains industry-agnostic.
- **Workstream C — People & Finance:** HR/attendance/payroll, Employee/Barber extension, expenses, Treasury, Accounting reconciliation, shift and BusinessDay. **One designated owner** coordinates first financial schema/GL and migrations; no parallel writes to financial schema.
- **Workstream D — Platform, data and proof:** Tenant/Business/Branch Auth/Entitlements, Cut read-only extract+mapping, SQL safe probe/Query Store, migration/backup, browser E2E, negative permissions, deploy and release attestation; hotel/clinic starter tenant configuration.
- A single integration owner arbitrates `packages/contracts`, one ordered migration sequence, schema refs and cross-module transaction boundaries. All other work is file-disjoint. Code reuse via reviewed Cashier domain and UI/tests; **no** Cashier `dbo`, cookies, numeric IDs, legacy session bootstrap or unscoped direct writes.
- Retain temporary ADR-039 direct-main fast development for low-risk accepted code; external authorization and owner-governed staging/real-data/finance still apply. No administrative PR ceremony required for every feature. This document in draft PR #162 is a reviewable planning artifact, not approval for unrestricted production changes.

## Data migration contract: **full Cut data**, without double-posting

Data sets to profile and map: Tenant/Business/Branch configuration and permissions; HR employees, assignments, barber skills, attendance, schedules, salary agreements, advances, commission and payroll opening positions; catalog categories/services/products/steps/packages/prices; customers, contact/duplicate and consent evidence, visit history/loyalty balances; future/active bookings, public tokens, waitlist/queue; historic sale headers/lines/payments, discounts, tips, returns/voids and related print records; operational days/shifts, cash movements/tender rails, reconciliations, outstanding receivables, expenses/income; stock on hand, movement history, transfers, purchases, valuation and supplier balances; reports' source lineage and integration configurations. Review retention/minimization; **never transfer credentials, raw customer exports or backup files through chat/GitHub.**

- Historical **posted** Cashier financial rows: source-identified **read-only immutable archive**, opening balances posted only by independently approved accounting migration procedure; never replay old paid sale effects or fabricated WhatsApp consent.
- Every imported entity: stable source ID map, explicit tenant+business+branch, idempotent retry, referential checks, count and money totals reconciliation, dry-run/rollback.
- Establish precise source timezone, workdate and sequence, closed/open periods, sold vs paid/tender semantics before comparing sums. Report exceptions instead of silently fixing or dropping them.
- Cut production source is untouched; export requires founder and Cut operator authorization and independent credentials off chat. Synthetic pilot database must **never** receive real Cut PII.

## GO / NO-GO acceptance (non-negotiable)

- **Functionality:** 100% of Cut-used P0 workflows proven in DRVO with original source coverage + tests + real protected browser + staff acceptance. Every used P1 accepted or covered by an explicit tested owner-approved workaround. Any omission is an open blocker.
- **Financial correctness:** zero unexplained mismatch in sale/tender/GL/Treasury/inventory/payroll/shift results, safe refund/reversal, retry and re-entrant writes; no paid posting until ADR-031 authorization and evidence. Exact totals and documented rounding policies.
- **Security:** real release/K5F trusted session, deny cross-Tenant, cross-Business and cross-Branch plus role-negative tests, HTTPS/CSRF/secret handling and least privilege. Clinic/hotel tenant tests cannot receive Cut customer data.
- **Data:** full agreed Cut inventory reconciled (row counts, status, identity map, active future bookings, open receivables, stock, balances, refunds); immutable historical evidence, no duplicate money/points/commission. Historical archive completeness measured separately from opening balance transfer.
- **Ops:** verified off-host encrypted backup, independent restore, realistic printer/browser/network failure, monitoring, support coverage, reversible or compensating rollback rehearsal with post-cutover transaction ownership.
- **External release:** [issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) P1–P7 for real-data pilot; C1–C3 for paying full production. Founder/finance/security/operations sign off. If any gate open at D21: **Cut stays on Cashier.**

## First action (today)

**Operator:** execute the [isolated synthetic Pilot one-command runbook](PRIVATE-PILOT-LIVE-ACTIVATION-ONE-COMMAND-2026-11-21.md) only with authorized VPS root/SQL admin, verify exact DB name, backup/restore and Owner K5 browser. No credentials in chat.  
**Engineering:** extend [operational ledger](CUT-SALON-OPERATIONAL-REPLACEMENT-BASELINE-2026-11-22.md) to all Cashier source routes/actions using current SHA, source characterization, visible UX, SQL side effects and Cut actual-use priority; start file-disjoint ports with tests, not new preview dashboards.  
**Founder + Cut admin:** approve secure read-only source inventory/scope and finance ADR-031 signoff workflow; **do not** authorize real-data import, paid posting or public launch merely by approving the plan.  
**First observable proof:** signed browser Customer→Catalog→Barber→Booking→POS persisted DRAFT after reload in isolated synthetic Pilot, with negative cross-scope and restore. Subsequent paid sale proof is separately gated.

## Sources and precedence

Authoritative: [Start](../00-start-here/START-HERE.md) · [Current state](../00-start-here/CURRENT-STATE.md) · [Architecture](../02-architecture/ARCHITECTURE.md) · [Roadmap](ROADMAP.md) · [ADR-001](../05-decisions/ADR-001-new-repository.md) · [ADR-002](../05-decisions/ADR-002-modular-monolith.md) · [ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) · [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) · [ADR-037](../05-decisions/ADR-037-LEAN-PLATFORM-KERNEL-BOUNDARY.md) · [ADR-039](../05-decisions/ADR-039-FOUNDER-TEMPORARY-FAST-DEVELOPMENT-MODE.md) · [ADR-040](../05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md).

This is a proposed scheduling/acceptance program. Existing ADR approvals and current true operational state take precedence over any target date here.
