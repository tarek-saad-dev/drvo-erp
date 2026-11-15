'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const root=join(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const client=readFileSync(join(root,'hr/hr-client.tsx'),'utf8');
const route=readFileSync(join(root,'hr/page.tsx'),'utf8');
const home=readFileSync(join(root,'workspace-home-client.tsx'),'utf8');
test('HR UI private Web flag, exact five-group scope and no persistent browser PII cache',()=>{
 assert.match(route,/DRVO_K5_WEB_ENABLED/);assert.match(route,/DRVO_HR_WEB_ENABLED/);
 const m=client.match(/const GUID=\/(\^[^\n;]*\$)\/i;/);assert.ok(m);
 const uuid=new RegExp(m[1],'i'),id='ab12cd34-1234-4abc-a890-0123456789ab';
 assert.equal(uuid.test(id),true);assert.equal(uuid.test(id.toUpperCase()),true);
 for(const bad of [id+'-4321',id.slice(1),id+'x',id.replace(/-/g,'')])
  assert.equal(uuid.test(bad),false);
 assert.match(client,/GUID\.test\(businessId\)/);assert.match(client,/GUID\.test\(branchId\)/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB/);
});
test('private HR creates scoped employee and Salon links only approved PERSON booking resources',()=>{
 assert.match(client,/\/hr\/employees"/);
 assert.match(client,/\/booking"/);
 assert.match(client,/x\.kind==="PERSON"&&x\.isActive/);
 assert.match(client,/method:"POST",credentials:"same-origin",cache:"no-store"/);
 assert.match(client,/Idempotency-Key/);
 assert.match(client,/payrollMethod==="monthly"/);
 assert.match(client,/isBookable/);
 assert.match(client,/مفيش حساب مستخدم أو رواتب متدفعة/);
 assert.match(home,/if\(hrWebEnabled\)/);
 assert.match(home,/setCanViewHr\(hrResult\.ok\)/);
 assert.match(home,/hrWebEnabled&&canViewHr/);
});
