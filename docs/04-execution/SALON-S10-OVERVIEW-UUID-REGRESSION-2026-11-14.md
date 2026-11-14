# Salon S10 — private Overview UUID and default-OFF Web regression

**2026-11-14 | GitHub PR/CI only; not a live-browser Pilot.**

## Found actual product defect

`apps/web/src/app/workspace/[businessId]/[branchId]/salon/salon-overview-client.tsx` used a GUID regex with only **four** segments (`8-4-4-12`), not the standard UUID shape (`8-4-4-4-12`). Correct scoped Business/Branch UUIDs were rejected at the client gate before `/api/auth/me`, `/auth/workspaces`, and module reads, displaying the denied experience even if K5 was otherwise authorized. Valid Offering IDs used for independent POS preview were likewise rejected.

## Fix and regression

- Fix local `GUID` validator to complete five-segment UUID with case-insensitive matching.
- Add Node test exercising real UUID strings, uppercase form, short, malformed, path-like and suffixed IDs. Confirm that **both** Business/Branch validation and Offering preview guard continue using the strict ID check.
- Extend existing [K5C private UI CI](../../.github/workflows/k5c-private-ui-ci.yml) HTTP smoke with the private `/salon` route, which must stay **404 when K5 and module Web flags are OFF**. Preserve independent server-side K5, Booking, Customers and Catalog page gates.

## Architecture and operation

No new API/SQL/migration/K5 role/entitlement/industry-specific data owner, no Finance posting and no Public Auth. The fix is a *client-side validation correction*, not a bypass: server K5 session, exact Tenant/Business/Branch membership, module-specific SQL and runtime flags remain authoritative under ADR-030, ADR-032 and ADR-037.

Even if all disposable CI checks pass, actual P6 browser acceptance after P1–P5 real signoffs has **not** occurred; [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) remains NO-GO. Rollback: revert client/test/CI/docs; no data migration required.
