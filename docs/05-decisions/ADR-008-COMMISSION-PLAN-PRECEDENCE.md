# ADR-008 — Commission Plan Decides Opener Rate
Date: 2026-10-29
Status: Accepted business decision; specific policy-rule authoring model still to design.

## Decision (founder approved)
Opening commission calculation and precedence between employee-specific and service-specific rules is configurable under **Commission Plan**. DO NOT hardcode employee-first or service-first precedence. This supersedes a fixed universal 10% opener rate, but 10% can remain as a configured default/example.

## Existing constraints retained
- Up to one opener per service, opener not the executor.
- Opening commission base = discounted service price **before tax**.
- Executor alone credited service Target; revenue counted once.
- Reversal after refunds; no historic commission rewrite, use documented adjustment.
- Plans and targets may differ by Branch; daily accrual and monthly closing.

## Recommended implementation (proposal)
Effective-dated, versioned per-employee/per-service rule sets with explicit priority, deterministic ties and immutable applied rule snapshot on invoice attribution. Fail ambiguities at plan publication. Refund recalculation uses original snapshot. Audit rule changes and RBAC authorization. Rounding, precedence UI, effective-date changes remain separate design questions.
