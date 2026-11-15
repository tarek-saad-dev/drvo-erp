# Legacy Cashier migration reference

> **2026-11-15 FULL FUNCTIONAL PARITY MANDATE:** [ADR-040](https://github.com/tarek-saad-dev/drvo-erp/blob/main/docs/05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md) + [Cashier Functional Parity Matrix V0](https://github.com/tarek-saad-dev/drvo-erp/blob/main/docs/04-execution/CASHIER-FULL-FUNCTIONAL-PARITY-MATRIX-V0-2026-11-15.md) replace this document's earlier *preliminary* table as the broader working feature inventory. Audited legacy source pin `tarek-saad-dev/casher@a51101791c52bca90e45bd40ead3a46c08d78adb`. Full behavior parity requires per-feature source inspection, approved domain contracts, positive/negative scope testing, verified DRVO SQL/HTTP/UI and independent operational acceptance. Never raw-copy legacy `dbo` tables, integer IDs, sessions or DB credentials. This remains a migration reference rather than proof of production deployment.


Legacy Cashier is a separate operating production system; do not modify it as a side-effect of DRVO development.

Preliminary concept mapping (**not** one-to-one schema migration):

| Cashier legacy | DRVO concept |
|---|---|
| TblClient | Customers |
| TblEmp | Employees |
| TblPro | Catalog items with separated inventory/service policies |
| TblinvServHead / TblinvServDetail | Sales / sale lines |
| TblinvServPayment | Payments |
| TblProMove | Inventory movements |
| TblShiftMove | POS sessions |
| TblCashMove | Cash transactions |

Source artifacts in the Hawai project include database schema exports; this new repo must not contain customer records, plaintext passwords or credentials. Validate all mappings against live source code and migrations before porting.

## Porting checklist

1. Identify the business rule and source tests.
2. Map it to DRVO domain boundaries, permissions and tenancy.
3. Write a new module specification and acceptance criteria.
4. Adapt implementation, do not mass-copy.
5. Add tests including tenant isolation and failure cases.
6. Verify real workflows and update docs.
