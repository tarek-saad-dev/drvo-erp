# Offline POS — Founder Discovery Round 1
**Date:** 2026-10-28. **Status:** partial answers and proposed scope change; engineering plan NOT approved.

## Responses
1. Offline allowed activity — unanswered in multiple-choice; free-text founder request: **sell services AND products with ALL payment methods during disconnection**. This **conflicts with earlier approved cash-only offline scope**. Mark this the latest desired scope, **pending payment-method feasibility/security categorization**, not a guarantee electronic settlement is possible without network.
2. Device storage: **independent durable queue for each POS device** — approved.
3. Offline login: **previously authenticated employees may sign in using local verification** — approved intent; exact credential, expiry and revocation rules pending.
4. Before sync: **offline sale can be corrected/cancelled according to distinct permissions** — approved.
5. Closing shift with pending sales — undecided.
6. Cash physical count including unsynced local sales — undecided.
7. Late sync after shift close — undecided.
8. Duplicate submission — undecided by founder; idempotency is a necessary integrity mechanism, not represented as an approved UX choice.
9. Partial sync failure — undecided.
10. Financial day closed with pending offline — undecided.
11. Manager device/pending-sales view — undecided.
12. Lost unsynced local data — undecided.

## Essential payment-method distinction
- Cash may be recorded as locally received.
- Card transactions with an independent standalone terminal may be **externally confirmed** by that terminal, but DRVO cannot infer payment authorization without trusted reference or later reconciliation; mark unverified as pending.
- In-app payment gateway, wallet, online QR, instant transfer or provider-dependent payment CANNOT be called successful without actual provider authorization/confirmation. Store pending tender intent and do not fabricate success. Some specialized terminals may support certified offline authorization under provider contracts, not assumed.
- Customer credit during network outage cannot safely enforce a global credit limit across devices; requires offline reservation/limit strategy or remains disabled. “All methods” is a product request, not blanket payment guarantee.
- No storage of card PAN, CVC, sensitive authentication data in local queue.
- Founder confirmation needed on whether a sale with pending electronic settlement is a posted invoice, a pending order, or only finalized when payment confirmed.

## Open conflicts
Previously confirmed: cash-only offline, open-shift guard, immutable paid invoices, hard credit-limit enforcement, global dedupe, no duplicate receipts, source sale date and late accounting adjustment. Scope change must preserve these protections or explicitly revise via new decision. See [POS State Machine](POS-STATE-MACHINE.md).

No implementation has occurred.

## Follow-up answers — 2026-10-28

1. Electronic payments offline — **unanswered; leave open**.
2. Unsynced sales at shift close — **approved: provisional close then final reconciliation**.
3. Cash physical count — **approved: include all actually received cash, including offline unsynced sales**.
4. Failed offline sync — **approved: automatic retries, then Manager-visible errors**.

These decisions supersede the undecided entries for shift close, cash count and sync failure above. Remaining electronic tender behavior is not settled.
