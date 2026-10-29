# ADR-027 — Industry Character Family, Illustration Scenes and Purposeful Motion

**Date:** 2026-10-29
**Status:** ACCEPTED PRODUCT/DESIGN DIRECTION by founder. Character art, asset styles, actual motion timings/transitions and implementation are DESIGN DRAFT.
**Related:** ADR-017 Industry Solutions; ADR-019 conditional Domain Modules; ADR-022 original UI; ADR-023 Hybrid Navigation; ADR-024 default palette; ADR-025 ERP × Duolingo-inspired North Star; ADR-026 Business Theme Engine.

## Context
The founder **rejected the layout compositions in previous screen mockups** but was strongly attracted to their illustrative character, building/house scene, profession-specific visual storytelling and a scene transition/flip between sections. DRVO should retain Duolingo-like warmth and craft while Odoo-like high productivity and accurate financial UI stay intact.

## Accepted principles
1. Build an original **Character Family / Industry Illustration Layer** in the shared DRVO design system: scalable, distinctive, reusable original profession/industry characters and illustrated scenes, not a compulsory single mascot copied from Duolingo.
2. Associate approved Character/Illustration Packs with **Industry Solutions**, plus safe generic fallback; examples: barber/salon, clinic, education, retailer, property agent/house, importer/manufacturer. Characters should represent diverse real users and avoid reducing professions to offensive stereotypes.
3. Use scenes in **Industry discovery, guided Business setup, App Launcher welcome where space permits, first-use learning, empty states and safe nonfinancial confirmation**, where graphics explain or emotionally support the task.
4. **Do not crowd** accounting journals, Treasury, Payroll, complex finance tables, high-pressure sales checkout, sensitive clinical records or reporting; an illustration is never a substitute for a record status, action or help text.
5. Define a shared **Motion Grammar**, including **scene-to-scene page flip / transition as a candidate effect** for industry/onboarding/Launcher surfaces. Do not mandate flip on every route or every App switch.
6. All motion must support **reduced motion** and user preference, be interruptible where applicable, maintain focus/scroll state and never delay or fake a POS submission, sync, posting, entitlement/payment confirmation or financial close.
7. Images/character assets must be original/licensed, responsive, lightweight, localized where text is embedded (ideally no text baked into graphic), usable with alt text/decorative classification, and safe with Business-level theme overrides (ADR-026).
8. Character/scene selection may be associated with the Business's Industry Solution and optional permitted theme configuration, but **actual per-Business alternate character-pack purchases/uploads are NOT automatically approved**; distinguish provisioned industry pack from a separately authorized custom uploaded art feature.
9. Graphic support is **part of the UX language** and the architectural design from the beginning. The volume of V1 packs/scenes, art production budget and whether each industry receives a full character set before launch remain separate decisions.

## Core UX and safety invariant
**Professional Core + Friendly Illustration Layer.** The surface can welcome and guide, while record ownership, RBAC, money, inventory and confidential data remain unchanged. Illustration rendering must never become a Required dependency for invoice posting or safe operation.

## Candidate scene/motion slots (DRAFT)
- `salon.welcome`: welcoming barber/reception character, salon/storefront illustration.
- `salon.empty.bookings`: character arranging appointment cards; secondary, one clear action.
- `clinic.setup`: culturally appropriate professional/clinic; not medical diagnostic advice.
- `real-estate.discovery`: independent house/building scene; subtle 2D parallax.
- `manufacturing.first-run`: production facility scene with one onboarding hint.
- `generic.module-installed`: safe verification feedback only **after** activation is confirmed.
- `scene.flip`: optional short flat-to-illustration/scene transition during Guided Setup or voluntary industry browse.
- `page.enter`, `card.press`, `overlay.open`, `empty.enter`: smaller purpose-led motion.
This list is conceptual. Exact graphic style, character names, animation technology, transitions and size budgets are pending.

## Interaction/production boundaries
- A direct user action can navigate immediately; animation is nonblocking, never a hard modal.
- Use static low-cost variant and assets when motion disabled/offline/low-power/printing.
- Animation must not delay route interactivity; avoid heavyweight 3D engines/large decoded videos in common ERP shell or POS V1.
- Generic Error/Empty components are readable without characters; image download/render failure must not remove the underlying message/action.
- No confetti, XP, forced streaks or celebratory animation for money, invoices or approvals.
- New industry can ship a new pack via released assets/manifest without changing shared Core UI layout or codebase copies.

## Remaining approvals
- Character family visual language, shapes, wardrobe/spec, inclusivity and brand IP ownership.
- Concrete Salon V1 pack minimum and where it appears; additional industry timing.
- Flip vs slide vs morph proof-of-concept, motion durations, page persistence and reduced-motion behavior.
- Hosting, versioning, cache/asset quota, translation, alt text, legal licensing and commercial custom packs.

## Links
[Character, Scene and Motion Blueprint](../02-architecture/CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md) · [ADR-025](ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md).

**No code, UI asset production, animations, Figma files, migrations or production changes authorized.**


## Founder-selected art style — ADR-028 (2026-10-29)

Founder accepted the proposed combined **Soft Editorial 2.5D profession characters + Miniature/Isometric 3D-inspired environment scenes** as the DRVO visual art direction. First concept validation targets the DRVO Barber, a miniature Salon storefront and miniature property/house (real estate) scene plus a nonblocking storyboard for scene.flip. This resolves only the general *style pairing*, not any exact art asset, production character pack, layout, motion timing or renderer. Previous screen layouts remain rejected; graphics are not permission to implement them. [ADR-028](ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md), [Art Concept Pack](../02-architecture/DRVO-ART-DIRECTION-FIRST-CONCEPT-PACK.md).
