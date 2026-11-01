# DRVO API — first running NestJS service

This is a running **NestJS 11 API scaffold**, not a complete ERP API.

From this directory: `npm install`, `npm run build`, then `API_PORT=3101 npm start` or `npm run dev`. Probe `GET http://127.0.0.1:3101/api/health`.

Liveness means the HTTP process responds only. There are **no** authentication routes, SQL, tenants, billing, authoritative module activations, jobs or POS endpoints. The API binds to loopback by default; explicit `API_HOST` is required for other interfaces. Do not expose this development service publicly.

Next step: disposable SQL Server spike (Issue #5), ADR-030 protected scope sign-off, then authenticated Kernel routes and integration tests. Framework versions are pinned in this app manifest; its own dependency lockfile must be added before release.
