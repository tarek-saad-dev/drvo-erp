'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('private POS workstation hosts Cashier catalog/cart/barber/packages/quick-actions shell',()=>{
 const client=read('pos-preview-client.tsx');
 assert.match(client,/data-cashier-pos="private-workstation-v1"/);
 assert.match(client,/CashierCatalogBrowser/);
 assert.match(client,/CashierPackagesSection/);
 assert.match(client,/CashierCartPanel/);
 assert.match(client,/CashierQuickActions/);
 assert.match(client,/CashierBarberSelector/);
 assert.match(client,/PosCustomerOperator/);
 assert.match(client,/defaultExecutorEmployeeId=\{selectedBarberId/);
 assert.doesNotMatch(client,/\/api\/sales|localStorage|DEMO_/);
});
test('barber selector reads HR roster and never posts payroll',()=>{
 const ui=read('cashier-barber-selector.tsx');
 assert.match(ui,/data-cashier-pos="barber-selector"/);
 assert.match(ui,/\/hr\/employees/);
 assert.match(ui,/isBookable/);
 assert.doesNotMatch(ui,/method:\s*"POST"/);
 assert.doesNotMatch(ui,/\/api\/sales/);
 assert.match(ui,/no payroll/);
});

test('catalog browser preserves Cashier / focus and service-product tabs without client prices',()=>{
 const ui=read('cashier-catalog-browser.tsx');
 assert.match(ui,/data-cashier-pos="catalog-browser"/);
 assert.match(ui,/e\.key==="\/"/);
 assert.match(ui,/SERVICE/);
 assert.match(ui,/PRODUCT/);
 assert.match(ui,/onAdd/);
 assert.doesNotMatch(ui,/priceMinor\s*=/);
});

test('quick actions expose Cashier finance buttons as explicitly blocked',()=>{
 const ui=read('cashier-quick-actions.tsx');
 assert.match(ui,/data-cashier-pos="quick-actions-blocked"/);
 assert.match(ui,/FINANCE_GATED/);
 assert.match(ui,/ADR-031/);
 assert.match(ui,/disabled/);
 assert.doesNotMatch(ui,/fetch\(|\/api\/sales|POST/);
});
