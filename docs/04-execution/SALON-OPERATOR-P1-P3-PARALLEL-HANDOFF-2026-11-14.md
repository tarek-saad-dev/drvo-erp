# First Salon — operator handoff, three parallel non-mutating reviews

**2026-11-14 · Prepared, NOT executed.** Official source: [First Salon P1–P7 #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106). Private Salon is **NO-GO**. This packet contains a human approval workflow, **no shell script, credentials, SQL, API calls or authorization to change any server**.

## What GitHub proved versus what it did not

Source CI [#115](https://github.com/tarek-saad-dev/drvo-erp/pull/115) ran a restricted disposable SQL Server 2022 migration **009→017** and restored pre/post snapshots. [#118](https://github.com/tarek-saad-dev/drvo-erp/pull/118) added offline source checksum reconciliation for *reported* post-017 rows, independent of the still-expected **001–009 root K5F preflight**. [#112](https://github.com/tarek-saad-dev/drvo-erp/pull/112)/[#116](https://github.com/tarek-saad-dev/drvo-erp/pull/116) added synthetic-only Pilot access and CAS/revoke models. [#119](https://github.com/tarek-saad-dev/drvo-erp/pull/119) tests *self-supplied, untrusted* Ed25519 Publisher/Market key pairs; no genuine issuer authority or market eligibility is established. **All outputs are source or simulated proof, NOT any real P1–P7 acceptance.**

## Parallel work packets the authorized operators can actually perform

| Packet | Owner(s) | Minimum independently witnessed evidence | Explicitly excluded |
| --- | --- | --- | --- |
| **P1 — Release + K5F root audit** | VPS root operator + independent Security reviewer | Reviewed exact GitHub `main` SHA vs actual `release.sha`, root-owned immutable installed K5F checker and dependencies hash/perms, DB **001–009** ordered checksum read using the approved read-only checker, all sensitive public/private feature flags OFF and stage app/migrator principal separation. Evidence reference must identify independent reviewer, time and method. | Running checkout JS as root; pasting `/etc` env, DB accounts or private keys; applying SQL010–017; changing flags |
| **P2 — encrypted off-host recovery** | Backup operator + separate Recovery/Security witness | Encrypted off-host copy **actually restored** into *isolated DRVO-only disposable infrastructure*; independent checksum/schema-history and scoped privileges/custody validation; measured recovery results against separately agreed RPO/RTO and documented rollback; redacted evidence reference. | A same-host `COPY_ONLY` backup or Docker CI restore being treated as off-host DR; touching Cashier/Clinic databases; uploading backup or encryption key |
| **P3 — independent external network & identity** | Platform/Security operator + separate outside-network witness | HTTPS/TLS/HSTS, trusted proxy/IP and forwarded-header spoof rejection, exact Origin/CSRF/Secure+HttpOnly cookie and no-store, K5/private endpoints OFF, approved invite/sender path, synthetic foreign Tenant/Business/Branch and revoked Session/Role denial as applicable to current authorized test stage. Redacted signed evidence, no tokens. | Activating public login or Salon flags, sending production invites, unapproved penetration test or touching real customer records |

**Can run concurrently:** P1 root source/SQL read-only examination, P2 isolated encrypted off-host restore and P3 authorized external network-only checks. Operators MUST get the necessary independent access/change approvals; passing local reviewer tools alone is not a checkmark.

## Post-review engineering gates

**P4: authorized migration window.** After P1+P2 evidence and P3 security review, DBA+Security+Founder must explicitly authorize SQL 010–017 maintenance **separately**. Validate **actual** live 001–009 provenance, operator migration credentials/roles, tested backup, immutable post-017 checker transition, rollback and post-release history. The new `node tools/staging-readiness/post-migration-review.cjs --template` output is local **untrusted evidence only** and cannot be used to authorize migration; never execute `staging-db-migrate` based on this packet.

**P5: real private noncommercial Pilot rights.** Separate review of real DRVO publisher trust anchors, signed deployment and independently approved country/industry, server-resolved Tenant/Business/Branch/Account and role action, scoped audited SQL Grant storage and expired/revoked worker/HTTP deny. SC-0 production Registry remains **EMPTY**; self-provided synthetic keys in #119 do **not** count. No Pilot grant can be issued based on this packet.

**P6:** only after P1–P5 actual signoffs, run authorized private browser Owner/Staff/Catalog→Customers→Booking→POS DRAFT and T1/B1, T1/B2, T2/B3 negatives against tested persisted staging rows, with refresh and audit; then **P7** one-Salon founder/security/privacy/support GO. No `POSTED` finance or paid SaaS entitlement.

## Evidence capture contract

Record only redacted **reference IDs**, timestamps, reviewed SHAs, outcome and identity/role of independent reviewers in a protected ticket. No personal names/phones, tokens, root outputs, certificates' private keys, SMTP credentials or raw SQL backup paths. All GitHub/source reports are preparatory; attestation by independently authorized operators must be verified outside GitHub.

**NO-GO remains: 7 major Pilot gates, plus 3 additional full paid Salon gates (C1–C3).** This count is a set of independent acceptance requirements, not a delivery ETA. No step in this packet itself proves a live server, backup or user is ready.

References: [K5F-3 source audit](K5F3-GOVERNANCE-READ-FLAGS-2026-11-14.md) · [P2 isolated recovery review](SALON-P2-RECOVERY-READINESS-2026-11-14.md) · [P3 offline network review](P3-NETWORK-SECURITY-OFFLINE-REVIEW-2026-11-14.md) · [P4 review](P4-POST-017-OFFLINE-EVIDENCE-REVIEW-2026-11-14.md) · [P5 cryptography](P5-SYNTHETIC-RELEASE-MARKET-SIGNATURES-2026-11-14.md).
