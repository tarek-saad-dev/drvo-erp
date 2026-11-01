# DRVO Worker — standalone NestJS runtime

This is an isolated NestJS application context with an *idle process heartbeat*. It is **not** a functioning outbox, event worker or entitlement service.

Run `npm install`, `npm run build`, `npm start` from this directory. Stop with SIGINT/SIGTERM.

No connection to SQL Server, external services or customer information. ADR-030 trusted service scope and ADR-031/032 effect contracts remain prerequisites for real jobs. Dependency versions are pinned in the manifest; nested lockfile is a follow-up.
