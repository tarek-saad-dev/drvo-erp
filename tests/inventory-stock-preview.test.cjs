'use strict';
/**
 * Shared Inventory DRAFT stock preview — Catalog PRODUCT only; on-hand UNKNOWN.
 * Cashier pin concepts: casher@046bf19 admin inventory dashboard + branch stock list.
 * No SQL027 / Nest inventory procs in this track.
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

test('PRODUCT offerings become DRAFT rows with UNKNOWN on-hand; SERVICES excluded',()=>{
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
 assert.equal(preview.kpis.lowStock,'UNKNOWN');
 assert.equal(preview.kpis.outOfStock,'UNKNOWN');
 assert.equal(preview.items.length,2);
 for(const row of preview.items){
  assert.equal(row.onHand,'UNKNOWN');
  assert.equal(row.stockStatus,'UNKNOWN');
  assert.equal(row.barcode,null);
  assert.equal(row.productCode,null);
 }
 assert.equal(preview.items.find(r=>r.displayName==='Shampoo')?.categoryName,'Retail');
});

test('query matches displayName or offeringId prefix; never invents qty 0 as truth',()=>{
 const wax=product(10,'Arabic Wax');
 const gel=product(11,'Hair Gel');
 const all=inv.buildDraftStockPreview([wax,gel],'');
 assert.equal(all.items.length,2);
 assert.ok(all.items.every(r=>r.onHand==='UNKNOWN'&&r.onHand!==0));
 const byName=inv.buildDraftStockPreview([wax,gel],'wax');
 assert.equal(byName.items.length,1);
 assert.equal(byName.items[0].displayName,'Arabic Wax');
 const byId=inv.buildDraftStockPreview([wax,gel],guid(11));
 assert.equal(byId.items.length,1);
 assert.equal(byId.items[0].offeringId,guid(11));
});

test('malformed offerings and oversized query fail closed',()=>{
 assert.throws(()=>inv.buildDraftStockPreview(null),TypeError);
 assert.throws(()=>inv.buildDraftStockPreview([{
  offeringId:'bad',kind:'PRODUCT',displayName:'X',priceMinor:1,currency:'EGP',isActive:true,
 }]),TypeError);
 assert.throws(()=>inv.buildDraftStockPreview([product(1,'Ok')],'x'.repeat(201)),TypeError);
 assert.equal(inv.isCatalogProductOffering(product(1,'Ok')),true);
 assert.equal(inv.isCatalogProductOffering({
  ...product(2,'Cut'),kind:'SERVICE',
 }),false);
});

test('web local helper stays aligned with shared domain package',()=>{
 const domain=readFileSync(resolve(__dirname,
  '../packages/business-modules/inventory/src/stock-preview.ts'),'utf8');
 const web=readFileSync(resolve(__dirname,
  '../apps/web/src/app/workspace/[businessId]/[branchId]/inventory/inventory-stock-preview.ts'),
  'utf8');
 for(const token of [
  'DRAFT_UNVERIFIED_STOCK_PREVIEW','UNVERIFIED','NOT_POSTED','NOT_AVAILABLE',
  'NOT_IN_SCOPE','onHand: "UNKNOWN"','stockStatus: "UNKNOWN"',
  'isCatalogProductOffering','buildDraftStockPreview','matchesStockPreviewQuery',
 ]) assert.ok(domain.includes(token)&&web.includes(token),'missing '+token);
 assert.doesNotMatch(domain,/\bQtyOnHand\b|qtyOnHand\s*[:=]\s*0|applyManualStockAdjustment/);
 assert.doesNotMatch(web,/\bQtyOnHand\b|localStorage|sessionStorage/);
});
