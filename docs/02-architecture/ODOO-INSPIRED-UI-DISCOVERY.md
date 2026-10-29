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
