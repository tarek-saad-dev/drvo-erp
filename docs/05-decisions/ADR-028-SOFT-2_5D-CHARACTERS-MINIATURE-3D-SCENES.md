# ADR-028 — Hybrid Art Direction: Soft 2.5D Characters + Miniature 3D Industry Scenes

**Date:** 2026-10-29
**Status:** ACCEPTED VISUAL DIRECTION (founder endorsed the proposed combination). Actual illustrated characters, rendered scenes, motion timings, UI layout, assets and code remain DESIGN DRAFT.
**Related:** ADR-022 Odoo-familiar original DRVO UI; ADR-023 Hybrid navigation; ADR-024 DRVO default Plum/Teal; ADR-025 serious ERP/friendly surface; ADR-026 Business Themes/custom fonts; ADR-027 Industry Character Family, Scenes and Motion.

## Decision
Use a coherent and original **hybrid illustration language**: **Soft Editorial 2.5D for profession-specific characters**, complemented by **Miniature/Isometric 3D-inspired buildings and environments** for Industry Solution selection, first use, selected empty states and storytelling. Match perspective, lighting, materials, outlines, palette and proportions so characters and environments clearly belong to one DRVO identity. This is a **visual style**, not a decision to ship a heavyweight real-time 3D renderer or to reproduce another company's characters.

## What founder approved vs what remains open
- **Approved:** paired visual style family, first exploration of a DRVO Barber Character, a Salon Miniature Scene and a Property/House Miniature Scene; explore a subtle scene-to-scene Flip animation as a future guided transition.
- **Not approved:** any specific generated character face, clothing palette, barber/haircut tool, building facade, detailed layout, whether a 2D sprite/vector pre-render or 3D runtime is used, final animation curve/duration, exact imagery licensing or distribution, number of V1 characters beyond scoped exploration.
- **Still REJECTED:** earlier App Launcher/Accounting/POS screen element distribution in previously generated design boards. The new illustration boards are **art-style explorations, not accepted screen layouts**.

## Artistic rules
1. Character = recognizably professional, warm and mature, not childish or gamified; silhouette clearly legible at thumbnail scale; expressive but calm poses; stylized rounded anatomy with real human diversity, dignity and occupation credibility.
2. Scene = recognizable micro-world with layered architectural elements (Salon storefront / salon interior chair / building or house), calm soft lighting, physically coherent miniature depth; avoid complex busy backgrounds.
3. Both share soft ambient occlusion, matte/clay-like materials and controlled highlights, consistent perspective, edge softness and production palette. Prefer simple low-frequency surfaces for integration with changing Business themes.
4. Keep characters/scene independent from brand text/logo baked into art wherever possible. Label and Business logo must be UI text/image overlays from trusted customer Theme Engine. Character skin/identity and profession-specific context should never be arbitrary CSS-recolored with Business theme.
5. Treat mood/scene as delight around tasks, not primary information architecture. Real financial records, sensitive clinical data, payroll and active POS checkout are functional first and typically illustration-free.
6. Use original/licensed production art and retain source/usage rights evidence. Do not copy Duolingo Owl, Odoo proprietary iconography or commercial third-party character packs.

## First concept kit — only references, not deliverable acceptance
- **DRVO Barber:** full-body/three-quarter friendly barber with professional apron and haircut tools, neutral and welcoming pose; optional useful expressions (welcome, thinking, empty bookings), without brand logo embedded.
- **Salon miniature:** stylized storefront and salon chair/mirror geometry, place to connect character and optional onboarding; safe composition at desktop and 390px mobile.
- **Property miniature:** original house/building/agent environment that can pivot between a discovery card and a business setup scene, retaining a static fallback.
- Initial generated visual boards were created in conversation as **illustrative concept boards**. They are not a GitHub art asset library, not editable vector/Figma files and are not approved final production art.

## Interaction and Motion principles
- The founder liked a scene/building flipping when moving from one guided page to another. Design **scene.flip** as an **optional, low-cost, nonblocking** short transition between e.g. Industry Selection → Business Setup; preserve text direction, focus, history and data.
- Do not flip entire authenticated ERP pages or replace real app navigation with decorative theatre.
- Respect user and OS reduced-motion and supply graceful static/crossfade behavior.
- POS, invoice posting, settlement, inventory and confidential medical workflows should not be motion-dependent or slow.
- Motion durations and asset budgets are to be **benchmarked as prototypes**, not approved here.

## Priority before code
1. Create 3 stand-alone portrait/environment style sheets with matching camera/light/material language; art lead review.
2. Write character bible: variants, expressions, perspective, clothing system, inclusive casting and props/scene safe areas.
3. Storyboard scene.flip start/intermediate/end plus reduced-motion static transition and route focus.
4. Check palette interchange using DRVO default ADR-024 and one Business-custom Theme (ADR-026).
5. First 3 completely new screen compositions come only **after** art family and Theme/typography design review; original mockup layouts are not to be reused.

**Architecture/design direction only. No application implementation, animation code, graphic asset production build pipeline, database migration or deployment authorized.**
