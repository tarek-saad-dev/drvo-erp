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
 assert.match(client,/مفيش حجوزات في الفترة المعروضة/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|\/demo\/salon|\.post\(|method:"POST"/);
});
test('Workspace only reveals Salon tile after real module read and Web gates',()=>{
 const source=read('workspace-home-client.tsx');
 const page=read('page.tsx');
 assert.match(page,/salonWebEnabled=/);
 assert.match(source,/salonWebEnabled&&canViewBooking/);
 assert.match(source,/setCanViewBooking\(bookingResult\.ok && catalogResult\.ok && customersResult\.ok\)/);
});

test('daily operational filters and Booking-to-POS actions honor independent access',()=>{
 const client=read('salon/salon-overview-client.tsx');
 assert.match(client,/setFilter\]=useState<"TODAY"\|"UPCOMING"\|"ALL">\("TODAY"\)/);
 assert.match(client,/localToday\(when\)/);
 assert.match(client,/filter==="UPCOMING"/);
 assert.match(client,/b\.status==="BOOKED"/);
 assert.match(client,/posPreviewAllowed=preview\.ok/);
 assert.match(client,/overview\.posPreviewAllowed&&b\.status==="COMPLETED"&&GUID\.test\(b\.offeringId\)/);
 assert.match(client,/encodeURIComponent\(b\.offeringId\)/);
 assert.match(client,/root\+"\/pos-preview"/);
 assert.match(client,/بدون مبيعات أو تحصيل/);
 assert.doesNotMatch(client,/method:"POST"|\/sales\/posted|\.post\(/);
});

test('resource/status roster filters use authorized list only and never create API access',()=>{
 const client=read('salon/salon-overview-client.tsx');
 assert.match(client,/resourceId:string;customerName/);
 assert.match(client,/resourceFilter,setResourceFilter/);
 assert.match(client,/statusFilter,setStatusFilter/);
 assert.match(client,/resourceOptions=Array\.from\(new Map/);
 assert.match(client,/\.filter\(b=>!resourceFilter\|\|b\.resourceId===resourceFilter\)/);
 assert.match(client,/\.filter\(b=>statusFilter==="ALL"\|\|b\.status===statusFilter\)/);
 assert.match(client,/k5-salon-resource-filter/);
 assert.match(client,/k5-salon-status-filter/);
 assert.match(client,/filtered\.length/);
 assert.match(client,/آخر 200 حجز/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|method:"POST"/);
});
