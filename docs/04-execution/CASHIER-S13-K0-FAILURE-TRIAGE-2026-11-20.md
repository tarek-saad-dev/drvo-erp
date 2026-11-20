# 2026-11-20 S13 private Browser and K0 triage — diagnostic fix PR

**Source SHA inspected:** `e76ffea996f8ae4b280c6530f50e7c5239a48efa`.

**Verified failures (not a green workflow):** [Private Browser run #44751858621](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44751858621) reached `S12 Booking survives browser reload` and advanced through S12 POS, then logged `S13 private HR view and real create through browser` before its 720,000ms parent hard ceiling. The precise stalled HR action is **not proven** by those old logs. [K0 run #44751858614](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44751858614) failed 1/187 because `CUT-03 SourcePaths+BlobSHA` incorrectly contained a **DRVO documentation path** that cannot exist in the immutable Cashier runtime source inventory.

## Changes

- **K0:** remove the DRVO Track D document from `CUT-03.SourcePaths+BlobSHA`, while keeping it in the `TargetPaths` provenance (no invented Cashier blob SHA). Preserve all actual source and fixture paths, and the strict K0 check.
- **S13:** write PII-free breadcrumbs around real HR navigation, heading and form actions; use Playwright `waitUntil:'commit'` for HR navigation while still requiring the real HR heading and all original SQL/UI create + Barber/role checks.
- **Watchdog:** parent reads the existing phase heartbeat every 5s and fails closed if **one phase** stays unchanged for more than 120s. The existing global 12min cap remains as a separate guard. No test steps or assertions are skipped.
- **Regression:** add a static test requiring S13 breadcrumbs and an active phase watchdog; keep existing K0 ledger validator. This is diagnostic hardening, **not proof the underlying HR hang is resolved**.

## Verification / release policy

Run K0 and the full disposable SQL + Chromium S12/S13 job on the **exact new PR commit**. A green K0 plus a faster/more-specific S13 failure is not an end-to-end PASS. If S13 still fails, use the new lastPhase to diagnose real HR route/API/React behavior, fix it and rerun without bypassing checks. Primary SQL024/025, private Owner browser and Cut Salon production activation remain **unverified and blocked**. No VPS access or primary migrations requested.
