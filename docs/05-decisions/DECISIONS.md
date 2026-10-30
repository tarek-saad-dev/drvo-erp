# Architecture Decision Record (ADR) register

> **FOUNDATIONAL DECISION:** [ADR-029 — DRVO ERP Three-Pillar Architecture Mission](ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md) and [Founder Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) govern all future architectural work: Egypt-scale platform, extensible any-industry capability, micro-to-enterprise functional AND technical scale. Do not confuse an ambition with verified deployment capacity.


Accepted directions are **not implemented features**.

| ID | Decision | Status | Record |
|---|---|---|---|
| ADR-001 | Independent repository | Accepted | [ADR-001](ADR-001-new-repository.md) |
| ADR-002 | Modular Monolith | Accepted | [ADR-002](ADR-002-modular-monolith.md) |
| ADR-003 | Multi-tenant shared-database baseline | Accepted direction | [ADR-003](ADR-003-tenant-model.md) |
| ADR-004 | POS core plus industry extensions | Accepted | [ADR-004](ADR-004-pos-extensibility.md) |
| ADR-005 | Documentation as source of truth | Accepted | [ADR-005](ADR-005-documentation-first.md) |
| ADR-006 | Every module must provide Core + Extension architecture | Accepted direction | [ADR-006](ADR-006-every-module-extensible.md) |

| ADR-007 | Required/Optional Dependencies with conflict detection | Accepted | [ADR-007](ADR-007-MODULE-DEPENDENCIES.md) |
| ADR-008 | Opening commission precedence defined by Commission Plan | Accepted | [ADR-008](ADR-008-COMMISSION-PLAN-PRECEDENCE.md) |
| ADR-009 | SQL Server VPS and Windows POS PWA IndexedDB initial direction | Accepted | [ADR-009](ADR-009-SQLSERVER-PWA-OFFLINE.md) |
| ADR-010 | Offline credit and post-sync review | Accepted | [ADR-010](ADR-010-OFFLINE-CREDIT.md) |
| ADR-011 | Offline electronic tender evidence and reconciliation | Accepted | [ADR-011](ADR-011-OFFLINE-ELECTRONIC-PAYMENT-EVIDENCE.md) |
| ADR-012 | Negative stock provisional costing | Accepted | [ADR-012](ADR-012-NEGATIVE-STOCK-COSTING.md) |
| ADR-013 | Late offline posting to open accounting period | Accepted | [ADR-013](ADR-013-LATE-OFFLINE-POSTING-CLOSED-PERIOD.md) |
| ADR-015 | Each Module is a separate visible App tile | Accepted | [ADR-015](ADR-015-EACH-MODULE-INDEPENDENT-APP.md) |
| ADR-016 | Required dependencies shown/priced and approved as one activation bundle | Accepted | [ADR-016](ADR-016-BUNDLED-REQUIRED-DEPENDENCIES.md) |
| ADR-017 | Shared Core + Domain Modules + Industry Solutions | Accepted direction | [ADR-017](ADR-017-SHARED-CORE-INDUSTRY-SOLUTIONS.md) |
| ADR-018 | Repeatable industry expansion + growth-ready SaaS direction | Accepted strategic direction | [ADR-018](ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md) |
| ADR-019 | Conditional Extension vs independent Domain Module boundaries | Accepted | [ADR-019](ADR-019-CONDITIONAL-DOMAIN-MODULE-BOUNDARY.md) |
| ADR-020 | Start Business with essentials, expand Modules later; no standalone Salon Service Execution V1 | Accepted | [ADR-020](ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md) |

| ADR-021 | Recommended customizable Industry Starter with Required dependencies | Accepted | [ADR-021](ADR-021-CUSTOMIZABLE-RECOMMENDED-INDUSTRY-STARTER.md) |

| ADR-022 | Odoo-familiar ERP patterns with simpler original DRVO UX | Accepted direction | [ADR-022](ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md) |

| ADR-023 | Unified Shell with Hybrid per-Module navigation patterns | Accepted direction | [ADR-023](ADR-023-HYBRID-NAVIGATION-BY-MODULE.md) |

| ADR-024 | Original DRVO Plum + Teal + Soft Neutral palette | Accepted visual baseline | [ADR-024](ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md) |

| ADR-025 | ERP professional depth with Duolingo-inspired everyday clarity and original DRVO UX | Accepted direction | [ADR-025](ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md) |

| ADR-026 | Business-scoped theme palettes, central typography and safe custom font capability | Accepted direction | [ADR-026](ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md) |
| ADR-027 | Original profession-specific character scenes and purposeful motion | Accepted direction | [ADR-027](ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md) |

| ADR-028 | Soft 2.5D profession characters + Miniature 3D industry environments | Accepted art direction | [ADR-028](ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md) |

| ADR-029 | Founder architecture mission: national ERP platform, any-industry extensibility, micro-to-enterprise functional and technical scale | Accepted foundational guardrails | [ADR-029](ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md) |

| ADR-030 | Enforce Tenant/Business/Branch isolation through trusted scopes, scoped data, workers and exports | **PROPOSED — founder/security sign-off pending** | [ADR-030](ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) |

| ADR-031 | First POS sale + mandatory Accounting journal atomic A vs durable pending B; separated tender/stock/commission truth | **PROPOSED — founder/finance/architecture choice pending** | [ADR-031](ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) |

| ADR-032 | Business-scoped immutable module activation plan and quote, idempotent entitlement and safe version/dependency lifecycle | **PROPOSED — founder/billing/security approval pending** | [ADR-032](ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md) |

| ADR-033 | Business identity independent of industry; compatible multi-industry capabilities inside one Business while separate legal/financial entities retain Business boundaries | **ACCEPTED — founder** | [ADR-033](ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md) |

**Product launch and pilot decisions** are recorded in [Product Discovery](../01-product/DISCOVERY-01-FOLLOWUPS.md) and [Roadmap](../04-execution/ROADMAP.md).

When superseding decisions, preserve the original and cross-link replacements.
