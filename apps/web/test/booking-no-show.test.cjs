'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const web=fs.readFileSync(path.join(dir,'booking-client.tsx'),'utf8');
const sql=fs.readFileSync(path.resolve(__dirname,'../../../db/migrations/041_booking_no_show_terminal.sql'),'utf8');
const svc=fs.readFileSync(path.resolve(__dirname,'../../api/src/booking/booking.service.ts'),'utf8');

test('private Booking wires No-show into persisted scoped status action',()=>{
 assert.match(web,/status:"BOOKED"\|"CANCELLED"\|"COMPLETED"\|"NO_SHOW"/);
 assert.match(web,/next:"CANCELLED"\|"COMPLETED"\|"NO_SHOW"/);
 assert.match(web,/changeStatus\(b\.bookingId,"NO_SHOW"\)/);
 assert.match(web,/Date\.parse\(b\.startsAtUtc\)>Date\.now\(\)/);
 assert.match(web,/window\.confirm\(/);
 assert.match(web,/Idempotency-Key/);
 assert.match(web,/credentials:"same-origin"/);
 assert.match(web,/لم يحضر/);
 assert.doesNotMatch(web,/\/sales\/posted|localStorage|sessionStorage/);
});
test('SQL041 preserves Booking K5 owner + guard and never writes another module',()=>{
 assert.match(sql,/CHECK\(Status IN \('BOOKED','CANCELLED','COMPLETED','NO_SHOW'\)\)/);
 assert.match(sql,/CHECK\(TargetStatus IN \('CANCELLED','COMPLETED','NO_SHOW'\)\)/);
 assert.match(sql,/ALTER PROCEDURE core\.ChangeBookingAppointmentStatus/);
 assert.match(sql,/core\.AssertBookingBranchAction/);
 assert.match(sql,/FROM core\.QueueTicket WITH\(UPDLOCK,HOLDLOCK\)/);
 assert.match(sql,/IF @TargetStatus IN \(''COMPLETED'',''NO_SHOW''\) AND @StartsAtUtc>SYSUTCDATETIME\(\)/);
 assert.match(sql,/INSERT core\.BookingStatusChange/);
 assert.doesNotMatch(sql,/(?:INSERT|UPDATE|DELETE) (?:dbo\.|core\.)?(?:Sale|Treasury|Accounting|PosDraft|QueueTicket)\b/i);
 assert.match(svc,/d\.status!=="NO_SHOW"/);
 assert.match(svc,/status:"CANCELLED"\|"COMPLETED"\|"NO_SHOW"/);
});
