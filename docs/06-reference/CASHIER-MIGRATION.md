# Legacy Cashier migration reference

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
