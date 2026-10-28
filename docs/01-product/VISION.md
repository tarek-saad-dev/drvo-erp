# DRVO ERP — Product Vision

**Discovery baseline:** 2026-10-28  
**Source:** Founder discovery — Section 1 (10 responses)  
**Status:** Confirmed product direction; detailed scope/architecture pending

## Product vision

DRVO ERP is a **comprehensive modular ERP SaaS platform** for businesses that grow and evolve. A customer assembles the system they need from independently scoped modules, with room to add new capabilities as their operations change in subsequent years.

The product must offer useful experiences for owners, partners, directors, managers, employees and end customers. DRVO aims for high functionality **without exposing unnecessary complexity to non-technical workers**.

**Scope of ambition:** a comprehensive ERP as the target product, delivered incrementally rather than all at first launch.

## Differentiation — founder-confirmed

1. **Composable and extensible:** business owners can combine modules like puzzle pieces; new capabilities can be added as a business grows.
2. **Stakeholder coverage:** relevant tools and experiences for owners, partners, managers, staff and customers.
3. **Multi-branch visibility:** consolidated supervision with effective mobile access.
4. **Ease of use and continuous product evolution:** powerful functionality with easy interfaces and ongoing extensions.

The founder describes a **Core + Extension** direction across modules (including POS and Booking), not just POS. This is an architectural design objective, **not yet a mandate that every module must contain a separate extension package**. Extension points will be justified and specified per module.

## Initial customer and markets

- **Primary initial customer:** a medium-sized business with a chain of branches.
- **Markets:** Egypt and Gulf countries from the product strategy outset. Country-by-country rollout, localization, taxes, regulatory requirements, payment integrations and launch order are not yet decided.
- **Industries of interest:**
  - Barber salons, beauty salons and cosmetic/aesthetic clinics.
  - Medical clinics.
  - Supermarkets.
- **First commercial vertical:** Barber salons (Salon First) — confirmed.
- **Second vertical:** **Not yet confirmed.** Earlier direction was Retail next; the latest discovery list puts medical clinics ahead of supermarkets but did not explicitly specify rollout order. See open questions.

## Product positioning and UX

Odoo is the founder's closest reference and aspiration in ERP breadth/modularity. DRVO may adopt useful UX patterns, but **will create original implementation, branding and interface designs**, not literally copy protected assets/UI.

A non-technical employee must be able to accomplish daily work easily, while advanced users can access richer management functionality. Mobile monitoring and multi-branch operations are important product capabilities; exact mobile form factors remain open.

## Definition of success

Founder-defined success: **businesses using DRVO measurably improve their operations**.

Metrics and baselines for three-month and one-year milestones have **not yet been specified**. Candidate metrics for discussion: cashier time per sale, booking errors, manual reconciliation effort, staff adoption, multi-branch reporting time, and customer satisfaction. These are suggestions, not adopted targets.

## Delivery principles (previously accepted)

- New standalone repository: DRVO ERP.
- Preserve Cashier as an operational legacy reference; port business rules selectively.
- Modular Monolith first.
- Multi-tenant, multi-business, multi-branch architecture.
- POS Core with industry extensions; module-wide extensibility model to be designed.
- Salon First.
- GitHub documentation is the source of truth.
- Deliver end-to-end slices and do not confuse product vision with an MVP commitment.

## Clarifications still needed

See [discovery follow-ups](DISCOVERY-01-FOLLOWUPS.md) and [open questions](../04-execution/OPEN-QUESTIONS.md).

## Change process

Changes to accepted direction require updating this document, the discovery record and affected ADR/roadmap documents. Preserve historical decisions.
