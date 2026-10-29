# ADR-026 — Business-Scoped Visual Themes, Central Typography and Safe Custom Font Support

**Date:** 2026-10-29
**Status:** ACCEPTED PRODUCT/ARCHITECTURAL DIRECTION by founder. Exact schema, APIs, implementation, quota/pricing and font upload UX remain DESIGN DRAFT.
**Related:** ADR-003 tenant/Business isolation; ADR-015 independent Module Apps; ADR-017 Industry Solutions; ADR-022 original DRVO UI; ADR-023 hybrid navigation; ADR-024 DRVO Plum/Teal baseline; ADR-025 UX North Star.

## Problem and founder instruction
Every Business should be able to customize its system's **color palette** and **fonts** (choose supported fonts or upload its own licensed fonts). The overall application typography must be changeable from a **single central source**; no independent hardcoded font-family across Modules. Design for this from V1 architecture, rather than adding Business branding as a breaking retrofit. Previous presented page layouts were rejected; no prior screen composition is accepted as final.

## Accepted decision
1. DRVO will have a **central, token-driven Theme Engine** with Business-level brand/palette and typography configuration. The entire authorized Business UI consumes resolved semantic design tokens, not individual hard-coded color/font values.
2. **Business-specific overrides** are supported across its activated Modules and applicable industry surfaces. ADR-024 Plum `#74536E`, Deep Plum `#553E53`, Teal `#1A7B80`, Page `#F7F6F8`, White `#FFFFFF`, Text `#27242B` remain the **DRVO default and safe fallback**, not mandatory fixed colors for every Business.
3. A Business administrator with **explicit branding permission** may choose an approved font family/pack or submit a custom-licensed font file subject to validation, preview, security processing and publication controls. This is an accepted **capability direction**, not an approved arbitrary untrusted font executable/URL mechanism.
4. Keep Typography **centrally mapped** (body, heading, numeric and monospace roles, weights and fallbacks), supporting Arabic RTL + English LTR. New shared components and Modules must not set custom font families ad hoc.
5. **Color override is constrained** by readability, accessible contrast, focus, transparent status semantics and payment/offline/financial state truth. Success, error, pending and warning semantics cannot be freely redefined or hidden by custom brand colors.
6. Themes are scoped to **Tenant → Business** with a DRVO global baseline and optional future Tenant/Industry presets; users can choose personal display preferences (e.g., density/reduced motion), but may not change organization branding for others without authority.
7. Switching Business must deterministically swap theme, font and assets without leaking previous Business's configuration or records; a failed/unavailable custom font loads a legible built-in fallback.
8. Keep global DRVO product identity and trust/security/legal disclosures independently identifiable from Business brand; optional logo customization does not make the service legally a full white-label reseller product. White-label packaging/commercial rights are separate decisions.

## Governance and privacy
- Theme changes must be **previewable**, reversible to last known-good and factory DRVO defaults; publish is audited and authorized.
- No free-form custom CSS/JavaScript/remote stylesheet insertion as the primary theming path. Use allowlisted semantic tokens and trusted compiled assets.
- Font uploads must be licensed for SaaS/web embedding and pass MIME + signature checks, size/quantity limits, malware checks, metadata review and glyph coverage tests. Validate effective font embedding rights and regional privacy/storage constraints before shipping.
- Uploaded font assets stay tenant/business-scoped as necessary; serve through approved origin/CDN with CSP and safe caching. Do not silently expose private fonts across Businesses/Tenants.
- Theme contrast validation checks actual combinations and interaction states. Approved semantic defaults and a safe override policy keep accessible affordances, even if a custom branding choice is rejected.
- Separate **branding owner permissions** from normal employee UI preferences; brand edits must never alter RBAC, financial entitlements or ledger behavior.

## Future-proof but pragmatic V1
Create *the architectural seam* for Business-specific Theme Profiles, token resolution and a font asset lifecycle as part of initial UI architecture. **How much self-service theme editor/upload UI actually ships in first commercial V1 remains to be scoped**; do not quietly assert fully working custom font processing without code/tests or an explicitly approved V1 backlog.
- All Modules reuse a shared theme context; specialized POS rendering must load cached safe theme/font without slowing transactions or disrupting offline safety.
- Cost/performance budgets and compiled CSS/asset strategy are design tasks, not founder-approved infrastructure choices.

## Not decided
- Exact font file formats and size thresholds; Arabic/English font pair defaults; whether custom font upload is a paid Enterprise feature or included universally.
- Whether employees may adjust personal accent, layout density or optional dark mode; tenant-wide default policy.
- Full dark mode generation, accessible derived palette algorithm and contrast thresholds beyond existing WCAG target.
- Theme versioning schema/database/storage, preview/publish routes, dedicated CDN/retention and backup restore.
- Number of theme presets, support for custom Business logo, export/portability, licensing indemnity and moderation workflow.

## Links
[Business Theme Engine Blueprint](../02-architecture/BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md) · [Design Tokens](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md) · [ADR-024](ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md).

**No code, schema migration, server changes, production deployment or UI implementation authorized.**
