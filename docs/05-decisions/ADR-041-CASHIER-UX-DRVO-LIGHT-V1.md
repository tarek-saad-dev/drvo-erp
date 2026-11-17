# ADR-041 — Cashier operator UX, DRVO Light V1 visual system

> **2026-11-17 FOUNDER UX V1.1 FEEDBACK IMPLEMENTED (source):** Founder reviewed public Salon screenshot and explicitly rejected the large Guided Tour, wanted a denser operational viewport and demanded Cashier's real POS capability audit before continuing. [Source-backed POS audit, delivery and truth boundaries](../04-execution/CASHIER-POS-UX-DENSITY-AND-FUNCTION-PARITY-REVIEW-2026-11-17.md). New public synthetic Light CSS reduces sidebar/header/cards/gaps without CSS `zoom` or scaling; Guided Tour component, logic and dead CSS removed. Added real **synthetic interaction** for service/package/product search and selection, demo customer/Barber, +/- qty, fixed/% discount, NOT_COLLECTED split preview, draft notes/history and keyboard shortcuts. **No real Auth, SQL, POS payment, inventory deduction, Treasury/Accounting posting or declared Cashier parity**. Light-only remains the accepted design; Stage browser/new SHA acceptance must be verified independently. Test/source changes are not new authorization to activate finance.

**Date:** 2026-11-15  
**Status:** **FOUNDER-ACCEPTED UX DIRECTION; first Light V1 CSS/launcher slice committed, full UX parity and live deployment NOT VERIFIED.**

## Founder direction
Use the **actual Cashier operator experience** as DRVO's first operational UX reference; apply the **DRVO ERP corporate Brand Kit** image supplied on 2026-11-15 to the **product's UI**, starting with **Light Theme ONLY**. This is not a demand to copy Cashier's old data ownership, authentication, physical SQL or industry coupling. Defer Dark Mode and Theme Settings UI.

## Grounded source comparison
- Legacy Cashier source: `tarek-saad-dev/casher` `src/components/layout/{AuthLayout,AuthenticatedAppShell,MainNav,nav-config}.tsx`, `src/app/layout.tsx`, `src/app/globals.css`.
- Cashier operator UX: RTL-first navigation grouped into **daily operations, booking/queue, review, reporting, treasury/finance, HR/admin**, a scoped branch/tenant context, responsive sidebar/mobile navigation, and focused POS/Operations workspaces. It uses role-aware navigation and operational status; do not claim that DRVO implements every legacy route.
- DRVO prior UI: private `apps/web/src/app/workspace/[businessId]/[branchId]/workspace-home-client.tsx` included K5 permission checked links; public `/demo/salon` already included a real interactive synthetic Sidebar + Dashboard + Booking + POS, but was Dark; many private pages inherited dark colors.
- Visual anchor: founder-uploaded **DRVO ERP Social Media Brand Kit V1** reference. Brand role tokens are validated against **ADR-024**: Plum `#74536E`, Deep Plum `#553E53`, Teal `#1A7B80`, Canvas `#F7F6F8`, white panels, dark text `#27242B`. **Brand marketing graphics are reference material, not business records or customer dashboard widgets.**

## Product/architecture decision
1. **Light-only V1.** White surfaces, soft neutral background, Plum navigation/headings, Teal primary actions, Arabic-first RTL. No toggle or auto dark preference until a separate reviewed product slice. Preserve honest red/amber/green financial/sync status semantics.
2. **Cashier work rhythm, not copied architecture.** Enable fast click paths to daily actions, compact cards/tables/forms, clear branch identity, app navigation grouped by workflows, keyboard-friendly POS, and booking context. Implement inside the DRVO shared UI kit and ADR-023 Hybrid Shell (sidebar on admin, focused POS/booking on operational tasks).
3. **Single brand/token layer** for public and authenticated UI, with an ADR-026-compatible future per-Business theme seam. Business-specific theme publishing and custom fonts are **not implemented** in this slice. The Web brand mark is **byte-for-byte copied from the founder-approved repository SVG** `assets/brand/approved/drvo-symbol-primary.svg` (ADR-038); original Brand Kit raster remains the optical reference for final review.
4. **Module navigation remains authorized.** The private Branch app launcher only renders routes supported by the existing K5 gate + actual API access checks. No fake Modules, money KPIs, account balances, employee data or uncontrolled navigation by copying `nav-config` verbatim from Cashier.
5. **Keep existing private flags and SQL untouched.** No Public Auth, real Pilot grant, SQL migration, financial posting or permission bypass to make Light UI accessible. Public `/demo/salon` remains synthetic, in-memory and open by prior policy.
6. **Light theme is a view-layer change.** Business owner APIs, cross-Tenant/Business/Branch boundaries, idempotency, Cashier-to-DRVO functional parity roadmap and multi-sector extensibility remain unchanged.

## First delivered implementation (CODED, tests/workflow verification pending)
- `apps/web/src/app/drvo-light.css`: central Light V1 palette/font fallback and shared public/private presentation overrides.
- `apps/web/src/app/layout.tsx`: loads Light layer after legacy stylesheet.
- `apps/web/src/app/demo/salon/salon-demo-light.css` and `page.tsx`: Light-first Cashier-like interactive Salon Dashboard/Booking/POS without replacing demo data model.
- `apps/web/src/app/workspace/[businessId]/[branchId]/workspace-home-client.tsx`: K5-scoped application launcher card layout; existing permission checks kept intact.
- `apps/web/public/brand/drvo-mark.svg`: exact copy of the approved ADR-038 `assets/brand/approved/drvo-symbol-primary.svg` source (manually traced/vector rendition of the visual reference).
- `apps/web/test/drvo-light-ui.test.cjs`, `.github/workflows/interactive-salon-demo-ci.yml`: source contract regression for Light tokens/imports, public demo and authorized launcher.
- No new Node dependencies, SQL, API commands, authentication flags or real customer data.

## Acceptance checkpoints (NOT yet closed)
- Exact source-commit CI: Next build/typecheck, original interactive Salon tests, Light contract tests, private K5 default 404 regression. Public Salon root now declares `data-drvo-ui="light-v1"`; external stage smoke checks that HTML marker and the official logo resource after a successful deploy. **A smoke PASS still is not a production DB/security/release.sha attestation.**
- Actual external HTTPS `https://erp-stage.drvotech.com/demo/salon` displays **Light V1**, with browser screenshot review for desktop/mobile, RTL readability, focus, statuses, forms, Booking/POS interactions.
- Independent exact release SHA and externally visible UI/HTTP evidence. GitHub code changes/CI success alone cannot prove deployment.
- Private HR/Reports/Booking/POS module visual and workflow parity against actual Cashier pages as modules become live and safe; no claim of full legacy UX parity yet.
- The initial Web SVG has been verified identical to the approved ADR-038 repo asset; final visual/optical review against the founder's raster is still open.

**Related:** ADR-023, ADR-024, ADR-025, ADR-026, ADR-038, ADR-039, ADR-040; [live release loop](../04-execution/USER-VISIBLE-RELEASE-LOOP-2026-11-15.md). First external Salon P1–P7 and commercial C1–C3 unchanged.
