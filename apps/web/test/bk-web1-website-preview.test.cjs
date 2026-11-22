'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const base=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const page=fs.readFileSync(path.join(base,'website-preview/page.tsx'),'utf8');
const client=fs.readFileSync(path.join(base,'website-preview/website-preview-client.tsx'),'utf8');
const sql=fs.readFileSync(path.resolve(__dirname,'../../../db/migrations/043_booking_website_preview_slots.sql'),'utf8');
const controller=fs.readFileSync(path.resolve(__dirname,'../../api/src/booking/booking.controller.ts'),'utf8');
const svc=fs.readFileSync(path.resolve(__dirname,'../../api/src/booking/booking.service.ts'),'utf8');
test('private website preview denies public access and never fakes payments or booking confirmations',()=>{
 for(const flag of ['DRVO_K5_WEB_ENABLED','DRVO_BOOKING_WEB_ENABLED',
  'DRVO_CUSTOMERS_WEB_ENABLED','DRVO_CATALOG_WEB_ENABLED','DRVO_WEBSITE_BOOKING_PREVIEW_WEB_ENABLED'])
  assert.ok(page.includes(flag));
 assert.match(page,/notFound\(\)/);
 assert.match(controller,/DRVO_WEBSITE_BOOKING_PREVIEW_ENABLED!=="YES"/);
 assert.match(client,/credentials:"same-origin"/);
 assert.ok(client.includes('booking+"/appointments"'));
 assert.match(client,/BookingQuickCustomer/);
 assert.match(client,/Idempotency-Key/);
 assert.match(client,/URLSearchParams/);
 assert.match(client,/response\.created/);
 assert.doesNotMatch(page+client,/\/api\/public\/|\/book\/\[branchCode\]|localStorage|sessionStorage|sales\/posted/);
});
test('SQL043 website reads complete scoped windows and conflicts, still delegates write to Booking',()=>{
 assert.match(sql,/CREATE PROCEDURE core.ReadWebsiteBookingSlots/);
 assert.match(sql,/core.AssertBookingBranchAction/);
 assert.match(sql,/booking\.read/);
 assert.match(sql,/FROM core.BookingResourceWindow/);
 assert.match(sql,/FROM core.BookingAppointment/);
 assert.match(sql,/State=''OPEN''/);
 assert.match(sql,/Status=''BOOKED''/);
 assert.match(sql,/SERIALIZABLE/);
 assert.match(sql,/GRANT EXECUTE ON OBJECT::core.ReadWebsiteBookingSlots/);
 assert.doesNotMatch(sql,/INSERT\s+core\.|UPDATE\s+core\.|DELETE\s+core\./i);
 assert.match(svc,/core.ReadWebsiteBookingSlots/);
 assert.match(svc,/advisory:true,confirmed:false,timezone:"UTC"/);
});
test('fail closed on forged, other-scope or stale availability responses',async()=>{
 const {parseWebsiteSlots}=await import(pathToFileURL(path.join(base,'website-preview/website-slots.mjs')).href);
 const r='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const o='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const d='2027-01-02',start='2027-01-02T09:00:00.000Z',end='2027-01-02T09:30:00.000Z';
 const good={utcDay:d,resourceId:r,offeringId:o,advisory:true,confirmed:false,
  timezone:'UTC',slots:[{startsAtUtc:start,endsAtUtc:end}]};
 assert.deepEqual(parseWebsiteSlots(good,r,o,d),{slots:good.slots});
 for(const value of [
  {...good,advisory:false},{...good,confirmed:true},{...good,timezone:'Africa/Cairo'},
  {...good,resourceId:o},{...good,utcDay:'2027-01-03'},
  {...good,slots:[{startsAtUtc:start,endsAtUtc:start}]},
  {...good,slots:[{startsAtUtc:'2027-01-03T09:00:00.000Z',endsAtUtc:end}]},
  {...good,slots:[...good.slots,...good.slots]},null,{},[]
 ])assert.equal(parseWebsiteSlots(value,r,o,d),null);
});
