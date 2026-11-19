# Cut Salon read-only adapter track (SAFE / fixture-only)

**Status:** scaffold only. This package characterizes and reconciles **exported JSON fixtures**. It does **not** connect to any live Cut Salon, Cashier, staging, or VPS SQL database.

## Hard rule

| Action | Allowed here? |
| --- | --- |
| Parse offline JSON fixtures committed or supplied as plain objects | YES |
| Produce dry-run characterization / id-map preflight plans | YES |
| Open `mssql` / Tedious / ODBC / JDBC sockets | NO |
| Accept connection strings, hosts, ports, passwords, or `DATABASE_URL` | NO |
| Query Cut production, Cashier production, or DRVO VPS SQL | NO |
| Write into DRVO owner tables | NO |

## Approved-connection gates (live source)

Live Cut/Cashier source access is **BLOCKED** in this track until **all** of the following exist outside chat/repo secrets:

1. **Founder-approved connection** to a verified read-only Cut SQL target (identity of host/database confirmed by Cut Salon admin; credentials never committed).
2. **Explicit scope:** `SourceSystem + SourceTenant + SourceBranch + time window` written into an approved restricted import ledger.
3. Secure off-chat transfer of any export; no passwords, backups, or real phone rosters in GitHub issues, public pages, or this repository.
4. Destination DRVO pilot DB identity, restorable backup evidence, and module ownership gates from [CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18](../../docs/04-execution/CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18.md).

Until those gates pass, the only honest path is **exported JSON fixtures** (pseudonymized tokens) fed into `reconciliation-planner.cjs`.

## Layout

| Path | Role |
| --- | --- |
| `connection-gates.cjs` | Fail-closed refusal of live connection markers |
| `reconciliation-planner.cjs` | Pure characterization / reconciliation planner |
| `fixture-schema.json` | Customers + services sample fixture contract |
| `fixtures/sample-customers-services.json` | Synthetic offline sample |
| `../../tests/cut-adapter.test.cjs` | Unit tests (incl. refuse live hosts/DSNs) |

## Usage (fixture object only)

```js
const {planCutFixtureReconciliation} = require('./reconciliation-planner.cjs');
const fixture = require('./fixtures/sample-customers-services.json');
const plan = planCutFixtureReconciliation(fixture);
// plan.mode === 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY'
// plan.liveAccess === 'BLOCKED'
// plan.writes === 0
```

Do not pass env-derived SQL config into this planner. A future live-read tool, if ever authorized, must be a **separate** package with its own founder approval record—not a silent mode flag here.

## Ledger honesty

Cashier workflow ledger rows for Cut import / historical source read remain `SOURCE_IDENTIFIED` (fixture track identified) or `BLOCKED` (live DB access). Fixture dry-run tests are not Cut pilot proof and are not posted Sales history.
