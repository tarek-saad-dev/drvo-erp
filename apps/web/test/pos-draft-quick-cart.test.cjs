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
