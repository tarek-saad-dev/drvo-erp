# DRVO ERP — Business Theme Engine & Custom Font Asset Architecture Blueprint

**Date:** 2026-10-29
**Status:** DESIGN BLUEPRINT implementing founder-accepted ADR-026; all implementation strategies, schema names, specific UI controls and V1 self-service delivery scope are still proposals. **No coding.**
**Approved intent:** every Business has independent, safe color/typography branding; app's typography is centrally controlled for consistent single-point changes.

## 1. Three authority layers and their precedence

Conceptual resolution (most specific applicable safe source wins):
1. **DRVO Global Defaults** — platform fonts, ADR-024 Plum/Teal fallback palette, semantic statuses, contrast baseline.
2. **Optional Tenant/Industry Preset** — if offered in future, seeds safe defaults; cannot bypass platform invariant. Not yet founder-approved feature scope.
3. **Business Theme Profile** — editable, versioned, explicitly published overrides for brand colors, typography, optionally logo/style; applies to all this Business's authorized Modules.
4. **User Display Preferences** — personal density, reduced motion and accessibility preferences only; cannot mutate Business brand for colleagues or override protected status meanings.
5. **Device/Accessibility Safety Layer** — OS preferred reduced motion, forced/high contrast, font fallback, offline asset unavailability; accessibility has priority over cosmetic overrides.

**Invariants:** Business A theme never leaks into Business B. Tenant switch invalidates theme-specific asset context/cache. A user may have roles in multiple Businesses with different themes. All Modules get the same resolved semantic tokens; Module-specific brand overrides do not happen ad hoc.

## 2. Theme composition and token taxonomy (conceptual, NOT schema/code)

| Token category | Examples | Edit authority / constraints |
|---|---|---|
| Global foundation | `foundation.spacing.*`, layout grid, `type.scale.*` | Product/design system; user cannot break shared geometry |
| DRVO default brand | `brand.primary`, `brand.secondary`, `action.primary` | ADR-024 global fallback, override via validated Business profile |
| Brand-scoped colors | primary/accent/link/selected nav, supporting neutral accent | Business Branding Manager; contrast, derivation, safe gamut, approved preview |
| Semantic roles | `state.success`, `state.warning`, `state.danger`, `state.pending`, `state.neutral` | Protected: approved status meanings/text/icon and safe contrast; not arbitrary custom map |
| Surfaces/text | page, card, border, heading/body | Normally calculated or selected from reviewed safe presets; never allow unreadable text |
| Typography slots | `font.body.ar`, `font.body.en`, `font.heading.ar/en`, `font.numeric`, `font.mono` | Single central resolver; fallback by language/glyph; custom approved font family pack allowed |
| Component mapping | `button.primary.*`, `table.header.*`, `nav.active.*` | Design system maps semantics; Business cannot inject arbitrary custom CSS |
| Illustration/motion | active industry pack, permitted scene style, user motion preference | Character registry and motion contracts per ADR-027; per-Business optional selection extent TBD |

**Example fallback, not required client visual:** ADR-024 Primary Plum `#74536E`, Deep Plum `#553E53`, Teal `#1A7B80`, Canvas `#F7F6F8`, Panel `#FFFFFF`, Text `#27242B`. For a blue-branded Clinic Business, a *validated business branding override* may replace Plum/Teal in appropriate navigation/action accents while `Posted`/`Pending`/`Reversed` remain truthful and distinct.

## 3. Conceptual domain ownership (PROPOSAL)

| Entity/contract name | Contains | Authority |
|---|---|---|
| `ThemeDefinition` | system token baseline, version, supported semantic roles | DRVO platform release |
| `ThemePreset` | selected safe color/font families for setup, if offered | DRVO design admin |
| `BusinessThemeProfile` | Business ID, overrides, selected font-pack IDs, optional logo, status, version | Business branding role |
| `ThemeRevision` | draft/published, actor, date, validation, rollback target | audited Business change history |
| `FontAsset` | asset ref, scope, owner, mime/signature, coverage, license attestation, processing state | asset validation service |
| `ResolvedTheme` | deterministic effective token + font URL refs + semantic-safe version/hash | trusted theme resolver |
| `UserUIPreferences` | density, motion preference, accessible mode | individual user, role-safe |

These are **NOT** approved database tables. If shared SQL Server V1, keep Tenant/Business boundary and platform-owned references. Avoid storing raw font binary in ERP transactional SQL tables; physical asset store decision remains open.

## 4. Configuration UX: proposed Business Branding Settings
- Open **Settings → Business Appearance** only for authorized Business Brand Admin/Owner.
- Start from current published theme (not forced to edit every token).
- **Colors**: safe palette presets, small number of brand-primary/secondary/accent inputs, live demonstration of button/nav/form/calendar/finance status plus contrast/error explanation. Selecting an invalid color combination offers safe variants; no silent inaccessible publication.
- **Fonts**: dropdown of platform-approved pairs + upload workflow, explicit language coverage preview with Arabic/Latin/numerals including 123/١٢٣, and low-resolution/slow-network fallback. Body, Heading and Numerical role selection from central slots.
- **Preview**: Desktop Accounting List/Form (dense), Owner Home (friendly), POS (operational), RTL and LTR, focus/hover/disabled and status chips.
- **Save as draft** → validate → **Publish** with audit metadata → safe cache version update; **Revert to previous** or DRVO default. Other Business users see published theme only.
- **Do not** introduce arbitrary font URL fields, inline CSS editors, JavaScript upload or reusable global brand changes by accident.

