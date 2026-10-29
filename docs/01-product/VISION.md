# DRVO ERP — Product Vision

**Updated:** 2026-10-28  
**Source:** Founder discovery, Section 1 + six approved follow-ups  
**Status:** Product vision approved; feature/MVP scope and technical choices pending

## FOUNDER'S PRIMARY ARCHITECTURE MISSION — 2026-10-30

**This is the overarching project purpose, not a decorative future feature:** DRVO ERP aspires to become one of Egypt's largest ERP platforms, expandable into **any economically viable industry after proper discovery/engineering**, and able to serve Businesses from **very small to very large** using both progressive compatible Module activation **and separately tested infrastructure/operational scalability**. Build one product platform, not per-customer ERP forks. The three pillars are founder-approved design guardrails under [Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) and [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md). No claim of already leading Egypt, instantly supporting every industry, or current unlimited Enterprise workload. All future V1/industry/pricing decisions must pass the [Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md).

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


## Founder-approved multi-industry product line — 2026-10-29

DRVO ERP is intended as a **multi-industry SaaS product platform**, not a separate clone of Salon, Clinic, Education, Real Estate and Manufacturing systems. Shared stable business capabilities (e.g., invoices, booking, cash/treasury, accounting, reporting) are reused; scoped Industry Extensions alter compatible workflows; genuinely distinct domains (clinical records, courses/enrollment, property/deals, MRP/manufacturing) become owned Modules with their own Core + Extension contract. A reusable **Industry Solution** composes released Modules, extensions, defaults and onboarding into a specialized customer product. This is accepted product direction [ADR-017](../05-decisions/ADR-017-SHARED-CORE-INDUSTRY-SOLUTIONS.md).

New industries follow Discovery → Fit-Gap → Domain Design → Module/Integration Design → UX → Engineering/QA → Cutover → Productization, so later similar customers can start from a versioned Solution instead of a custom fork [ADR-018](../05-decisions/ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md). Industry Solution selection may precede app activation, but each visible app remains independently navigable (ADR-015) and required paid dependencies remain explicitly bundled/priced/approved (ADR-016).

**Ambition vs capability:** extendibility is a long-term design goal; readiness for every industry, customer size, country, compliance regime or performance tier is NOT an existing feature or a guarantee. Salon V1 remains first; Clinics second. Manufacturing, education and real estate are hypothetical future industry examples and are not launch commitments.
