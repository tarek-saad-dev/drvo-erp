# ADR-009 — SQL Server on VPS + POS PWA/IndexedDB Initial Storage
Date: 2026-10-29
Status: Accepted initial architecture direction, with device durability/security validation before implementation.

## Decision (founder approved)
- Central **SQL Server hosted on VPS**.
- POS offline-first client starts as **PWA** with locally persisted **IndexedDB** queue per device.
- This is an initial choice, not a statement that browsers guarantee persistence or offline sensitive-login security.

## Implementation guardrails (engineering proposals)
- Next.js frontend and NestJS modular monolith API remain recommended application stack, not separate founder selection.
- Queue: stable device/event IDs, ordered events, immutable local correction trail, server replay dedupe, retry and manager errors. Verify storage persistence via StorageManager where supported; treat IndexedDB as vulnerable to browser eviction, user clearing, private mode and lost device. Device loss incident + manual cash reconciliation remains approved.
- Security: offline authentication limited to previously verified users; credential/verifier design, session age and device trust require security review. Never save PIN/CVV or card secrets in IndexedDB.
- SQL Server: verify edition, licensing, backup/log recovery, storage IOPS, encrypted connections and resource sizing on VPS. No assumption that existing unrelated databases may be reused.
- Provisional shift/day closing and local cash count including unsynced received cash retained.

## Validation
Browser/device matrix, PWA install/update behavior, airplane mode, crash/restart, storage eviction simulation, multi-device replay, no false payment confirmation, tenant isolation, restore rehearsal. Pivot to SQLite-capable packaged app only if measured PWA durability requirements cannot be met; requires new decision.
