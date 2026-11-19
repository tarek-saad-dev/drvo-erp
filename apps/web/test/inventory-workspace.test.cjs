'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Inventory page requires K5 and independent web feature flag',()=>{
 const page=read('inventory/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_INVENTORY_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});

test('Inventory Client is Catalog PRODUCT read-only DRAFT preview; no fake stock writes',()=>{
 const client=read('inventory/inventory-client.tsx');
 assert.match(client,/\/api\/workspaces\//);
 assert.match(client,/\/catalog/);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/buildDraftStockPreview/);
 assert.match(client,/DRAFT \/ UNVERIFIED/);
 assert.match(client,/on-hand = UNKNOWN/);
 assert.match(client,/stockLedger NOT_AVAILABLE/);
 assert.match(client,/posting NOT_POSTED/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB/);
 assert.doesNotMatch(client,/method:"POST"|method:'POST'/);
 assert.doesNotMatch(client,/\bQtyOnHand\b|qtyOnHand|applyManualStockAdjustment|\/inventory\/transfers/);
 assert.match(client,/purchasingPosts=\{preview\.purchasingPosts\}/);
 assert.match(client,/adr031=\{preview\.adr031\}/);
});

test('Branch launcher only reveals Inventory tile after flag AND Catalog permission',()=>{
 const home=read('workspace-home-client.tsx');
 const route=read('page.tsx');
 assert.match(home,/if\(inventoryWebEnabled\)/);
 assert.match(home,/setCanViewInventory\(catalogResult\.ok\)/);
 assert.match(home,/inventoryWebEnabled&&canViewInventory/);
 assert.match(route,/inventoryWebEnabled=\{process\.env\.DRVO_INVENTORY_WEB_ENABLED==="YES"\}/);
});

test('Light V1 inventory styles reuse ADR-024 tokens; no separate dark theme',()=>{
 const css=fs.readFileSync(path.resolve(__dirname,'../src/app/drvo-light.css'),'utf8');
 assert.match(css,/\.drvo-inventory-banner/);
 assert.match(css,/\.drvo-inventory-kpis/);
 assert.match(css,/\.drvo-inventory-unknown/);
 assert.match(css,/var\(--drvo-deep\)/);
 assert.doesNotMatch(css,/\.drvo-inventory[^{]*\{[^}]*prefers-color-scheme:\s*dark/);
});
