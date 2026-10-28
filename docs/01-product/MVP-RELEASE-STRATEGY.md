# DRVO ERP — MVP Discovery, Release Strategy Decision

**Date:** 2026-10-28
**Status:** Founder choices approved; implementation and release acceptance criteria pending
**Source:** Eight clarification answers following 20-question MVP discovery.

## Approved decisions

| ID | Decision |
|---|---|
| R2-01 | Developer is founder + Cursor/AI, not a staffed engineering team. |
| R2-02 | One month is a flexible aspirational milestone; quality takes priority. |
| R2-03 | One comprehensive commercial V1, not three staged commercial releases. Development, internal testing and all-branch pilot/validation remain prerequisites, not separate public editions. |
| R2-04 | Offline POS scope: **cash sales only**, queued locally and synchronized later; exact safety rules unresolved. |
| R2-05 | DRVO becomes the authoritative source for bookings during coexistence with Cashier. Synchronization/integration and cutover are not yet designed. |
| R2-06 | Full accounting, including journals, ledgers and balances, is a V1 acceptance requirement. |
| R2-07 | Manual subscription collection first; payment gateway integration later. This supersedes the previous requirement for full online subscription payments in the first MVP. Subscription plans, entitlement enforcement and manual payment reconciliation still require specifications. |
| R2-08 | Initial real-world validation must cover **all Cut Salon branches**, with legacy Cashier retained during coexistence. |

## Founder V1 desired scope retained from earlier answers

Multi-tenant/multi-business/multi-branch; POS incl. refunds, advanced discounts and credit sales; booking and public booking website; all existing Cashier HR functions; inventory, purchases, suppliers and stocktaking; full accounting; owner/manager/cashier experiences; Arabic-first responsive PWA; initial cash-only offline sales; subscription plans with manual collection; Salon first.

Queue and device printing can be deferred, but operational fallback / Cashier replacement parity needs explicit criteria. Data migration awaits analysis.

## Definition of the release

One comprehensive **commercial V1** after development and internal/all-branch operational validation. These are quality gates, not separately marketed versions. Avoid calling the founder's entire scope realistically deliverable in one month without estimates. No code implementation or production launch verified.

## Operational non-negotiables to specify

1. **Booking ownership:** DRVO is authoritative; prohibit independent booking write paths in Cashier; define integration, redirects, failure handling, rollback and double-booking concurrency tests.
2. **Offline cash-only:** define safe offline local ID allocation, secure durable local storage, max offline limits, unique sync keys, idempotent replay, server validation, inventory/accounting posting after accepted synchronization and unresolved conflicts. Never treat unsynced sales as centrally posted accounting entries.
3. **Accounting:** define chart of accounts, balanced journals, ledger posting, adjustments/voids, closing and audit trails, currency, taxes and cutover.
4. **All-branch trial:** map branches and rollout strategy, source-of-truth per entity, reconciliation and emergency stop/rollback.
5. **Subscription collection:** manual payments and invoices, administrative verification, plan activation/expiration, audit and entitlements; payment gateway later.
6. **Acceptance evidence:** measured performance, tenant leakage tests, concurrent bookings, financial reconciliation, offline sync recovery, access controls and end-to-end tests.

## MVP discovery closure clarifications — 2026-10-28

- **Public booking integration:** retain the existing Cut Salon website and connect it to the new DRVO Booking API. The exact migration, fallback and integration contracts are pending.
- **Offline stock shortage:** accept offline **cash** sales even if the eventual server-side reconciliation finds insufficient inventory across branches; record an explicit stock shortage/exception for review after synchronization. Do not silently discard or duplicate sales. Policy for negative stock, costing, reconciliation and escalation is pending; this is not a promise of immediate authoritative stock balances while offline.
- **Accounting manual journals:** no decision yet whether to permit manual journal entry alongside automatic posting. Complete a detailed Accounting Module design first. Full GL/journals/ledgers/balances remains a V1 requirement.
- **Single commercial release:** internal testing throughout development is allowed, but commercial sale/launch happens once after comprehensive V1 acceptance. Internal testing is not a separate public release.

## Unresolved

See [Open Questions](../04-execution/OPEN-QUESTIONS.md); detailed module specs, feasibility estimate and full release gates are not yet approved.
