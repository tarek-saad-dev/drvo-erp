# Shared POS Core — persisted DRAFT-only V0

> **2026-11-13 S4 PRIVATE POS UX FAST PATH MERGED:** PR #81 adds quick active Catalog Offering selection and explicitly preparing a **NEW** cart from an immutable saved DRAFT, requiring currently active authorized Offering references, new UUID and fresh SQL re-price at new DRAFT creation. Existing saved drafts never edited. No sale POSTED, payment, tax, GL or public activation. K5C/Next build and existing POS SQL CI passed. [S4](../04-execution/SALON-S4-PARALLEL-DELIVERY-2026-11-13.md).


> **2026-11-13 S2 CROSS-MODULE PROOF:** PR #74 exercised existing POS DRAFT SQL 014 after a real Customers→Catalog→Booking API journey with the same authenticated Branch scope. POST DRAFT persists/replays through real Nest SQL HTTP, exact Catalog list-price snapshots and separate `pos.draft.read/manage` revocation checks; still DRAFT only, no posted sale, invoice, tax, payment or GL. Public Salon Demo remains fake. SQL 010–014 not VPS-authorized, K5F/ADR-031/032 OPEN. [Handoff](../04-execution/SALON-S2-INTEGRATED-HANDOFF-2026-11-13.md).


**Status (2026-11-12): code merged in main via PR #64; SQL 014 remains CI-only and NOT authorized on VPS. Not customer activated and not Sale/Accounting.** This is the first **durable, nonposting** POS document slice, following [PL-1 preview](POS-PREVIEW-CORE-V0.md). ADR-031 First-GL and ADR-032 paid module activation remain PROPOSED.

## Ownership and data

- **POS** owns `core.PosDraft` / `core.PosDraftLine` SQL tables with composite `(TenantId,BusinessId,BranchId,DraftId)` scoped keys and Branch FK. Table prefix identifies POS bounded-context ownership inside initial shared SQL `core` schema; no universal Kernel ownership is implied.
- Each draft has status `DRAFT` only, version 1 (reserved for future versioning), creator Account, CreatedAtUtc, stable RequestId and SHA256 payload hash, currency and immutable subtotal.
- Lines own an **at-creation snapshot** of Catalog Offering ID, kind, name and integer list price, quantity, line subtotal. SQL checks that the offering is active, same Tenant+Business, allows 2-decimal EGP/SAR/AED/USD only, rejects mixed currency, duplicates, totals over max. Catalog remains authoritative for current list prices; the POS snapshot cannot mutate Catalog, and is NOT an authoritative invoice tax/discount/payment total.
- No Customer/HR attribution, shift, taxable invoice, cash tender, settled payment, accounting GL, inventory, commission, receipt, refund, price lock, Draft edit/delete or posting transition. There is no endpoint nor SQL procedure for POSTED.
- Immutable created draft is readable by authorized Branch members, max latest 50. To change contents a user must create **a separate new draft**; safe update/version CAS is a future independent slice, not falsely claimed.

## API and permissions

- `GET /api/workspaces/:businessId/branches/:branchId/pos-drafts` requires live K5 session, Branch assignment/active membership, `pos.draft.read`, both K5 + Catalog + POS Draft API flags; returns scoped saved snapshots, no-store.
- `POST` same path accepts exact `{lines:[{offeringId,quantity}]}` plus UUID `Idempotency-Key` and exact allowed HTTPS Origin, checks `pos.draft.manage` **and** `catalog.read` in the **same SERIALIZABLE SQL transaction** after confirming current session/branch. The API validates IDs and quantities; SQL revalidates K5 permissions and computes prices from active owned Catalog rows. No client-priced money may pass to SQL.
- A reissued identical key+canonical payload returns the existing Draft ID; same key with changed payload/account returns conflict. Concurrent replay serializes by unique scope+request key and lock. Server uses exclusively parameterized stored procedures; ordinary app SQL principal cannot SELECT or UPDATE POS draft tables directly and cannot execute internal assert proc.
- API feature flag: `DRVO_POS_DRAFTS_ENABLED=YES` (default OFF); Web save/list UI additionally requires `DRVO_POS_DRAFTS_WEB_ENABLED=YES` (default OFF), with existing K5/Catalog/POS Preview Web gates. **No flags are enabled by this PR.** Actual role grants, commercial entitlements, published modules and customer onboarding are NOT performed by adding action strings to a conditional SQL permission lookup.

## Safety & correctness

- Stored procedure enforces strict scoped composite FKs, active Customer-independent offering reference, immutable draft state and integer minor-unit math in one transaction. No unscoped joins, runtime table grants or client-supplied TenantId.
- App UI can show a save/list option only after authorized GET of `pos-drafts`; this is not authorization to save, since the separate `pos.draft.manage` action is checked by SQL at command time. Retain the same UUID retry key across ambiguous network retry for same cart.
- SQL 014 is **source/CI-only**, **never apply it to VPS** until K5F migration checker compatibility, backup/restore, security review and explicit operator approval. SQL 010–013 remain similarly unapproved. No Cashier production access.

## Acceptance

`tests/pos-drafts.test.cjs`, private Next Web build and [POS Draft SQL HTTP CI](../04-execution/POS-DURABLE-DRAFTS-EXECUTION-2026-11-12.md) must pass on exact HEAD; test migration apply/replay, restricted SQL principal, live HTTP read/create/idempotency/conflict/concurrency, cross-Tenant/Business/Branch and account/role/session revocation. Synthetic test role grants are strictly in disposable SQL, not a customer bootstrap. Passing CI is not an operational K5 sign-off.

**Future:** independent Draft edit/version CAS, ADR-031 adoption, actual sale posting/GL, Treasury/HR/Inventory contracts, ADR-032 commercial activation, staged Cut Salon multi-branch pilot.
