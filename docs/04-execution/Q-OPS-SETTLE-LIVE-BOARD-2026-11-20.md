# Queue Ops — settle-expired + live board (2026-11-20)

**Status:** PORTING / disposable CI intended. **Not** Owner-browser or primary-DB verified. **ADR-031** remains out of scope.

## Scope delivered

- Cashier pin `046bf19` lifecycle + operator settle-expired button path.
- Shared `queue-lifecycle-rules.ts` (Nest byte-identical copy): effective status, settle eligibility, overdue finish-required.
- SQL036 additive AutoClose columns + `core.SettleExpiredQueueTickets` (WAITING/CALLED past grace → NO_SHOW).
- Nest list enrichment + `POST .../queue/settle-expired`.
- Private Light grouped WAITING/CALLED/IN_SERVICE board + تسوية منتهية.
- `tools/queue/verify.cjs` applies migrations 001–036.

## Explicitly out of scope

- Q-04 voice/announce, Q-06 print slip, nearest-barber planner, background job/cron settle.
- Primary/VPS SQL apply, paid sale / Treasury / GL (ADR-031).
