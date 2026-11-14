# Private Web UUID contract — scope validation regression

**2026-11-14 · test-only; does not authorize access.**

S12 real Browser+disposable SQL found that the POS Preview component contained a 6-group UUID regex, rejecting otherwise authorized `businessId` / `branchId` *before* K5 could enforce access. The product POS bug and its dedicated positive/negative test are handled by separate [PR #133](https://github.com/tarek-saad-dev/drvo-erp/pull/133). This independent PR protects the other **five healthy private scope clients** (Workspace, Catalog, Customers, Booking, Salon Overview) so the same error cannot silently reappear in unrelated pages.

Each regression extracts the literal GUID matcher from its real component and verifies exact five-group 8-4-4-4-12 lower/upper SQL hex-case acceptance, rejection of added groups, missing separators, wrong characters, extra prefix/suffix, and that both Business and Branch are validated. K5C CI executes the test. This is a client-side input guard only; Tenant/Business/Branch authorization and SQL predicates remain authoritative under ADR-030. Separate modular Catalog/Customers/Booking/POS ownership and ADR-037 remain intact; ADR-032 limited baseline is not expanded.

No runtime code, SQL migration, root checker, production flag, Public Auth, grant, contact record or financial POSTED is changed. Rollback: revert test + K5C CI wiring. Tests cannot close P1–P7/C1–C3 in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106). After [#133](https://github.com/tarek-saad-dev/drvo-erp/pull/133) merges, its POS-specific test remains the sixth independently enforced component.
