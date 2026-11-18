# Cut Salon → DRVO ERP: USE-IT-WHILE-BUILDING private pilot (2026-11-18)

**Founder direction (accepted operating objective):** DRVO ERP should become a **real usable business operating system during development**, not a synthetic/demo-only interface. Cut Salon/Cashier is the source of established workflows and a proposed last-month reference dataset. The public `/demo/salon` is **marketing-only**, never an operational data store or an acceptable substitute for private POS parity.

## Current factual boundary

- **Repository source audited:** DRVO `tarek-saad-dev/drvo-erp`; legacy Cut Salon/Cashier `tarek-saad-dev/casher@bc9c03fff`. This access provides **code, schema and tests**, **not Cut's live SQL database records, credentials or backups**. Project file search did not expose an authorized Cut Salon last-month SQL extract; **zero Cut customer/invoice records have been copied**.
- Protected DRVO Customers Core already has a K5 SQL-backed Customer entity and idempotent API, `customers.read` and `customers.manage` permissions, plus a capped **first-200** list. DRVO Cashier POS S2/S3 already persists NONPOSTING DRAFT prices in SQL022–023 in disposable CI.
- **New actual private UI slice `7a3189e`:** authenticated real Customer picker with phone/name lookup and inline idempotent Customer create, directly connected through the private POS pricing panel to the Cashier V2 customer-linked SQL DRAFT. No public sample data or browser storage. The search is **local over at most 200 authorized Customers**, NOT the complete Business roster; quick registration is disabled when list length reaches 200. Backend `CreateCustomer` currently does **not** guarantee unique phone across the business, so full server-side phone search and a founder-approved identity/duplicate policy are **required before real bulk import or operational Customer deduplication**.
- **No live DRVO Cut pilot verified:** Primary DRVO SQL schema/migration state, independent backup-and-restore, K5 private access/flags, Owner browser and database/tenant mappings remain unverified. The public stage homepage or deploy success do not fix this.

## Selected data window: bounded example, not an actual imported batch

Proposed **[2026-10-18 00:00, 2026-11-18 00:00) Africa/Cairo local** as one reproducible trailing-month trial. Confirm how Cut's source timestamps are stored (SQL local vs UTC), timezone/DST and legacy WorkDate shifts **before** writing export SQL or counting any sales. Never pick a default database from connection-string discovery. Source is *read only*; destination must be a verified separate isolated DRVO Tenant/Business/Branch.

| Order | Source owner in Cashier | Destination owner | Trial behavior |
| --- | --- | --- | --- |
| 1 | Tenant, Branch, employee/Barber records | DRVO Identity, HR + Salon Extension | Validated mapping ledger; no legacy numeric ID collisions |
| 2 | Categories, active/inactive Services, products, price history | Catalog / Inventory | Import active catalog references; historical quote values kept as read-only evidence |
| 3 | Customers and mobile/source/consent fields | Customers / CRM | Scoped identity mapping, approved PII minimization, duplicate report before any write |
| 4 | Appointments, schedule, resource assignments | Booking + Salon | Historic states/branch/Barber timeline read only; new bookings through the authorized DRVO write path |
| 5 | Last-month Sale headers, details, discounts, tender, tip and void/refund | Sales **historical reference** | Read-only source-identified archive; **NOT** new POS Draft and **NOT** Posted Sale or Treasury payment |
| 6 | Cash drawer, shifts, stock movements, GL | Treasury/Operations/Inventory/Accounting | Read-only reconciled baseline. No financial posting/stock decrement/rebooking until ADR-031 and distinct cutover decision |

## Hard go/no-go gates before importing real Cut records

1. **Source authorization and identity:** Cut Salon's own administrator authorizes read-only export from a **verified Cut SQL target** with specific source Tenant/Branch and time interval, using secure off-chat transfer; never send SQL passwords, backup binaries or phone-number exports into a GitHub issue, public stage page or chat.
2. **Destination security:** verify dedicated DRVO pilot DB (not existing Cut or unrelated staging databases), owner and branch IDs, K5 private flags and permissions; inspect live migrations 001–023 **read-only**, and complete independently **restorable backup/restore evidence** before any target SQL mutation.
3. **Privacy:** choose source fields, retention and consent/notice basis. Import only minimum necessary direct identifiers to authenticated tenant-isolated data; test with irreversibly pseudonymized phone/name first where practical. No historical WhatsApp consent invented from stored phones.
4. **Manifest before actual writes:** record source rows by module/date/tenant/branch, duplicates, null foreign keys, soft-deleted records, cancellation/refund and payment totals by method. **Only non-PII counts, schema hashes, source primary key ranges and redacted reconciliation findings** can go in GitHub.
5. **Explicit mapping:** use `SourceSystem + SourceTenant + SourceBranch + EntityType + OriginalId → DRVO UUID` in approved restricted import ledger. Idempotency, resumable checkpoints, cross-scope FK checks and reconcile reports are mandatory. No unreviewed raw DML directly into multiple DRVO module owner tables.
6. **No double selling:** Keep live Cashier as the authoritative checkout until DRVO has independently approved Sales/Treasury/Accounting/inventory behavior and a cutover window. Historical paid transactions never trigger new tenders, points or payroll effects. Operator acceptance must show original transaction totals vs a read-only DRVO reference, and new DRVO DRAFT separately.

## Next production vertical slices (priority order)

**P0:** True server-side business-scoped Customer lookup by name/phone (not first 200), verified duplicate/identity policy and secure Cut export/mapping preflight. **P1:** authenticated Cut Salon workspace access, real Customers/Catalog/Barbers/Booking read, operator screen review and a private nonposting POS work session; no synthetic fallback. **P2:** bounded historical Cashier Sales read-only source owner with branch-scoped Customer last-visit + click-to-repeat fresh Catalog items, while Cashier still does real checkout. **P3:** finance/tender, printer, stock and posting only after ADR-031 explicit acceptance and reconciliation/security proof.

## Verification evidence and status

- [Private POS customer source change](https://github.com/tarek-saad-dev/drvo-erp/commit/7a3189e69df0eb8985abf9f220e5800f36bb2ebb)
- [Rich POS disposable SQL/HTTP + private Web workflow](https://github.com/tarek-saad-dev/drvo-erp/actions/workflows/pos-rich-ci.yml): verify exact tested SHA before declaring pass.
- **No Cut data migrated**, no private authenticated Owner browser proof, no private live POS feature enablement, no authorized paid posting, no Cut Salon production cutover.

**Operator next action required:** provide a secure, approved **read-only Cut Salon data source/export** and confirmed target DB via a restricted administrator channel, *not* secrets in conversation or repository. Without actual database access, only code and migration preparation can be truthfully delivered.
