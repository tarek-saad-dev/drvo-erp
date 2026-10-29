# ADR-024 — DRVO ERP Plum + Teal + Soft Neutrals Visual Palette

**Date:** 2026-10-29
**Status:** ACCEPTED — founder replied "تمام نعتمد" to proposed Odoo-inspired Plum/Teal/Soft-Neutral palette and its use across App Launcher, Accounting/List/Form and POS.
**Related:** ADR-022 original simpler DRVO identity, ADR-023 Hybrid per-Module navigation, ADR-015 independent App tiles.
**Supersedes:** earlier *unapproved* green-first candidate tokens in the initial Design Tokens draft.

## Approved direction
Use a calm, Odoo-familiar **Plum + Teal + Soft Neutrals** color language for DRVO ERP, implemented as an **original DRVO visual identity**, not an Odoo theme or asset clone. Keep transactional ERP pages information-dense but visually quiet. Avoid a dominant decorative Hero Banner that displaces first-viewport KPIs, active Apps or actionable tasks; whether the Home has a very small banner or none is a later screen-level decision.

## Approved palette baseline (hex values from founder-reviewed proposal)

| Design token | Color | Hex | Role |
|---|---|---|---|
| `color.brand.primary` | Primary Plum | `#74536E` | DRVO identity, selected navigation, app context, selected tabs |
| `color.brand.deep` | Deep Plum | `#553E53` | Strong dark plum emphasis or compact branded topbar, headings as justified |
| `color.action.primary` | Action Teal | `#1A7B80` | Main interactive CTA buttons, actionable controls, focus direction |
| `color.surface.page` | Page Canvas | `#F7F6F8` | Neutral page background |
| `color.surface.panel` | Surface | `#FFFFFF` | Tables, forms, cards and dialogs |
| `color.text.primary` | Main Text | `#27242B` | Headings, main body copy and numbers |
| `color.text.secondary` | Secondary Text | `#77707B` | Supporting labels (from preview), subject to tested contrast |
| `color.border.subtle` | Soft Border | `#E6E1E8` | Subtle dividers and cards (from preview) |
| `color.status.success` | Verified Success | `#167B53` | State **only when server-verified**, never brand-colored guesses |

The first six swatches are directly from the approved visual palette; supporting label/border/success values were shown in the corresponding preview or pre-existing semantic design draft and are documented as **starting implementation tokens requiring UI contrast and functional testing**. Warning/danger/info/pending neutral fills, focus ring and hover/disabled ramps remain **to be defined and reviewed**, not silently treated as approved.

## Functional mapping
- Plum: app/global navigation context, brand identity, selected module/tabs; do not make every transactional panel purple.
- Deep Plum: optional branded header/nav emphasis; the header composition and background itself still require detailed visual sign-off.
- Teal: primary CTA/positive operation buttons, but **action color does not mean payment/ledger posting succeeded**.
- White + soft neutral: bulk of everyday List, Form, Calendar, POS and reporting workspace. Prioritize readable amount columns and Arabic text.
- Explicit status semantics: verified success green; pending orange/amber; failed destructive red; draft/unknown neutral; text/icon accompanying every color. Do not use Teal or Plum as the sole evidence of correctness, settlement, sync or a completed financial journal.
- Industry Solution may change content/configuration; no arbitrary per-industry replacement of the foundational DRVO UI tokens. Optional Business branding must not damage status semantics, readability or accessibility.
- Arabic RTL and English LTR share semantic colors; contrast must be tested in both; original DRVO icons/logos only (no unlicensed Odoo assets).

## Accessibility verification note (preliminary calculations, not full visual sign-off)
Calculated contrast ratios using WCAG standard luminance formula:
- White text on Primary Plum `#74536E`: approximately **6.55:1**.
- White text on Deep Plum `#553E53`: approximately **9.54:1**.
- White text on Action Teal `#1A7B80`: approximately **5.01:1**.
- Main Text `#27242B` on Page Canvas `#F7F6F8`: approximately **14.19:1**.
- Secondary Text `#77707B` on white panel: approximately **4.79:1**.
These specific color pairs exceed WCAG AA normal-text 4.5:1 threshold, but that **does not certify the full UI**. Test all combinations in actual components, focus/hover/disabled states, Arabic sizes, chart categories, dark theme if later introduced and enlarged content.

## Scope and acceptance
**Accepted:** color direction and six primary reference hex values as DRVO ERP visual baseline, broad purpose assignments, quieter Home/less giant promotional Hero.

**Not yet approved:** physical geometry, final Home/hero absence choice, final fonts/icons/logo, topbar treatment, shadows, all variant ramps, per-page full high-fidelity design and design-file asset. Nothing has been implemented.

## Design-review application sequence
1. Business App Home/Launcher — compact actionable summary and authorized independent app tiles, with Plum navigation and mostly neutral canvas.
2. Accounting List/Form — dense data, tabs/state badges, hierarchy and server-truth statuses.
3. Salon Windows POS — strong Teal primary sale action, currency/readability, fast services and visible offline/unsynced state.
4. Compare Arabic RTL and English LTR variants and narrow screen sizes; adjust variants only with explicit review of impact across all modules.

See [Design Tokens](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [UI Kit Blueprint](../02-architecture/DRVO-ERP-UI-KIT-BLUEPRINT.md) and [Hybrid Navigation](../02-architecture/DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md).

**Documentation approval only: no coding, migrations, new image/mockup files, UI components or production deployment authorized.**
