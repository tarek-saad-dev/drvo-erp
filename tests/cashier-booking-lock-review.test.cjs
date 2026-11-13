'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'tests/fixtures/cashier/publicBookingCreateLocks.ts');
const body=fs.readFileSync(file,'utf8');
const blob=crypto.createHash('sha1').update(Buffer.concat([
 Buffer.from('blob '+Buffer.byteLength(body)+'\0'),Buffer.from(body)
])).digest('hex');
const original='e204c261e8ea6d748cb65f66a825d2b4b8bfc0f8';
const js=ts.transpileModule(body,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
}}).outputText;
const m={exports:{}};
// Only the pure key/hash functions are invoked. No real server, DB or session.
vm.runInNewContext(js,{
 module:m,exports:m.exports,
 require:(name)=>{
  if(name==='server-only')return {};
  if(name==='@/lib/db')return {sql:{}};
  throw Error('Unexpected legacy runtime dependency');
 }
},{timeout:3000});
const legacy=m.exports;
const sqlBooking=fs.readFileSync(path.join(root,
 'db/migrations/013_branch_booking_foundation.sql'),'utf8');

test('snapshot is exactly pinned to reviewed Cashier Git blob, not a mutable branch',()=>{
 assert.equal(blob,original);
 assert.match(body,/sp_getapplock/);
});
test('Cashier pure lock helpers are characterized without copying its SQL runtime',()=>{
 assert.equal(legacy.hashServiceSet([8,2,4]),legacy.hashServiceSet([4,8,2]));
 assert.match(legacy.hashServiceSet([2,4,8]),/^[0-9a-f]{8}$/);
 const start=1730000000000,end=start+30*60000;
 assert.equal(legacy.empIntervalLockResource(12,start,end),
  'booking:emp:12:'+start+':'+end);
 assert.equal(legacy.anyBarberAssignmentLockResource(8,start,end,'deadbeef'),
  'booking:any:8:'+start+':'+end+':deadbeef');
});
test('legacy employee lock key is not Tenant/Business/Branch scoped',()=>{
 const key=legacy.empIntervalLockResource(3,1700000000000,1700001800000);
 assert.ok(key.startsWith('booking:emp:3:'));
 assert.doesNotMatch(key,/(tenant|business|branch)/i);
 // A legacy EmpID repeated in two tenants would share one global string;
 // do not use it as authorization or a DRVO ownership key.
});
test('Cashier SQL applock truncation can create different request key collisions',()=>{
 const a='a'.repeat(255)+'X';
 const b='a'.repeat(255)+'Y';
 assert.notEqual(a,b);
 assert.equal(a.slice(0,255),b.slice(0,255));
 assert.match(body,/resource\.slice\(0, 255\)/);
});
test('DRVO owns composite Branch/Resource keys and serializes overlap on scoped resource row',()=>{
 assert.match(sqlBooking,/PRIMARY KEY\(TenantId,BusinessId,BranchId,ResourceId\)/);
 assert.match(sqlBooking,/FOREIGN KEY\(TenantId,BusinessId,BranchId,ResourceId\)/);
 assert.match(sqlBooking,/BookingResource WITH\(UPDLOCK,HOLDLOCK\)/);
 assert.match(sqlBooking,/BookingAppointment WITH\(UPDLOCK,HOLDLOCK\)/);
 assert.match(sqlBooking,/Status=''BOOKED''/);
 // Booking CI executes two concurrent requests against disposable SQL and
 // expects one 200, one 409. These static checks are NOT concurrency proof.
 const ci=fs.readFileSync(path.join(root,'tools/booking/verify.cjs'),'utf8');
 assert.match(ci,/Concurrent same-resource overlapping/);
 assert.match(ci,/\[200,409\]/);
});
