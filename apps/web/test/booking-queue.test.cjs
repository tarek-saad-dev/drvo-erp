'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Queue page is private and independently gated',()=>{
 const page=read('queue/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_QUEUE_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});
test('Queue UI stays nonposting and uses idempotent lifecycle + settle actions',()=>{
 const client=read('queue/queue-client.tsx');
 assert.match(client,/NONPOSTING_QUEUE_TICKETS_ONLY/);
 assert.match(client,/NONPOSTING_QUEUE_LIFECYCLE/);
 assert.match(client,/treasuryState!=="NOT_PAID"/);
 assert.match(client,/accountingState!=="NOT_POSTED"/);
 assert.match(client,/ADR-031 OUT OF SCOPE/);
 assert.match(client,/Idempotency-Key/);
 assert.match(client,/\/queue\/tickets/);
 assert.match(client,/\/queue\/tickets\/.+\/status/);
 assert.match(client,/\/queue\/settle-expired/);
 assert.match(client,/تسوية منتهية/);
 assert.match(client,/drvo-queue-board/);
 assert.match(client,/WAITING/);
 assert.match(client,/CALLED/);
 assert.match(client,/IN_SERVICE/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|CashMove|paidSale/);
 assert.match(client,/NOT_POSTED/);
 assert.doesNotMatch(client,/"POSTED"|accountingPosted|paid invoice/i);
});
test('Booking calendar board + queue handoff are wired without financial claims',()=>{
 const page=read('booking/page.tsx');
 const client=read('booking/booking-client.tsx');
 assert.match(page,/queueWebEnabled=\{process\.env\.DRVO_QUEUE_WEB_ENABLED==="YES"\}/);
 assert.match(client,/drvo-booking-calendar/);
 assert.match(client,/تقويم اليوم حسب المورد/);
 assert.match(client,/\/queue\/from-booking/);
 assert.match(client,/إلى الطابور/);
 assert.match(client,/ADR-031 خارج النطاق/);
 assert.doesNotMatch(client,/auto-post|POSTED sale|convert.*paid/i);
});
test('Branch launcher exposes queue only behind web flag + API auth',()=>{
 const home=read('workspace-home-client.tsx');
 const route=read('page.tsx');
 assert.match(route,/queueWebEnabled=\{process\.env\.DRVO_QUEUE_WEB_ENABLED==="YES"\}/);
 assert.match(home,/queueWebEnabled&&canViewQueue/);
 assert.match(home,/\/queue/);
 assert.match(home,/setCanViewQueue\(queueResult\.ok/);
});
test('Light CSS covers booking calendar and queue live board columns',()=>{
 const css=fs.readFileSync(path.resolve(__dirname,'../src/app/drvo-light.css'),'utf8');
 assert.match(css,/\.drvo-booking-calendar-grid/);
 assert.match(css,/\.drvo-queue-columns/);
 assert.match(css,/\.drvo-queue-board/);
 assert.match(css,/\.drvo-queue-card/);
});
