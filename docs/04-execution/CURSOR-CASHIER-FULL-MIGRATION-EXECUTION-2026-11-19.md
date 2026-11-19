# Cashier → DRVO ERP — Cursor Master Execution Contract (2026-11-19)

**Owner direction: FULL operational and UX parity, zero silently omitted Cashier features.** This is an **EXECUTE** assignment. Do not merely write design documents, synthetic demos or a status summary. Make working changes in DRVO, prove them, and continue through the sequence below. A complete migration is not asserted by this document.

**Project:** `tarek-saad-dev/drvo-erp` (destination); `tarek-saad-dev/casher` (read-only legacy source). Initial independently reviewed pinned Cashier source: `bc9c03fff86074872590ad0fd3525f9a4e416958`. Resolve current remote main and inspect source diffs before execution, then **record a new immutable source SHA**. Never replace the source baseline silently. Do not modify the Cashier production repo or database.

**Non-negotiable strategic goal:** DRVO is one multi-tenant, multi-business, multi-industry SaaS Business Operating System built as a Modular Monolith. Preserve all mature Cashier behaviors while mapping generic capabilities to shared Module owners and Salon/Barber/Queue/Packs to composable Extensions. Future Hotel modules must reuse the same HR, Customers, Catalog, Booking, POS, Sales, Inventory, Treasury, Expenses, Purchasing, Accounting and Reporting cores.

## 0. Mandatory reading order / source of truth

1. `docs/00-start-here/START-HERE.md`
2. `docs/00-start-here/CURRENT-STATE.md`
3. `docs/02-architecture/ARCHITECTURE.md`
4. `docs/04-execution/ROADMAP.md`
5. `docs/05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md`
6. `docs/05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md`, `ADR-032`, `ADR-039`, `ADR-002`, `ADR-009` (resolve exact paths from ADR register)
7. `docs/04-execution/CASHIER-PRESERVATION-FIRST-MIGRATION-2026-11-17.md`
8. `docs/04-execution/CASHIER-FULL-FUNCTIONAL-PARITY-MATRIX-V0-2026-11-15.md`
9. `docs/04-execution/CASHIER-POS-PAGE-WORKFLOW-AUDIT-V1-2026-11-18.md`
10. `docs/04-execution/CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18.md`
11. The exact existing DRVO migration files, CI workflows, deployment instructions and relevant source tests for each changed area.

**Precedence:** current GitHub docs/approved ADRs > this execution contract where they conflict; raise conflicts with paths, never silently weaken the architecture or finance policy. Conversation history is not authoritative.

## 1. Correct completion criteria / anti-fake progress

- **Full Cashier** means every supported operator flow, roles, buttons, dialogs, filters, search, lifecycle transition, keyboard and responsive UX, error/retry, printing, reporting, customer/staff/branch scope, ledger side effect and reversal has a source-anchored mapped equivalent. Retain nuanced Cashier workflow semantics unless a DRVO security/accounting difference is explicitly recorded.
- Never label a module DONE on the basis of route count, copied components, an iframe, an inert button, synthetic data, a working build, a passed isolated unit test or a public marketing demo.
- A visible private DRVO page must use authorized DRVO-backed data. No public /demo/salon changes as a substitute for protected operator workflows.
- **Definition of PARITY-VERIFIED for each workflow:** original source paths + immutable blob SHA; actor/permissions and branch/day preconditions; UI states/edge cases; original source data reads/writes and side effects; target owning module & extension; actual target API and SQL; source characterization/differential tests; negative tenant/business/branch checks; idempotency/race/cancellation/reversal checks where relevant; authorized private browser run on verified target; operator acceptance with evidence (URL, commit SHA, test run). All columns must exist in the living matrix. Missing proof = OPEN.
- Maintain explicit statuses `SOURCE_IDENTIFIED`, `PORTING`, `SOURCE_TESTED`, `DRVO_CI_PASS`, `PRIVATE_BROWSER_VERIFIED`, `PILOT_VERIFIED`, `BLOCKED`; do not collapse these into one 'complete' flag.
- Optimize for safe working vertical slices and genuinely runnable progress. Continue independent ready tasks without waiting for blocked live credentials, migrations or financial approvals. Do not declare full migration if blockers remain.

