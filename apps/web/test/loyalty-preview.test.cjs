'use strict';
// SOURCE-LEVEL guards only (no browser run): private flag, scoped UUIDs, preview-only wiring.
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const root=join(__dirname,'../src/app/workspace/[businessId]/[branchId]/loyalty');
const client=readFileSync(join(root,'loyalty-client.tsx'),'utf8');
const route=readFileSync(join(root,'page.tsx'),'utf8');

test('Loyalty UI is behind private Web flags and validates scoped UUIDs',()=>{
 assert.match(route,/DRVO_K5_WEB_ENABLED/);assert.match(route,/DRVO_LOYALTY_WEB_ENABLED/);
 assert.match(route,/notFound\(\)/);
 const m=client.match(/const GUID=\/(\^[^\n;]*\$)\/i;/);assert.ok(m);
 const uuid=new RegExp(m[1],'i'),id='ab12cd34-1234-4abc-a890-0123456789ab';
 assert.equal(uuid.test(id),true);
 for(const bad of [id+'-4321',id.slice(1),id+'x',id.replace(/-/g,'')])assert.equal(uuid.test(bad),false);
 assert.match(client,/GUID\.test\(businessId\)/);assert.match(client,/GUID\.test\(branchId\)/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB/);
});

test('Loyalty UI only calls read/preview endpoints and never a posting path',()=>{
 assert.match(client,/\/loyalty"/);
 assert.match(client,/api\+"\/config"/);
 const paths=[...client.matchAll(/post\("([a-z-]+)"/g)].map(m=>m[1]).sort();
 assert.deepEqual(paths,['redeem-preview','rewards-preview']);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.doesNotMatch(client,/Idempotency-Key|method:"(PUT|PATCH|DELETE)"/);
 assert.doesNotMatch(client,/\/(redeem|adjust|reverse-sale|earn|send|whatsapp)["'`]/);
 assert.match(client,/UNPOSTED_LOYALTY_PREVIEW/);
});

test('Loyalty UI states the preview-only, no-earn-rule, no-messaging limits',()=>{
 assert.match(client,/معاينة فقط|للمعاينة فقط/);
 assert.match(client,/earnRule/);
 assert.match(client,/لا يوجد مرسل رسائل/);
 assert.match(client,/cutClubConfigProvenance/);
});
