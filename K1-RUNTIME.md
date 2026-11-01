# DRVO ERP — K1 Development Runtime

**Date:** 2026-11-01  
**Scope:** First real local Next.js, NestJS HTTP and standalone worker runtimes. **No production deployment, SQL Server, identity or business operations.**

## Run locally (Node.js 22+)

Each app has its own pinned direct-dependency manifest; app-specific lockfiles remain an explicit pre-staging action.

```bash
# Terminal 1 — Backend API
cd apps/api
npm install
npm run build
npm start
# http://127.0.0.1:3101/api/health

# Terminal 2 — Frontend (from repository root)
cd apps/web
npm install
npm run dev
# http://127.0.0.1:3100
# http://127.0.0.1:3100/health

# Terminal 3 — Standalone worker (from repository root)
cd apps/worker
npm install
npm run build
npm start
# idle heartbeat only; Ctrl+C to stop
```

The **root** `npm ci && npm run verify` continues to test the K0 Kernel/contract *pure fixtures*. Its TypeScript project intentionally does not compile the NestJS app's separate projects.

## CI evidence gate

The new `.github/workflows/runtime-ci.yml` must pass:
- API: pinned NestJS install, TypeScript compile, health-controller unit test and live HTTP probe.
- Web: pinned Next.js/React install, production build, TypeScript check, live GET /health.
- Worker: NestJS standalone app compile and process-start smoke test.
- Original `foundation-ci.yml` continues the Kernel boundary and fixture tests.

**Health responses assert liveness only:** `{ "status": "ok", "service": "drvo-api" | "drvo-web", "mode": "scaffold" }`. They do not imply correct financial posting, subscription rights, database access or permitted user access.

## Security/deployment constraints

- API and Web dev/start default to localhost `127.0.0.1` (no public listener).
- No credential is stored in the repo; no SQL connection or payment callback code exists.
- The worker runs idle. Its heartbeat must **not** appear as `processing jobs` or `AI active` in a customer dashboard.
- Do **not** expose K1 routes to real customers, attach a production SQL Server, or run migrations without the separately authorized security/data contract.
- Next required milestone is a disposable SQL Server driver/migration/restore spike ([Issue #5](https://github.com/tarek-saad-dev/drvo-erp/issues/5)), plus ADR-030 protected scope before real Tenant/Business endpoints.
- Keep SaaS entitlement/activation governance in the Lean Kernel and **DRVO commercial plans/payments outside it**. Build minimal subscription/activation capability early, before Salon commercial modules, but do not import commercial settings from the separate DRVO AutoResponse product.
- ADR-031 must be selected before real POSTED POS transactions, and ADR-032 before paid subscription-funded module activation.
- **Dependency lockfile gap:** K1 app manifests pin direct versions, but each app installs transitive dependencies from npm without a checked-in lockfile. That is acceptable only for this non-production smoke PR; add app lockfiles, then convert CI to `npm ci` before staging or claiming reproducible builds.

## Architecture placement

- `apps/web`: customer-facing shell; **no** authority to grant module access.
- `apps/api`: trusted server entrypoint and future domain command host.
- `apps/worker`: scoped background jobs (none implemented yet).
- `packages/kernel`: platform scope and capability rules, not POS/GL/HR business truth.
- `modules/*`: future owned Business Modules with Core and bounded Extensions.

Read [Master Map](docs/02-architecture/DRVO-UNIVERSAL-ERP-ARCHITECTURE-MASTER-MAP-V1.md) and [Module Contract Template](docs/02-architecture/STANDARD-MODULE-CONTRACT-V1.md).
