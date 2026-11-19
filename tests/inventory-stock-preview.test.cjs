'use strict';
/**
 * Shared Inventory stock preview helper — Catalog PRODUCT + optional SQL027 balances.
 * Cost remains UNKNOWN; ADR-031 out of scope.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const inv=require('../dist/packages/business-modules/inventory/src/stock-preview');

const guid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');

function product(n,name,extra={}){
 return {
  offeringId:guid(n),kind:'PRODUCT',displayName:name,
  priceMinor:1500,currency:'EGP',isActive:true,...extra,
 };
}

test('without balances: PRODUCT rows keep UNKNOWN on-hand; SERVICES excluded',()=>{
 const preview=inv.buildDraftStockPreview([
  product(1,'Wax'),
  {offeringId:guid(2),kind:'SERVICE',displayName:'Haircut',priceMinor:20000,
   currency:'EGP',isActive:true},
  product(3,'Shampoo',{isActive:false,categoryName:'Retail'}),
 ]);
 assert.equal(preview.state,'DRAFT_UNVERIFIED_STOCK_PREVIEW');
 assert.equal(preview.verification,'UNVERIFIED');
 assert.equal(preview.posting,'NOT_POSTED');
 assert.equal(preview.stockLedger,'NOT_AVAILABLE');
 assert.equal(preview.purchasingPosts,'NOT_AVAILABLE');
 assert.equal(preview.adr031,'NOT_IN_SCOPE');
 assert.equal(preview.kpis.activeProducts,1);
 assert.equal(preview.kpis.unitsAvailable,'UNKNOWN');
 assert.equal(preview.kpis.inventoryValueAtCost,'UNKNOWN');
 assert.equal(preview.items.length,2);
 for(const row of preview.items){
  assert.equal(row.onHand,'UNKNOWN');
  assert.equal(row.stockStatus,'UNKNOWN');
 }
});

test('with balances: qtyMilli owned; cost still UNKNOWN',()=>{
 const preview=inv.buildDraftStockPreview(
  [product(10,'Wax'),product(11,'Gel')],
  '',
  [{offeringId:guid(10),qtyMilli:2500,reorderLevelMilli:1000,stockStatus:'OK'},
   {offeringId:guid(11),qtyMilli:0,reorderLevelMilli:null,stockStatus:'OUT'}],
 );
 assert.equal(preview.state,'NONPOSTING_BRANCH_STOCK_BALANCES');
 assert.equal(preview.verification,'BALANCES_OWNED');
 assert.equal(preview.stockLedger,'BRANCH_BALANCE_TABLE');
 assert.equal(preview.purchasingPosts,'RECEIVE_DRAFTS_ONLY');
 assert.equal(preview.kpis.unitsMilli,2500);
 assert.equal(preview.kpis.unitsAvailable,2.5);
 assert.equal(preview.kpis.outOfStock,1);
 assert.equal(preview.kpis.inventoryValueAtCost,'UNKNOWN');
 assert.equal(preview.items.find(r=>r.offeringId===guid(10)).qtyMilli,2500);
 assert.equal(preview.items.find(r=>r.offeringId===guid(11)).stockStatus,'OUT');
});

test('query matches displayName or offeringId prefix',()=>{
 const wax=product(10,'Arabic Wax');
 const gel=product(11,'Hair Gel');
 const byName=inv.buildDraftStockPreview([wax,gel],'wax');
 assert.equal(byName.items.length,1);
 assert.equal(byName.items[0].displayName,'Arabic Wax');
});

test('malformed offerings fail closed',()=>{
 assert.throws(()=>inv.buildDraftStockPreview(null),TypeError);
 assert.throws(()=>inv.buildDraftStockPreview([product(1,'Ok')],'x'.repeat(201)),TypeError);
});

test('web local helper stays aligned with shared domain package',()=>{
 const domain=readFileSync(resolve(__dirname,
  '../packages/business-modules/inventory/src/stock-preview.ts'),'utf8');
 const web=readFileSync(resolve(__dirname,
  '../apps/web/src/app/workspace/[businessId]/[branchId]/inventory/inventory-stock-preview.ts'),
  'utf8');
 for(const token of [
  'NONPOSTING_BRANCH_STOCK_BALANCES','BALANCES_OWNED','NOT_POSTED',
  'BRANCH_BALANCE_TABLE','RECEIVE_DRAFTS_ONLY','NOT_IN_SCOPE',
  'buildDraftStockPreview','isCatalogProductOffering',
 ]) assert.ok(domain.includes(token)&&web.includes(token),'missing '+token);
 assert.doesNotMatch(domain,/localStorage|applyManualStockAdjustment/);
});
