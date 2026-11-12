# Demo-S1 — First working Salon walkthrough (2026-11-12)

**Status:** GitHub review PR; standalone PUBLIC **synthetic** Web demonstration. **Not** real Booking/POS, not a sale, not a customer/onboarding environment. Founder requested skipping noncritical release work to view a working UI immediately.

## Architectural impact before implementation

- Adds `/demo/salon` to the Next Web app as an **isolated browser-only presentation/sandbox**, linked from the current public engineering landing page.
- Uses hardcoded synthetic Salon fixtures via `apps/web/src/app/demo/salon/demo-model.ts` only. **No calls to K5/Auth, Catalog, Customers, Booking, POS, Accounting, SQL, API routes, Cashier, browser storage or provider services**. It cannot read or write any real Tenant, Business, Branch, client, payment or appointment.
- The standalone route is purposely **public and independent of K5**: no auth is opened and no public role/permission is created. Existing private `/sign-in`, `/workspaces` and real workspace routes stay default-OFF as before.
- Explicit non-production labeling in header + UI: only fabricated names, no editable free-text customer PII, no real booking, invoice, tax, tender, posting or persisted sale. `robots.index=false` on this demo route.
- Shared Core remains shared; this is a Salon-specific **demonstration of UX**, not a bypass to a real Salon Extension or an alternative business backend.

## First working user journey

1. Open the public DRVO homepage and click **جرّب Demo الصالون الآن**.
2. On the dashboard, inspect synthetic appointments, status counts and a calculated value of completed services (not cash collected).
3. Open **المواعيد**; select a seeded synthetic customer, service, staff member and hour; book. Attempt the same staff/hour again to see conflict rejection; complete or cancel an appointment.
4. Use **أضف للبيع** to put an appointment service into the demo POS cart, or choose any catalog service directly.
5. On **نقطة البيع**, add and remove services, check integer-price subtotal and save one or more `DRAFT` records **inside React memory only**. Reloading or clicking `إعادة ضبط الديمو` removes changes. There is **no checkout/payment**.
6. Existing K5 protected pages must remain inaccessible while private flags are OFF.

## Implementation files

- `apps/web/src/app/demo/salon/page.tsx`, `salon-demo-client.tsx`, `demo-model.ts`, `salon-demo.css`.
- Public landing `apps/web/src/app/page.tsx` CTA and `globals.css` CTA styling.
- `apps/web/test/salon-demo.test.cjs` immutable seed, booking double-slot denial, appointment transitions, cart arithmetic, no API/browser-storage access and reset checks.
- `.github/workflows/interactive-salon-demo-ci.yml` builds Next, runs unit tests, HTTP GET smoke of homepage and `/demo/salon`, rejects protected K5 pages with 404.

## Release, smoke and limits

Require K0 + K1 and the dedicated demo CI on the exact PR head, security review that no real data or auth surface is exposed, then merge. The existing `DRVO ERP — Staging Deploy` workflow only deploys automatically if the operator set `DRVO_STAGE_AUTO_DEPLOY=true`; otherwise an operator must manually dispatch the existing authorized workflow on `main`. A successful build or artifact check is not evidence the deployed URL updated.

Intended route after independently verified code deploy: `https://erp-stage.drvotech.com/demo/salon`. Do **not** claim it works publicly until HTTP verified against the exact deployed code. If deploy is disabled, GitHub review PR + CI remain deliverables, with explicit operator action required.

**Open gates unchanged:** K5F operational security; SQL 010–014 unapplied/unapproved on VPS; ADR-031 first-journal and ADR-032 commercial activation still PROPOSED. No actual salon onboarding or real invoice/payment.
