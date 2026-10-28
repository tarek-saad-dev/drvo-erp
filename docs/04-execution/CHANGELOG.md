# Project changelog

## 2026-10-28 — POS state machine / shift lifecycle design drafts

- Confirmed single distinct opener; 10% opening commission on after-discount before-tax service price; automatic refund reversal.
- Founder accepted cash surplus in variance account until proven sale and append-only manager corrections preserving original settlement.
- Created proposed POS State Machine and Shift Lifecycle specs, including guards, states, events, tests and unresolved design questions.
- **Specifications only; no implementation, schema, or deployment.**



## 2026-10-28 — POS discovery round 4

- Recorded seven cash/day/shift responses, including last cash custodian responsibility and separate approval for deductions.
- Captured explicit salon upsell scenario: Mohamed 10% opener commission; Youssef sole executor and target owner.
- Flagged cash surplus sales classification and editing approved journal adjustments for accounting/audit design.
- Day closing and offline fiscal reconciliation remain open; no code implemented.



## 2026-10-28 — POS discovery round 3

- Captured 12 founder responses on shared treasury, cashier shifts, cash differences, post-payment attribution corrections, offline sales and employee tips.
- Documented shortage-to-cashier and surplus-as-sales requested policy with accounting/workforce compliance concerns; no automatic journal classification or payroll deduction approved.
- Deferred attribution percentages, offline close and treasury transfer design.
- No implementation or deployment.



## 2026-10-28 — POS discovery round 2

- Captured 15 payment, refund, credit, tips and staff attribution answers.
- Approved separate tips, configurable payment methods, mixed-tender debt, refund controls and automated target/commission reversal outcome.
- Deferred attribution scenario, percentage rule, closed-day behavior and payroll posting details.
- No software implementation claimed.



## 2026-10-28 — POS Core discovery round 1

- Recorded 12 founder decisions covering invoices, staff attribution, drafts, split tender, credit, corrections and shifts.
- Tracked ambiguity between one service executor and multiple revenue/commission beneficiaries.
- Added payment/refund/offline follow-up questions; no code implemented.



## 2026-10-28 — Permission and QR follow-up

- Approved Allow-only + Default Deny RBAC evaluation.
- QR card must be used only by its owner with additional verification; actual purpose remains unspecified.
- Discount Engine rules and precedence are not yet approved.
- No feature implementation claimed.



## 2026-10-28 — RBAC matrix discovery

- Recorded founder's approved RBAC choices and ten unanswered operations.
- Captured ID/QR card discount concept; clarified that security and recipient semantics are unresolved.
- Added open questions for permission evaluation, delegation, discounts and accounting.
- No RBAC or discount feature implemented.



## 2026-10-28 — Identity & Access discovery

- Recorded 12 founder responses, approved global usernames and login model.
- Documented Owner/Manager account creation, explicit Business Membership, one role per Branch and recovery/session policies.
- Logged unresolved Deny, role hierarchy and privilege escalation controls. No code implemented.



## 2026-10-28 — Tenancy final follow-up

- Confirmed manager access to profit/cost within authorized management scope.
- Confirmed Business-only currency, language, timezone settings; no Branch overrides.
- Left Module Dependencies undecided for detailed architecture review.


## 2026-10-28 — Tenancy discovery (40 answers)

- Confirmed Tenant > Business > Branch, separate Business brands/accounting and Tenant-wide summaries.
- Confirmed Branch-specific stock/treasury/shifts, shared intra-Business customers, price overrides and multi-Branch staff.
- Confirmed Tenant-scoped accounts, hierarchical RBAC, customizable roles and sensitive-action audits.
- Confirmed Business-level module enablement, multiple extensions, preserved data on deactivation and admin approval for paid modules.
- Confirmed shared database with isolation, expected scale and deferred questions.
- Added discovery record and Tenancy Architecture blueprint; no code implemented.



## 2026-10-28 — Final MVP discovery clarification

- Retain Cut Salon booking site; connect to DRVO Booking API.
- Accept cash-only offline sales with reviewable shortages found after sync.
- Defer manual journal-entry design decision until Accounting Module discovery.
- Allow internal development tests before one comprehensive commercial V1 launch.
- Updated project state, roadmap and open risks; no implementation claimed.


## 2026-10-28 — MVP release strategy decisions

