# Salon S9-B — faithful duration-based synthetic demo scheduling

**Architecture impact before implementation:** only the isolated public fake-data salon Demo model/UI; **not** Shared Booking or SQL. Reuses existing demo fixtures and adds a 30-minute time grid for a fixed synthetic 10:00–19:00 day. An appointment occupies the full half-open interval [start, start+service.duration). A same-Barber interval overlap blocks booking even with different starts; adjacent [10:30,11:00) and [11:00,11:30) are independent. Existing COMPLETED bookings still occupy their past slots; CANCELLED bookings release them. Starting a 60-minute service at 18:30 is prohibited because it finishes after synthetic closing time. These are educational local semantics, not promised real availability.

The select disables occupied times using already-present local fixture state and chosen Barber/service, automatically changes to a valid candidate when the other fields change, and disables Submit if the chosen slot is stale. The model revalidates at booking (not only the UI). Guided three-step tour retains its valid 18:00 30-minute cut. New tests prove shorter overlapping longer appointments, adjacency, cancelled reuse, close bound, and public no-fetch/no-session/no-API boundaries.

**Not duplicated backend logic:** real Shared Booking always uses its independent domain-owned SQL013/016/017 validation, Resource locks, scoped K5 grants and Origin; the demo is intentionally isolated and resets. No SQL migration, authentication, POS POSTED, business flags, real customer onboarding or live browser claims.

K0/K1, Interactive Salon Demo CI (Next build/typecheck and private default-404 assertions), plus Staging Artifact CI are required. VPS SQL 010–017, K5F/offhost restore, ADR-031/032 remain blocked.
