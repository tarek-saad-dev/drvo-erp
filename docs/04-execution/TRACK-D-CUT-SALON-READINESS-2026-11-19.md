# Track D — Cut Salon readiness (fixture / pre-activation only) — 2026-11-19

**Status:** source readiness scaffolds only. **No production verification claimed.** Live Cut SQL is not modified. Live production secrets are not accepted in this track. Real-data activation remains **BLOCKED**.

Related contracts: [CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18](CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18.md), [CURSOR-CASHIER-FULL-MIGRATION-EXECUTION-2026-11-19](CURSOR-CASHIER-FULL-MIGRATION-EXECUTION-2026-11-19.md) §Track D / PR3, [K5F3-POST-MIGRATION-ISOLATED-RESTORE-2026-11-12](K5F3-POST-MIGRATION-ISOLATED-RESTORE-2026-11-12.md).

## What this delivery is

| Deliverable | Path | Claim |
| --- | --- | --- |
| Read-only fixture adapter (customers + services) | `tools/cut-adapter/reconciliation-planner.cjs` | Fixture dry-run characterization |
| Connection fail-closed gates | `tools/cut-adapter/connection-gates.cjs` | Refuses hosts/DSNs/secrets |
| Identity mapping scaffold | `tools/cut-adapter/identity-mapping.cjs` | Unassigned `SourceSystem\|Tenant\|Branch\|Entity\|OriginalId` keys only |
| Reconciliation report scaffold | `tools/cut-adapter/reconciliation-report.cjs` | Redacted non-PII counts + digests |
| Sales-history count fixture | `tools/cut-adapter/fixtures/sample-sales-history-summary.json` | Synthetic aggregates; not invoices |
| Pre-activation gate board | `tools/cut-adapter/preactivation-gates.cjs` | SQL024/025 source probe + OPEN operator gates |
| Offline verify | `tools/cut-adapter/verify.cjs` | Asserts activation stays BLOCKED |
| Unit tests | `tests/cut-adapter.test.cjs` | Fixture + refusal coverage |

## What this delivery is NOT

- Not a Cut production SQL extract, backup, or connection.
- Not primary/VPS SQL024 or SQL025 apply evidence.
- Not independently witnessed isolated restore / RPO-RTO proof.
- Not K5F root operator PASS or private Owner browser acceptance.
- Not approved import ledger with real DRVO UUID bindings.
- Not paid POS / ADR-031 posting / Cashier cutover.

Disposable GitHub CI PASS (Customers SQL024 HTTP, Catalog SQL025 packages, Chromium Salon browser) remains **CI-only** and does not close the operator gates below.

## Checklist (honest status)

| Gate | How to verify BEFORE real-data activation | Status in this commit |
| --- | --- | --- |
| SQL024 **source** present | `db/migrations/024_customer_business_search.sql` exists; checksum via `buildPreactivationGateBoard()` | **PASS_SOURCE_ONLY** (git artifact) |
| SQL025 **source** present | `db/migrations/025_catalog_packages.sql` exists; checksum via gate board | **PASS_SOURCE_ONLY** (git artifact) |
| SQL024 **target apply** | Read-only `core.SchemaMigration` on dedicated DRVO pilot DB; matching checksum; restricted migrator only after backup | **OPEN** |
| SQL025 **target apply** | Same as above for `025_catalog_packages.sql` after 024 | **OPEN** |
| Isolated restore | Encrypted/off-host (or approved) backup → `RESTORE VERIFYONLY` → restore into a **new** DRVO-only recovery DB; compare migration history; never restore into Cut/Cashier/AutoResponse | **OPEN** |
| K5 permissions | Trusted private session: `customers.read` / `customers.manage`, catalog/POS draft scopes, foreign Tenant/Business/Branch deny; flags OFF until approved; K5F checker when installed | **OPEN** |
| Owner browser | Authenticated Owner on private workspace (not `/demo/salon`): SQL024 Customer search, catalog/packages if 025 applied, NONPOSTING DRAFT only, foreign denial | **OPEN** |
| Founder Cut source scope | Cut admin authorizes read-only export; `SourceTenant + SourceBranch + time window`; secrets off-chat | **OPEN** / CUT-02 **BLOCKED** |
| Approved import ledger | Restricted offline ledger before any DRVO owner-table write; fixture identity map stays unassigned | **OPEN** |
| Production verification | — | **NOT CLAIMED** |
| Real-data activation | — | **BLOCKED** |
| Cut SQL modifications | — | **FORBIDDEN** |

## Operator procedure (documentation only)

1. **Confirm destination identity** — dedicated DRVO pilot database name, Owner login principal, Tenant/Business/Branch UUIDs. Never discover defaults from connection-string guessing; never reuse Cut production SQL.
2. **Backup first** — verified restorable checkpoint of the target DRVO DB before any migration apply.
3. **Apply SQL024 then SQL025** only with separately authorized restricted migrator; re-read SchemaMigration checksums.
4. **Isolated restore rehearsal** — restore the post-migration backup into a differently named recovery database; confirm objects and migration history; discard or quarantine the recovery DB per ops policy.
5. **K5 + Owner browser** — prove scoped permissions and private UI gates with an authorized Owner account; treat disposable Chromium CI as preparatory only.
6. **Cut export** — only after founder-approved read-only connection + scope, receive a redacted/pseudonymized JSON export off-chat; feed **fixtures** into `planCutFixtureReconciliation` → `buildIdentityMappingLedger` → `buildReconciliationReport`.
7. **Import writes** — still blocked until the approved identity ledger exists and module owners accept the reconcile digest. Historical sales counts must not create tender, stock, loyalty, tax, or payroll effects.

## Local offline commands

```bash
node --test tests/cut-adapter.test.cjs
node tools/cut-adapter/verify.cjs
```

Expected verify JSON includes `productionVerificationClaimed: false`, `realDataActivation: "BLOCKED"`, and blocking gate ids for target apply / restore / K5 / Owner / founder scope / import ledger.

## Ledger honesty

Cashier workflow ledger rows **CUT-01** (fixture characterization), **CUT-02** (live SQL **BLOCKED**), **CUT-03** (identity map + recon + preactivation scaffolds) remain non-pilot. Fixture digests are not Cut pilot proof.
