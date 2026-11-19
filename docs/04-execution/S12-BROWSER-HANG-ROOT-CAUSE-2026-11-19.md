# S12 Salon Private Browser hang — root cause (2026-11-19)

## Incident

- Failed/hung run: https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44578301185 (attempt 3)
- Prior failures: https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44570523438, https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44575723285
- Starting tip under investigation: `d338449` / later `a56d3e9`

## Root causes (stacked)

1. **Booking readiness vs SQL024 search (44570523438)**  
   Booking client probed `GET /customers?q=` for page readiness while disposable browser SQL historically stopped at SQL018. SearchCustomers missing → `prerequisites` status → resource form never rendered → `getByLabel('اسم المورد').fill` timed out.  
   Diagnostic `scopePresent:false` was a UUID case-compare false negative while all scoped HTTP codes were 200.

2. **POS UX assertion drift (44575723285)**  
   After Cashier workstation transplant, S12 still expected heading `مسودة بيع — معاينة الأسعار`, placeholder `اكتب اسم العنصر`, and `+ Service —` quick-add buttons. Actual UI: `نقطة البيع — مسودة تشغيل`, Cashier catalog browser labels/buttons.

3. **Harness hang (44578301185 attempt 3)**  
   `tools/salon-browser/run.cjs` `childCheck` waited on the Chromium child with **no hard timeout**. If Playwright stalled, the workflow Verify step could run for hours inside the 45m job budget without a final PASS/FAIL. Cancelled after prolonged in_progress.

## Fixes shipped

- Booking prerequisites use `GET /customers` (customers.read); `?q=` only after operator types.
- Disposable browser SQL applies migrations through **024** and asserts `SearchCustomers` EXECUTE.
- S12 Chromium uses Business customer search UI + Cashier POS workstation selectors.
- `childCheck` hard ceiling **12 minutes** + SIGKILL; Playwright contexts set 45s default timeouts.
- Booking create asserts POST `/booking/appointments` HTTP 200 before row waits.
- Diagnostics include `customers?q=` status, `bookingReady`, case-insensitive scopePresent.

## Verification required

Fresh Salon Private Browser CI PASS on the exact repair commit SHA (not claimed until green).

Disposable CI ≠ Owner authenticated production browser ≠ primary DB SQL024/025 apply.