## 5. Fonts: secure lifecycle and legal/operational contract
1. Authorized Business admin selects from licensed library or uploads a file from a supported, eventually **approved allowlist** (e.g., WOFF2 as output; whether accepted source TTF/OTF is deferred).
2. Server enforces Business scope, file size/count quotas, MIME **and** magic/signature checks, malware scanning, parser/sanitizer isolation, malformed font rejection and exact content fingerprint. Trusted asset processing not browser injection.
3. Collect *license-to-embed on a SaaS website* confirmation, asset ownership, handling policy and removal/refund terms; do not redistribute unlicensed font files.
4. Verify glyph coverage Arabic (shaping, ligatures), English, digits, punctuation, mixed RTL/LTR, required weights and web rendering; reject unsafe/unsupported pack or fall back per language/weight.
5. Publish only safe vetted font assets via approved secure origin and CSP, cache by immutable content hash + version with preload only where necessary.
6. Changes activate atomically by `BusinessThemeProfile` version; failed upload/processing does not break last published theme. Offline POS continues using safe locally available cached fonts/fallback; never blocks sale on font network.
7. Delete/revoke retains integrity of UI history/audit and migrates active Business to approved fallback; font file removal/access scope and retention remain designed and documented.

## 6. Theme resolution lifecycle and performance
- Resolve theme **once per Business context**; distribute to App Shell and all authorized Modules, including POS and the add-on store; don't fetch themes independently for every screen.
- Use signed/trusted server response and allowlisted token values; no arbitrary HTML/CSS/JS injection. Client can set CSS variables/token context once when actually implemented, but **this document does not authorize implementation**.
- A Business switch flushes potentially sensitive scoped app data/themes, then applies correct published theme before painting. Design to avoid cross-business flash of stale logo/colors/fonts (SSR/hydration, cached themes); strategy pending.
- Asset cache keys include Business/version/asset digest; cross-Tenant data isolation and authorization checks required.
- Font loading should be nonblocking; initial display uses legible fallback, avoids large layout shifts; don't degrade cashier first-sale latency.
- Atomic publish + rollout + rollback must avoid partially updated CSS or mixed font/color versions across modules.
- Theme resolves safely in printed invoices/exports via a **controlled printable template**; Business brand does not change signed amounts, tax details, legal text or other audit facts.

## 7. Accessibility and status policies
- Validate body, button, label, table row, links, focus and selected text against target WCAG AA contrast under actual states in Arabic/English, not just isolated swatches.
- Colorblind-safe statuses use text/icon as well as safe colors; success/warning/danger remain semantic even if Business wants a matching-brand status palette.
- Screen reader/keyboard and reduced motion/high contrast preferences override branding when needed for accessibility.
- Responsive visual previews at 390px, 768px, 1280/1440px and Windows POS 1366x768, 200% zoom.

## 8. Example: one Tenant with separate Businesses
- **Business A Salon:** brand Plum/Teal or its approved customized dark-blue accent; Arabic body font chosen by Salon owner; POS and Booking inherit; employee B's personal compact-density pref doesn't change branding.
- **Business B Timber Manufacturer:** its own gray/orange approved brand profile and Latin/Arabic licensed fonts; Purchasing/Inventory/Accounting inherit that theme; switching between A/B must re-evaluate tokens, permission, data and asset cache.
- **DRVO Control Center:** remains platform-owned, not recolored merely because support operator opens a Business record.

## 9. Decision matrix: owner vs employee vs platform

| Customization | Business owner / branding role | Ordinary employee | DRVO platform operator |
|---|---|---|---|
| Business brand colors | Can preview/publish validated profile | View resolved theme only | Maintain safe defaults/validation |
| Pick font pack | Can select compatible released pack | No org-wide edits | Manage approved font library |
| Upload custom licensed font | Capability direction accepted, rollout/auth limits TBD | No | Validate/storage/moderation |
| Logo/illustration pack | Possible controlled Business option (exact scope pending) | No | Supply licensed packs |
| Personal density / motion | May use own preference | May use own preference | Define accessible defaults |
| Success/error/payment semantics | Cannot override correctness semantics | Cannot override | Design and enforce invariant |
| Raw CSS/JS injection | Never | Never | No untrusted injection in client theming |

## 10. V1 architecture readiness gates (not build permission)
- Define actual `BusinessThemeProfile` and theme resolver contract, only safe immutable tokens.
- Decide security-reviewed custom font pipeline vs staged rollout; remember support in *architecture* is founder-approved, but self-service upload feature delivery date isn't approved.
- Draft font licensing policy, font preview tests and fallback strategy.
- Define theme publish/rollback/audit, RBAC and precedence; test cross-Business switching/offline POS.
- Review full Design Kit requirements, single source of truth for color/typography and **no per-Module arbitrary overrides**.

**Links:** [ADR-026](../05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md), [Character & Motion](CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md), [Design Tokens](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [Industry Solutions](INDUSTRY-SOLUTIONS-ARCHITECTURE.md).

**No application code, database migration, asset processing deployment or Figma file creation authorized.**
