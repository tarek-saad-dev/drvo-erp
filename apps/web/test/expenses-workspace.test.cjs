'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Expenses page requires K5 and independent web feature flag',()=>{
 const page=read('expenses/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_EXPENSES_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});
test('Expenses Client only uses authorized Branch API; no browser storage or fake money posting',()=>{
 const client=read('expenses/expenses-client.tsx');
 assert.match(client,/\/api\/workspaces\//);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/NONPOSTING_EXPENSE_DRAFTS_ONLY/);
 assert.match(client,/treasuryState!=="NOT_PAID"/);
 assert.match(client,/accountingState!=="NOT_POSTED"/);
 assert.match(client,/parseMinor\(amount\)/);
 assert.match(client,/crypto\.randomUUID\(\)/);
 assert.match(client,/Idempotency-Key/);
 assert.match(client,/\/drafts\/".*?cancel/s);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB|CashMove|postedSale|\/ledger/);
});
test('Branch launcher only reveals Expenses tile after flags AND API permission response',()=>{
 const home=read('workspace-home-client.tsx');
 const route=read('page.tsx');
 assert.match(home,/if\(expensesWebEnabled\)/);
 assert.match(home,/setCanViewExpenses\(expenseResult\.ok\)/);
 assert.match(home,/expensesWebEnabled&&canViewExpenses/);
 assert.match(route,/expensesWebEnabled=\{process\.env\.DRVO_EXPENSES_WEB_ENABLED==="YES"\}/);
});
test('Light V1 is shared across all modules, not separate finance-specific branding',()=>{
 const css=fs.readFileSync(path.resolve(__dirname,'../src/app/drvo-light.css'),'utf8');
 assert.match(css,/\.drvo-expenses-grid/);
 assert.match(css,/\.drvo-expenses-banner/);
 assert.match(css,/var\(--drvo-deep\)/);
});
