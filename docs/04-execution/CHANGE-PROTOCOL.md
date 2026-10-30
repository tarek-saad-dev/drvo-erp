# Documentation change protocol

> **MANDATORY FOUNDER ARCHITECTURE CHARTER FIRST:** [Project North Star](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) and [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md). Each material platform/Module/Industry/enterprise-size decision MUST complete the [Architecture Fitness Record](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md) covering all three pillars (Egypt-scale platform, any-industry extensibility, micro-to-enterprise functional AND operational scale). No silent architecture exceptions or unsupported capacity claims.


1. **Capture:** describe requested change and expected business outcome.
2. **Impact analysis & Charter fitness:** identify affected Modules, interfaces, data, finance/security, operations and docs; assess the **three founder pillars**, minimal Business vs very large Enterprise, reuse vs industry fork, and capacity/tenant placement. Mark PASS / NEEDS DESIGN / BLOCKED and document evidence gaps.
3. **Decision:** for material architectural choices, write a new ADR. Never silently erase the old rationale.
4. **Update spec:** edit canonical architecture/module/product docs and links.
5. **Implement:** ship small, tested changes.
6. **Verify:** collect test/CI and deployment evidence; don't claim production success without proof.
7. **Sync status:** update CURRENT-STATE, ROADMAP and CHANGELOG with relevant commit/PR references.

## Status vocabulary

Proposed → Accepted → Planned → In progress → Implemented → Tested → Production verified.

An accepted decision is **not** implemented code. Rejected/superseded ADRs remain accessible for history.

## Definition of done

For implemented features: specification + security/tenant checks + migration (if relevant) + tests + code review + evidence + updated documentation. For production verified: deployment and end-to-end smoke checks.

## Sources

Repository documentation and reviewed commits are canonical. ChatGPT/Cursor conversations are supporting material.


## Constitution-first scope control — 2026-10-30

Before drafting any new technical ADR, read [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) → [Core Architecture Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md). **Classify the change first:** (a) universal platform law/boundary → review NOW in Phase 0; (b) specific Module operation, event enum, payment account, SQL index or UI step → defer to its Module design phase and retain as a **PROPOSED working draft**. An accepted founder product behavior inside a specialist ADR still remains accepted. The existence of a detailed draft never turns its unapproved options into binding Constitution law. Any real exception must document pillar/law impact, migration/exit and explicit founder approval. Phase 0 authorizes docs review, **not application code/tests/migrations/deployment**.
