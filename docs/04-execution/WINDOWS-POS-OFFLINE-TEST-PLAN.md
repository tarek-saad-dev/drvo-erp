# Windows Browser POS — Offline & IndexedDB Verification Plan

Date: 2026-10-29. Status: **test plan only, NOT EXECUTED**. Founder confirmed Windows Browser as initial POS device. No tablet/iPad qualification required for V1. No application code or infrastructure changes authorized.

## Target matrix
- Windows 10/11 desktop POS as candidates; **actual minimum supported OS and browser versions still need confirmation**.
- Chromium-based Chrome and Microsoft Edge on Windows as **proposed** qualification targets, not yet approved as the exact support matrix.
- Normal installed PWA, normal browser tab, browser restart, computer restart, multiple tabs; private/incognito mode is unsupported for durable offline storage by design recommendation.
- Test with real target cashier hardware and actual Windows user profiles, avoiding unsupported assumptions about IndexedDB longevity.

## Scenarios and success criteria
| Case | Test | Acceptance requirement |
|---|---|---|
| W01 | Login online, then disconnect while open shift | Previously verified cashier can access allowed offline scope; no unauthorized escalation |
| W02 | Create mixed product+service sale without connection | Each device durable local event ID/sequence; complete cart and selected tender recorded |
| W03 | Choose Cash, Card, Wallet, InstaPay, custom tender offline | Every configured method stays selectable; customer payment evidence captured without false provider-verified status |
| W04 | Offline credit exceeds shared customer cap from two PCs | Sales retained and registered; after sync review flags excess and blocks new credit until manager review |
| W05 | Close shift with unsynced sales | Provisional close, actual cash includes received offline cash; final after reconciliation |
| W06 | Close financial day provisionally | No loss of open-shift/unsynced events; final reconciliation after sync |
| W07 | Reconnect and replay same event 20 times | One canonical invoice and AR/ledger/inventory/commission effect |
| W08 | Crash browser before/after local write and ACK | No acknowledged local sale disappears silently; detect and report any interrupted/incomplete write |
| W09 | Restart Windows, close/reopen browser and PWA | Pending data persists under tested normal profiles, sync resumes when connected |
| W10 | Multi-tab/windows writing same device queue | Single-writer or race-safe sequence; no duplicate or divergent cash records |
| W11 | Disable network during sync response | Retry same idempotency key; server returns prior acknowledgement; no duplication |
| W12 | Quota exhausted / storage persistence denied / user clears site data | Explicit warnings and incident workflow; no claim of guaranteed recovery |
| W13 | Lost/damaged PC before sync | Device-loss incident and manual cash reconciliation; do not invent restored sale rows |
| W14 | Employee disabled or permissions revoked while PC offline | Document revocation gap, enforce bounded offline session and reject untrusted events on reconnect according to approved policy |
| W15 | Device/user account switch | Separate queues and tenant/business/branch access; no data exposure after logout/profile switch |
| W16 | Update Service Worker while offline with pending events | Pending queue remains compatible, migration is recoverable or explicitly blocked |
| W17 | Sale on closed accounting month arrives late | Preserve original sale date; post linked adjustment to open financial period |
| W18 | Negative inventory with unknown last cost | Quantity moves, cost remains PENDING; no fictional zero COGS |
| W19 | Fake electronic payment evidence | Does not become verified/settled; outstanding amount/collection exception follows policy |
| W20 | Protected local data exposure attempt | No raw password, card secrets, PAN/CVV, customer sensitive data unnecessarily cached |

## Test execution evidence template
For every case record: Windows build, browser version, app deployment SHA, device identifier (non-personal), run time, prerequisites, steps, expected/actual, PASS/FAIL/BLOCKED, logs/screenshots redacted, defect link and tester. **No PASS has been recorded**.

## Remaining choices before development authorization
1. Official supported Windows version(s) and browsers; choose whether Chrome only or Chrome+Edge.
2. Device ownership, Windows accounts, kiosk/shared-device mode, and physical admin privileges.
3. Offline authentication session expiry, local verifier/key protection and logout policy.
4. IndexedDB quota/persistence behavior and storage-loss messaging on real devices.
5. SQL Server VPS edition/version, capacity, separate project DB, credentials, migrations, encryption and off-host restore rehearsal.
6. Backup owner and RPO/RTO, monitoring and operator incident escalation.
7. Data access ORM/driver choice and exact financial precision/tax configuration.
8. Founder explicit authorization to start writing code remains separate.

## Project-wide nonnegotiables
SQL Server on VPS; PWA+IndexedDB initial offline storage; per-device independent queue; one branch treasury with shifts; all tender options visible; immutable financial records; tenant isolation; loss incident with manual cash reconciliation. No tests executed or deployment performed.
