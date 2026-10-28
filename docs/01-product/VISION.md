# DRVO ERP — Product Vision

**Updated:** 2026-10-28  
**Source:** Founder discovery, Section 1 + six approved follow-ups  
**Status:** Product vision approved; feature/MVP scope and technical choices pending

## Product vision

DRVO ERP is a **comprehensive, modular, multi-tenant ERP SaaS platform**, delivered incrementally. Businesses can assemble capabilities like puzzle pieces and expand them over time. It should support owners, partners, directors, managers, employees and customers, while remaining easy for non-technical staff.

**ERP completeness is the long-term product vision, not a requirement to ship every ERP module in the first release.**

## Confirmed differentiation

- Composable modules and ongoing business-specific expansion.
- Useful features for all business stakeholders.
- Multi-business and multi-branch operation and mobile supervision.
- Usability and simplicity for non-technical workers.
- **Core + Extension for every module, without exception** — approved architectural requirement. Exact extension contract, packaging, lifecycle, scope and how to represent modules without active industry-specific behavior remain a design task. Do not equate this requirement with copying code or creating placeholder extensions.

## Customer and geography

- First-year ideal customer: medium-sized companies with multiple branches.
- **Commercial launch markets: Egypt AND Gulf countries from initial launch** (confirmed). Specific Gulf countries, regulatory/localization readiness and rollout mechanics remain open.
- **Initial vertical: barber salons. Second vertical: medical clinics** (confirmed, superseding the earlier Retail-second roadmap).
- Additional target sectors: beauty salons, aesthetic clinics and supermarkets; their precise release sequence is undecided.
- **First real-world pilot: Cut Salon** (confirmed). Pilot migration, coexistence and acceptance requirements are still open.

## UX and channels

- Odoo is the functional inspiration, with distinct DRVO implementation and identity.
- Easy daily workflows for non-technical employees, rich functionality for management.
- **First-release mobile delivery: responsive web / PWA** (confirmed); native mobile apps are not an initial requirement.

## Definition of success

The system measurably improves client businesses' operations. Specific three-month and one-year KPIs remain to be established.

## Delivery principles

- Independent repository; legacy Cashier remains separate and available for selective reuse.
- Modular monolith; shared tenant-aware database as initial direction, design details pending.
- Industry capabilities provided through module core/extension structure.
- Release incrementally; avoid treating the full ERP ambition as first-release scope.
- GitHub documentation is the source of truth.

See [Section 1 discovery](DISCOVERY-01-FOLLOWUPS.md), [roadmap](../04-execution/ROADMAP.md), [decision log](../05-decisions/DECISIONS.md) and [open questions](../04-execution/OPEN-QUESTIONS.md).
