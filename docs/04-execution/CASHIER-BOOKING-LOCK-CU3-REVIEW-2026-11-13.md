# Cashier CU-3 — Booking transaction lock source comparison

**Status:** exact pinned-source review fixture + pure tests; **no runtime port**, no Cashier SQL/data access, no public module activation.

## Source truth and architectural impact

Read [Cashier pinned commit](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/lib/booking/publicBookingCreateLocks.ts), Git blob **e204c261e8ea6d748cb65f66a825d2b4b8bfc0f8**. Exact TS source snapshot under `tests/fixtures/cashier/publicBookingCreateLocks.ts`; node tests verify its Git blob hash (immutable provenance). Snapshot has no runtime import from DRVO apps.

Cashier uses transaction-owned `sp_getapplock`, 8-second default timeout, numeric `EmpID` / Branch IDs, compact service-set FNV hash, and **truncates resource strings to 255 characters**, which can collapse distinct long keys. It uses global employee lock strings for cross-branch employee intervals, **without DRVO Tenant/Business/Branch scope in those names**. We test those legacy behaviors, but must **not** treat numeric EmpID as authority, copy Cashier SQL connection helpers or port truncation.

DRVO already has SQL 013 resource row `UPDLOCK,HOLDLOCK` with composite Tenant/Business/Branch/Resource key and adjacent/overlap + 2 concurrent HTTP 200/409 negative proof. **Keep this proven existing mechanism.** No reason to swap it for a more general legacy app-lock abstraction. If future shared employee resource scheduling *across branches* or any-barber dynamic assignments are approved, design a new independently scoped contract and test all branch timezone, HR identity, fair scheduling, lock-key collisions, timing and cancellation before choosing a new lock.

## Tests and boundaries

- `tests/cashier-booking-lock-review.test.cjs` in root K0 CI reads exact pinned TS fixture, transpiles in VM with stubbed DB import; invokes only pure key/hash functions. Explicitly tests global-key shape, sorting and 255-character collision, then statically checks DRVO 013 composite FKs/row locks and presence of **separate disposable SQL HTTP** concurrency proof.
- Legacy key/hash tests are characterization only. This test does NOT execute original Cashier database locking or certify real Cashier/DRVO booking parity. Existing Shared Booking SQL API HTTP CI provides actual DRVO transactional tests.
- No Cashier/DRVO production writes, no SQL migrations, public auth, runtime code changes, private flags, employee scheduling implementation or Salon Extension shipped.

## Decision

**Reuse the learned conflict/idempotency cases, not the numeric ID and lock resource implementation.** For the current single resource per appointment, DRVO's scoped SQL row locks are the correct already-implemented baseline. New HR cross-branch assignments require separate architecture approval and SQL race proof.
