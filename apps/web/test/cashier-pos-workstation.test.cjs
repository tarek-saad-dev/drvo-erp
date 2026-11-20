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
 assert.match(client,/CashierTipsPreview/);
 assert.match(client,/CashierReturnsPreview/);
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

test('PRODUCT tab uses Cashier-like labels and offeringId prefix search without fake barcode',()=>{
 const ui=read('cashier-catalog-browser.tsx');
 assert.match(ui,/اختر المنتج/);
 assert.match(ui,/بيع تجزئة/);
 assert.match(ui,/offeringId\.slice\(0,8\)/);
 assert.match(ui,/idPrefix\.includes\(q\)/);
 assert.match(ui,/displayName\.toLocaleLowerCase\("en"\)/);
 assert.match(ui,/لا باركود|ليست باركود|لا باركود\/مخزون/);
 // SQL027 overlay may expose stockStatus/qtyMilli; forbid barcode invent + client price writes.
 assert.doesNotMatch(ui,/Barcode|barcode\s*[:=]|fakeStock|qtyOnHand/);
 assert.doesNotMatch(ui,/priceMinor\s*=/);
 assert.match(ui,/ProductStockHint|productStock|stockStatus/);
});

test('quick actions expose Cashier finance buttons as explicitly blocked',()=>{
 const ui=read('cashier-quick-actions.tsx');
 assert.match(ui,/data-cashier-pos="quick-actions-blocked"/);
 assert.match(ui,/FINANCE_GATED/);
 assert.match(ui,/ADR-031/);
 assert.match(ui,/disabled/);
 assert.doesNotMatch(ui,/fetch\(|\/api\/sales|POST/);
});
