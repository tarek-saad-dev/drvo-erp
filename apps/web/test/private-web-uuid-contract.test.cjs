'use strict';
// Independent regression for all currently healthy private Web scopes.
// POS has its own failing-then-fixed exact UUID regression in PR #133.
// Source assertions do not grant access; K5 and SQL are still authoritative.
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const components=[
 'workspace-home-client.tsx',
 'catalog/catalog-client.tsx',
 'customers/customers-client.tsx',
 'booking/booking-client.tsx',
 'salon/salon-overview-client.tsx',
];
const valid='ab12cd34-1234-4abc-a890-0123456789ab';
const invalid=[
 valid+'-1234',
 valid.replace(/-/g,''),
 valid.replace(/-/,''),
 valid+'x',
 'x'+valid,
 valid.replace('cd','cz'),
 'ab12cd34-1234-4abc-a890-0123-456789ab',
 'ab12cd34-1234-4abc-a890-0000-0123456789ab',
];
for(const component of components){
 test(component+' accepts complete 5-part uppercase/lowercase UUID but no partial/extra groups',()=>{
  const source=readFileSync(join(root,component),'utf8');
  const match=/\bconst GUID\s*=\s*\/(\^[^\n;/]+\$)\/i\s*;/.exec(source);
  assert.ok(match,'Web scope must have a complete anchored /i UUID validator');
  const guid=new RegExp(match[1],'i');
  assert.equal(guid.test(valid),true,'valid UUID may not be blocked');
  assert.equal(guid.test(valid.toUpperCase()),true,'SQL GUID casing may differ');
  for(const bad of invalid)assert.equal(guid.test(bad),false,'invalid scoped UUID rejected');
  assert.match(source,/GUID\.test\(businessId\)/);
  assert.match(source,/GUID\.test\(branchId\)/);
 });
}
