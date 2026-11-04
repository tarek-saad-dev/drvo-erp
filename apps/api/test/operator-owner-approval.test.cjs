'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeOperatorApproval,issueOperatorApprovedOwner}=
  require('../dist/identity/operator-owner-approval.js');
const {randomBytes}=require('node:crypto');

const input={
  email:'  Owner.Test@EXAMPLE.COM ',username:'Owner.Test',
  tenantName:'DRVO Test',businessName:'Business',branchName:'Main',
  operatorId:'Operator.ONE',
};
test('only normalized approved identity and strictly bounded names are accepted',()=>{
  const result=normalizeOperatorApproval(input);
  assert.equal(result.email,'owner.test@example.com');
  assert.equal(result.username,'owner.test');
  assert.equal(result.operatorId,'operator.one');
  assert.equal(result.tenantName,'DRVO Test');
  for(const changes of [
    {email:'invalid@domain'}, {username:'root admin'}, {username:'x'},
    {operatorId:'!bad'}, {tenantName:' '}, {businessName:'x'.repeat(161)},
    {branchName:'okay\nnot okay'},
  ]) assert.throws(()=>normalizeOperatorApproval({...input,...changes}));
});

test('HMAC secret and operator details must be valid before touching any SQL connection',async()=>{
  const pool={get request(){throw Error('SQL not allowed')}};
  await assert.rejects(()=>issueOperatorApprovedOwner(pool,input,'not-a-secret'));
  await assert.rejects(()=>issueOperatorApprovedOwner(pool,{...input,username:'!bad'},'ca'.repeat(32)));
});
