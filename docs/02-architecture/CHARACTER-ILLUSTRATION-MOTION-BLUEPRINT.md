# DRVO ERP — Industry Character Family, Illustrated Scenes and Motion Grammar Blueprint

**Date:** 2026-10-29
**Status:** DESIGN BLUEPRINT. Industry character/scene/motion direction approved in ADR-027; **Soft Editorial 2.5D characters + Miniature 3D-style scenes accepted** in ADR-028. No individual art asset, exact page-flip duration, renderer, asset production, pack marketplace or implementation approved.
**Related:** ADR-025 UX North Star, ADR-026 Business Theme Engine, ADR-017 Industry Solutions.

## 1. Goal: profession-specific visual soul with ERP precision
Create a distinctive **DRVO Character Family**, original friendly illustrations and scenes for industries/professions that help first-time users connect with an otherwise sophisticated ERP. A graphic illustration can humanize Business discovery, setup and empty states; it **must not compete** with workflow state, search, List/Form density, cashiers, Finance or authorization.

The founder **explicitly rejected all previously shown screen layouts**, while liking the character, house/building scene and idea of scene-flip transition. These layouts are **REJECTED FOR VISUAL SIGN-OFF**, not templates for implementation. Retain approved ADR-023 Hybrid Navigation and ADR-024 default palette plus ADR-025 professional-friendly UX principles; design future compositions afresh.

## 2. Two-layer asset identity
1. **DRVO global Character Bible:** coherent line quality, silhouettes, proportions, facial language, lighting, rounded-but-adult-friendly style, accessibility, cultural/language inclusion, gender/range of professions. Original source art with commercial ownership/license and documented export sizes.
2. **Industry Pack:** compatible profession characters and contextual environments—salon (barber, receptionist), clinic (clinician, front desk), education (teacher/student), retail (seller), real estate (agent/house), manufacturing (operator/warehouse), generic (helpful neutral figure). All packs share visual DNA; no copied Duolingo owl, faces, character silhouettes or Odoo assets.
3. **Scene assets:** distinct `welcome`, `setup`, `empty`, `module-intro`, optionally `verified-nonfinancial-success`; no need for complete pack for every unlaunched industry.

## 3. Conceptual registry and resolver (not schema/API)

| Conceptual record | Candidate contents | Owning system |
|---|---|---|
| `IllustrationPack` | pack key, industry/region, supported locales/themes, version/status, fallback | DRVO design/release team |
| `Character` | key, character silhouette/role, alt policy, poses/expressions, source rights | Illustration registry |
| `SceneDefinition` | scene ID/intent, figure refs, building/background, aspect ratio, crop-safe bounds, static fallback | Illustration registry |
| `MotionPreset` | named transition, duration cap, reduced-motion fallback, interruption and route semantics | Shared Motion Grammar |
| `BusinessVisualPreferences` | selected compatible pack/preset if available, disable graphics preference when permitted | Business branding configuration (ADR-026) |
| `ResolvedScene` | allowed scene ref + valid theme/industry/locale + reduced motion/static asset | Trusted UI resolver |

No customer-uploaded arbitrary SVG/HTML/JS. Future custom illustrations must be security-vetted and licensed; first product packs are curated platform assets.

## 4. Content slot matrix (UX guidance)

| Surface | Allow illustrations | Intended purpose | Constraint |
|---|---|---|---|
| Industry catalog | Strong visual scene / miniature environment | Instantly recognize industry | searchable, doesn't hide unsupported status or fees |
| Onboarding step | Character+scene, optional tasteful transition | Reassurance and next action | never forces onboarding form or longer load |
| New Business / empty App | Small illustration plus useful CTA | Explain what to do | no character needed when real rows/records exist |
| App Launcher | Small scene or helper hint only if room | Delight and brand recognition | **App tiles and attention above art** |
| Booking first use | Illustration in empty state only | Show first booking action | not in crowded schedule/calendar |
| Financial list/journal | **Usually no art** | only genuine empty instructional state | never cover amounts, audit or errors |
| POS checkout or active shift | **No big character / animation** | keep fast cashier workspace | money/sync/shift always visible |
| Payroll/clinical records | **No characters over confidential data** | respect seriousness and access | no insensitive celebrations |
| Activation success | Subtle only **after verified activation** | acknowledge new capability | cannot fake billing entitlement |
| External error/offline | small static helper only if clarity wins | show recovery action | status text is mandatory |

## 5. Page flip / house scene idea — technical-neutral behavior
**Founder interest:** A building/house illustration flips or transitions out while moving from industry selection to the next setup page.

**Storyboard candidate:**
1. **Select real estate industry:** show neutral illustrated house and agent character. Static loading is immediate; primary CTA remains usable.
2. **Click “Continue”:** page route transition starts. Scene pivots/flips a small amount or turns a card (e.g., 2D/2.5D transform) while previous text fades and next step appears; avoid flipping the complete page with essential form data or reversed Arabic text.
3. **Next page ready:** scene settles into related role/context; focus moves to heading/first logical action; browser Back and cancel remain deterministic.
4. **Reduced motion / performance:** instant crossfade or no effect with static illustration. User choice/OS prefers-reduced-motion is respected.
5. **Failure/retry:** navigation context preserved; image loading failure never prevents Continue or loses entries.

