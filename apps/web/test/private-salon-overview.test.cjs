'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('private Salon route requires K5, Booking, Customer and Catalog Web flags',()=>{
 const page=read('salon/page.tsx');
 for(const flag of ['DRVO_K5_WEB_ENABLED','DRVO_BOOKING_WEB_ENABLED',
  'DRVO_CUSTOMERS_WEB_ENABLED','DRVO_CATALOG_WEB_ENABLED'])
  assert.ok(page.includes(flag+'!=="YES"'));
 assert.match(page,/notFound\(\)/);
 assert.match(page,/robots:\{index:false,follow:false\}/);
});
test('overview must verify branch session and independently authorized modules',()=>{
 const client=read('salon/salon-overview-client.tsx');
 assert.match(client,/\/api\/auth\/me/);
 assert.match(client,/\/api\/auth\/workspaces/);
 assert.match(client,/branchData\.businessId!==businessId/);
 assert.match(client,/matching=assigned\.workspaces\?\.find/);
 for(const endpoint of ['/booking','/customers','/catalog','/pos-drafts']){
  assert.ok(client.includes('root+"'+endpoint+'"'));
 }
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/drafts\.ok/);
 assert.match(client,/let draftCount:number\\|null=null/);
 assert.match(client,/لا توجد حجوزات/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|\/demo\/salon|\.post\(|method:"POST"/);
});
test('Workspace only reveals Salon tile after real module read and Web gates',()=>{
 const source=read('workspace-home-client.tsx');
 const page=read('page.tsx');
 assert.match(page,/salonWebEnabled=/);
 assert.match(source,/salonWebEnabled&&canViewBooking/);
 assert.match(source,/setCanViewBooking\(bookingResult\.ok && catalogResult\.ok && customersResult\.ok\)/);
});
