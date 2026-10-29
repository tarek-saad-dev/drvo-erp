# VPS + SQL Server — Read-only Pre-implementation Audit

Date: 2026-10-29
Status: **NOT EXECUTED**. No direct VPS/SSH command-execution connector is available in this conversation. This file is an operator runbook, not server evidence. Do not run until an authorized operator is ready. No application code/migrations/deployment permitted without explicit founder authorization.

## Scope / safety
Read-only inspection of Linux VPS, SQL Server metadata, existing service resource use, security exposure and backup *configuration*. Do not modify firewalls, users, databases, service state, jobs, backup schedules, logins or production settings. Avoid collecting secrets/customer data. Redact public addresses, account identifiers and file paths if sharing.

## Operator commands (Linux, no sudo needed if permissions allow)
```bash
uname -sr
cat /etc/os-release
uptime
free -h
df -hT
lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS
nproc
systemctl --no-pager --type=service --state=running
ss -lnt
```
Service listings and listener addresses may expose infrastructure details: redact as appropriate. CPU/load snapshot is not a capacity benchmark. No command here installs or changes anything.

## SQL Server — metadata read only (authorized least-privileged account)
```sql
SELECT @@VERSION AS version_text,
       SERVERPROPERTY('Edition') AS edition,
       SERVERPROPERTY('ProductVersion') AS product_version;
SELECT name, state_desc, recovery_model_desc
FROM sys.databases
WHERE name NOT IN ('master','model','msdb','tempdb');
```
Database names may be sensitive; redact before sharing. Determine whether DRVO gets a new, isolated database; **never** modify existing production databases during this audit.

## Backup / recovery evidence to inspect, not change
- Backup software/job ownership, schedule, encryption and off-host destination; confirm credentials are not copied.
- Last backup timestamp and success logs (redacted), availability of a restore-test environment.
- RPO/RTO objectives and whether current SQL Server recovery model supports required log recovery.
- Do **not** declare a backup reliable until a restore test has succeeded.

## Windows POS / PWA evidence still pending
- OS build and browser name/version (Chrome and Edge are proposed, not approved).
- Actual Windows workstation/user profile and whether multiple employees share a login.
- IndexedDB quota/persistence and data-clear policies, offline session lifetime, device-loss incident workflow.
- 20 Windows offline tests documented in WINDOWS-POS-OFFLINE-TEST-PLAN.md. None have been run.

## Decision checklist
| Item | Status |
|---|---|
| Founder-selected SQL Server on VPS | Approved |
| Founder-selected Windows Browser POS | Approved |
| Founder-selected IndexedDB PWA | Approved starting approach |
| Linux/SQL Server actual version and capacity | Unverified |
| Firewall/TLS/least privilege assessment | Unverified |
| Off-host backup and restore exercise | Unverified |
| Windows/IndexedDB real-device tests | Unverified |
| ORM / migration choice | Open |
| Explicit permission to write code | NOT GRANTED |

## Next
Authorized operator supplies **redacted** outputs and the backup/restore evidence. Review against pre-code checklist, record pass/fail with evidence. After review seek explicit founder authorization before any feature implementation.
