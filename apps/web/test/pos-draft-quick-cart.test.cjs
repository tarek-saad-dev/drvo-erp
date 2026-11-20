'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const source=fs.readFileSync(path.join(root,'pos-preview-client.tsx'),'utf8');
const catalog=fs.readFileSync(path.join(root,'cashier-catalog-browser.tsx'),'utf8');
const cart=fs.readFileSync(path.join(root,'cashier-cart-panel.tsx'),'utf8');
test('quick POS selections are nonposting and do not write draft without explicit save',()=>{
 assert.match(source,/function quickAdd\(offering:Offering\)/);
 assert.match(source,/setLines\(current=>\[\.\.\.current,/);
 assert.match(source,/retryKey\.current=null;setPreview\(null\)/);
 assert.match(source,/function createNewFromDraft\(d:\{lines:Line\[\]\}\)/);
 assert.match(source,/!Number\.isSafeInteger\(x\.quantity\)/);
 assert.match(source,/d\.lines\.some\(x=>!GUID\.test/);
 assert.match(source,/offerings\.some\(o=>o\.offeringId===x\.offeringId&&o\.isActive\)/);
 assert.match(source,/new Set\(d\.lines\.map\(x=>x\.offeringId\)\)\.size!==d\.lines\.length/);
 assert.match(source,/المسودة الأصلية لم تتغير/);
 assert.match(source,/draftsEnabled&&draftStatus==="ready"/);
 assert.match(source,/posted!==false/);
 assert.match(source,/credentials:"same-origin",cache:"no-store"/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|\.\/demo\/salon/);
});

test('search narrows only authorized active Catalog suggestions, never new API scope',()=>{
 assert.match(source,/CashierCatalogBrowser/);
 assert.match(catalog,/data-cashier-pos="catalog-browser"/);
 assert.match(catalog,/offerings\.filter\(o=>\{/);
 assert.match(catalog,/if\(!o\.isActive\)return false;/);
 assert.match(catalog,/displayName\.toLocaleLowerCase\("en"\)/);
 assert.match(catalog,/offeringId\.slice\(0,8\)/);
 assert.match(catalog,/idPrefix\.includes\(q\)/);
 assert.match(catalog,/type="search" maxLength=\{100\}/);
 assert.match(catalog,/\.slice\(0,40\)\.map\(o=>\{/);
 assert.doesNotMatch(catalog,/fetch\(/);
 assert.doesNotMatch(source,/fetch\([^)]*catalogSearch/);
});
test('quantity controls are bounded and invalidate stale preview/idempotency before save',()=>{
 assert.match(source,/function adjustLineQuantity\(selectedOfferingId:string,delta:-1\|1\)/);
 assert.match(source,/if\(busy\|\|draftBusy\)return;/);
 assert.match(source,/existing\.quantity\+delta<1\|\|existing\.quantity\+delta>20/);
 assert.match(source,/retryKey\.current=null;setPreview\(null\);setAdjustment\(null\);setMessage\(""\)/);
 assert.match(source,/next>=1&&next<=20\?\{\.\.\.l,quantity:next\}:l/);
 assert.match(source,/CashierCartPanel/);
 assert.match(cart,/disabled=\{disabled\|\|l\.quantity<=1\}/);
 assert.match(cart,/disabled=\{disabled\|\|l\.quantity>=20\}/);
 assert.match(source,/if\(busy\|\|draftBusy\|\|lines\.length===0\)return;/);
 assert.match(source,/method:"POST",credentials:"same-origin",cache:"no-store"/);
 assert.doesNotMatch(source,/\/sales\/posted|\/payment|localStorage|sessionStorage/);
});

// Regression: the real S12 Browser+SQL test caught a six-group UUID regex
// causing POS to deny a valid authorized branch before issuing its GET.
test('POS requires exactly 5-group UUID scope, accepts SQL hex casing and rejects malformed IDs',()=>{
 const match=source.match(/const GUID=\/(\^[^\n;]*\$)\/i;/);
 assert.ok(match,'Expected an anchored case-insensitive UUID literal');
 const guid=new RegExp(match[1],'i');
 const valid='b08a369f-4616-4f17-98bf-106a2c9d141a';
 assert.equal(guid.test(valid),true);
 assert.equal(guid.test(valid.toUpperCase()),true);
 for(const bad of [
  '',valid+'-0000','00000000-0000-0000-0000-0000-000000000000',
  valid.replace(/-/g,''),valid.replace(/-/,''),
  'b08a369f-4616-4f17-98bf-106a-2c9d141a',
  'b08a369f-4616-4f17-98bf-106a2c9d141z',
 ])assert.equal(guid.test(bad),false,bad);
 assert.match(source,/!GUID\.test\(businessId\)\|\|!GUID\.test\(branchId\)/);
 assert.match(source,/setStatus\("denied"\);return/);
 assert.doesNotMatch(source,/data-scope-uuid-valid/);
});
