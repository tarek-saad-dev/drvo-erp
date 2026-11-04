'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeOperatorApproval,issueOperatorApprovedOwner,revokeOperatorApprovedOwner}=
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

test('revoke requires operator-controlled reason, GUID, email and valid HMAC before SQL',async()=>{
  const inaccessible={get request(){throw Error('SQL should not be accessed')}};
  const sample={
    approvalId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email:'owner@example.test',operatorId:'operator.one',
    reasonCode:'MAIL_FAILED',
  };
  for(const invalid of [
    {...sample,approvalId:'bad-id'},
    {...sample,operatorId:'operator admin'},
    {...sample,reasonCode:'DELETE_ACCOUNT'},
    {...sample,email:'invalid@domain'},
  ]){
    await assert.rejects(()=>revokeOperatorApprovedOwner(
      inaccessible,invalid,'ca'.repeat(32)));
  }
  await assert.rejects(()=>revokeOperatorApprovedOwner(
    inaccessible,sample,'not-a-key'));
});
