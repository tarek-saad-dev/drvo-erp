# ADR-021 — Recommended, Customizable Industry Starter Bundles With Enforced Required Dependencies

**Date:** 2026-10-29
**Status:** ACCEPTED by founder — Option B. Detailed manifest/state-machine designs below are PROPOSALS until technical sign-off.
**Related decisions:** ADR-006 Core/Extension, ADR-007 Required/Optional dependencies, ADR-015 independent App tiles, ADR-016 one explicit bundle approval incl. costs, ADR-017/018 Industry Solutions, ADR-019 conditional Domain Modules, ADR-020 incremental Business growth.

## Founder decision

A new Business begins by choosing an **Industry Solution** and seeing a **recommended starter set of Modules and compatible Extensions**. The user **may customize the selection** by adding/removing optional or merely recommended Modules before activation. The platform **must enforce all Required dependencies** of selected capabilities and necessary platform/security/financial invariants. The selected Modules, their transitive prerequisites, activation implications and applicable prices are presented together for **one explicit approval** (ADR-016).

This supersedes both (A) mandatory fixed identical bundles per industry and (C) blank, expert-only assembly of every Module. It supplements ADR-020: later installation of further Modules remains supported.

## Consequences approved as product behavior
1. The starter **is a suggestion, not a license to disable mandatory financial/security capabilities**. A feature cannot operate when its required dependency is absent.
2. Changing the selection must recalculate the complete transitive Required dependency closure, compatibility, available extensions and total price. If a recommended Module is required by another chosen Module, show why it cannot be removed unless the dependent capability is also removed.
3. Distinguish **Platform Foundation** (always required, may be invisible as an App), **Required dependency of a chosen capability** (can become unneeded if dependent capability removed), **Recommended but optional**, and **Optional add-on**. A recommendation's default selection does not turn it into an invariant.
4. The preview must distinguish existing active/entitled Modules from newly required or priced Modules and must not silently purchase additional Modules. Required costs and subscription impacts must be visible before approval (ADR-016).
5. Activation is per Business with Tenant/Business/Branch scopes, RBAC and entitlements. After successful activation each user-facing Module appears as an independent authorized App tile (ADR-015).
6. An Industry Solution is a reusable versioned composition, not a cloned system or irreversible installation; the Business may add compatible Modules later. Platform deployment/release of new Module code is separate from Business activation.
7. This is a **Business onboarding UX and activation rule**, **not** authorization to reduce the founder-approved comprehensive Salon commercial V1 product scope. Salon V1 excludes only the standalone Service Execution app per ADR-020.

## Illustrative example (NOT approved Salon starter manifest)
- Salon selected with POS, Catalog dependency and mandatory financial/authorization controls for real sales; Booking may be recommended but deselectable when no chosen workflow needs it; WhatsApp remains optional if/when released.
- For a future Clinic, recommending Booking does not imply unlocking Clinical Records without its distinct owner/security/consent requirements.
- No hypothetical example is a statement of launched functionality, actual pricing, or a signed-off dependency graph.

## Design guardrails (technical proposal, not new founder decisions)
- **IndustrySolutionDefinition@version** contains industry/market eligibility, starter recommendation rules, Module refs and compatible versions, Extension suggestions, role/config templates and prerequisites.
- **ModuleRegistry** remains source of truth for Module definitions, Required/Optional edges, conflicts, compatibility, lifecycle and permission contracts. A Solution cannot override or weaken these rules.
- **BusinessActivationPlan** resolves normalized requested selection + dependency closure and a versioned quote; checks actor RBAC, Business entitlement, location/country constraints, conflicts and pricing.
- **BusinessSolutionAssignment** stores source Solution version, approved Module/Extension selection and configuration provenance to support future upgrades without unwanted retroactive activations.
- Revalidate plan/quote/permissions/dependency graph at confirmation and use idempotent activation; stale quotes trigger renewed explicit approval, not silent substitutions.
- Platform release (with reviewed common SQL migrations if needed) precedes per-Business activation. Deactivation never deletes historical journals/invoices; restoring/adding Modules does not fabricate unrecorded history.
- Keep app visibility and paid entitlement separate from the minimum financial engine obligations (e.g., if posting a sale requires accounting, disabling a UI tile must not bypass posting).

## Remaining explicit design questions
- Concrete Salon recommended/default selected apps and exact financial Required edges; shape of custom Business (no preset industry).
- Whether Recommended apps are preselected or merely highlighted, and how to explain changing dependencies in real time.
- Role allowed to approve bundle, including paid Modules; pricing, proration, checkout failures and refunds.
- Extension version pinning and upgrading an existing Business across Industry Solution revisions.
- Authorization of an existing Business to switch primary Industry Solution, combine industry contexts or use cross-solution configurations.
- Financial posting consistency, account access and entitled free/paid functional tiers.

**No application code, database migration, testing, VPS or production work authorized.**
