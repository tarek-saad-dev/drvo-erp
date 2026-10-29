# Infrastructure + Offline Security — Pre-Code Verification Checklist

Date: 2026-10-29. Status: CHECKLIST ONLY; no server inspection, environment change, code, migration, or deployment performed.

## Confirmed design
SQL Server on VPS, Next.js UI + NestJS API recommended, PWA with local IndexedDB queue per POS device, all configured tenders selectable, separate verified-payment state, provisionally closed shift/day, loss incident and manual cash reconciliation, tenant/business/branch isolation. Founder's express restriction: **no programming until explicit approval**.

## Evidence request / verify before deployment
| Area | Evidence needed | Pass criterion |
|---|---|---|
| VPS OS/resources | OS version, free RAM, CPU, disk capacity & IOPS, other production services | measurable headroom and no existing-service impact |
| SQL Server | SELECT @@VERSION, SERVERPROPERTY('Edition'), DB recovery model, disk/log sizes (no credentials collected) | supported edition, capacity and separate DB/schema policy |
| SQL connectivity | bind/address/firewall, TLS cert validation, least-privileged service identities | app-only network exposure; no public admin connection |
| Backup/restore | full/differential/log schedule as appropriate, encrypted off-host backup, restore drill, RPO/RTO | a tested restore with recorded time and checksums |
| Reliability | restart rules, worker heartbeat, queue depth, errors/alerts, deployment rollback | reproducible recovery, bounded queue delays |
| POS devices | actual OS/browser and device matrix, PWA installed mode, offline use | tested against intended devices, not assumed |
| IndexedDB | persistence/eviction behavior, quota, private browsing, clear-data, failed writes, tab competition | acknowledged local write durable across expected crashes; loss incidents covered |
| Offline auth | previously verified login, local verifier/key protection, expiration and remote revocation delay | no raw password, token or sensitive tender secrets saved unencrypted; documented risk window |
| Transport & secrets | HTTPS/TLS, device registration, secure credentials/secrets rotation | network transport protected and secrets outside repo |
| Tenant data isolation | database predicates/compound FK, background jobs, exports, integration users | negative cross-Tenant and cross-Business tests pass |

## Proposed implementation defaults — NOT founder decisions
- Separate SQL Server database for DRVO ERP, with least-privileged user accounts and no touching other applications.
- Append-only device event log with unique deviceId + clientEventId and hash; persist event before confirming save; use backoff + idempotent server acknowledgments.
- IndexedDB storage with clear pending-count indicator and storage quota alerts; device loss cannot guarantee recovery of unuploaded events.
- Offline local identity proof bound to device and previously authenticated user, with bounded validity and online revalidation on reconnect.
- SQL Server decimal exact amounts, transactions for financial posting, immutable ledger and outbox/inbox deduplication.
- Backup evidence & restore test before production data is entrusted to system.

## Decision gates remaining
1. Identify target cashier devices and supported browsers; confirm offline session TTL and storage loss handling.
2. SQL Server instance/version/licensing, actual available RAM/storage and whether DRVO will share the server with existing applications.
3. Confirm backup owner, backup location/retention and recovery objectives (RPO/RTO).
4. Select compatible SQL Server data access/ORM + migration tool based on a short no-production proof.
5. Select concrete rounding/tax/reporting rules per country and close-out evidence paths.
6. Separate explicit permission to begin development from acceptance of this checklist.

## Proposed safe inspection commands (not executed)
- Linux: uname -a; free -h; df -h; uptime; systemctl status <service> (read-only).
- SQL Server (read-only using authorized DB account): SELECT @@VERSION, SERVERPROPERTY('Edition'), SERVERPROPERTY('ProductVersion');
- NEVER paste passwords, .env contents, auth tokens, customer personal data or full DB dumps into project documentation.

## Exit criteria
A signed environment inventory, device test matrix, backup/restore drill and security controls checklist; approved outstanding low-level contracts; founder authorization. Until then: planning only.
