# PR0 + PR1 — Source lock & Business Customer search (2026-11-19)

**Status: SOURCE CODED / CI PARTIAL / NOT LIVE / NOT FULL PARITY**

## Source lock (PR0)

| Field | Value |
| --- | --- |
| Prior pin | `bc9c03fff86074872590ad0fd3525f9a4e416958` (retained) |
| New immutable pin | `046bf19b0d5833a07fe4b2891cbf3032d03b7cef` (`feat(CUT CLUB): add admin WhatsApp OTP API test`) |
| Delta | +5 blobs, 0 removed, 1 changed; critical POS/HR/Treasury paths retained |
| Inventories | `tools/cashier-reuse/cashier-source-lock-2026-11-19.json`, `*-baseline-*`, `*-all-source-blobs-*`, `*-delta-*` |
| Workflow ledger | `tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json` |
| Generator | `node tools/cashier-reuse/inventory-source.cjs --repo ../casher --sha <40> --previous <40>` |
| Gate tests | `tests/cashier-source-lock-2026-11-19.test.cjs`, `tests/cashier-workflow-ledger.test.cjs` |

Cashier local working tree was **not** modified (dirty sibling checkout left alone; inventory used `git ls-tree` at the locked SHA).

## Customer search (PR1)

| Piece | Detail |
| --- | --- |
| SQL024 | `db/migrations/024_customer_business_search.sql` — `core.SearchCustomers`, phone index, CreateCustomer phone-conflict return |
| Duplicate policy | Refuse create; return `CUSTOMER_PHONE_EXISTS` + `existingCustomerId`. **No UNIQUE constraint** until real duplicate analysis |
| API | `GET .../customers?q=` → Business-scoped TOP 20; browse list still TOP 200 |
| Phone | Egyptian 01 / +20 / 0020 canonicalize (`egyptian-phone.ts` / `.mjs`) |
| Private POS | `pos-customer-operator.tsx` debounced server search; selects existing on phone conflict |
| Tests run | API `114/114` unit PASS; private POS web 3/3 PASS; root lock/ledger 11/11 PASS |
| Not run here | Disposable SQL2022 `tools/customers/verify.cjs` (needs Docker SQL); primary DB apply; Owner browser |

## Explicit OPEN gaps

- CU-03 profile/source/consent; CU-05..CU-09 history/apply-last-visit/loyalty
- Booking UI still uses local first-200 filter
- PR2 full Cashier POS component transplant
- SQL024 on primary/dev DB + backup/restore evidence
- ADR-031 financial posting

## Next executable task

1. Run Shared Customers SQL CI (`shared-customers-ci.yml`) against SQL024.
2. Start PR2: transplant Cashier POS UX tree into private Light workspace with API façades (nonposting).
3. Expand workflow ledger rows for remaining POS/HR/Treasury workflows.
