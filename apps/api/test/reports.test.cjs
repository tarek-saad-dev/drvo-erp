'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ReportsService,ReportsController}=(()=>{
 const service=require('../dist/reports/reports.service');
 return {...service,ReportsController:require('../dist/reports/reports.controller').ReportsController};
})();
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const scope=[ID(1),ID(2)],actor={tenantId:ID(3),accountId:ID(4)},token='A'.repeat(43);
const emp=(n,res)=>({employeeId:ID(n),employeeCode:'EMP'+n,displayName:'Synthetic '+n,
 employmentType:'full_time',payrollMethod:'daily',isActive:true,branchActive:true,
 isBookable:true,resourceId:ID(res),resourceName:'PERSON '+res});
const booking=(n,res,status)=>({bookingId:ID(n),resourceId:ID(res),status});
function env(opts,fn){const old=Object.fromEntries(Object.keys(opts).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(opts))if(v==null)delete process.env[k];else process.env[k]=v;
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old))
  if(v===undefined)delete process.env[k];else process.env[k]=v;});
}
test('Reports: HR and Booking source counts without revenue, payment, customer PII',()=>{
 const result=require('../dist/reports/reports.service').buildBarberOperationsReport(
  [emp(1,10),emp(2,20),{...emp(3,30),isBookable:false}],
  [booking(1,10,'BOOKED'),booking(2,10,'COMPLETED'),
   booking(3,20,'CANCELLED'),booking(4,30,'BOOKED'),booking(5,99,'COMPLETED')],...scope);
 assert.equal(result.state,'READ_ONLY_BOOKING_SAMPLE');
 assert.deepEqual([result.booked,result.completed,result.cancelled],[2,2,1]);
 assert.equal(result.unassignedBookings,2);assert.equal(result.barbers.length,2);
 assert.equal(result.barbers.find(x=>x.employeeId===ID(1)).total,2);
 for(const name of ['customerName','revenueMinor','profitMinor','paymentState'])
  assert.equal(name in result,false);
});
test('Reports: case-insensitive UUID join, strict duplicates/invalid source denial',()=>{
 const build=require('../dist/reports/reports.service').buildBarberOperationsReport;
 assert.equal(build([emp(1,10)],[booking(1,10,'BOOKED'),
  {...booking(2,10,'COMPLETED'),resourceId:ID(10).toUpperCase()}],...scope).barbers[0].total,2);
 for(const [staff,appts] of [
  [[emp(1,10),emp(2,10)],[]],[[emp(1,10),emp(1,20)],[]],
  [[emp(1,10)],[booking(1,10,'BOOKED'),booking(1,10,'BOOKED')]],
  [[emp(1,10)],[booking(1,10,'UNKNOWN')]],
  [[emp(1,10)],[{...booking(1,10,'BOOKED'),resourceId:'bogus'}]],
  [[{...emp(1,10),resourceId:'wrong'}],[]],
 ]){
  assert.throws(()=>build(staff,appts,...scope));
 }
 assert.throws(()=>build([],[],'bogus',scope[1]));
 const full=build([emp(1,10)],
  Array.from({length:200},(_,i)=>booking(i+1,10,'BOOKED')),...scope);
 assert.equal(full.mayBeTruncated,true);assert.equal(full.appointmentsRead,200);
});
test('Reports disabled before Auth and HR/Booking source reads',async()=>{
 await env({DRVO_REPORTS_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const service=new ReportsService({list(){throw Error('hr touched');}},
   {list(){throw Error('booking touched');}});
  await assert.rejects(()=>service.barberOperations(actor,token,...scope),e=>e.getStatus?.()===503);
  const controller=new ReportsController({actorFromToken(){throw Error('auth touched');}},service);
  await assert.rejects(()=>controller.barberOperations({headers:{}},{setHeader(){}},...scope),
   e=>e.getStatus?.()===503);
 });
});
test('Reports calls independently scoped HR and Booking services, never writes',async()=>{
 await env({DRVO_REPORTS_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const calls=[];
  const scoped=name=>({list(a,t,b,br){calls.push(name);
    assert.equal(a,actor);assert.equal(t,token);
    assert.deepEqual([b,br],scope);return Promise.resolve(name==='hr'?
     {employees:[emp(1,10)]}:{appointments:[booking(1,10,'COMPLETED')]});}});
  const service=new ReportsService(scoped('hr'),scoped('booking'));
  const data=await service.barberOperations(actor,token,...scope);
  assert.deepEqual(calls.sort(),['booking','hr']);assert.equal(data.completed,1);
 });
});
test('Reports fails closed if either domain owner denies',async()=>{
 await env({DRVO_REPORTS_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const service=new ReportsService({list(){return Promise.reject(new Error('HR denied'));}},
   {list(){return Promise.resolve({appointments:[]});}});
  await assert.rejects(()=>service.barberOperations(actor,token,...scope),/HR denied/);
 });
});
