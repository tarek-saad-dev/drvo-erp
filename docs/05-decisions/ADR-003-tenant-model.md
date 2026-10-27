# ADR-003 — Multi-tenancy baseline

**Date:** 2026-10-27  
**Status:** Accepted direction (implementation choices open)

## Decision

Model Tenant → Businesses → Branches with scoped user memberships. Begin with a shared tenant-aware SQL database, not database-per-customer.

## Guards

Server-resolved tenant context, cross-tenant authorization tests and tenant-scoped relational integrity are mandatory.

## Unresolved

DB vendor, RLS use, restore strategy, subscriptions ownership and future dedicated-DB migration design.
