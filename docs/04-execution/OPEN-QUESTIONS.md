# Open questions — unresolved only

| ID | Open decision | Priority |
|---|---|---|
| OQ-001 | Backend/frontend framework and TypeScript structure | High |
| OQ-002 | SQL engine, ORM/query tooling and migrations | High |
| OQ-003 | Tenant isolation strategy and cross-tenant integrity guarantees | High |
| OQ-004 | Ownership of subscriptions and entitlements | High |
| OQ-005 | Hosting, staging, environments and secrets | High |
| OQ-006 | Salon MVP and legacy Cashier migration/coexistence/rollback | High |
| OQ-007 | Identity and invitations | Medium |
| OQ-008 | Offline PWA POS, device/printing support and sync | High |
| OQ-009 | Final ERP module capability map vs integrations / MVP cut | High |
| OQ-011 | Which Gulf countries first, and required regulatory, tax, language and payment support for concurrent Egypt + Gulf launch? | High |
| OQ-012 | PWA offline capability, stakeholder portal timing and later native-app requirements | High |
| OQ-013 | Mandatory Core + Extension contracts for **every** module: interface, packaging, lifecycle and dependency rules | High |
| OQ-014 | Measurable 3-month/12-month customer benefit targets | Medium |
| OQ-015 | Target branches/users/transaction volume | High |
| OQ-016 | Must-have Odoo capabilities vs DRVO additions | Medium |
| OQ-017 | After barber salons then medical clinics, when do beauty/aesthetic and supermarket editions launch? | Medium |
| OQ-018 | Clinic clinical data scope, privacy, compliance and safe release criteria | High |
| OQ-019 | Cut Salon pilot date, scope, transition and operational rollback | High |

## MVP Round 2 unresolved scope / delivery

| ID | Open decision | Priority |
|---|---|---|
| OQ-020 | One-month target feasibility: team, resources, delivery scope, acceptance gates | Critical |
| OQ-021 | Distinguish limited pilot, replacement parity, and first external commercial sale | Critical |
| OQ-022 | Offline POS writes, sync conflicts, payment processing, stock and journal posting | Critical |
| OQ-023 | Parallel operation: per-entity system of record and duplicate prevention | Critical |
| OQ-024 | Full general ledger design/requirements vs operational cash summaries | Critical |
| OQ-025 | Full existing HR parity checklist and dependencies | High |
| OQ-026 | Subscription payment provider(s), invoicing and operational billing | High |
| OQ-027 | Receipt printing postponed: pilot process and replacement acceptance | High |
| OQ-028 | Pilot date/branch, data migration strategy, booking concurrency test | Critical |
| OQ-029 | Arabic-first vs Gulf-market localization and compliance at simultaneous launch | High |

