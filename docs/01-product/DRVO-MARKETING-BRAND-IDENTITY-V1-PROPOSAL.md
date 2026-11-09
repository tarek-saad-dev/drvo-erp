# DRVO ERP - Marketing Brand Identity V1 (PROPOSAL)

> **Founder review required.** This is a marketing identity proposal, NOT an accepted new ADR, NOT a replacement for ADR-024, and NOT a production product UI change.

**Created:** 2026-11-10 | **Status:** PROPOSED | **Scope:** marketing only

## Authority and no-regression constraints
- [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md): original Plum / Teal / Soft Neutrals accepted. Final logo, type and geometry were explicitly *not* accepted there.
- [ADR-022](../05-decisions/ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md), [ADR-026](../05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md): preserve original UI and centrally resolved customer Business themes; social creatives do not silently update product tokens.
- [ADR-027](../05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md) / [ADR-028](../05-decisions/ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md): illustration art direction accepted, not production character assets.
- [Founder charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md): one multi-industry platform; no unsupported marketing claims.

## Brand architecture and positioning
- Master brand: **DRVO ERP** - one modular multi-tenant ERP SaaS platform, not separate product identities for salon or clinic.
- First Go-To-Market focus: barber salons (pilot discovery at Cut Salon). Clinic remains second **planned** vertical pending domain, privacy, compliance and engineering validation.
- Proposed Arabic line: **إدارة أوضح. نمو أذكى.**
- Proposed English support line: **One platform. Many possibilities.**
- Brand traits: **Professional / Clear / Practical / Approachable**.
- Public status wording while launch is not approved: `Product in development` / `قيد التطوير` / `قريبًا`. No pretend production availability.

## Palette: ADR-024 accepted values
| Token | Hex | Marketing usage |
| --- | --- | --- |
| `color.brand.primary` | `#74536E` | Master identity and selective headline |
| `color.brand.deep` | `#553E53` | Strong brand/background |
| `color.action.primary` | `#1A7B80` | CTA/accent |
| `color.surface.page` | `#F7F6F8` | Neutral canvas |
| `color.surface.panel` | `#FFFFFF` | Panels |
| `color.text.primary` | `#27242B` | Main text |
| `color.text.secondary` | `#77707B` | Supporting text (contrast checks required) |
| `color.border.subtle` | `#E6E1E8` | Quiet dividers |

Proposed **marketing-only** pale tints `#DCEFF0` and `#EEE8EE` are NOT approved product UI tokens. Never imply financial success/settlement using brand Teal.

## Logo proposal
- An original geometric **D** plus three ascending modular bars and a small Teal path; platform-level symbol, no hair/scissors or vertical-specific icons.
- Source proposals: [symbol](../../assets/brand/drvo-symbol-v1.svg) and [horizontal lockup](../../assets/brand/drvo-logo-horizontal-v1.svg). A user-downloadable social/PDF brand kit is also prepared outside the repository for design review.
- Default lockup on light background; white/teal inverse on dark Plum; use symbol alone for small avatars. Minimum clear space around lockup: 0.5 symbol height.
- No stretching/recolouring/faux 3D, no third-party/Odoo/Duolingo brand derivative. Wordmark text uses fallback Inter/Arial in SVG; final production vector outlined wordmark and trademark/name review required.

## Typography proposal
- English: **Inter**; Arabic: **Noto Sans Arabic**. Typography remains review-only and is NOT a product-wide font decision under ADR-026.
- RTL / LTR layouts must be independently checked. No font binaries in assets/repo; verify font rights before web embedding or distribution.

## Visual and content production grammar
- Square post: 1080x1080; Story: 1080x1920; Facebook cover design: 1640x624; LinkedIn company banner design: 1128x191. Validate platform-specific safe areas on real devices before use.
- A single readable headline, high whitespace, simple iconography, small constant DRVO brand signature, one CTA or informative takeaway.
- Educational operations content before hard selling. Proposed mix: 40% salon operations education; 20% brand; 20% build-in-public; 20% customer discovery. This is editorial planning, not measured performance.
- Existing founder-approved Soft 2.5D character/miniature scenes may be explored separately; do not bake unapproved characters into the master logo.

## Tone of Voice
- Egyptian Arabic for accessible social posts: direct, respectful, practical, professional but not corporate-jargon-heavy.
- English for B2B/LinkedIn with concrete scope, accurate status and engineering credibility.
- Sample: `لسه بنبني DRVO ERP، وهنشاركك خطوات التطوير ونصايح عملية تساعدك ترتّب شغل الصالون.`
- Forbidden without proof: largest/best platform, fully live all-industry support, tested unlimited enterprise scale, real-time integrations, customer results/testimonials, fake verification badges or invented statistics.

## Architecture / delivery impact
- **No product code, SQL, migrations, APIs, tenants, roles, billing, UI tokens or Staging flags modified by this proposal.**
- Brand assets are marketing artifacts; later approved integration into web/app requires accessibility/crop/layout review and separate implementation authorization.
- Source-of-truth synchronization after founder acceptance: record approved logo/typography/voice in a new design/marketing ADR or addendum to ADR-024; update ADR register, roadmap/commercial GTM references, current-state note and changelog as appropriate.

## Acceptance gates
1. Founder reviews symbol, wordmark and tagline.
2. Name/domain/trademark and social handle clearance performed.
3. Font licenses and SVG exports checked; approved vector outlined wordmark prepared.
4. Facebook/Instagram/LinkedIn templates checked for Arabic mobile crops.
5. Social registration from verified company-owned admin accounts; approve any public posts separately.

**Current status:** DESIGN PROPOSAL ONLY. No claim that pages exist, posts are scheduled, accounts verified, or external customers onboarded.