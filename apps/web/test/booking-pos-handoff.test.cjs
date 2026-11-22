'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview');
const bookingBase=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const page=fs.readFileSync(path.join(base,'page.tsx'),'utf8');
const client=fs.readFileSync(path.join(base,'pos-preview-client.tsx'),'utf8');
const booking=fs.readFileSync(path.join(bookingBase,'booking-client.tsx'),'utf8');

test('Booking handoff is gated by private K5/Catalog/POS Web flags',()=>{
 for(const v of ['DRVO_K5_WEB_ENABLED','DRVO_CATALOG_WEB_ENABLED','DRVO_POS_PREVIEW_WEB_ENABLED'])
  assert.ok(page.includes(v));
 assert.match(page,/notFound\(\)/);
 assert.match(page,/typeof query\.offeringId==="string"/);
 assert.match(page,/typeof query\.customerId==="string"/);
 assert.match(page,/typeof query\.packageId==="string"/);
 assert.match(page,/typeof query\.bookingId==="string"/);
 assert.match(page,/initialBookingId=\{requestedBookingId\}/);
 assert.match(page,/initialOfferingId=\{requestedOfferingId\}/);
 assert.match(page,/initialCustomerId=\{requestedCustomerId\}/);
 assert.match(page,/initialPackageId=\{requestedPackageId\}/);
});

test('Booking COMPLETED link carries Booking ID only; no customer/offering URL spoof',()=>{
 assert.match(booking,/GUID\.test\(b\.bookingId\)/);
 assert.match(booking,/bookingId="\+encodeURIComponent\(b\.bookingId\)/);
 assert.doesNotMatch(booking,/customerId="\+encodeURIComponent\(b\.customerId\)/);
 assert.doesNotMatch(booking,/offeringId="\+encodeURIComponent\(b\.offeringId\)/);
 assert.doesNotMatch(booking,/packageId="\+encodeURIComponent/);
 assert.doesNotMatch(booking,/\/sales\/posted|localStorage|sessionStorage/);
});

test('untrusted link ID only pre-fills after independently authorized POS/Catalog API GET',()=>{
 assert.match(client,/initialOfferingId:string\|null/);
 assert.match(client,/initialCustomerId:string\|null/);
 assert.match(client,/initialBookingId:string\|null/);
 assert.match(client,/parseVerifiedBookingHandoff/);
 assert.match(client,/\/pos-handoff/);
 assert.match(client,/bookingRes\.status===401/);
 assert.match(client,/if\(!bookingRes\.ok\)/);
 assert.match(client,/customerHint=verified\.customerId/);
 assert.match(client,/initialPackageId:string\|null/);
 assert.match(client,/handoffApplied=useRef\(false\)/);
 assert.match(client,/data\.state!=="DRAFT_PREVIEW_ONLY"/);
 assert.match(client,/GUID\.test\(customerHint\)/);
 assert.match(client,/setSelectedCustomerId\(customerHint\)/);
 assert.match(client,/setCustomerRevision\(v=>v\+1\)/);
 assert.match(client,/expandPackageToDraftLines/);
 assert.match(client,/\/catalog\/packages/);
 assert.match(client,/o\.offeringId\.toLowerCase\(\)===offeringHint\.toLowerCase\(\)/);
 assert.match(client,/o\.isActive&&o\.kind==="SERVICE"/);
 assert.match(client,/setLines\(current=>current\.length!==0\|\|!handoffLines\?current:handoffLines\)/);
 assert.match(client,/credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/retryKey\.current=null;setLines\(\[\]\);setPreview\(null\)/);
 assert.match(client,/posted!==false/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|method:"POST"[^]*\/sales/);
});

test('Booking source response is checked, never trusted from a URL or foreign response',async()=>{
 const {pathToFileURL}=require('node:url');
 const {parseVerifiedBookingHandoff}=await import(pathToFileURL(path.join(base,
  'booking-pos-handoff.mjs')).href);
 const bookingId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const customerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const offeringId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 const valid={bookingId,customerId,offeringId,status:'COMPLETED'};
 assert.deepEqual(parseVerifiedBookingHandoff(valid,bookingId),{customerId,offeringId});
 for(const value of [
  {...valid,status:'BOOKED'},{...valid,status:'CANCELLED'},
  {...valid,status:'NO_SHOW'},{...valid,bookingId:customerId},
  {...valid,customerId:'not-guid'},{...valid,offeringId:'not-guid'},
  {...valid,extra:'from-client'},null,[],{},undefined
 ])assert.equal(parseVerifiedBookingHandoff(value,bookingId),null);
 assert.equal(parseVerifiedBookingHandoff(valid,'not-guid'),null);
});
