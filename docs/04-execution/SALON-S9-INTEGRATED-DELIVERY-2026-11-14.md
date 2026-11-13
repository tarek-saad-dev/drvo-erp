# Salon S9 — three parallel product + operator enablement slices

**Merged source state (2026-11-14):** [#99](https://github.com/tarek-saad-dev/drvo-erp/pull/99) + [#100](https://github.com/tarek-saad-dev/drvo-erp/pull/100) + [#101](https://github.com/tarek-saad-dev/drvo-erp/pull/101) all MERGED. Final product/main before docs merge: `5fd770aa39b52fd3b7621fc5bcf6d78b053e3a46`. PR HEAD workflows all green: #99 9/9 including K0/K1/K5C, SQL Booking/Customers/Catalog/POS HTTP CI, synthetic Demo and artifact; #100 5/5 including K0/K1/K5C, synthetic Demo, artifact; #101 K0/K1 2/2. Do not infer post-merge staging success until distinct main workflow/SSH receiver verification.

## S9-A — find Customers faster without leaking scope

Protected Shared Booking appointment form has an optional **client-local** Arabic-name/international-phone finder within the independently granted Customers GET response. It normalizes Arabic diacritics, common alif/ya/ta spellings and Arabic-Indic digits, returns *only* already-present active Customers and does not make another request or preserve PII. Input mutation clears the previous selected CustomerId and Booking idempotency UUID, preventing unintended stale selection on POST. A visible caveat warns the list is **only up to 200 already-scoped customers**, not a server-wide search or pagination. Creating a new Customer is a link to the independent Customers Module, never a hidden Booking write. Booking SQL/Origin/K5 permissions still authorize every record. [Source/test details](SALON-S9-BOOKING-CUSTOMER-FINDER-2026-11-14.md).

## S9-B — service duration matters in synthetic Salon Demo

Public isolated /demo/salon now uses half-hour fixture slots with overlap detection on the full `[startsAt, endsAt)` interval, not equality of start time; COMPLETED occupies time, CANCELLED releases it, and no service may overrun the synthetic 19:00 close. UI disables occupied options and resets an invalid time after Staff/Service changes; the model revalidates on booking. Guided 18:00 single-service tour still works. No K5/SQL/real identity, session, API, settlement or real scheduled availability; backend SQL013/016/017 alone authorizes real Booking. [Details](SALON-S9-DEMO-DURATION-SLOTS-2026-11-14.md).

## S9-C — preflight NO-GO becomes actionable

A strictly bounded local Node CLI, `node tools/salon-pilot/remediation.cjs --template` or `--input <local-redacted-evidence.json>`, reuses the original schema-validated S3 preflight and emits 10 accountable actions (SHA, source/prefix SQL001–009, eight K5F / offhost restore / proxy / Owner-Staff / migration / ADR-032 controls). Every `OPERATOR_REPORTED` remains unverified. Even 0 reported blockers can **never** authorize VPS SQL, K5, commercial activation, user invites, financial POSTED or declare a live browser pilot. It accesses no network/SQL/SSH/browser and reveals neither input file path nor confidential content. [Details](SALON-S9-PILOT-REMEDIATION-2026-11-14.md).

## Architectural/release invariants

- Modular Monolith; Shared Booking/Customers/Catalog/POS owners unchanged; Salon Industry Solution only composes, no duplicate DB owner/Customer CRM. Tenant→Business→Branch authenticated context, module-level independent read/action rights and Exact Origin unchanged (ADR-030).
- Forward-only source SQL remains **001–017**. **VPS SQL 010–017 not authorized/applied by S9**, no SQL018, no Public Auth, no commercial flags, no new paid Module contract and no financial POSTED (ADR-031/032 OPEN).
- **Actual Pilot blockers:** K5F trusted root checker and independent read-only audit, encrypted offsite backup with independently verified isolated restore, proxy/Origin and foreign Tenant/Branch negative tests under real synthetic Owner/Staff rights, separately signed SQL 010–017 deployment window and ADR-032 controlled private entitlements. This is operator-owned, not a GitHub CI greenlight.
- S9 can ship code separately from activating customers; a real launch requires independent operational proof and founder/security consent.

## Next delivery

Prioritize early controlled private test on explicitly authorized **synthetic** Owner/Staff accounts *after* operational gates. In parallel, improve the Booking/Customers UX only through shared owners and strengthen observability (redacted evidence, no PII/log leakage). Keep finance/Tender POSTED out until ADR-031.