**Do NOT** require flip on every route, on posting journals, on POS checkout, during offline sale reconciliation, or on tab/search/filter changes. The desired effect is a charming scene change only where it clarifies context.

**Motion types (tentative):** `scene.flip`, `scene.slide`, `scene.morph`, `card.press`, `panel.reveal`, `onboarding.progress`, `empty.enter`, `confirm.soft`, `route.instant`. Duration, frame rate, animation library and 3D decisions require prototype testing; avoid heavy 3D/runtime that harms end-to-end POS response speed.

## 6. Original Character Bible — asset/art direction to design
- Character forms: recognizable adult-friendly proportions, strong silhouette and consistent facial/hand language; no existing third-party mascot look.
- Occupation clues: barber with scissors/apron, doctor with medical attire where culturally appropriate, teacher with course materials, wood operator with safe PPE, property agent near property model. Avoid “one costume defines all professionals,” stereotype or generic stock.
- Props/architecture: illustrated storefront, house, clinic, warehouse, classroom; these become scene transition anchors and may subtly use the Business's validated brand colors.
- Style axis candidates for founder review: **(A) soft editorial 2.5D**, **(B) crisp vector character system**, **(C) restrained miniature/isometric worlds**. These are options **not yet approved**.
- Assets: decorative regions shouldn't block reading order; meaningful instructional art gets accurate localized alt, with motion user preferences.
- Cultural sensitivity and original licensing/IP ownership essential before commercial art pipeline.

## 7. Personalization vs invariants
- Industry Solution provides **recommended compatible illustration pack** and relevant scene keys; fallback generic pack for unsupported/unlaunched industry.
- Business Theme may recolor a **limited safe subset of clothing/props/environment accents** from allowed semantic brand tokens; don't recolor skin or change occupation/identity via arbitrary CSS filters.
- A Business may choose to hide decorative illustrations if a supported setting is released; regulatory/low-bandwidth UI stays functional without them.
- `font.body/heading` changes with Business Theme and cannot alter text embedded in art; **avoid text baked into pictures**.
- Per-Business custom uploaded character pack is not part of the approved first release; future feature could be gated by licensing/security.

## 8. Asset packaging and performance budget guidance (not committed numbers)
- Keep original master sources separate from optimized distribution assets; use version hashes, cached responsive static fallbacks and CSP-approved asset origins.
- Prefer light static/vector export or well-tested small motion assets; defer runtime heavy 3D/large video to evidence-based demand.
- The shared ERP Shell must not synchronously load all Industry Packs. Only request current Business/Industry scenes, and preload next scene opportunistically if cheap.
- Offline Windows POS, low-bandwidth connection, 390px phone and reduced-motion users must still access all functional actions without graphics.
- Rendering fails gracefully: textual empty state or page CTA persists.

## 9. UX research and QA gates
- Compare illustrated vs unillustrated onboarding tasks for first completion, not only aesthetic preference.
- Review with real professionals: salon owner/barber, accountant, clinician, manager and future factory roles for dignity and clarity.
- Layout visual approval **restarts from first principles**; do not carry previous mockups forward automatically.
- Validate keyboard, focus after route change, browser back, RTL text orientation, reduced-motion, asset crop and content at 200% zoom.
- Validate truthful finance states and no latency regression on POS.
- Test repeated navigation 10 times: animation must not fatigue user.

## 10. V1 scope proposal (not approved deliverable)
Build the first **Salon Character Mini Pack** for onboarding/industry selection, empty booking and welcome only after art/style signoff; generic small pack covers initial non-salon screens. No need to produce 100 industry mascots. Build only a reusable scene/pack registry seam that can extend later.
**ADR-027 does not require shipping a fully animated family of characters in Salon V1 absent separate release scope approval.**

**Links:** [ADR-027](../05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md), [Theme Blueprint](BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md), [UX North Star](DRVO-UX-NORTH-STAR-PLAYBOOK.md), [Visual Review](DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md).

**No code, design source files, illustration/animation assets or deployment authorized.**


## Founder-selected unified art style — ADR-028 (2026-10-29)

Founder agreed with pairing **Soft Editorial 2.5D** for all original industry characters and **Miniature/Isometric 3D-inspired** architecture/scenes with unified lighting, material and perspective treatment. The earlier **A/B/C art-style candidates** in Section 6 are superseded at the high-level style-choice level, but specific model detail, lighting, texture, character pose and the end asset package remain open. First concept scope: [DRVO Barber + Salon Storefront + Real Estate House](DRVO-ART-DIRECTION-FIRST-CONCEPT-PACK.md). House/building scene flip is still only a candidate transition, not an approved animation spec. Previous screenshots' layout compositions remain rejected. [ADR-028](../05-decisions/ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md). No code.