## 2. Architectural invariant: modules and data ownership

| Business capability | Shared owner | Salon-specific extension or adaptation |
| --- | --- | --- |
| Identity / tenants / businesses / branches / roles / audit / entitlements | DRVO Platform Kernel | Salon activation preset only; DO NOT import legacy auth/session |
| Employee master / attendance / payroll / leave / targets / ledger | HR Core | Barber profile, qualifications, barber schedule, barber service duration, tiered commission/tip attribution |
| Services / products / categories / pricing / packages | Catalog Core | Groom packages, barber-specific durations, salon add-ons and recipes |
| Customer / CRM / consent / history / loyalty | Customers + CRM/Loyalty | Cut Club tiers, salon return frequency, visit insights; no duplicate Customer entity |
| Appointment / availability / resources / queue | Booking Core + Queue/Operations | walk-in queue, barber allocation, service steps, handoff, public salon booking |
| Cart / quote / invoice / sale / return / receipt | POS/Sales | barber executor, packages, tips and service handoff; no Salon-specific sale header |
| Business date / open-close / shift custody | Operations | barber day/queue-close readiness and cutoffs |
| Payment methods / cash movement / transfer / reconciliation | Treasury | salon cashier operational configuration; NO second treasury |
| Expense / other income / budgets | Finance business-document owners | category extensions only; NO alternate route for POS revenue |
| Stock / COGS / purchase / supplier | Inventory + Purchasing | salon consumables/recipes, retail products and service stock usage |
| Journals / period close / reversal | Accounting | industry mapping policy, not separate salon GL |
| Insights, communications, alerts | Reports + Messaging | salon performance, customer follow-up, WhatsApp opt-in and Cut Club |
| Hotel (future) | Same shared cores | rooms, room inventory/availability, rate plans, folio, housekeeping etc; never import barber rules into shared core |

Use DRVO K5 server-authoritative `TenantId / BusinessId / BranchId` and RBAC on every read, write, export, batch, report and background task. Default Deny. Composite FKs and EXECUTE-only runtime access where current architecture requires them. Avoid leaking data through pagination, aggregate results, logs or 404 responses.

Cashier numeric legacy IDs do **not** replace scoped DRVO UUIDs. Store a separate restricted mapping ledger: `SourceSystem + SourceTenant + SourceBranch + EntityType + OriginalKey → DRVO UUID`. Cashier financial invoice identity is composite `(invID, invType)`. Explicitly retain WorkDate, BusinessDay, Cairo time semantics and source timestamp provenance. No direct cross-module table mutations. Domain event / outbox / approved transactional command orchestration only.

## 3. Cursor operating instructions / initial repository bootstrap

1. Work in the DRVO repo root; obtain read-only local checkout of Cashier in a sibling directory (example `../casher`) using already-authorized Git credentials. Do not paste access tokens, passwords, connection strings or real customer PII into prompts, commits or logs.
2. `git status --short`; record DRVO HEAD. Never overwrite unrelated user modifications. Fetch Cashier and lock its exact commit; compare with existing `bc9c03fff` inventory and record source HEAD deltas.
3. Identify actual package scripts, existing Next.js/NestJS/SQL Server architecture and CI matrix before installing dependencies or changing configuration.
4. Use existing Cashier source manifest, parity matrix and audit to **seed** a richer machine-readable task inventory; enumerate *all* relevant `src/app/**` operator pages and route handlers, `src/components/**`, `src/apps/**`, `src/modules/**`, `src/lib/**`, `src/packs/salon/**`, SQL schema/migrations, tests, permissions, scheduled jobs, triggers, prints and messaging integrations.
5. Classify every source artifact as `USE_AS_IS`, `ADAPT`, `SPLIT_GENERIC_AND_EXTENSION`, `DEFER_WITH_BLOCKER` or `OBSOLETE_WITH_PROOF`. A file inventory alone is not a functional inventory: map handlers/components to independently tested **workflows** with source identifiers and import-boundary owners.
6. Work in reviewable PRs/atomic commits with an execution ledger. For each PR document current modules affected, target ownership, input/output API change, migration & rollback, disabled-by-default flags, security/finance impact, and acceptance evidence. Sync appropriate docs and changelog **with code**; do not produce doc-only progress loops.
7. Delegate parallel agents **only for file-disjoint owners**; never concurrently edit migration numbering, identity, shared financial schemas or deployment secrets. Integrate branch only after test verification.
8. Do not stop after planning. Start implementing the first critical dependency chain with real source code and tests. On context/session interruption checkpoint exact branch, SHA, changes, failing tests and next direct command; continue from that state when resumed.

