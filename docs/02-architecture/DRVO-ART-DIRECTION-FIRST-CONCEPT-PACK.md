# DRVO ERP — Art Direction Concept Pack 01: Barber, Salon & Real Estate

**Date:** 2026-10-29
**Status:** Detailed concept and art handoff DRAFT; ADR-028 approves only the **Soft 2.5D character + Miniature 3D environment** direction.
**Goal:** build a distinctive, recognizable DRVO art family reusable in Salon pilot and industry exploration without coupling illustrations to ERP functional controls.

## 1. Visual North Star
**ERP seriousness, thoughtful warmth.** Character illustrations should evoke friendliness and confidence, not a cartoon UI over accounting. Miniature worlds are illustrations with toy-scale perspective and tidy rounded shapes, but materials/wardrobe are mature and professional. All artwork is DRVO-owned/original. No third-party copyrighted mascot copy or brand duplication.

## 2. Style continuity: character/scene contract

| Art dimension | Shared direction | Production review |
|---|---|---|
| Characters | Soft stylized 2.5D, human facial warmth, approachable but credible professions | judge recognizable silhouette at 64 and 160 px |
| Environments | Miniature 3D-looking architecture with simplified geometry | visual scale consistent with character |
| Lighting | warm diffused key light + soft grounded shadow | light direction same across packs |
| Materials | matte/clay-inspired clean plastics, cloth, brushed details | avoid shiny game-toy overload |
| Depth | shallow believable isometric/three-quarter scene | scene perspective matches character placement |
| Background | transparent/quiet neutral variant; no busy artwork behind text | usable in multiple Business themes |
| Accents | DRVO Plum `#74536E` + Teal `#1A7B80` for global preview only | if Business colors differ, color safe scene props only |
| Text/logos | **UI overlay, not baked into illustration** where possible | right-to-left / left-to-right safe |
| Expressiveness | small meaningful gestures; consistent calm eyes/expressions | no payment or ledger celebration |
| Variants | hero portrait, compact thumbnail, simple static fallback | mobile crop and reduced-motion safe |

## 3. Asset 01 — DRVO Barber Character (first identity)
**Purpose:** Salon industry setup/welcome, empty appointment list, optional safe tips.
**Pose:** friendly standing barber holding comb and professional scissors safely; warm approachable expression, not oversized ridiculous proportions; apron with subtle blank badge area reserved for optional UI-logo overlay.
**Views:** medium 3/4 hero, waist-up square, neutral pose, pointing to setup action, concerned/helpful empty-booking expression. Alternate gender/skin tone/age expressions later when first art language validated; avoid suggesting only men work in salons.
**Do NOT:** use an existing influencer's face, embed Cut Salon name inside character, overuse large barber portrait on cashier transaction or accountant screen.
**State keys (conceptual):** `salon.barber.welcome`, `salon.barber.helpful`, `salon.barber.empty-bookings`.
**Validation:** same character recognizable in three poses, easy small-scale readability, neutral background, license/ownership verified.

## 4. Asset 02 — Miniature Salon Scene
**Purpose:** Industry selection card / onboarding illustration / optional first-run task completion only after server confirmation.
**Scene:** original clean barber shop storefront and glimpse of chair, mirror and reception; 2.5D/miniature architectural depth with softly lit glass and trimmed plants, professionally restrained tones; **unbranded storefront** so Business logo/name can be placed as UI overlay.
**State keys:** `salon.storefront`, `salon.setup`, `salon.empty-bookings`.
**Motion:** tiny parallax/scene shift during a *voluntary guided onboarding transition*, no permanent moving background. Static fallback mandatory.
**Mobile crop:** support square and vertical/cropped without clipping chair or destroying focal point.
**Focus:** illustration occupies secondary region; primary action and essential Business form remain foreground and accessible.

## 5. Asset 03 — Miniature Real Estate House Scene
**Purpose:** Industry selection / real estate Business intro and scene-to-scene flip prototype. **Not** an assertion that the Real Estate vertical is an implementation priority now (Salon remains pilot, Clinic follows).
**Scene:** original warm modern house or low-rise mixed-use building with miniature landscaping, doorway and optional friendly property professional; free of customer/logo text.
**Visual anchor:** single meaningful building silhouette on calm soft background; both front/side variants generated from same coherent model and palette.
**State keys:** `real-estate.house.discovery`, `real-estate.house.setup`.
**Flip storyboard candidate:**
1. **Before:** house/industry tile static, “ابدأ إعداد نشاطك” visible and usable.
2. **Interaction:** tap/select → scene *card* pivots visually at a small angle, house subtly changes viewpoint; text/UI does not flip or reverse.
3. **After:** new setup context appears immediately, house settles, focus on heading and first action; Back returns logically.
4. **Reduced motion/offline:** immediate transition/static card, no loading gate, no imagery required for functionality.
**Avoid:** mandatory animation on every Page, 3D WebGL dependency or page-level RTL inversion.

## 6. Original character family future packs
- **Clinic:** healthcare professional + facility interior, careful privacy/dignity.
- **Education:** instructor/admin + classroom/library.
- **Retail:** shopkeeper/warehouse associate + storefront/shelf.
- **Restaurant:** chef/front-of-house + professional kitchen/counter.
- **Manufacturing:** operator/engineer with PPE + production miniature.
- **Generic:** neutral helpful Business assistant (not a copied Duolingo character).
**V1 production scope:** first Salon mini-pack and generic fallback recommended, not yet formally committed. Supporting real estate scene is art style validation only.

## 7. Technical handoff (NO CODE)
- Conceptual registry fields: industryKey, assetKey, characterRole, sceneIntent, sourceRights, locale, themeCompatibility, reducedMotionFallback, aspectRatio, version.
- Concepts not approved DB schema. Separate illustration from text and logos; resolve via industry pack and Business Theme safely.
- Support asset fail gracefully, per-Business variant selection only if approved (don't promise uploaded/custom character packs to every Business).
- SVG/canvas/video implementation not decided; ensure no arbitrary user-supplied SVG scripts or unsafe asset injection.
- Share only art concept boards during planning. **Real editable layered art and measured motion prototype are future deliverables.**

## 8. Illustration quality checklist
- Same figure body/face in at least 3 poses and as 64px icon-style crop.
- Salon/house scenes render coherently together with character at desktop and phone widths.
- Safe neutral background with DRVO palette preview and one alternative Business-custom color pack.
- No text baked into scene; locale-dependent type remains real UI text.
- Distinct character identities for each profession without stereotypes or proprietary look.
- Assets meet content/copyright/IP clearance for actual SaaS use.
- No logo/picture/animation may hide Business/Branch, financial state, error recovery, or CTA.

## 9. Layout decision status
**Previous Home, Accounting and POS element arrangements remain REJECTED.** Do not equate satisfaction with character/house visuals to acceptance of those layouts. The next UI mockups must propose genuinely new compositions after the art language and Theme Editor are visually validated.

[ADR-028](../05-decisions/ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md) · [Character & Motion Blueprint](CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md) · [Business Theme Blueprint](BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md).

**No code, migration, service setup, graphic art asset library or product deployment authorized.**
