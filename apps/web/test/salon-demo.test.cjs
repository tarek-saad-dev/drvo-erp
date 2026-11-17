'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'../src/app');
const source=fs.readFileSync(path.join(root,'demo/salon/demo-model.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText;
const m={exports:{}};
new Function('module','exports',code)(m,m.exports);
const d=m.exports;

test('public demo is intentionally synthetic and has no storage/API/session access',()=>{
 assert.doesNotMatch(source,/fetch\s*\(|localStorage|sessionStorage|document\.cookie|mssql/i);
 const client=fs.readFileSync(path.join(root,'demo/salon/salon-demo-client.tsx'),'utf8');
 assert.doesNotMatch(client,/fetch\s*\(|localStorage|sessionStorage|document\.cookie|\/api\//i);
 assert.match(client,/نسخة تجريبية تفاعلية/);
 assert.match(client,/مفيش تسجيل دخول أو حجز فعلي/);
 const page=fs.readFileSync(path.join(root,'demo/salon/page.tsx'),'utf8');
 assert.match(page,/index:false/);
 const home=fs.readFileSync(path.join(root,'page.tsx'),'utf8');
 assert.match(home,/href="\/demo\/salon"/);
});
test('booking works and rejects same barber/slot double booking',()=>{
 const first=d.initialDemo();
 const input={customerId:'guest',staffId:'mostafa',serviceId:'cut',time:'16:00'};
 const added=d.bookDemoAppointment(first,input);
 assert.equal(added.appointments.length,first.appointments.length+1);
 assert.equal(first.appointments.length,5,'seed must be immutable');
 assert.throws(()=>d.bookDemoAppointment(added,input),/عنده موعد/);
 const other=d.bookDemoAppointment(added,{...input,staffId:'youssef'});
 assert.equal(other.appointments.length,added.appointments.length+1);
 assert.throws(()=>d.bookDemoAppointment(added,{...input,time:'00:00'}));
 assert.throws(()=>d.bookDemoAppointment(added,{...input,staffId:'other'}));
});
test('booking can be completed or canceled, releasing only canceled demo slots',()=>{
 let state=d.initialDemo();
 const a=state.appointments.find(x=>x.id===2);
 assert.equal(a.status,'confirmed');
 state=d.updateDemoAppointment(state,2,'cancelled');
 assert.throws(()=>d.updateDemoAppointment(state,2,'completed'));
 state=d.bookDemoAppointment(state,{customerId:'guest',staffId:'youssef',serviceId:'cut',time:'11:00'});
 assert.equal(state.appointments.at(-1).status,'confirmed');
 state=d.updateDemoAppointment(state,state.appointments.at(-1).id,'completed');
 assert.equal(state.appointments.at(-1).status,'completed');
 assert.throws(()=>d.bookDemoAppointment(state,{customerId:'guest',staffId:'youssef',serviceId:'cut',time:'11:00'}));
});
test('POS computes exact demo list prices and saves DRAFT only',()=>{
 let cart=d.addDemoCartLine([],'cut');
 cart=d.addDemoCartLine(cart,'beard');
 cart=d.addDemoCartLine(cart,'cut');
 assert.equal(d.demoSubtotal(cart),44500);
 const old=d.initialDemo();
 const saved=d.saveDemoDraft(old,cart);
 assert.equal(saved.drafts[0].status,'DRAFT');
 assert.equal(saved.drafts[0].subtotalMinor,44500);
 assert.equal(saved.drafts.length,1);
 assert.equal(old.drafts.length,0);
 assert.equal(d.demoSubtotal(d.removeDemoCartLine(cart,'cut')),8500);
 assert.throws(()=>d.demoSubtotal([]));
 assert.throws(()=>d.demoSubtotal([{serviceId:'cut',quantity:0}]));
 assert.throws(()=>d.demoSubtotal([{serviceId:'cut',quantity:11}]));
 assert.throws(()=>d.demoSubtotal([{serviceId:'cut',quantity:1},{serviceId:'cut',quantity:1}]));
 assert.throws(()=>d.addDemoCartLine([],'not-real'));
});
test('demo fixture only and reset does not retain previous state',()=>{
 let state=d.initialDemo();
 state=d.saveDemoDraft(state,[{serviceId:'bundle',quantity:2}]);
 const reset=d.initialDemo();
 assert.equal(reset.drafts.length,0);
 assert.equal(reset.appointments.length,5);
 assert.equal(d.DEMO_SERVICES.length,6);
 assert.equal(d.DEMO_STAFF.length,3);
 assert.equal(d.DEMO_CUSTOMERS.length,5);
 for(const s of d.DEMO_SERVICES)assert.equal(Number.isSafeInteger(s.priceMinor),true);
});

test('UI no longer shows Guided Tour; booking to POS DRAFT remains a direct user path',()=>{
 const client=fs.readFileSync(path.join(root,'demo/salon/salon-demo-client.tsx'),'utf8');
 assert.doesNotMatch(client,/GUIDED TOUR|sd-tour|startTour|tourActive|ابدأ الجولة/);
 assert.match(client,/function fromAppointment\(a:DemoAppointment\)/);
 assert.match(client,/setTab\("pos"\)/);
 assert.match(client,/SalonPosWorkspace/);
 assert.match(client,/نسخة تجريبية تفاعلية/);
 assert.doesNotMatch(client,/fetch\s*\(|localStorage|sessionStorage|document\.cookie|\/api\//);
 let state=d.initialDemo();
 state=d.bookDemoAppointment(state,{customerId:'guest',staffId:'mostafa',serviceId:'cut',time:'18:00'});
 const id=state.appointments.at(-1).id;
 state=d.updateDemoAppointment(state,id,'completed');
 const cart=d.addDemoCartLine([],state.appointments.find(a=>a.id===id).serviceId);
 state=d.saveDemoDraft(state,cart);
 assert.equal(state.drafts[0].status,'DRAFT');
 assert.equal(state.drafts[0].totalMinor,18000);
 assert.equal(state.drafts[0].discountMinor,0);
 assert.equal(d.initialDemo().drafts.length,0);
});

test('Cashier-inspired synthetic products, stock and quantity +/- behave safely',()=>{
 assert.equal(d.DEMO_PRODUCTS.length,3);
 assert.equal(d.demoPosItem('shampoo').name,'شامبو عناية');
 assert.equal(d.demoPosItem('cut').name,'قص شعر رجالي');
 let cart=d.addDemoCartLine([], 'wax');
 cart=d.changeDemoCartQuantity(cart,'wax',1);
 assert.equal(cart[0].quantity,2);
 cart=d.changeDemoCartQuantity(cart,'wax',-1);
 assert.equal(cart[0].quantity,1);
 cart=d.changeDemoCartQuantity(cart,'wax',-1);
 assert.deepEqual(cart,[]);
 let full=[];
 for(let i=0;i<8;i++)full=d.addDemoCartLine(full,'wax');
 assert.throws(()=>d.addDemoCartLine(full,'wax'),/الكمية/);
 assert.throws(()=>d.demoSubtotal([{serviceId:'wax',quantity:9}]),/المخزون/);
 assert.throws(()=>d.demoPosItem('not-real'));
});

test('POS discount math is safe minor money and saved records remain nonposting DRAFT',()=>{
 const cart=[{serviceId:'cut',quantity:2},{serviceId:'wax',quantity:1}];
 assert.equal(d.demoSubtotal(cart),50000);
 assert.deepEqual(d.demoDraftTotals(cart,{mode:'fixed',value:1250}),{
  subtotalMinor:50000,discountMinor:1250,totalMinor:48750,
 });
 assert.deepEqual(d.demoDraftTotals(cart,{mode:'percent',value:10}),{
  subtotalMinor:50000,discountMinor:5000,totalMinor:45000,
 });
 for(const invalid of [
  {mode:'percent',value:101},{mode:'fixed',value:50001},
  {mode:'percent',value:12.5},{mode:'none',value:1},
 ])
  assert.throws(()=>d.demoDraftTotals(cart,invalid));
 assert.deepEqual(d.demoSplitPreview(45000,20000),{
  cashMinor:20000,electronicMinor:25000,state:'NOT_COLLECTED',
 });
 assert.throws(()=>d.demoSplitPreview(45000,46000));
 assert.throws(()=>d.demoSplitPreview(45000,10.1));
 const old=d.initialDemo();
 const next=d.saveDemoDraft(old,cart,{
  discount:{mode:'percent',value:10},customerId:'ali',staffId:'mostafa',note:'note',
 });
 assert.equal(next.drafts[0].totalMinor,45000);
 assert.equal(next.drafts[0].discountMinor,5000);
 assert.equal(next.drafts[0].customerId,'ali');
 assert.equal(next.drafts[0].note,'note');
 assert.equal(next.drafts[0].status,'DRAFT');
 assert.equal(old.drafts.length,0);
 assert.throws(()=>d.saveDemoDraft(old,cart,{customerId:'unknown'}));
 assert.throws(()=>d.saveDemoDraft(old,cart,{note:'x'.repeat(241)}));
});

test('operator POS shows real functioning synthetic controls and no real API or payment',()=>{
 const client=fs.readFileSync(path.join(root,'demo/salon/salon-pos-workspace.tsx'),'utf8');
 const page=fs.readFileSync(path.join(root,'demo/salon/page.tsx'),'utf8');
 for(const f of [
  'DEMO_PRODUCTS','DEMO_STAFF','DEMO_CUSTOMERS','demoDraftTotals',
  'changeDemoCartQuantity','demoSplitPreview','discountMode','cashText',
  'saveDraft','setSearch','NOT COLLECTED','aria-pressed','F9',
 ])
  assert.ok(client.includes(f),'Missing POS control '+f);
 assert.match(client,/نقدي \+ إلكتروني/);
 assert.match(page,/import "\.\/salon-pos-workspace\.css"/);
 assert.doesNotMatch(client,/fetch\s*\(|localStorage|sessionStorage|document\.cookie|\/api\//);
});
test('S9 synthetic half-hour intervals reject overlapping durations, allow adjacent and canceled slots',()=>{
 const seed=d.initialDemo();
 assert.equal(d.DEMO_TIMES.length,18);
 assert.equal(d.DEMO_TIMES[1],'10:30');
 assert.equal(d.DEMO_TIMES.at(-1),'18:30');
 assert.ok(!d.demoAvailableTimes(seed,'mostafa','cut').includes('10:30'),
  'completed 10:00–11:00 bundle remains occupied');
 assert.ok(d.demoAvailableTimes(seed,'mostafa','cut').includes('11:00'),
  'back-to-back booking is allowed');
 assert.ok(!d.demoAvailableTimes(seed,'youssef','bundle').includes('10:30'),
  'a 60-minute service starting 10:30 overlaps existing 11:00 cut');
 assert.ok(d.demoAvailableTimes(seed,'youssef','cut').includes('10:30'),
  'short 30-minute service ends at 11:00 and does not overlap');
 const input={customerId:'guest',staffId:'youssef',serviceId:'bundle',time:'10:30'};
 assert.throws(()=>d.bookDemoAppointment(seed,input),/متداخل/);
 const adjacent=d.bookDemoAppointment(seed,{...input,serviceId:'cut'});
 assert.equal(adjacent.appointments.length,seed.appointments.length+1);
 assert.throws(()=>d.bookDemoAppointment(seed,{...input,staffId:'mostafa',serviceId:'cut'}),/متداخل/);
 assert.throws(()=>d.bookDemoAppointment(seed,{...input,staffId:'hassan',time:'18:30'}),/خارج اليوم/);
 assert.ok(d.demoAvailableTimes(seed,'hassan','cut').includes('18:30'));
 assert.ok(!d.demoAvailableTimes(seed,'hassan','bundle').includes('18:30'));
 const canceled=d.updateDemoAppointment(seed,2,'cancelled');
 assert.ok(d.demoAvailableTimes(canceled,'youssef','bundle').includes('10:30'));
 assert.throws(()=>d.demoAvailableTimes(seed,'unknown-staff','cut'));
 assert.throws(()=>d.demoAvailableTimes(seed,'youssef','unknown-service'));
});
test('S9 real demo UI disables occupied options, never pretends SQL guarantees',()=>{
 const client=fs.readFileSync(path.join(root,'demo/salon/salon-demo-client.tsx'),'utf8');
 assert.match(client,/const availableTimes=useMemo\(\(\)=>demoAvailableTimes\(data,staffId,serviceId\)/);
 assert.match(client,/disabled=\{!availableTimes\.includes\(t\)\}/);
 assert.match(client,/disabled=\{!availableTimes\.includes\(time\)\}/);
 assert.match(client,/setTime\(current=>slots\.includes\(current\)\?current:\(slots\[0\]\?\?""\)\)/);
 assert.match(client,/مفيش حجز حقيقي أو مزامنة مع SQL/);
 assert.doesNotMatch(client,/fetch\s*\(|\/api\/|localStorage|sessionStorage|document\.cookie/);
});
