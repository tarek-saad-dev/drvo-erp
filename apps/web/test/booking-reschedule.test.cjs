'use strict';
// BK-06 private Booking reschedule UI: advisory helpers + source locks. SOURCE-LEVEL ONLY
// (no browser run). SQL033 is the sole authority for conflicts; nothing here proves a slot.
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {readFileSync}=require('node:fs');
const dir=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const helperUrl=pathToFileURL(path.join(dir,'booking-reschedule.mjs')).href;
const client=readFileSync(path.join(dir,'booking-client.tsx'),'utf8');
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const R1='11111111-1111-4111-8111-111111111111',R2='22222222-2222-4222-8222-222222222222';
const nowMs=Date.parse('2030-02-03T06:00:00Z');
const appt=(o={})=>({bookingId:A,resourceId:R1,status:'BOOKED',
 startsAtUtc:'2030-02-03T09:00:00.000Z',endsAtUtc:'2030-02-03T09:30:00.000Z',...o});

test('only a future BOOKED appointment with a valid id can be offered a move',async()=>{
 const {canOfferReschedule}=await import(helperUrl);
 assert.equal(canOfferReschedule(appt(),nowMs),true);
 assert.equal(canOfferReschedule(appt({status:'CANCELLED'}),nowMs),false);
 assert.equal(canOfferReschedule(appt({status:'COMPLETED'}),nowMs),false);
 assert.equal(canOfferReschedule(appt({startsAtUtc:'2030-02-03T05:00:00.000Z'}),nowMs),false);
 assert.equal(canOfferReschedule(appt({bookingId:'not-a-guid'}),nowMs),false);
 assert.equal(canOfferReschedule(null,nowMs),false);
});

test('move body carries only resourceId + exact UTC minute and never scope fields',async()=>{
 const {buildMoveBody,localMinuteToUtcIso}=await import(helperUrl);
 const local='2030-02-03T12:00';
 const body=buildMoveBody({resourceId:R2,localStart:local,nowMs});
 assert.deepEqual(Object.keys(body).sort(),['resourceId','startsAtUtc']);
 assert.match(body.startsAtUtc,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
 assert.equal(body.startsAtUtc,new Date(local).toISOString());
 assert.equal(buildMoveBody({resourceId:'bad',localStart:local,nowMs}),null);
 assert.equal(buildMoveBody({resourceId:R2,localStart:'',nowMs}),null);
 assert.equal(localMinuteToUtcIso('2030-02-03T06:02',nowMs),null,'needs 5 minute lead');
 assert.equal(localMinuteToUtcIso('2030-02-03T12:00:30',nowMs),null);
 assert.equal(localMinuteToUtcIso('2030-02-30T12:00',nowMs),null);
 assert.equal(localMinuteToUtcIso(undefined,nowMs),null);
});

test('retry of the same move reuses its key id, a different target does not',async()=>{
 const {moveRequestKeyId}=await import(helperUrl);
 const body={resourceId:R2,startsAtUtc:'2030-02-03T10:00:00.000Z'};
 assert.equal(moveRequestKeyId(A,body),moveRequestKeyId(A,{...body}));
 assert.notEqual(moveRequestKeyId(A,body),moveRequestKeyId(A,{...body,resourceId:R1}));
 assert.notEqual(moveRequestKeyId(A,body),moveRequestKeyId(B,body));
 assert.notEqual(moveRequestKeyId(A,body),moveRequestKeyId(A,{...body,startsAtUtc:'2030-02-03T10:15:00.000Z'}));
});

test('advisory conflict ignores itself, cancelled rows and other resources',async()=>{
 const {advisoryMoveConflict}=await import(helperUrl);
 const self=appt();
 const other=appt({bookingId:B,resourceId:R2,startsAtUtc:'2030-02-03T10:00:00.000Z',endsAtUtc:'2030-02-03T11:00:00.000Z'});
 const base={appointments:[self,other],bookingId:A,durationMinutes:30};
 assert.equal(advisoryMoveConflict({...base,resourceId:R1,startsAtUtc:'2030-02-03T09:15:00.000Z'}),null,'own slot never conflicts');
 assert.equal(advisoryMoveConflict({...base,resourceId:R2,startsAtUtc:'2030-02-03T10:30:00.000Z'}),other);
 assert.equal(advisoryMoveConflict({...base,resourceId:R2,startsAtUtc:'2030-02-03T11:00:00.000Z'}),null,'touching end is free');
 assert.equal(advisoryMoveConflict({...base,resourceId:R2,startsAtUtc:'2030-02-03T09:45:00.000Z'}),other,'tail overlap');
 assert.equal(advisoryMoveConflict({appointments:[{...other,status:'CANCELLED'}],bookingId:A,
  durationMinutes:30,resourceId:R2,startsAtUtc:'2030-02-03T10:15:00.000Z'}),null);
 assert.equal(advisoryMoveConflict({...base,durationMinutes:null,resourceId:R2,startsAtUtc:'2030-02-03T10:15:00.000Z'}),null);
});

test('move suggestions keep the appointment duration and free its own slot',async()=>{
 const {suggestMoveStarts,appointmentDurationMinutes}=await import(helperUrl);
 assert.equal(appointmentDurationMinutes(appt()),30);
 assert.equal(appointmentDurationMinutes({startsAtUtc:'x',endsAtUtc:'y'}),null);
 const win={resourceId:R1,state:'OPEN',startsAtUtc:'2030-02-03T09:00:00.000Z',endsAtUtc:'2030-02-03T10:00:00.000Z'};
 const out=suggestMoveStarts({appointment:appt(),resourceId:R1,dayLocal:'2030-02-03',
  windows:[win],appointments:[appt()],nowMs});
 assert.equal(out.status,'SUGGESTIONS');
 assert.ok(out.slots.some(s=>s.startsAtUtc==='2030-02-03T09:00:00.000Z'),'own slot is free for itself');
 const closed=suggestMoveStarts({appointment:appt(),resourceId:R1,dayLocal:'2030-02-03',
  windows:[{...win,state:'CLOSED'}],appointments:[],nowMs});
 assert.equal(closed.status,'NO_OPEN_WINDOWS_RETURNED');
});

test('failure mapping resets the key for decisions and keeps it for transient failures',async()=>{
 const {describeMoveFailure}=await import(helperUrl);
 for(const s of [400,403,404,409])assert.equal(describeMoveFailure(s).key,'reset',String(s));
 for(const s of [500,503])assert.equal(describeMoveFailure(s).key,'keep',String(s));
 assert.ok(describeMoveFailure(409).message.length>10);
});

test('Booking client wires validate-then-confirm reschedule with idempotency and no side effects',()=>{
 assert.match(client,/booking-reschedule\.mjs/);
 assert.match(client,/id="move-appointment"/);
 assert.match(client,/"validate-move"\|"reschedule"/);
 assert.match(client,/\/booking\/appointments\/"\+encodeURIComponent\(bookingId\)\+"\/"\+kind/);
 assert.match(client,/headers\["Idempotency-Key"\]=moveKeys\.current\.get\(retryId\)!/);
 assert.match(client,/moveChecked!==retryId/);
 assert.match(client,/canOfferReschedule\(b\)/);
 assert.match(client,/window=\{windows\}|windows,appointments:data\.appointments/);
 // Body is built only by buildMoveBody, so scope fields cannot be injected from the UI.
 assert.match(client,/JSON\.stringify\(moveBody\)/);
 assert.doesNotMatch(client,/localStorage|sessionStorage/);
 assert.doesNotMatch(client,/whatsapp|sendMessage|notify\(/i);
});
