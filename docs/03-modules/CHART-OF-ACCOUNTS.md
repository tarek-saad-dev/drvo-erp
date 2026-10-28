# Chart of Accounts — Business Template Design Draft

**Date:** 2026-10-29. **Status:** proposal, not seeded tables or approved chart.

Each Business starts from an editable industry template (e.g. salon or clinic). The Business owns a separate ledger and Chart of Accounts; Tenant dashboard can present consolidated reports without combining underlying journal books. Account records should carry Business scope, account code, name, type (asset/liability/equity/income/expense), parent reference when hierarchy is enabled, active flag, used-in-postings flag, and audit references. Parent/child nesting depth remains **OPEN**.

Example **illustrative** headings: cash/treasury, bank and payment clearing, accounts receivable, inventory, accounts payable, employee compensation payable, sales revenue, sales returns, cash over/short variance, cost of sales, payroll/commission expense. Do not assume final account numbers, category mappings, taxes or fiscal currency conversion.

Editing a used account: no deletion; restrict type/parent/code changes that would invalidate historic reporting, allow controlled renaming and deactivation subject to use checks. New postings cannot use inactive accounts; historic reports retain account reference and prior names where needed.

Posted journal always balances total debits and credits. Immediate posting means automatic guard checks and audit; draft approval state not required by founder. Reversal/correction entries preserve original. Configure fiscal year start, closing periods and report visibility per Business; expense dimensions cover Branch, Department and Project.

Open: account-level maximum depth, numbering convention, default template content by vertical, account-level reporting roll-up, tax mapping, multi-currency consolidation and report minimum.
