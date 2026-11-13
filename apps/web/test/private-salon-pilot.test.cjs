'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=path.join(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const read=name=>fs.readFileSync(path.join(app,name),'utf8');
test('private Salon pilot journey never enables K5 or public Booking',()=>{
 const page=read('page.tsx'),client=read('booking-client.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED !== "YES"/);
 assert.match(page,/DRVO_BOOKING_WEB_ENABLED !== "YES"/);
 assert.match(page,/DRVO_POS_PREVIEW_WEB_ENABLED==="YES"/);
 assert.match(page,/DRVO_CATALOG_WEB_ENABLED==="YES"/);
 assert.match(client,/status==="ready"&&<section/);
 assert.match(client,/href=\{home\+"\/customers"\}/);
 assert.match(client,/href=\{home\+"\/catalog"\}/);
 assert.match(client,/id="new-appointment"/);
 assert.match(client,/canOpenPos&&<Link/);
 assert.match(client,/setCanOpenPos\(preview\.ok\)/);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/تحديث من SQL/);
 assert.doesNotMatch(client,/\/demo\/salon|localStorage|sessionStorage/);
});

test('Booking completed-to-POS route requires draft AND preview grants, never posts',()=>{
 const booking=read('booking-client.tsx');
 const page=read('page.tsx');
 assert.match(page,/DRVO_POS_DRAFTS_WEB_ENABLED==="YES"/);
 assert.match(page,/draftsWebEnabled=/);
 assert.match(booking,/setCanPrepareDraft\(false\)/);
 assert.match(booking,/setCanOpenPos\(preview\.ok\)/);
 assert.match(booking,/if\(preview\.ok&&draftsWebEnabled\)/);
 assert.match(booking,/fetch\(scope\+"\/pos-drafts"/);
 assert.match(booking,/setCanPrepareDraft\(drafts\.ok\)/);
 assert.match(booking,/b\.status==="COMPLETED"&&canPrepareDraft&&GUID\.test\(b\.offeringId\)/);
 assert.match(booking,/encodeURIComponent\(b\.offeringId\)/);
 assert.doesNotMatch(booking,/\/sales\/posted|localStorage|sessionStorage/);
});
