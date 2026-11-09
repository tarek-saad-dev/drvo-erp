# DRVO ERP — Official Master Logo Usage Guidelines V1

**Decision:** [ADR-038](../05-decisions/ADR-038-DRVO-MASTER-LOGO-AND-VARIATIONS.md) — founder approved 2026-11-10. **Authority:** supplied bilingual brand board screenshot + ADR-024 palette.

## Identity specification

**Name:** DRVO ERP (English uppercase wordmark). **Symbol:** upright open **D** with three ascending columns and a rising Teal underside sweep. **Brand architecture:** one cross-industry master identity; barbers are the first GTM segment but don't own the corporate logo.

## Logo variations

1. **Primary full-color:** Plum D (`#74536E`), Teal lower sweep (`#1A7B80`), Deep Plum/Plum wordmark on `#FFFFFF` or `#F7F6F8`.
2. **On Dark:** white D and white wordmark with Teal curve, for Deep Plum backgrounds (`#553E53`).
3. **Monochrome:** entirely Deep Plum `#553E53` or sufficiently dark near-black; no Teal needed if one-ink printing.
4. **Reverse monochrome:** entirely white on a sufficiently dark surface.
5. **Responsive lockups:** horizontal full name in larger contexts; stacked lockup/profile icon for narrow spaces; don't force illegible small full labels.

The SVG source files under [assets/brand/approved](../../assets/brand/approved/README.md) were manually redrawn to represent the founder-approved raster; their optical fidelity is subject to final export QA. **Don't substitute the old, different D shape from the first Brand Starter Kit or the rejected V2 explorations.**

## Spacing, minimum sizes and background rules

- Clear space >= **0.25× symbol height** on every side. No UI text, photography, icon or border intrudes into that field.
- Working recommendations (needs device-level visual check): horizontal logo width >= 180 CSS px; standalone symbol >= 24 CSS px; for 16px favicon prepare a reviewed simplified source/favicon cut.
- On light backgrounds choose primary; on Plum/Deep Plum choose on-dark. No drop shadows, stretched aspect ratios or arbitrary color substitutions.
- Test actual contrast/visibility for surrounding text and brand Teal at target sizes; use a monochrome or strong backdrop when quality degrades.
- Work with SVG first; export PNG in sRGB with transparent background for use in apps, and keep crisp 2×/3× raster resolutions for platform accounts.

## Brand voice and content

The logo is universal, not Salon-exclusive. Content can be Salon-focused during first market entry; descriptions must not claim unsupported industry readiness or verified results.

The reference board's sample social follower counts, blue verification checks and handles are design placeholders only. Do not reuse them as factual statements. The product remains in development.

## Boundaries

- **Approved:** pictured logo geometry and color treatments, identity scope and responsive-use guidance.
- **Not silently approved:** poster composition, full social templates, screenshots, tagline, Arabic/English fonts as global product defaults, performance claims, production deployment or UI implementation.
- **DRVO app UI:** branded assets can later be integrated only through its shared UI Kit and safe Theme Engine; per-Business branding remains tenant-scoped and does not replace the legal master DRVO platform identity.

## Production checklist

- [ ] Manually inspect exact SVG reproduction against original founder image at 24, 32, 128 and 512 px.
- [ ] Validate icon and wordmark in both English LTR and Arabic RTL placements.
- [ ] Export all logos with outlined text from licensed fonts, and avoid font-binary distribution.
- [ ] Verify typography and whitespace when embedded in social cover crops / mobile device previews.
- [ ] Trademark/logo similarity check and image rights clearance.
- [ ] Publish to website/social only after separate review and account access verification.

**No ERP code, SQL, infrastructure, feature-flag or production changes.**
