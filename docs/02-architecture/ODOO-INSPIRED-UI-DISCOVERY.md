# DRVO ERP UI/UX — Odoo-inspired product design proposal
Date: 2026-10-29
Status: DRAFT; no mockups, production UI, or copyrighted assets copied.

## Goals
Familiar ERP affordances, simpler first-screen navigation and clear Arabic RTL and English LTR. Existing Business and Branch selector; module app launcher, actionable notifications and owner-relevant summary; manager/cashier paths differ; feature visibility gated by entitlements, RBAC and active module flags.

## Shared UX skeleton
Login -> Business selector (only when multiple) -> Business Home with activated apps -> inside module consistent sidebar, breadcrumb, filter/search, List/Form/Kanban/Calendar/Charts where applicable. The Windows POS is a dedicated distraction-free cashier interface, not an admin form.
App Store: installed and available modules with required/optional dependencies, extension compatibility, plans, detailed preview and activation permissions.
Business setup: select industry starter pack and business details, then initialize only approved modules; no huge form.
Design system: own DRVO iconography, typography, color, spacing, tables, field widgets, dialogs and components; keyboard accessibility, readable density, fast navigation, Arabic-first RTL, responsive support.

## Odoo as reference, not source to clone blindly
Official reference: https://www.odoo.com/page/all-apps
Official module docs: https://www.odoo.com/documentation/19.0/developer/reference/backend/module.html
Official license: https://www.odoo.com/documentation/19.0/th/legal/licenses.html
Official view taxonomy: https://www.odoo.com/documentation/19.0/applications/productivity/studio/views.html
Reusable ideas: app launcher, generic form/list/kanban, unified filter bar, quick create, per-module side navigation, configurable views and app management.
Do not copy Odoo Enterprise source, licensed themes, distinctive brand assets, icons, proprietary code or screen designs pixel-for-pixel without valid rights. LGPL community reuse requires license compliance; using patterns without taking code/assets is lower risk. Build a separately branded DRVO implementation.

## UX verification before coding
Approve 5 high-fidelity **original DRVO** design screens: Business App Home, Module Store, POS, module List/Record view, new Business onboarding. Test both Arabic RTL and English, owner/manager/cashier tasks, empty/loading/permission states and large invoice tables.


## Industry discovery and 100+ sector navigation — approved direction 2026-10-29

Founder accepted Industry Solution selection as customer entry point: searchable/filterable sector catalog (e.g., Beauty & Services, Healthcare, Education, Real Estate, Manufacturing, Trade & Distribution). Selecting a sector chooses a compatible starter composition; required apps/costs still require explicit approval (ADR-016). An unsupported sector should offer a transparent request/discovery path rather than false availability. **Industry Solution is not one giant app**: once Business is entered, show only activated/authorized independent app tiles (ADR-015); owner may switch among Businesses of different industries.

A future **DRVO Platform Control Center** is distinct from any customer's ERP UI and is intended for solutions, registry versions/extensions, tenants, plans, rollout and health/capacity. Avoid a flat grid of 100 industries inside customer app home. UI specifics, access and screens remain drafts. See [SaaS Catalog and Control Center](SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md). Original design direction (not Odoo pixel-copy) remains.


## Detailed DRVO ERP UI Kit blueprint — 2026-10-29

The earlier sketch is expanded in [DRVO ERP UI Kit Blueprint](DRVO-ERP-UI-KIT-BLUEPRINT.md): layout tokens, app shell, view engine, reusable controls, transaction/offline states, RTL/LTR and source design deliverables. Functional UX can be benchmarked against Odoo 19, but DRVO must own its visual identity and not copy proprietary Enterprise assets/code. New [Pricing Discovery](../01-product/SAAS-PRICING-STRATEGY-DISCOVERY.md) is a DRAFT, **not** a pricing policy or price list. No UI kit code or editable Figma/Canva asset has been created.


## Selected UX direction — ADR-022, 2026-10-29

Founder chose Option A: **Odoo familiarity + unique DRVO identity and simplified ERP UX**. This confirms functional pattern and interaction direction, NOT any exact visuals, copyrighted assets or React implementation. Comprehensive design specs: [App Shell](DRVO-APP-SHELL-UX-SPEC.md), [Tokens & Components](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [View Patterns](DRVO-VIEW-AND-SCREEN-PATTERNS.md). [Hybrid Pricing](../01-product/HYBRID-PRICING-MODEL-ANALYSIS.md) remains commercial research, not an accepted plan or price list.


## Hybrid Navigation accepted — ADR-023 (2026-10-29)

Founder chose Option C: a common original DRVO App Shell with **Sidebar, Tabs or focused Workspace** per Module, rather than universal Sidebar or topbar-only. This remains Odoo-familiar in conventions without copying proprietary visual assets/code. [ADR-023](../05-decisions/ADR-023-HYBRID-NAVIGATION-BY-MODULE.md), [Hybrid Navigation & RTL/App Launcher](DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md), [List/Form details](DRVO-LIST-FORM-UX-DETAILED.md) specify design proposals; measurements, final Module patterns and visuals are not yet approved.
