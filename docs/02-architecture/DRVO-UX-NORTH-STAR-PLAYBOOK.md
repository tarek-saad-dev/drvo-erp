# DRVO ERP UX North Star — Serious System, Friendly Surface

**Date:** 2026-10-29
**Status:** PRODUCT UX PHILOSOPHY APPROVED (ADR-025); exact visuals/components are design proposals.
**Tagline:** **Odoo structure. Duolingo clarity. DRVO identity.**
**Owner:** Product design/architecture.

## 1. Design identity
- Odoo contributes the mature business-workflow grammar: App Launcher; controlled Sidebar/Tabs/Workspace per Module; List/Form/Document/Kanban/Calendar/Pivot/Graph and serious multi-tenant controls.
- Duolingo inspires clarity, gentle affordances, consistency, first-run confidence, craft, reduced cognitive load and iterative usability validation.
- DRVO owns the distinct visual and interaction system: accepted Plum/Teal/Neutrals (ADR-024), Arabic RTL-first, original icons/brand and serious financial statuses.
- Do not import trademarked characters, Odoo proprietary UI source/assets or Odoo XML view engine. The product should not look like Duolingo turned into a game or like Odoo reskinned.

## 2. Screen design laws (developer & designer checks)
1. **Now + Next + Context:** within first viewport show current Business/Branch, screen identity, work state and next useful action; don't require scrolling past a promotional hero.
2. **Primary action:** one clearly emphasized intended next action; all other meaningful expert operations stay discoverable. Do not hide essential audit or ledger controls.
3. **3 progressive depths:** essential by default; more via More/Advanced and user/role settings; never bury required permissions/taxes/payment facts.
4. **Information hierarchy:** human-readable task title > relevant KPI/status > actionable content > secondary explanation > tertiary metadata. For Accounting, document number and financial state can be promoted.
5. **Calm feedback:** inline nonblocking acknowledgement for selection/draft, persistent explicit review for offline/posting/billing uncertainty.
6. **Correctness above delight:** irreversible operations require server confirmation; no optimistic “paid”, “posted”, “synced”, “activated” badges.
7. **Progressive guidance:** contextual tip for new users; dismissible; no mandatory stepper for repeat tasks.
8. **Fine control for experts:** keyboard navigation, search, date/branch filters, saved preferences if implemented; never sacrifice speed to playful interactions.
9. **Access-aware UX:** launcher and global search include only activated/authorized Apps/data, and errors never reveal hidden financial/medical record fields.
10. **Systemic reuse:** no separate Salon/Clinic/Factory basic buttons, table shells or StatusPills; specialized widgets are permitted for unique domain workflows.
11. **Localization:** Arabic RTL plus English LTR and mixed bidi identifiers; keyboard, currency, dates, taxes, line wrapping and icons tested.
12. **No false alerts:** attention count matches actionable work; healthy state is quiet; no fake KPI or placeholder performance badge shown as production truth.

## 3. Controlled interaction vocabulary (draft)
| Intent | DRVO behavior | Where NOT to use |
|---|---|---|
| Select or navigate | Short directional motion, clear selected state, preserved focus | Disable on reduced motion; no pointless full-page transition |
| Add to cart | Immediate item/cart response, subtle count/amount update | Must not imply posted invoice or verified payment |
| Save draft | Explicit saved/unsaved status; error retains input | No “Invoice posted” before server ledger check |
| Financial Post | Confirm authorized operation, pending state, final server status, audit trail | No confetti, XP, celebratory streak or misleading cash success |
| Module activate | Show dependencies/price, explicit consent, verified state, explain next available action | No silent upsell or auto-activation on recommendation |
| Empty state | One relevant example and next useful CTA; never pretend data exists | No mascot blocking accountant's view |
| Error/retry | Explain next safe recovery action, keep context/draft, explicit support path | No repeated generic “Oops” toaster with lost data |
| Offline | Visible queue/pending/replay status and what is locally saved | No final reconciled label from a local-only transaction |

## 4. Layout density modes
- **Friendly:** onboarding, owner home and first-use guidance; spacious hierarchy and touch-friendly CTAs.
- **Operational:** Booking/POS/CRM; focused card and search density, short actions, critical status always visible.
- **Expert:** Accounting/Inventory/Payroll; dense tables and records, pinned source metadata, keyboard support, fewer ornamental cards.
All are variants of one global kit, not three brand systems. Numeric metrics from existing design draft (Topbar 56, Sidebar 240, row 36/44 px) remain optional candidates, not founder approved.

## 5. Typographic, palette and component behavior
- Six founder-accepted base colors ADR-024: Plum `#74536E`, Deep Plum `#553E53`, Teal `#1A7B80`, Canvas `#F7F6F8`, White `#FFFFFF`, Text `#27242B`.
- Font family and precise Arabic/Latin sizes are still pending actual readability tests; avoid a cartoon typeface in finance.
- Accent colors explain navigation and interaction, not financial truth. Semantic success/warning/danger remain role-based, with text labels.
- Friendly touch feedback is functional: focus ring, subtle pressed state, inline progress; don't imitate copyrighted Duolingo animation assets.

## 6. Role-based checkpoints
| Role | First task | Intended first screen | Most critical trust signal |
|---|---|---|---|
| Business Owner | See what needs attention / switch App / open report | Business Home + Apps | Scope and verified KPI freshness |
| Manager | Resolve exceptions and branch status | Actionable Home / operational workspace | Accurate counts, permitted transitions |
| Cashier | Build and complete a sale fast | Full-screen POS | Tender, branch, shift, sync/posting truth |
| Accountant | Find, inspect and post/reverse correct document | Compact List + full Document | Posted state, totals, period, audit |
| New Business Owner | Select valid minimum starter and begin use | Guided industry setup | Full Required + price preview / approval |

## 7. UX Kit handoff package (before code)
- **Foundations:** palette and semantic tokens, typography, spacing, iconography, responsive/bidi rules, motion rules.
- **Primitives:** fields, actions, selects, relation picker, badges, dialog, drawer, table row, help tip, empty, status and offline components.
- **Patterns:** Business/Branch switch; app discovery; List/Form/Calendar/Document/POS, priced module activation; validated feedback.
- **Screens:** Home/Launcher, Accounting List/Form, Windows POS first; subsequently Booking Calendar, Inventory count, App Store/Starter.
- **States:** idle, hover, focus, selected, disabled, loading, empty, error, permission denied, unsaved, posted, pending reconciliation, offline queued.
- **QA:** 390px RTL, 1366x768 Windows POS, 1440 desktop, 200% zoom, keyboard, real use-case replay and finances authorization.

## 8. Three-screen review & readiness
Use [Visual Review Brief](DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md) to compare the three mockups consistently. A beautiful static screenshot is not proof of successful UX. Sign off first on information hierarchy, action placement and density; then tokens/motion, then error-state prototypes. Deep technical behavior in [UI Kit Blueprint](DRVO-ERP-UI-KIT-BLUEPRINT.md).

## 9. Evidence and ownership
Official research: Odoo 19 front-end and views; Duolingo design blog and operating principles, linked in [ADR-025](../05-decisions/ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md). This is a strategic synthesis for DRVO, not a claim both products use the exact same UX architecture or that Duolingo's SDUI is approved to implement.

**No code, design source files, DB migrations or deployment authorized.**
