# ADR-004 — Shared POS core and industry extensions

**Date:** 2026-10-27  
**Status:** Accepted

## Decision

Common POS engine owns sales/cart/payments/discounts. Salon/Retail extensions supply business-specific policy and workflow without copying the engine.

## Examples

Salon: worker assignment, service commission and booking links. Retail: barcodes, stock and units.

## Consequences

Defined extension contracts and module tests are needed. Start with Salon and validate extensibility with Retail.
