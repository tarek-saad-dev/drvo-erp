# Salon S8-B — first-visit guided synthetic demo

The existing public Next.js /demo/salon has a three-step walkthrough for a salon prospect: confirm a NEW synthetic appointment for 18:00, complete exactly that appointment, then explicitly save an in-memory POS DRAFT. The guide resets only the demo memory and presents status/progress while moving between the existing Booking/POS tabs; no paid sale, invoice or external customer relationship is simulated as real.

**Architecture impact:** presentation-only inside the already isolated fake data demo. No real K5 session, SQL, Catalog/Customers/Booking/POS APIs, local/session storage, cookie, tracking endpoint, contact form, lead submission, user activation or new authentication. The demo's no-index metadata and strict private-route 404 checks remain unchanged. Responsive styles plus an existing real pure synthetic model (not a second business implementation).

**Test evidence:** static no-network/no-storage checks and full synthetic book→complete→save-DRAFT business rule roundtrip in the existing demo Node CI, Next build/typecheck, HTTP 200 public route + private 404 negatives, plus K0/K1. A public demo is NOT a private pilot or production readiness.

**Operator hold:** K5F/offsite restore incomplete, VPS SQL 010–017 held, ADR-032 paid activation and ADR-031 POSTED still unapproved.
