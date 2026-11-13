# S4C — First Private Salon Operating Overview (review-only)

**Scope:** Private read-only Salon composition route `/workspace/:businessId/:branchId/salon`, visible only after existing authenticated/authorized Branch homepage and independent Booking/Customers/Catalog permissions. Not a new Salon Backend or a financial dashboard.

## Architecture impact before change

Use Shared Booking/Catalog/Customers bounded owners via existing no-store same-origin APIs and K5 session. Branch homepage only displays the Salon entry when all applicable Web flags plus separately authorized Booking/Customer/Catalog GETs succeed. Overview rechecks current `/api/auth/me`, `/api/auth/workspaces`, and exact Business/Branch details; foreign/missing Branch fails closed. It separately reads POS Draft count **only if** Web POS flags and POS `GET` allow it. Counts are limited by existing list caps; never infer actual revenue, complete books, drawer balance, customer-ready release or tax.

This is a presentation-only **Salon Industry Solution** over reusable Shared Core, fully consistent with ADR-017/030 and modular-monolith boundaries. No account permission grant, Cashier copy, SQL migration, new independent core or paid module toggle. The public `/demo/salon` is unchanged and synthetic.

## Validation

Next typecheck/build, static authorization test and HTTP 404 assertion on private route with K5 flags OFF plus unchanged public synthetic Demo 200. Existing API SQL HTTP tests remain independent. No VPS DB activation; ADR-031/032 and K5F remain open.
