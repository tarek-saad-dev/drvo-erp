# S6-C — Salon daily roster resource and lifecycle filters

**Scope:** Salon Industry Solution private read-only Web screen, not a new Core API or SQL.

## Architecture impact

Reuse only already authorized K5 Tenant/Business/Branch Booking GET and existing Customer/Catalog/POS read gates. Add client-side resource and BOOKED/COMPLETED/CANCELLED selectors to the pre-existing TODAY/UPCOMING/ALL filters. Options are derived exclusively from the Booking rows already returned to the user; no new request, staff HR identity assertion, customer export, revenue statistic, privileged role or extra tenant scope. Date remains device-local; the source API caps the list at last 200, so counts are explicitly partial. Existing Completed → POS link continues only with independent POS Preview and Draft authorization (S5-B).

Test that no request writes data and filters cannot grow the authorization surface. Root K0/K1, K5C Next build/typecheck, Interactive Salon Demo CI (public mock 200 / private 404) and normal Shared SQL CI are expected. No VPS flags/migration, ADR-031/032/K5F remain open.
