'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const page=fs.readFileSync(path.join(base,'page.tsx'),'utf8');
const client=fs.readFileSync(path.join(base,'pos-preview-client.tsx'),'utf8');

test('Booking handoff is gated by private K5/Catalog/POS Web flags',()=>{
 for(const v of ['DRVO_K5_WEB_ENABLED','DRVO_CATALOG_WEB_ENABLED','DRVO_POS_PREVIEW_WEB_ENABLED'])
  assert.ok(page.includes(v));
 assert.match(page,/notFound\(\)/);
 assert.match(page,/typeof query\.offeringId==="string"/);
 assert.match(page,/initialOfferingId=\{requestedOfferingId\}/);
});
test('untrusted link ID only pre-fills after independently authorized POS/Catalog API GET',()=>{
 assert.match(client,/initialOfferingId:string\|null/);
 assert.match(client,/handoffApplied=useRef\(false\)/);
 assert.match(client,/data\.state!=="DRAFT_PREVIEW_ONLY"/);
 assert.match(client,/o\.offeringId===initialOfferingId&&GUID\.test/);
 assert.match(client,/o\.isActive&&o\.kind==="SERVICE"/);
 assert.match(client,/setLines\(current=>current\.length===0/);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/retryKey\.current=null;setLines\(\[\]\);setPreview\(null\)/);
 assert.match(client,/posted!==false/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|method:"POST"[^]*\/sales/);
});
