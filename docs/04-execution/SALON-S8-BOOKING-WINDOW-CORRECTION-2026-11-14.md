# Salon S8-A — safe two-step Resource availability correction

**Architecture impact:** Private Shared Booking UI only, on existing scoped SQL016/017 close and create endpoints. No new APIs, permissions, SQL migrations, Salon domain, HR shifts or Cashier reuse.

Select an already visible OPEN Resource window, prefill its local dates, and edit the future proposed range. Explicitly close the old window first; after the existing authorized scoped GET returns CLOSED, separately publish the replacement. The selected Resource cannot change mid-correction. Missing/unknown resource or window in the capped 300 results fails closed and requires refresh/cancel. Old close request and new create request preserve separate existing UUID idempotency keys.

**Non-atomic guarantee:** closure and creation are independent SQL transactions. If closing succeeds but creating fails, the old window REMAINS CLOSED, and the resource has a temporarily unavailable gap; there is no automatic rollback, restoration or invoice. SQL017 refuses closure while any future/ongoing BOOKED appointment depends on the window (409). New window overlap/coverage remains SQL-owned. LAST CLOSED does NOT make the resource unrestricted. The browser's last-200 Booking rows never grant authorization.

Pure Node tests of window-stage progression/local time plus static fail-closed UI assertions run in K5C with Next build/typecheck and route 404 negatives; K0/K1 and Booking SQL CI remain required. No Public Auth, VPS SQL 010–017, real pilot, K5F/offhost restore, ADR-032 entitlement or ADR-031 posting authorization.