## 4. Exhaustive parity tracks and source entry points

This is a minimum floor, **not an exhaustive license to omit unlisted source features**. Perform full source discovery for all details before closing a module.

### Track A — UX/navigation: exact Cashier workflow fidelity
- Begin with `casher/src/app/income/pos/page.tsx` and `casher/src/components/pos/**`; reuse/refactor original Cashier light/compact operation, keyboard flows, empty/error/loading states, mobile sheets, drawer layouts, quick actions, dialogs and print.
- CustomerSearch, QuickCustomerModal, CustomerHistoryPanel, CustomerRecentSales, CustomerVisitSummary, Recommendation, vouchers, complete customer/consent.
- BarberCarousel/Grid, ServiceCatalog, ProductCatalog, PackagesSection, addons, incoming barber handoffs, quantity/cart editing, split payment selector, tips, saved/recent invoices, print/reprint and receipts.
- Preserve Cashier booking calendar, HR admin tabs/employee ledger, daily/monthly reports, full-day close, Treasury views, Inventory, loyalty, settings, employee portal and partner/manager UIs.
- New shell may use DRVO light identity/theme and authenticated navigation but **do not replace detailed originals with placeholder previews**. UI actions must invoke DRVO-owned APIs and show real state/errors. Original screenshot/DOM and end-user click-path comparator required on each large screen.
- Do not clone Cashier global auth, env reads, direct `dbo` calls, browser-trusted branch IDs or session assumptions. Replace via explicit DRVO API adapters/BFF.

### Track B — Customers, Catalog and migration prerequisites
- Read Cashier `dbo.TblClient`, `TblPro`, `TblCat`, packages, services, employees and branch mapping using **verified read-only** source DB principal. Discover actual schema, tenant scope, branch FK and data volume before export; no guessed defaults.
- Fix DRVO server-side authorized Customers search over full Business (current API only reads first 200), normalized Egyptian phone identity & explicit duplicate policy; analyze duplicates BEFORE adding constraints or bulk-importing.
- Customer CRUD, source/consent evidence, multi-phone, history, loyalty, tier, vouchers, customer-specific notes, no assumed WhatsApp consent from stored mobile.
- Categories, active/inactive offerings, duration, pricing, stock product vs service classification, service steps, salon packages/addons, groom packs and category search.
- Prove idempotent bounded batch, stable ID mapping, no FK leakage, sums/counts reconciliation. Historical posted sales remain read-only evidence, not new postings.

### Track C — HR and Barber Extension
- Employee master/profile/history, active/archive, branch assignments, transfers, schedule/rotation, permissions.
- Attendance/check-in/out/break, late/absent/day-off/leave, overtime, manually corrected source audit, shift and cross-branch rules.
- Monthly/daily payroll agreements: salary/commission/freelance/mixed, daily target tiers, retroactive pay rules, service commission, tips, earnings/advances/deductions, employee ledger, payouts and approvals.
- Salon barber eligibility, per-service durations, skills, workstation, bookable role, branch availability, service executor and opener attribution, handoffs, employee portal.
- Cashier evidence: `src/app/admin/hr/page.tsx`, `src/components/hr/**`, `src/app/api/admin/hr/**`, `src/lib/hr/**`, `src/lib/payroll/**`, `src/modules/attendance/**`. Characterization of formula/reversal/cross-day policies mandatory; no payroll posting until financial gate.

