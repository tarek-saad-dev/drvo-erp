# ADR-006 — Core + Extension for every module

**Date:** 2026-10-28  
**Status:** Accepted direction (specific implementation contract pending)  
**Decision owner:** Founder

## Context

DRVO is designed as a composable, evolving ERP for many industries. The initial POS-only core/extension model is insufficient for that vision.

## Decision

**Every module, without exception, must have a defined Core + Extension architecture.** Core contains shared domain capability and public contracts; Extension(s) provide specialized functionality and customization.

## Constraints

- Extensions may not bypass tenant isolation or authorization.
- Core must not depend on a specific industry implementation.
- Avoid duplicating core logic.
- Maintain explicit compatibility, permissions and migration rules.
- The requirement does **not** yet settle physical package boundaries, registration, plugin lifecycle, per-tenant enablement or whether a module with no specialized workflow needs a separate no-op extension artifact.

## To decide before implementation

Specify contracts, dependency boundaries, versioning, activation, testing, fallback behavior and error containment. Record in a follow-up architecture ADR and module specifications.

## Relation

[ADR-004](ADR-004-pos-extensibility.md) remains the original POS-specific decision; ADR-006 expands it to all modules.
