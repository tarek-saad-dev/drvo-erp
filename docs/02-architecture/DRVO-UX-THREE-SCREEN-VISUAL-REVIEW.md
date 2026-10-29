# DRVO ERP — Three-Screen Visual Concept Review

**Date:** 2026-10-29
**Status:** PREVIOUS MOCKUP LAYOUTS REJECTED by founder (2026-10-29). UX philosophy ADR-025 remains accepted; Character/House illustrations and scene-flip idea ADR-027 accepted for further exploration. Do NOT use any of the illustrated page layouts as an implementation blueprint.
**Palette:** ADR-024 six founder-approved Plum / Teal / Soft Neutral hex values.
**Concept deliverables:** 3 separate user-facing visual ideas for discussion: App Launcher/Home, Accounting List/Form, and Salon Windows POS. Images shown in chat are conceptual illustrations only and not stored in this repository or editable UI assets.

## Cross-screen principles
1. One DRVO brand/typography/palette; not separate product skins.
2. Deep Odoo-like ERP capabilities, but progressive, Duolingo-inspired clarity and calm friendliness.
3. One major action per task context; no hero/photo marketing banner in operational Home.
4. Arabic RTL layout; English IDs and money remain bidi-safe.
5. Only activated/authorized Modules and real Business/Branch scope.
6. Honest server state, clear outstanding issues, no fake `paid/posted` or false health/status.
7. Hierarchy first, extra steps only for genuine approval, no gimmicks or children's gamification.
8. Internal-only operations, details and sensitive financial records protected by RBAC.
9. Normal plus pending/error/offline/permission/empty states must eventually have separate prototypes.
10. Data in visualization is illustrative and must be unmistakable as mock/sample, not a production KPI.

## Concept 1 — App Launcher / Business Home
**Person:** Owner/Manager. **Mood:** calm/optimistic, instantly understandable, uncluttered.
- Slim dark Plum global navigation with Apps, Business+Branch switch, search and authenticated user.
- First viewport: concise greeting + **Today needs attention** (only verified actionable items) + 3 real KPI cards or safe 'no data' + accessible quick action.
- Independently activated App tiles with friendly icon accents, consistent names and optional one-line descriptions; no giant marketing hero.
- A one-sentence, dismissible tip/first-win guidance prompt if new user, never compulsory.
- New modules in the App Store, not a hundred industry tiles in customer home.
**Review:** find Booking or POS without searching; clear scope; four apps and twenty apps; new and experienced user.

## Concept 2 — Accounting List + Form/Document
**Person:** Accountant/Owner. **Mood:** quiet, efficient, authoritative, not childish.
- Context Sidebar (draft assignment) + global context + Invoices List, searchable chips/filters, subtotal where verified.
- Selected record pane or document route demonstrates Form hierarchy: title/number, actual posting state, amount summary, line items and audit.
- Never treat paid vs posted as same state; pending journals, reversal reason and traceability visible.
- Professional density with ergonomic row height; do not waste top space on visual illustrations.
- Primary action is unambiguous; all expert filter, batch, export and correction features accessible by permission.
**Review:** find invoice by number; distinguish Draft/Posted/Pending; correct posted invoice without in-place editing; return with preserved search.

## Concept 3 — Salon POS Focused Workspace
**Person:** Cashier. **Mood:** tactile, effortless, extremely fast.
- Full-canvas workspace with visible Branch, cashier/shift and connectivity/queue indicator (not a generic sidebar).
- Search, service category pills, product/service cards with large clear target and simple price; tasteful short add-to-cart feedback.
- Customer/executor picker and cart with readable totals, discount and tender/verification.
- Teal major confirm action only after proper explicit tender review; a tap does not equal settled provider evidence.
- Optional advanced detail appears contextually; keyboard-first Windows and offline test.
**Review:** create Haircut + Beard in very few steps; assign executor, change quantity, choose correct tender, understand offline pending vs verified success.

## Comparative scorecard (use with real test participants)
| Criterion | Home | Accounting | POS |
|---|---|---|---|
| Can user find the next primary action immediately? | Required | Required | Required |
| Is Business/Branch/task context unmissable? | Required | Required | Required |
| Does the density fit role/task? | Friendly | Expert | Operational |
| Are errors and pending states honest? | Verified KPI/attention | Posting/audit | Offline/tender |
| Keyboard and Arabic RTL quality | Test | Test | Critical Windows |
| Responsive scope | 390/1440 | 1280/1440 expert | 1366x768 and 1920x1080 |
| Are data/actions properly authorized? | App tiles | Documents and export | Shift/tenders/customer |
| Delight without noise? | Subtle guidance | Only restrained state feedback | Fast tap/selection response |

## Next design approvals (not yet founder decisions)
- Home: no hero vs tiny helpful welcome; KPI count and active App tile grid.
- Accounting: pane split vs full record view, columns/status chip naming, density default.
- POS: cart side/size, service cards with image or icon, checkout steps, shortcuts/offline warning placement.
- Shared: typography and icon family, exact component corners/spacing, disabled/hover/focus variants, page first fold at 1366x768, 390 mobile.
- Design-file tooling and future React/Storybook implementation require explicit independent approval.

**No software implementation, Figma/Canva source file, code changes or production actions authorized.**


## Founder feedback / visual review reset — 2026-10-29

**Rejected:** every presented screen layout/composition, including Home, Accounting and POS placement. No design acceptance of the Page Shell, tables, sidebars or grids can be inferred from these images. **Liked and accepted as direction:** professional Odoo depth × Duolingo ease, original industry Character Family/House illustration style, meaningful flip/transition between select screens, customer-specific colors and selected/uploaded fonts, centrally managed typography. Continue to new layouts only AFTER specifying [Business Theme Engine](BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md) and [Industry Character/Motion Blueprint](CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md). ADR-024 remains default brand and ADR-023 remains navigation *pattern*, not precise layout. [ADR-026](../05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md); [ADR-027](../05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md).