### Track D — POS, Sales, Payments, Printing
- Complete cart: customer lookup, "apply last visit" with fresh catalog reprice, products/services/packages/addons, barcode, stock availability, split employee attribution, line/header discounts, coupons/loyalty, gifts, taxes and rounding.
- Draft → quote → sale/checkout, invoice identity, shift/day/branch stamp, tender cash/card/split/partial/credit, electronic evidence vs actual settlement, transfer/clearing, tips, refunds/void/edit/reopen, reversal, customer receipt and audit.
- Cashier sources: `src/app/income/pos/page.tsx`, `src/components/pos/**`, `src/apps/pos/**`, `src/app/api/sales/**`, `src/app/api/pos/**`, `src/lib/sales/**`, `src/lib/clearingMethod.ts`, `src/lib/printService.ts`.
- Reuse source-executed price math already in DRVO. Profile original `src/apps/pos/application/createSale.ts` and `src/apps/pos/internal/legacySaleCreateAdapter.ts` for transaction/side effects; do NOT paste direct `dbo.TblinvServHead` writes into DRVO.
- Prevent duplicate finance writes, repeated invoices, duplicate Inventory decrement/loyalty points from retries. No paid POSTED contract until ADR-031 separately approved and posted path regression + independent accounting reconciliation verified.

### Track E — Booking, Queue, Availability
- Multi-service appointments, barber-specific availability, schedule/day-off, timezone/overnight/cutoff, hold/TTL, queue/walk-in, conflict handling, branch/tenant isolation, create/move/cancel/no-show, late arrivals, assigned/nearest barber, wait estimation, public booking and secure confirmation.
- Booking → POS conversion must be exactly-once, no duplicate charged line, correct customer/resource/employee branch.
- Cashier: `src/app/bookings/**`, `src/app/api/bookings/**`, `src/app/api/public/booking/**`, `src/lib/booking/**`, `src/apps/booking/**`, `src/app/api/queue/**`, `src/lib/queueEstimateEngine.ts`.
- Keep DRVO shared Booking generic for hotels/clinics; salon queue is an extension.

### Track F — Operations, BusinessDay, Treasury
- Opening/closing day, branch WorkDate cutoff and catch-up, opening/closing shifts, cash custody, safe operational write preconditions, handover.
- Treasury balance, cash in/out, payment method allocations, split clearing, collection, refund, transfer, approvals, count/recon discrepancies, manager closing, close/reopen audit and reversals.
- Cashier `src/apps/treasury/**`, `src/app/treasury/**`, `src/app/api/treasury/**`, `src/app/api/day/**`, `src/app/api/shift/**`, `src/modules/business-day/**`.
- Keep a single owner for money movements. Read-only or draft screens can launch separately; posting gated on reconciliation/ADR-031.

### Track G — Expenses, Other Income, Budgets, Purchasing, Inventory
- Expenses: categories, receipts, recurring/fixed, employee allocation/advances, approval, reversals, amounts and payability distinct from payment.
- Non-sale income: independent document + receipt classification; do not double count sales as other income.
- Budgets, forecast, variance, manager/partner reports and approvals.
- Stock by branch, unit/lot/valuation, stock movements, count, adjustments, product returns, transfer between branches, purchase order/receiving, supplier credit/payables, service consumption recipes and reorder alerts.
- Cashier source `src/app/expenses/**`, `src/app/income/**`, `src/app/api/expenses/**`, `src/app/api/incomes/**`, `src/app/api/budget/**`, `src/app/api/inventory/**`, `src/app/api/purchases/**`, `src/lib/inventory/**`.
- Accounting ownership for GL and cost valuation; no phantom balances from inventory snapshots or paid-looking drafts.

### Track H — CRM, Loyalty, Reporting, Integrations, Platform
- Contact capture, duplicates, visit recency/frequency and full source-backed history; rewards earn/redeem/reverse; Cut Club tiers, offers, vouchers, consent and messaging opt-out.
- Reports: daily/shift/monthly, revenue vs cash, employee revenue and payroll, profit/cost/cashflow, booking and cancellation, branch comparison, inventory, payment-method and reconciliation breakdown. All filters/permissions/export/print.
- WhatsApp/notifications, campaign templates, outbox retry, idempotency and audit with verified user consent; avoid automatic broadcast on imported history.
- Platform: DRVO K5 auth, workspace, branch RBAC, tenant isolation, release/activation, organization config, audit; preserve all needed manager/partner/employee operator roles without transporting old cookie/session codes.
- Cashier `src/app/api/loyalty/**`, `src/app/admin/cut-club/**`, `src/app/api/reports/**`, `src/app/reports/**`, `src/modules/messaging/**`, `src/platform/**`.

