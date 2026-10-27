# ADR-002 — Modular monolith

**Date:** 2026-10-27  
**Status:** Accepted

## Decision

Start with one deployable backend with separated business modules, explicit contracts and shared tooling; do not launch as microservices.

## Rationale

Faster delivery and lower operational complexity without giving up internal boundaries.

## Revisit if

Independent scaling, organizational boundaries or deployment requirements justify service extraction.
