'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

const source=fs.readFileSync(path.join(__dirname,
  '../src/app/workspaces/authorized-workspaces.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
}}).outputText;
const m={exports:{}};
new Function('module','exports',js)(m,m.exports);
const {groupsFromAuthorizedWorkspaces}=m.exports;
const a='11111111-1111-1111-1111-111111111111';
const b='22222222-2222-2222-2222-222222222222';
const id='33333333-3333-3333-3333-333333333333';
const br1='44444444-4444-4444-4444-444444444444';
const br2='55555555-5555-5555-5555-555555555555';

test('authorized branches group by tenant and business, never by business alone',()=>{
  const rows=[
    {tenantId:a,businessId:id,businessName:'CUT',branchId:br1,branchName:'Gleem'},
    {tenantId:a,businessId:id,businessName:'CUT',branchId:br2,branchName:'Camp'},
    {tenantId:b,businessId:id,businessName:'Another',branchId:br1,branchName:'Other'},
  ];
  const groups=groupsFromAuthorizedWorkspaces(rows);
  assert.equal(groups.length,2);
  assert.deepEqual(groups.map(g=>g.branches.length),[2,1]);
  assert.equal(groups[0].name,'CUT');
  assert.equal(groups[1].tenantId,b);
});

test('duplicate memberships and invalid or injected scope IDs are not presented',()=>{
  const row={tenantId:a,businessId:id,businessName:'CUT',branchId:br1,branchName:'Gleem'};
  const groups=groupsFromAuthorizedWorkspaces([row,row,{...row,branchId:'../owner'},
    {...row,businessId:'not-a-guid'},null,{},'invalid']);
  assert.equal(groups.length,1);
  assert.equal(groups[0].branches.length,1);
  assert.equal(groups[0].branches[0].branchId,br1);
  assert.deepEqual(groupsFromAuthorizedWorkspaces(null),[]);
  assert.deepEqual(groupsFromAuthorizedWorkspaces({workspaces:[row]}),[]);
});

test('routes remain gated and signed-in users are not sent to branch role admin',()=>{
  const read=(p)=>fs.readFileSync(path.join(__dirname,'../src/app',p),'utf8');
  assert.match(read('workspaces/page.tsx'),/DRVO_K5_WEB_ENABLED/);
  assert.match(read('workspace/[businessId]/[branchId]/page.tsx'),/DRVO_K5_WEB_ENABLED/);
  assert.match(read('sign-in/sign-in-client.tsx'),/router\.replace\("\/workspaces"\)/);
  assert.match(read('workspaces/workspaces-client.tsx'),/\/api\/auth\/workspaces/);
  assert.match(read('workspace/[businessId]/[branchId]/workspace-home-client.tsx'),
    /\/access\/roles/);
});