### Track I — quality, security, operational portability
- Validate true DRVO customer/branch/role scope, SQL injection prevention, rate limits, PII/consent handling, keyboard accessibility and responsive UI.
- Feature flags **OFF** until independently verified. Mandatory build/typecheck, unit, SQL2022 HTTP integration, multi-tenant isolation, negative grants, idempotency/concurrency, browser E2E, recovery/restore, performance comparison, print and failure tests.
- Match every existing Cashier source fixture/test relevant to the port (not just happy paths). Persist reproducible fixtures devoid of real PII.
- Preserve developer portability across Cursor, ChatGPT and local CLI. Store durable decisions and checkpoints in GitHub, not ephemeral agent memory.

## 5. Actual data / VPS integration (NEVER assume runtime access)

Cashier and DRVO are understood to be on a VPS with SQL Server, but GitHub access does not imply DB credentials or live schema. Make *read-only* discovery and prove exact source DB names, backups, login principal, Tenant/Branch scopes, timezone and SQL version using secure host-side procedures. Do not copy production passwords/connection strings or raw PII into the repo/agent transcript. Don't depend on an arbitrary `sa` login.

- Independent confirmed destination DB and scoped DRVO Owner login, verify actual applied migration checksums and source-vs-target schema.
- Before any target write: source snapshot + record counts and reconciliation manifest; separately verifiable encrypted backup & restore to an isolated DB; schema/FK and mapping preflight; least-privileged integration credentials.
- Copy master data and a bounded last-month operational history by source IDs; de-duplicate and reconcile before merge. No unsafe auto-migrations.
- **Historical invoice = read-only source evidence** until separately authorized import/cutover. It must never generate a second sale, cash movement, stock decrement, loyalty earn, tax event, payroll credit or journal.
- Implement source→target incremental sync only after update/delete/refund detection is proved; log checkpoints and change hashes. Never bidirectional sync into Cashier without explicit write-owner decision.
- Cut Salon keeps its existing checkout writer until DRVO's POS→Treasury→Accounting→Inventory→Loyalty write chain passes independent financial and branch isolation checks and an owner-approved coordinated cutover. Never share a table for simultaneous writes.
- A parallel **operator coexistence** launch may keep existing Cashier running separately for production continuity, but an iframe or navigation link is NOT counted as migrated DRVO functionality.

## 6. Execution order and parallelism

**Priority = a usable private Cut Salon operator journey, not a pretty public demo.**

| Wave | Critical path | Safe parallel owner tracks | Required observed result |
| --- | --- | --- | --- |
| W0 | Verify both HEADs; update exhaustive source UI/API/SQL workflow ledger and map responsibility; identify actual Cut/DRVO DB and DRVO flags | Import source characterization tests; screenshot inventory; data-schema read-only preflight | Precise gap ledger, no hidden omissions, first CI fixture |
| W1 | Authorized K5 workspace + Customers global search/dedupe → Catalog/HR Barber → private Cashier POS state/cart with source UX | Booking/Queue UI and availability; Reports read-only; import tooling | Real customer and service selection and safe nonposting DRAFT in private workspace |
| W2 | Booking↔POS package/handoff and source historical last-visit; BusinessDay/Shift preflight | HR/Payroll salary policy + staff UX; Inventory read-only & Purchasing; CRM/Loyalty | Real-data operator workflow, all critical actions produce correct durable state or explicitly blocked |
| W3 | Treasury/expense/other income + receipt/print + reconciliation, no unauthorized funds movement | Reporting, mobile UX, role matrix, legacy test characterization, perf/restore | Independent real SQL/HTTP/browser evidence for all nonfinancial ported functions |
| W4 | ADR-031 finance/tender/accounting decision + implementation + isolated recovery/retry tests; source-of-truth cutover | Final payroll/inventory/loyalty side-effect parity and regression | Posted sale and all exactly-once effects *only after formal approvals* |
| W5 | Every operator role/branch and every source workflow parity walk; remove blockers, final reconciliation and production readiness | Hotel Extension discovery may proceed on generic core without depending on Salon completion | Complete verifiable matrix; signed Cut Salon go-live/cutover only if all gates met |