See [MVP Discovery Round 2](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Resolved from founder follow-ups (2026-10-28)

- Former OQ-010 second industry: **medical clinics**, after barber salons.
- Comprehensive ERP ambition, delivered in stages.
- Egypt and Gulf both in initial commercial launch strategy.
- Responsive Web / PWA for first release.
- Core + Extension mandatory for every module.
- Cut Salon is first pilot.

[Source answers](../01-product/DISCOVERY-01-FOLLOWUPS.md). Record detailed architecture choices in ADRs before implementation.

## MVP clarification resolutions (2026-10-28)

- OQ-020 partly resolved: team = founder + Cursor; one-month target flexible. Detailed estimate remains open.
- OQ-021 partly resolved: **one comprehensive commercial V1**, with testing and all-branch validation gates (not separate commercial releases). Exact acceptance criteria open.
- OQ-022 partly resolved: offline POS cash sales only, sync later. Conflict/idempotency/accounting specifications still open.
- OQ-023 partly resolved: DRVO authoritative for bookings. Legacy Cashier integration and write lockout still open.
- OQ-024: **full GL accounting required in V1**; detailed accounting model remains open.
- OQ-026 partly resolved: subscription collections manual initially; gateway deferred. Entitlements/reconciliation unresolved.
- OQ-028 partly resolved: all Cut Salon branches included in initial validation; phased activation and rollback remain open.

[Release strategy decision](../01-product/MVP-RELEASE-STRATEGY.md).


## Final MVP clarification resolutions — 2026-10-28

- Existing Cut Salon public booking website stays; integrate it with DRVO's new Booking API. Migration, cutover and fallback remain OQ-023.
- Offline cash sales are accepted despite post-sync stock shortages; create a reviewable stock discrepancy. Negative-stock rules, valuation and reconciliation remain OQ-022.
- Accounting manual vs automatic journal-entry workflow is **unresolved**, to be decided during detailed Accounting Module discovery (OQ-024). Full accounting remains in commercial V1.
- Internal tests during development are allowed; **one comprehensive commercial launch** after acceptance, not separate public MVP stages (OQ-021).

## Tenancy discovery — unresolved details (2026-10-28)

| ID | Unresolved issue | Priority |
|---|---|---|
| OQ-030 | Business transfer between Tenants: prohibited or controlled migration? | Medium |
| OQ-031 | Business partner shares and ownership model | Medium |
| OQ-032 | Module dependency policy (recommended DAG/explicit required and optional dependencies, awaiting approval) | High |
| OQ-033 | SaaS branch/user/module limits and expired subscription workflow | High |
| OQ-034 | Tenant/Business export and portability policy | Medium |
| OQ-035 | Per-entity deletion, retention, audit and legal rules | High |
| OQ-036 | Business-level currency/timezone/language vs multi-country Branch needs | High |
| OQ-037 | Tenant-qualified username uniqueness, identity and recovery | High |
| OQ-038 | Manager-only finance visibility: Owner/Super Admin exceptions | High |
| OQ-039 | Cross-Business consolidated financial reports, accounting periods and currency conversion | High |
| OQ-040 | Branch-to-Branch transfer approval/posting and inter-branch finance rules | High |

Founder decisions: [Tenancy Discovery](../01-product/TENANCY-DISCOVERY-ROUND-3.md). Architecture blueprint: [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md).

## Tenancy final follow-up (2026-10-28)

- OQ-032 remains **open**, explicitly awaiting Module Dependencies design discussion and founder approval.
- OQ-036: founder approved Business-only settings, no Branch overrides. Unresolved risk: Businesses spanning countries/timezones/currencies.
- OQ-038: Manager access to profit/cost is always granted **inside authorized management scope**. Exact owner exceptions and scope-to-role matrix still require documentation.

## Identity & Access discovery unresolved — 2026-10-28

| ID | Open decision | Priority |
|---|---|---|
| OQ-041 | Explicit Deny permission semantics versus default-deny Allow-only system | High |
| OQ-042 | Manager privilege delegation, role creation scope and escalation prevention | Critical |
| OQ-043 | Tenant/Business role precedence, inherited scopes and one-Role-per-Branch merging | Critical |
| OQ-044 | Tenant signup, first Business membership bootstrap, verified recovery email and invitation | Critical |
| OQ-045 | Session revocation on next protected API request; refresh token/session architecture | Critical |
| OQ-046 | Email OTP expiration, throttling, recovery and first-login credential enrollment | High |
| OQ-047 | Temporary permission delegation after role matrix design | Medium |

Approved: global username uniqueness, username/password login, self-registration, manager-account creation, explicit Owner Business membership, one Role/Branch, email OTP reset, mandatory first-login password change, revoke on refresh intent. [Identity & Access](../02-architecture/IDENTITY-ACCESS.md).

## RBAC matrix unresolved (2026-10-28)

- OQ-041: founder requests illustrative comparison before Allow-only vs explicit Deny decision.
- OQ-048: user QR discount: user is discount issuer, discount recipient or both; what determines final percentage/amount and role cap?
- OQ-049: QR security: revocable card tokens, second-factor/manager sign-off and audit rules (proposal only).
- OQ-050: manager may create/edit Roles but not grant equal Manager Role without Owner; define effective privilege ceilings.
- OQ-051: refund amount tiers, void permissions, closed-day reopening and journal reversal semantics.
- OQ-052: expenses, accounting entries, salaries, advances, stock transfer, price changes, booking, approvals, protected permissions still unanswered (questions 11–20).

[RBAC Discovery](../02-architecture/RBAC-MATRIX.md).

## QR / permission follow-up (2026-10-28)

- OQ-041 **resolved**: founder approved Allow-only + Default Deny. No explicit Deny in V1.
- OQ-048 **open**: QR card usage differs from suggested staff-authorizes-discount/personal-discount options; founder explanation required before designing feature.
- OQ-049 **partially resolved**: QR card for owner only with additional verification; exact authentication, revocation, credential/storage and abuse protection remain open.
- Discount Engine design and precedence vs Role limits remain **open**.

## POS and salon discovery open items (2026-10-28)

- OQ-053: Service has one executor but manager can split revenue and commission among multiple beneficiaries. Distinguish credited sales, targets, payroll and actual cash ledger; rules and percentages open.
- OQ-054: Draft invoice lifecycle, lock/resume, booking/stock reservations, offline behavior.
- OQ-055: Temporary catalog line review plus tax, inventory and accounting mapping.
- OQ-056: Split payments, credit-limit authorization, settlements, refunds and partial balances.
- OQ-057: Cash-only Offline POS sales require open shift; local shift availability and reconciliation.
- OQ-058: Correction documents and adjustment policy for immutable paid invoices.

[POS Discovery Round 1](../03-modules/POS-DISCOVERY-ROUND-1.md).

## POS payments / refunds / attribution discovery (2026-10-28)

- OQ-059: Custom payment method settlement, reconciliation and restrictions.
- OQ-060: Credit limit atomic checks, mixed cash/receivable payments, partial collection and aging.
- OQ-061: Refund by item or arbitrary amount, to tender/customer credit, preventing over-refunds and refunding unpaid debt.
- OQ-062: Tips distinct from service revenue: payroll/payable, allocation, refund and reporting.
- OQ-063: Manager approval for over-limit refunds: authorization workflow and thresholds.
- OQ-064: Automatically reverse target/commission on refund if earned, posted or paid; correction periods undecided.
- OQ-065: Service executor vs revenue/commission share mechanics and whether total shares equal 100%; HR to set attribution rules.
- OQ-066: Financial day reopening deferred to Accounting Module.

[POS Discovery Round 2](../03-modules/POS-DISCOVERY-ROUND-2.md).

## POS Round 3 unresolved — 2026-10-28

- OQ-067: Founder to describe one-executor / multiple-attribution-beneficiaries scenario; 100% share rule remains unknown.
- OQ-068: Shared Branch treasury with separate cashier shifts: cash custody, overlapping shifts, shortage attribution and evidence.
- OQ-069: Manager post-payment service attribution adjustments vs immutable invoice, HR and accounting.
- OQ-070: Cash shortfall charged to cashier and surplus described as sales income: investigate, approve, lawful employee recovery, and distinguish cash variance from verified sales/tax revenue.
- OQ-071: Financial day may close with active shifts; late-shift and offline sync settlement policy.
- OQ-072: Offline cash sale same shift; closing shift with pending unsynced transactions unresolved.
- OQ-073: Treasury transfers deferred; Tips credited to Employee Ledger (payout timing/settlement unresolved).

[POS Discovery Round 3](../03-modules/POS-DISCOVERY-ROUND-3.md).

## POS Round 4 follow-ups (2026-10-28)

- OQ-074: Shared branch treasury shortage allocated to last employee receiving cash; need custody handover proof, shared access rules, investigation and deduction approval.
- OQ-075: Founder wants surplus immediately labeled sales income; unresolved accounting/legal classification as true sales versus cash variance.
- OQ-076: Day close with open shifts: workflow and provisional/final adjustments unresolved.
- OQ-077: Business setting for multiple concurrent shifts; overlaps, cash custody and reconciliation.
- OQ-078: Offline original sale date plus post-close adjustment: financial/tax period policy and distinct posted_at vs occurred_at.
- OQ-079: Manager edits approved cash adjustment: preserve version/reversal audit and immutable posted journals.
- OQ-080: Salon opener upsell commission **10% for Mohamed**, while Youssef executes skin care and owns its target. Commission calculation base, stacking and refunds unsettled; prior 70/30 arbitrary revenue split not adopted.

[POS Discovery Round 4](../03-modules/POS-DISCOVERY-ROUND-4.md).

## POS state / shift specification — 2026-10-28

**Resolved founder decisions:** opener commission 10% on post-discount pre-tax service value, one opener, opener ≠ executor, automatically reverse on refund; cash surplus to variance then verified reclassification; approved settlements corrected via new linked entry preserving original.

**Still open:** rounding and partial refund commission reversal, employee commission plan interaction, financial-day closure finality, shift close with offline pending sales, signed custody chain, staff shortage liability approval, event/API/DB contracts, credit/refund ledger exact accounts and discount policy.

Design drafts: [POS State Machine](../03-modules/POS-STATE-MACHINE.md) and [Shift Lifecycle](../03-modules/SHIFT-LIFECYCLE.md). Their proposed state names and implementation choices are **not approved** merely by documenting them.

## Offline POS discovery — 2026-10-28

- OQ-081: Earlier cash-only Offline POS conflicts with latest all-payment-methods request. Decide supported tender type per offline capabilities, external terminal proof and provider confirmation.
- OQ-082: Should pending external gateway authorization create a draft, pending sale or posted receivable; prevent false PAID.
- OQ-083: Offline local login TTL, device trust, revocation during outage and encrypted credential storage.
- OQ-084: Offline corrected/cancelled sale permissions, immutable cash history, sync ordering.
- OQ-085: Closing cashier shift and counting physical cash when device queues remain unsynced; day finality.
- OQ-086: Duplicate sale idempotency, failed synchronization retry/review and manager pending-device dashboard.
- OQ-087: Lost POS device queue disaster recovery and limits of backup.
- OQ-088: Offline credit limit enforcement cannot be assumed safe across independent devices; online reservation or offline credit disabled pending decision.

[Offline founder responses](../03-modules/OFFLINE-POS-DISCOVERY-ROUND-1.md) · [Sync Spec](../03-modules/OFFLINE-SYNC-SPEC.md) · [Shift Closing](../03-modules/SHIFT-CLOSING-WORKFLOW.md).

## Offline POS follow-up decisions — 2026-10-28

- OQ-085 **partially resolved**: founder approved provisional *shift* close with pending sales and final reconciliation; all received offline cash included in count. Detailed day closing policy remains undecided.
- OQ-086 **partially resolved**: automatic retries then Manager error display approved; idempotency required to avoid duplicate financial events, exact retry escalation unresolved.
- OQ-081/OQ-082 **OPEN**: electronic tenders without provider confirmation. No assumption of offline card/gateway settlement.
- Remaining: scope of offline credit, queue-loss recovery, session TTL/revocation, terminal evidence, final exception resolution, finality of business-day close.

See [Offline Sync](../03-modules/OFFLINE-SYNC-SPEC.md) and [Shift Closing](../03-modules/SHIFT-CLOSING-WORKFLOW.md).

## Offline day-close follow-up (2026-10-28)

**Founder-resolved:** Day close with open shifts or pending offline sales is **provisional until final reconciliation**. Lost local POS queue/device handled via incident report + **manual physical cash reconciliation**, without assumed restoration. Payment providers to be evaluated **one payment method at a time** (unresolved).

**Open:** criteria for formally resolving a lost-device exception; late period tax/journal adjustments; specific card/terminal/wallet/transfer/gateway tender states; offline credit risk; cached login expiry; exact API schemas/database platform; cash handover and cross-device visibility; pending-payment handling on final close.

New design drafts: [Offline API Contracts](../03-modules/OFFLINE-API-CONTRACTS.md), [Offline Database Design](../03-modules/OFFLINE-DATABASE-DESIGN.md).

## Founder decision — 2026-10-29: payment selection availability

All payment methods configured for a Business must remain visible and selectable in POS both online and offline. Do not gate or hide a method merely because connectivity is lost. Founder explicitly skipped per-payment-method discovery for now.

Selecting a method is NOT equivalent to receiving or verifying funds. Cash may be recorded locally as received; provider-dependent payments must retain an unverified/pending reconciliation status until reliable confirmation or evidence exists. Never manufacture provider authorization, and never post pending electronic payment as settled cash. Payment selection UI availability is APPROVED; exact provider confirmation and settlement semantics are technical design work, not additional UI selection questions.


## POS technical design follow-up (2026-10-29)

Drafts created: [POS Data Model](../03-modules/POS-DATA-MODEL-V1.md), [Accounting Events](../03-modules/POS-ACCOUNTING-EVENTS.md), [Module Integrations](../03-modules/POS-MODULE-INTEGRATIONS.md). Open decisions: selected SQL engine/ORM, taxes, chart of accounts and posting policy, offline credit, provider confirmation, inventory reservation, rounding, payroll reversal timing and Module Dependencies. No source code/schema deployed.


## Accounting Core discovery (2026-10-29)

- Accounting hierarchy nesting depth OPEN; posted GL entries must balance debits/credits as an integrity invariant even though founder did not explicitly decide.
- Business-configured reports: required minimum list TBD; Tenant consolidation currency conversion TBD.
- Permission to reopen monthly/yearly periods approved; control and actor policy still TBD; posted entries remain immutable, corrected via linked reversing journal.
- Sensitive-only Audit Log policy approved, while immutable financial source/provenance must still be retained.
- See [Accounting Core](../03-modules/ACCOUNTING-CORE-SPEC.md), [Chart of Accounts](../03-modules/CHART-OF-ACCOUNTS.md).


## Treasury discovery — 2026-10-29

Confirmed one treasury per Branch; bank accounts at Business and Branch levels; approved and logged Manager-authorized transfers; expenses paid via bank or cash, with Manager approval for large expenses; bank reconciliation deferred; outside-sale cash movements logged; Manager balance visibility under independent permission. Open: large-expense amount thresholds, cross-Business transfers, account-level permissions and transfer reconciliation. [Treasury Core](../03-modules/TREASURY-CORE-SPEC.md).


## HR and Commission Engine — 2026-10-29

Founder approved per-employee flexible pay, configurable execution commission/target rules, different opening commission by service and user (supersedes universal 10% rate, preserves after-discount pre-tax basis), separate per-Branch targets, daily accrual/monthly close, advance offset, early payouts treated as advances, Business-configured negative balances, auditable historical adjustments and Owner/permissioned Manager payroll approvals. Open: rate precedence, lawful advance deductions, rounding, bonus targets, Branch assignment, payroll post-close refund adjustments. Cash-shortage deduction still requires separate approval. [HR Commission](../03-modules/HR-COMMISSION-ENGINE.md) · [Employee Ledger](../03-modules/EMPLOYEE-LEDGER.md).
