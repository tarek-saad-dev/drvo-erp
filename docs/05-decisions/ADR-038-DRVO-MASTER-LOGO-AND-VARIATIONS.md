# ADR-038 — DRVO ERP Master Logo and Official Variations

**Date:** 2026-11-10
**Status:** **ACCEPTED — founder explicitly approved the logo pictured in the supplied DRVO ERP bilingual Brand Identity board, including its variations.**
**Scope:** corporate/master brand logo and its variants; **not** authorization to deploy new frontend code or the example social pages.
**Related:** [ADR-024](ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md), [ADR-022](ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md), [ADR-026](ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md), [ADR-029](ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md).

## Founder-approved original logo

The exact **visual target** is the previously generated DRVO ERP bilingual Brand Identity reference board supplied again by the founder on 2026-11-10. This approves that pictured DRVO ERP emblem, **not any three alternatives from the later V2 exploration**.

The approved **corporate identity** consists of:
1. A bespoke capital **D** silhouette: rounded/right-hand D exterior and recognizable open diagonal lower-left interior cut.
2. **Three ascending internal columns** communicating organized capability, coherence and growing operational visibility.
3. **A separate rising Teal underside sweep** beneath/around the D.
4. **DRVO ERP** in a bold DRVO and lighter ERP wordmark, with a slender divider when space allows (the reference's horizontal lockup).
5. A consistent, sector-neutral symbol for the parent DRVO ERP brand: no barber scissors, medical symbols or other single-industry lock-in.

These are the **approved form and relationship**, rather than permission to freely redesign the icon.

## Official logo variations — approved as pictured

| Variant | Color | Intended application |
| --- | --- | --- |
| **Primary / Colored** | Plum D `#74536E`, Teal sweep `#1A7B80`, deep/Plum lettering | White and Soft Neutral backgrounds |
| **On Dark** | White D, Teal sweep, white wordmark | Deep Plum `#553E53` / Plum backgrounds |
| **Monochrome** | Single Deep Plum (or solid dark for one-color reproduction) | Invoices/print, monochrome documents |
| **Reverse monochrome** | All white | Single-ink dark-background print |
| **Standalone icon** | Same approved D/pillars/teal sweep where color is possible | Social profile, favicon, mobile/app icon; use safe margin |
| **Horizontal and stacked lockups** | Same form, only responsive arrangement | Website/marketing/social use according to available width |

Reference board depicts the three named Primary, On Dark and Monochrome variations; reverse solid and lockup layouts are strictly functional size/print adaptations preserving the approved mark.

## Palette authority

[ADR-024](ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md) remains authoritative: `#74536E` Plum, `#553E53` Deep Plum, `#1A7B80` Teal, `#F7F6F8` page neutral, `#FFFFFF` surface/white and `#27242B` text. This ADR accepts no uncontrolled UI recoloring, new status semantics or Industry-level brand replacement.

## Use rules

- Source-of-truth **design specification and scalable SVG renditions**: [Corporate Logo Usage Guidelines](../01-product/DRVO-MASTER-BRAND-LOGO-GUIDELINES.md) and [approved SVG folder](../../assets/brand/approved/README.md).
- Keep symbol proportions intact; no rotation/stretching, gradients that obscure the pillars, outline-only repainting, random alternate icons or salon-specific embellishment.
- Minimum clear space: 25% of D mark height; prioritize standalone symbol at very small sizes.
- Use white/light colored treatment on dark Plum. For printing without color, use solid monochrome; don't misrepresent Teal as a financial success state.
- The **DRVO corporate logo is independent of tenant-scoped Business branding**. Customer Business themes remain governed by ADR-026.
- Arabic/English surrounding copy may change independently; the brand mark stays **DRVO ERP**. A global UI font choice is not made by this logo decision.

## Clarification: what the reference board did NOT approve

The reference board is a **conceptual brand identity mockup**. Its sample page URLs, any follower metrics, verification check marks, product screenshots, case studies, photos and social-post copy are **NOT validated facts, created accounts, launched features or separately accepted marketing claims**. This decision approves the **logo and its pictured variations only**. Tagline choice, marketing typographic pair and social templates remain separate review items.

## Reproduction and rights gates

- The submitted art is a **raster reference**. Repository SVG files are carefully redrawn **vector renditions of the chosen appearance**, not the original authoring-source vector. The reference image remains visual authority if their shapes diverge. Final optical check at icon size and against reference is still required before large-scale production.
- Before public merchandise, domain/brand registration or widespread release: perform trademark/similarity checks, logo export QA, glyph outlines, legal/logo rights verification and light/dark accessibility/crop review.
- No source font binaries are included. The brand wordmark SVG source may use an installed Inter font; publication exports should use path-outlined versions.
- Exact visual assets may be improved only to align with the approved picture, not to switch direction without another explicit founder decision.

## Implementation / runtime

**No ERP code, SQL, tenant data, API, Business Theme Engine, feature flags or Staging/Production deployment are authorized or changed by this decision.** Existing K5 security acceptance is independent.

**Previous exploration:** Draft [PR #48](https://github.com/tarek-saad-dev/drvo-erp/pull/48) and its V2 experiments are superseded as proposed alternatives; do not treat them as co-approved designs.