**Do not force artificial all-at-once 'hours' completion.** Parallelize only independent domains. Time spent on live SQL permission, finance approval and backup is a boundary, not an excuse to silently mark missing modules complete.

## 7. First concrete PRs; do not just plan

1. **PR0 — source lock & reproducible parity gate:** programmatically inventory all Cashier runtime files/UI components/API routes/migrations and persist source blob hashes; test no silently removed/disappeared source path; generate actionable workflow ledger (not duplicate the existing source ledger blindly). Assert DRVO current coverage is source-matched only where real tests exist.
2. **PR1 — full scoped Customer search/duplicate safety:** replace first-200 local lookup with server-side business-scoped name/phone lookup; phone canonicalization, approved duplicate-handling semantics, idempotency, cross-tenant/business/branch negative SQL/HTTP tests, private POS search reuse. No source/live bulk import.
3. **PR2 — Cashier POS UX/state transplant:** carry original `src/app/income/pos/page.tsx` component tree and `src/components/pos/**` behavior into DRVO private workspace via extracted components/API façade; original-price handling, customer quick create, barcode/services/products/packages/cart/tips/discount/split/print states; for blocked financial action label status honestly, never simulate a payment. Screenshot and operator click-path diffs.
4. **PR3 — safe source read adapter + historical reference:** audited Cut SQL read-only schema extraction and id mapping, source invoices/detail/payment composite key, branch/date filtered history, real Customer last visit and fresh catalog repeat. No new posted sale or duplicate finance.
5. **PR4 — Booking+Queue and HR/Barber port:** source implementation tests for cancellation/concurrency, Branch resource windows, barber schedule and performance, original UX migration.
6. **PR5+ — operations, treasury, inventory, purchasing, loyalty, messaging, reports and finance gated delivery**, one coherent working vertical slice per PR, not abandoned placeholders.

For each PR: run actual targeted tests, Next build, Nest build, disposable SQL E2E and affected architecture/security tests. Include test commands/logs, SHA, changed files, bug/feature checklist, actual staging deployment status (if any), remaining blocker, next PR. A CI run being queued is not a PASS; deploy code SHA is not a DB migration or authorized private browser acceptance.

## 8. Machine-readable workflow ledger columns (mandatory)

`ID | SourceSHA | SourcePaths+BlobSHA | OriginalScreen | UserAction | AuthRole | TenantBusinessBranchScope | Preconditions | Reads | Writes | Effects | FailureAndRaceCases | OwnedModule | SalonExtension | TargetPaths | UIProof | DomainTest | SQLHTTPTest | BrowserProof | DataProof | PilotProof | Status | Blocker | NextAction`

For every original UI click/fetch and source domain command create corresponding row(s) and recursively trace invoked helper/worker/trigger. Unmapped source operation must remain an explicit blocker. If source behavior is unsafe, note a rationale and approved replacement; don't silently delete it.

## 9. Finish / checkpoint protocol

At every meaningful commit output:
- **Code completed:** exact paths, old Cashier method/component mapped to new DRVO owner, what working behavior exists and which is still missing.
- **Verification:** tests run, PASS/FAIL (with URLs and SHA), live SQL/backup/restore proof or 'not run', authenticated browser/screenshots or 'not run'.
- **Security:** branch/tenant scope, PII and permissions tests; cross-module ownership; no Cut DB writes.
- **Delivery:** PR/commit link, release flags, deployment SHA if separately verified, unresolved approvals.
- **Next action:** first executable command and next highest-value unblocked PR. Continue execution unless a truly blocking external permission/decision is required.

**Failure condition:** returning with a long plan, copied unconnected components, green dummy tests, undocumented deviations, or an assertion of '100% ported' while any source workflow has no real owner/API/SQL/UX/permission/CI/acceptance proof.

**Definition of mission completion:** all Cashier workflow rows have approved DRVO equivalents and operator acceptance; all intended Cut Salon live workflows and key financial side effects reconcile exactly once; independently verified live isolated deployment and backup/restore evidence; no blocking gaps. Until then: be candid that migration remains incomplete.

**Start now:** read files in `0`, inspect both repos, and implement PR1 Customer search plus PR0 workflow coverage in parallel, then advance to original Cashier POS private UX. Do not ask for approval of ordinary code/test changes; stop only at explicit operational/financial/security gates.