- Captured eight founder clarifications: founder + Cursor; flexible one-month goal; one comprehensive commercial V1.
- Cash-only offline sales with later synchronization; DRVO booking authority; all Cut Salon branches for validation.
- Full accounting required in V1; manual subscription collection precedes electronic gateway.
- Recorded outstanding architectural and rollout safety requirements. No code or deployment claimed.



## 2026-10-28 — MVP discovery round 2

- Captured all 20 founder responses as requested scope, without promising one-month feasibility.
- Documented scope/timing, offline, double booking, Cashier coexistence, printing and commercial-readiness risks.
- Added explicit open questions and linked the roadmap/current state. No code deployed.


## 2026-10-28 — Product discovery follow-up decisions

- Approved **medical clinics as the second vertical**, superseding Retail-second commercial rollout.
- Confirmed complete ERP as **long-term vision with staged release delivery**.
- Approved **Egypt and Gulf from initial commercial launch strategy** (specific countries/regulations still open).
- Approved **Responsive Web / PWA** for first mobile channel.
- Confirmed **Core + Extension for every module without exception**; exact architecture contracts still open.
- Confirmed **Cut Salon as first real-world pilot**.
- Updated vision, discovery answers, roadmap, architecture and open questions.
- **No application code, production DB or deployment claimed.**

## 2026-10-27 — Documentation foundation

- Created the DRVO ERP documentation baseline and navigation.
- Recorded agreed strategic architecture direction and open decisions.
- Status remains planning.


Offline POS 2026-10-28: independent per-device queues, local re-authentication for previously verified staff, and permissioned pre-sync correction confirmed. Founder requested broader tender support; provider-dependent confirmation, shift closing, and late sync remain unresolved. See docs/03-modules/OFFLINE-SYNC-SPEC.md and SHIFT-CLOSING-WORKFLOW.md. These are design drafts, not implemented.

## 2026-10-28 — Offline shift closure follow-up

- Confirmed provisional shift close and final reconciliation for pending local sales.
- Confirmed cash count includes all actually received offline cash.
- Confirmed automatic retries plus Manager-visible sync errors.
- Offline electronic payment confirmation remains undecided; updated engineering draft, no implementation.


## 2026-10-28 — Offline day close and API/data draft

- Approved provisional financial-day close and later final reconciliation.
- Approved device-loss incident with manual cash reconciliation, not guaranteed restoration.
- Electronic payments during outage deferred for per-method discussion.
- Added proposed offline API contracts and logical database model; technical names/schema are not approved. No code implementation or deployment.



## 2026-10-29 — POS technical design

Added draft POS logical data model, Accounting Events and module integration boundaries. Documents include tenant-scoped data integrity, invoice/payment/refund separation, idempotent outbox, one executor and optional distinct opener, and offline queue reconciliation. No app or database was implemented.


## 2026-10-29 — Accounting Core discovery round 1

- Created Accounting Core and Chart of Accounts documentation based on 16 founder answers, including unanswered/deferred points.
- Reconciled immediate posting, permissioned period reopening and limited audit scope against immutable posted journals and necessary provenance.
- No accounting schema or backend implementation.


## 2026-10-29 — Treasury discovery

- Recorded 8 founder answers and created Treasury Core specification.
- One branch treasury, separate shifts, manager-approved transfers and large expenses, permissioned balances and movements; bank reconciliation deferred.
- No treasury backend deployed.


## 2026-10-29 — HR & Commission discovery

- Recorded 12 founder decisions; created HR Commission Engine and Employee Ledger logical drafts.
- Reconciled service/employee-variable opener rate with previously fixed 10% example, advance offsets with separate shortage-deduction approval, and per-branch attribution.
- Documentation only, no code or database deployed.


## 2026-10-29 — Inventory and Purchasing discovery

- Documented 11 approved founder decisions; deferred cross-Business inventory transfer question.
- Added compact Inventory Core and Purchasing Core design specs with direct purchase, Recipe-based material consumption, stocktake and low-stock alerts.
- Reviewed POS offline negative stock and Accounting valuation implications; no code deployed.


## 2026-10-29 — Cross-module architecture review

Added ARCHITECTURE-READINESS-REVIEW.md: reconciled historical rule conflicts, listed seven design gates, proposed implementation sequencing, and scoped financial/tenant data integrity checks. Documentation only.


## 2026-10-29 — Technology architecture

- Recorded founder SQL Server selection and recommended Next.js + NestJS/TypeScript modular-monolith stack.
- Created Technology Architecture baseline and phased V1 plan, with tenancy, offline, financial safety and prerequisite decision gates.
- No source code, migrations, infrastructure changes or production deployment.
