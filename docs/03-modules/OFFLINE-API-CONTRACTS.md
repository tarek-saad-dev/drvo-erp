# Offline POS & Closing — API Contracts Draft
Date: 2026-10-28. Status: engineering PROPOSAL, not approved implementation or deployed endpoint. Route names and payloads illustrative.

## Founder decisions binding on design
- Day closure with open shifts or unsynced sales: **PROVISIONAL → FINAL after reconciliation**.
- Lost un-synced POS device: **record loss incident and reconcile physical cash manually**. Do not promise automatic recovery.
- Provider-dependent offline tender: **UNDECIDED; discuss each payment method separately**. Never mark unconfirmed tender paid.
- Shift closure with unsynced sales: provisional, then final reconciliation; include physically received offline cash in count.
- Per-device independent queues; previously verified employee local sign-in, permitted local corrections/cancellations, automatic sync retry followed by Manager-visible errors.
- Sales source dates maintained; immutable posted invoices and accounting corrections.
- Cash shortage employee recovery needs independent approval; surplus remains variance until verified.

## Authorization and envelope
All server endpoints enforce authenticated principal and resolved Tenant; explicit Business/Branch membership, Allow-only default deny, permission, shift/operator/device scope, module entitlement and server-side idempotency. Client identifiers are claims, not grants. All mutation requests carry Idempotency-Key, request version and correlation ID. Domain money values as integer minor units or exact decimal (currency rule not finalized); Business timezone determines business date.

## Candidate endpoints
| Method | Route | Purpose |
|---|---|---|
| POST | /v1/pos/devices/register | register branch-scoped device, verify prior session |
| POST | /v1/pos/offline/batches | submit ordered local queue events, per-event ack |
| GET | /v1/pos/offline/batches/{id} | poll batch outcomes after uncertain response |
| GET | /v1/pos/offline/devices | Manager pending/error device dashboard |
| POST | /v1/pos/shifts | open cashier shift; Business multiple-shift policy |
| POST | /v1/pos/shifts/{shiftId}/cash-counts | submit physical count with offline cash |
| POST | /v1/pos/shifts/{shiftId}/provisional-close | provisional close with pending queue summary |
| POST | /v1/pos/shifts/{shiftId}/finalize | finalize only after reconciliation |
| POST | /v1/pos/shifts/{shiftId}/variances/{id}/review | manager variance investigation |
| POST | /v1/pos/variances/{id}/corrections | new append-only correction, preserve original |
| POST | /v1/pos/business-days/{date}/provisional-close | warn if open shifts/unsynced devices |
| POST | /v1/pos/business-days/{date}/finalize | finalize after reconciled shifts/exception records |
| POST | /v1/pos/device-loss-incidents | Manager logs lost unsynced device, expected queue estimate and manual cash reconciliation |
| GET | /v1/pos/reconciliation/exceptions | unresolved payment/queue/cash disputes |

## Example event submission (illustrative)
```json
{
  "deviceId": "dev-42",
  "shiftId": "shift-18",
  "events": [{
    "clientEventId": "evt-001",
    "localSequence": 12,
    "eventType": "CASH_SALE_RECORDED",
    "occurredAt": "2026-10-28T19:05:00+03:00",
    "payloadVersion": 1,
    "saleId": "local-sale-11",
    "cashReceivedMinor": 30000,
    "currency": "EGP",
    "contentHash": "sha256:..."
  }]
}
```
Response per event: ACCEPTED (canonical IDs), ALREADY_ACCEPTED (same hash), RETRYABLE_ERROR (code, retry hint), REVIEW_REQUIRED (code, manager queue). An identical key with different hash must be refused and audited. Do not infer tender confirmation from user-provided reference alone.

## Atomicity and outbox
One server transaction verifies unique (business,device,event ID), expected shift and credit rules, posts single immutable sale and related records, updates accounting/stock ledgers or writes transactional outbox, and records audit. Downstream eventual consumers also deduplicate. Batch may partially accept events; each event has durable independent acknowledgement.

## Shift/day close preconditions
Provisional close: record counted cash, local pending event count and known cash value by device, cashier identity, handover chain, snapshot version and warning. Prevent new sale acceptance against logically closed shift unless it was an event originated while shift was open; distinguish source timestamps and ordered sequence. Final close: all known device events accepted or documented exceptional settlement, reviewed variance, unresolved electronic tenders excluded from cash, no double count of delayed sync. Day follows analogous provisional/final lifecycle.

## Device loss incident
Store device, branch, shift, reporting manager, last acknowledged sequence, estimate of missing events, manual physical count, supporting evidence, discrepancy, approval and adjustment references. Do not fabricate missing transactions or pretend exact restoration; if originals later sync, deduplicate against incident settlement.

## Security and test gates
- Cross-tenant/branch and cashier-to-other-shift access denied.
- 20 retries produce single sale/ledger/commission.
- Concurrent close vs late event has deterministic versioned reconciliation.
- Lost device yields documented exception, never silent final reconciliation.
- No electronic PAID status without verified provider evidence.
- All cash includes local received, once; corrections append-only.
- Day finalization blocked until reconciled or explicitly resolved exceptions.

## Outstanding / no claims of approval
Specific electronic payment methods and external terminal evidence; offline credit control; auth TTL/revocation; offline refunds; terminal loss incident role; unknown-device detection; resolution SLA; exact route naming/schemas; final financial journal and tax period rules; backend/database technology.

## Founder decision — 2026-10-29: payment selection availability

All payment methods configured for a Business must remain visible and selectable in POS both online and offline. Do not gate or hide a method merely because connectivity is lost. Founder explicitly skipped per-payment-method discovery for now.

Selecting a method is NOT equivalent to receiving or verifying funds. Cash may be recorded locally as received; provider-dependent payments must retain an unverified/pending reconciliation status until reliable confirmation or evidence exists. Never manufacture provider authorization, and never post pending electronic payment as settled cash. Payment selection UI availability is APPROVED; exact provider confirmation and settlement semantics are technical design work, not additional UI selection questions.
