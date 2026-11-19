# Cashier source reuse (read-only)

Pinned Cashier revision: `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`.

Do not edit these excerpts to invent DRVO behavior. Adapt through Nest/SQL module owners and characterization tests.

- `queue/queueLifecycleEngine.ts` — Cashier effective-status contract reused for Salon Queue.
- Additional Booking/Queue contracts may also live under `tests/fixtures/cashier/`.
