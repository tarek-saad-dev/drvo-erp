# MVP Discovery — Round 2 (Founder Answers)

**Date:** 2026-10-28
**Status:** Founder requested requirements captured. Delivery commitment and technical feasibility **not yet approved**.

## Answers (verbatim meaning)

| # | Requirement / choice |
|---|---|
| 1 | First MVP should be comprehensive enough to replace Cashier at Cut Salon |
| 2 | Target first testable version in **one month** |
| 3 | Cut Salon as an actual tenant from day one |
| 4 | Multiple businesses AND branches must function in the MVP |
| 5 | Full subscription plans and online payments in MVP |
| 6 | POS: products/services, payments, receipts/session, plus refunds, advanced discounts and credit sales |
| 7 | Booking in MVP, **Queue deferred** |
| 8 | All current Cashier HR functionality |
| 9 | Inventory, purchases, suppliers and stocktaking |
| 10 | Full accounting with journals, ledgers and balances |
| 11 | Separate user experiences for owner, manager and cashier |
| 12 | Public booking website integrated with ERP |
| 13 | All interfaces responsive |
| 14 | Arabic first (English timing not confirmed) |
| 15 | Device receipt printing may be delayed |
| 16 | Pilot runs alongside old Cashier, not immediate replacement |
| 17 | Data migration decision after assessment |
| 18 | Double booking and operational errors are the principal no-go criterion |
| 19 | Offline POS mandatory from first MVP |
| 20 | Selling the first subscription to an external salon is the primary declared success metric |

## Explicit contradictions / tension — must resolve before implementation baseline

- **Replacement-quality scope vs one-month target:** comprehensive accounting + offline + full HR + inventory + bookings + billing is unverified and high-risk for a small team.
- **Full replacement vs queue/printing deferral:** separate limited pilot acceptance from eventual Cashier parity.
- **Parallel running vs operational consistency:** define authoritative systems for bookings, sales, ledger, inventory, staff and customers; prevent duplicate writes and accounting.
- **Offline sales vs multi-branch inventory/finance:** define identifiers, local storage, sync, conflict resolution, payment acceptance and legal receipt policy.
- **Commercial sale vs pilot success:** external subscription requires production-grade tenant isolation, billing, support and security. Split pilot and commercial launch gates.
- **Medical clinics second vertical** still requires its own discovery and regulatory data controls; do not overload salon MVP.

## Status semantics

**Requested / confirmed as founder preference** does not mean **feasible in one month**, or that the timeline is accepted. Do not downgrade or silently omit requested features. Keep unresolved delivery decisions open.

## Follow-up topics

1. Team size, experience, availability and budget; month deadline strict or target?
2. Define minimum pilot vs full-replacement vs commercially sellable release.
3. Offline operations and synchronization contract.
4. Parallel Cashier/DRVO data ownership and migration.
5. Whether full GL accounting and full SaaS self-service billing are launch blockers.
6. First pilot branch, user roles, and business/branch configuration.
7. Cashier HR parity checklist and public booking API transition.
8. Exact success and no-go criteria, especially concurrent bookings and data reconciliation.

[Vision](VISION.md) · [Open questions](../04-execution/OPEN-QUESTIONS.md).
