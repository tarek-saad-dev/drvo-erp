# Cut Salon read-only adapter track (SAFE / fixture-only)

**Status:** Track D readiness scaffolds. This package characterizes and reconciles **exported JSON fixtures**, builds **unassigned identity maps**, emits **redacted reconciliation reports**, and prints a **pre-activation gate board**. It does **not** connect to any live Cut Salon, Cashier, staging, or VPS SQL database, and it does **not** claim production verification.

Full checklist: [TRACK-D-CUT-SALON-READINESS-2026-11-19](../../docs/04-execution/TRACK-D-CUT-SALON-READINESS-2026-11-19.md).

## Hard rule

| Action | Allowed here? |
| --- | --- |
| Parse offline JSON fixtures committed or supplied as plain objects | YES |
| Produce dry-run characterization / id-map / recon report scaffolds | YES |
| Probe repo for SQL024/025 **source file** presence + checksum | YES |
| Open `mssql` / Tedious / ODBC / JDBC sockets | NO |
| Accept connection strings, hosts, ports, passwords, or `DATABASE_URL` | NO |
| Query Cut production, Cashier production, or DRVO VPS SQL | NO |
| Modify Cut SQL / Cashier production schema or data | NO |
| Write into DRVO owner tables / bind live DRVO UUIDs | NO |
| Claim primary DB apply, restore, K5F, or Owner browser PASS | NO |

## Approved-connection gates (live source)

Live Cut/Cashier source access is **BLOCKED** until **all** of the following exist outside chat/repo secrets:

1. **Founder-approved connection** to a verified read-only Cut SQL target (identity of host/database confirmed by Cut Salon admin; credentials never committed).
2. **Explicit scope:** `SourceSystem + SourceTenant + SourceBranch + time window` written into an approved restricted import ledger.
3. Secure off-chat transfer of any export; no passwords, backups, or real phone rosters in GitHub issues, public pages, or this repository.
4. Destination DRVO pilot DB identity, restorable backup evidence, SQL024/025 **target** apply, K5 permissions, and Owner browser gates (see preactivation board).

Until those gates pass, the only honest path is **exported JSON fixtures** (pseudonymized tokens) fed into the modules below.

## Layout

| Path | Role |
| --- | --- |
| `connection-gates.cjs` | Fail-closed refusal of live connection markers |
| `reconciliation-planner.cjs` | Pure characterization / id-map preflight planner |
| `identity-mapping.cjs` | Unassigned SourceSystem\|Tenant\|Branch\|Entity\|OriginalId ledger |
| `reconciliation-report.cjs` | Redacted non-PII reconciliation report scaffold |
| `preactivation-gates.cjs` | SQL024/025 source probe + OPEN operator/founder gates |
| `verify.cjs` | Offline self-check (activation must stay BLOCKED) |
| `fixture-schema.json` | Customers + services sample fixture contract |
| `fixture-sales-summary-schema.json` | Sales-history counts fixture contract |
| `fixtures/sample-customers-services.json` | Synthetic offline sample |
| `fixtures/sample-sales-history-summary.json` | Synthetic non-PII sales counts |
| `../../tests/cut-adapter.test.cjs` | Unit tests (incl. refuse live hosts/DSNs) |

## Usage (fixture object only)

```js
const {planCutFixtureReconciliation} = require('./reconciliation-planner.cjs');
const {buildIdentityMappingLedger} = require('./identity-mapping.cjs');
const {buildReconciliationReport} = require('./reconciliation-report.cjs');
const {buildPreactivationGateBoard} = require('./preactivation-gates.cjs');

const fixture = require('./fixtures/sample-customers-services.json');
const sales = require('./fixtures/sample-sales-history-summary.json');

const plan = planCutFixtureReconciliation(fixture);
const ledger = buildIdentityMappingLedger(plan, {
  sourceTenantKey: fixture.meta.sourceTenantKey,
  approvedImportLedgerEvidence: false,
});
const report = buildReconciliationReport(plan, {
  identityLedger: ledger,
  salesSummary: sales,
});
const gates = buildPreactivationGateBoard();
// plan/report/ledger/gates: liveAccess BLOCKED, writes 0, productionVerificationClaimed false
```

```bash
node tools/cut-adapter/verify.cjs
node --test tests/cut-adapter.test.cjs
```

Do not pass env-derived SQL config into these modules. A future live-read tool, if ever authorized, must be a **separate** package with its own founder approval record—not a silent mode flag here.

## Pre-activation verification (operator, outside this package)

Before any real Cut data activation, independently verify:

1. **DRVO target DB SQL024/025** — SchemaMigration checksums on the dedicated pilot DB (source file PASS ≠ target apply).
2. **Isolated restore** — backup → verify → restore into a separate DRVO-only recovery DB.
3. **K5 permissions** — scoped Customers/Catalog/POS DRAFT actions; foreign scope deny; flags OFF until approved.
4. **Owner browser gates** — authenticated private workspace journey (not public demo); NONPOSTING DRAFT only.

`buildPreactivationGateBoard()` documents these steps and keeps operator/founder gates **OPEN** until real evidence exists outside git.

## Ledger honesty

Cashier workflow ledger rows for Cut import / historical source read remain `SOURCE_IDENTIFIED` (fixture track) or `BLOCKED` (live DB access). Fixture dry-run tests are not Cut pilot proof and are not posted Sales history.
