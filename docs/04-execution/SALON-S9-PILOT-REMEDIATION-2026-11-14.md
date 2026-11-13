# Salon S9-C — actionable, non-authorizing Pilot remediation report

**Architecture impact:** no API, UI, SQL, SSH, migration, auth, billing, activation or runtime worker changes. This reuses the S3 strict 8-KiB, schema-limited source-only evidence preflight and turns all **ten** current blockers (release SHA, exact observed pre-migration SQL 001–009, eight K5F/security/backup/ADR-032 controls) into an ordered `Owner / reported state / next independent operator action` checklist.

Run on a trusted source checkout:
```bash
node tools/salon-pilot/remediation.cjs --template
node tools/salon-pilot/preflight.cjs --template > salon-pilot-redacted.json
node tools/salon-pilot/remediation.cjs --input salon-pilot-redacted.json
```
The input is an intentionally small, **NON-SECRET, REDACTED and LOCAL** JSON. Never upload it, credentials, raw logs or customer data to GitHub/chat. The CLI suppresses source content and paths on failures. It runs ZERO network, SQL, HTTP, Docker, browser or SSH actions and can never grant access.

If everything is marked `OPERATOR_REPORTED`, every action remains `OPERATOR_REPORTED_NOT_ATTESTED`, with `NO_GO` and all permit booleans `false`. Even `blockingItems:0` means **no missing self-reports**, never proof of independent signoff. Source migration prefix 010–017 remains unobserved/unapproved. Independent backup restore, root K5F, proxy/Origin, exact Tenant/Branch negative tests, ADR-032 and a separately approved SQL window must be completed by trusted operators, without blindly using this file as release authority. ADR-031 financial POSTED remains independently blocked.

K0 Node tests enforce missing controls, release mismatch, self-reported complete NO-GO, untrusted origins and CLI non-network contract. K1+staging artifact CI on main are source checks only. **No live Pilot performed by S9-C.**
