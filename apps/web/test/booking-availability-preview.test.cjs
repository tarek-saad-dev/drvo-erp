'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {readFileSync}=require('node:fs');
const modulePath=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking/booking-availability-preview.mjs');
const bookingPath=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking/booking-client.tsx');
const rid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const date='2030-02-03', nowMs=Date.parse('2030-02-03T06:00:00Z');
const window=(resourceId=rid,state='OPEN')=>({resourceId,state,startsAtUtc:'2030-02-03T09:00:00Z',endsAtUtc:'2030-02-03T11:00:00Z'});
const booked=(resourceId=rid,status='BOOKED')=>({resourceId,status,startsAtUtc:'2030-02-03T09:30:00Z',endsAtUtc:'2030-02-03T10:30:00Z'});
const base={resourceId:rid,dayLocal:date,durationMinutes:30,windows:[window()],appointments:[],nowMs};
test('window suggestions are advisory, within OPEN window and finite',async()=>{
 const {suggestBookingStarts}=await import(pathToFileURL(modulePath).href);
 const result=suggestBookingStarts(base);
 assert.equal(result.status,'SUGGESTIONS');
 assert.ok(result.slots.length>0&&result.slots.length<=8);
 for(const s of result.slots){
   assert.ok(Date.parse(s.startsAtUtc)>=Date.parse(window().startsAtUtc));
   assert.ok(Date.parse(s.startsAtUtc)+30*60000<=Date.parse(window().endsAtUtc));
   assert.match(s.localInput,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
 }
});
test('confirmed overlapping appointments suppress suggestions, cancelled do not',async()=>{
 const {suggestBookingStarts}=await import(pathToFileURL(modulePath).href);
 const occupied=suggestBookingStarts({...base,appointments:[booked()]});
 assert.ok(occupied.slots.every(s=>Date.parse(s.startsAtUtc)<Date.parse(booked().startsAtUtc)||
  Date.parse(s.startsAtUtc)>=Date.parse(booked().endsAtUtc)));
 const cancelled=suggestBookingStarts({...base,appointments:[booked(rid,'CANCELLED')]});
 assert.ok(cancelled.slots.some(s=>Date.parse(s.startsAtUtc)===Date.parse(booked().startsAtUtc)));
 const foreign=suggestBookingStarts({...base,appointments:[booked(other)]});
 assert.equal(foreign.slots.length,cancelled.slots.length);
});
test('CLOSED-only and missing future windows never imply unrestricted availability',async()=>{
 const {suggestBookingStarts}=await import(pathToFileURL(modulePath).href);
 assert.equal(suggestBookingStarts({...base,windows:[window(rid,'CLOSED')]}).status,'NO_OPEN_WINDOWS_RETURNED');
 assert.equal(suggestBookingStarts({...base,windows:[]}).status,'NO_OPEN_WINDOWS_RETURNED');
 assert.equal(suggestBookingStarts({...base,windows:[window(other)]}).status,'NO_OPEN_WINDOWS_RETURNED');
});
test('invalid requests, expired periods and appointments longer than windows are not suggested',async()=>{
 const {suggestBookingStarts}=await import(pathToFileURL(modulePath).href);
 assert.equal(suggestBookingStarts({...base,resourceId:'BAD'}).status,'NEED_SELECTION');
 assert.equal(suggestBookingStarts({...base,dayLocal:'2030-02-31'}).status,'NEED_SELECTION');
 assert.equal(suggestBookingStarts({...base,durationMinutes:0}).status,'NEED_SELECTION');
 assert.equal(suggestBookingStarts({...base,durationMinutes:180}).status,'NO_VISIBLE_CANDIDATES');
 assert.equal(suggestBookingStarts({...base,nowMs:Date.parse('2030-02-03T12:00:00Z')}).status,'NO_VISIBLE_CANDIDATES');
});
test('UI keeps server-owned POST and independent K5 gates; suggestions are not a confirmation',()=>{
 const body=readFileSync(bookingPath,'utf8');
 assert.match(body,/suggestBookingStarts\(/);
 assert.match(body,/أوقات مرشحة فقط/);
 assert.match(body,/onClick=\{\(\)=>\{setLocalStart\(slot\.localInput\);bookingRequest\.current=null;\}\}/);
 assert.match(body,/await submit\("\/appointments"/);
 assert.doesNotMatch(body,/localStorage|sessionStorage|\/sales\/posted/);
});
