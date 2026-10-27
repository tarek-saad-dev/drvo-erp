# ADR-001 — Independent new repository

**Date:** 2026-10-27  
**Status:** Accepted

## Context

Cashier POS evolved around salon-specific workflows, making it a poor base for a multi-industry product.

## Decision

Create DRVO ERP independently. Keep Cashier running and use proven business behavior/code as reviewed reference material.

## Consequences

Cleaner architecture; selective migration required. No direct copy of existing DB schema.
