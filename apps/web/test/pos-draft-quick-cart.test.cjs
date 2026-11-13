'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,
 '../src/app/workspace/[businessId]/[branchId]/pos-preview/pos-preview-client.tsx'),'utf8');
test('quick POS selections are nonposting and do not write draft without explicit save',()=>{
 assert.match(source,/function quickAdd\(offering:Offering\)/);
 assert.match(source,/setLines\(current=>\[\.\.\.current,/);
 assert.match(source,/retryKey\.current=null;setPreview\(null\)/);
 assert.match(source,/function createNewFromDraft\(d:SavedDraft\)/);
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
 assert.match(source,/const \[catalogSearch,setCatalogSearch\]=useState\(""\)/);
 assert.match(source,/const matchingOfferings=offerings\.filter\(o=>o\.isActive&&/);
 assert.match(source,/o\.displayName\.toLocaleLowerCase\(\)\.includes\(catalogSearch\.trim\(\)\.toLocaleLowerCase\(\)\)/);
 assert.match(source,/type="search" maxLength=\{100\}/);
 assert.match(source,/matchingOfferings\.filter\(o=>/);
 assert.match(source,/\.slice\(0,8\)\.map\(o=><button/);
 assert.doesNotMatch(source,/fetch\([^)]*catalogSearch/);
});
test('quantity controls are bounded and invalidate stale preview/idempotency before save',()=>{
 assert.match(source,/function adjustLineQuantity\(selectedOfferingId:string,delta:-1\|1\)/);
 assert.match(source,/if\(busy\|\|draftBusy\)return;/);
 assert.match(source,/existing\.quantity\+delta<1\|\|existing\.quantity\+delta>20/);
 assert.match(source,/retryKey\.current=null;setPreview\(null\);setMessage\(""\)/);
 assert.match(source,/next>=1&&next<=20\?\{\.\.\.l,quantity:next\}:l/);
 assert.match(source,/disabled=\{busy\|\|draftBusy\|\|l\.quantity<=1\}/);
 assert.match(source,/disabled=\{busy\|\|draftBusy\|\|l\.quantity>=20\}/);
 assert.match(source,/if\(busy\|\|draftBusy\|\|lines\.length===0\)return;/);
 assert.match(source,/method:"POST",credentials:"same-origin",cache:"no-store"/);
 assert.doesNotMatch(source,/\/sales\/posted|\/payment|localStorage|sessionStorage/);
});
