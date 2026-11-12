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
