const test = require('node:test');
const assert = require('node:assert/strict');
const { fixtureMatchesResourceScope } = require('../dist/packages/kernel/src/index.js');
const fixture = { tenantId: 'T1', businessId: 'B1', branchId: 'R1' };

test('same branch resource matches pure ownership ancestry', () => {
  assert.equal(fixtureMatchesResourceScope(fixture, { scope: 'branch', tenantId: 'T1', businessId: 'B1', branchId: 'R1' }), true);
});
test('different tenant and different business fail closed', () => {
  assert.equal(fixtureMatchesResourceScope(fixture, { scope: 'tenant', tenantId: 'T2' }), false);
  assert.equal(fixtureMatchesResourceScope(fixture, { scope: 'business', tenantId: 'T1', businessId: 'B2' }), false);
});
test('wrong branch, missing context and malformed identifiers fail closed', () => {
  assert.equal(fixtureMatchesResourceScope(fixture, { scope: 'branch', tenantId: 'T1', businessId: 'B1', branchId: 'R2' }), false);
  assert.equal(fixtureMatchesResourceScope(null, { scope: 'tenant', tenantId: 'T1' }), false);
  assert.equal(fixtureMatchesResourceScope({ tenantId: ' T1' }, { scope: 'tenant', tenantId: ' T1' }), false);
  assert.equal(fixtureMatchesResourceScope({ tenantId: 'T1', businessId: 'B1' }, { scope: 'branch', tenantId: 'T1', businessId: 'B1', branchId: 'R1' }), false);
});
test('business scope does not assert branch action authorization', () => {
  // This fixture helper only matches record ancestry; a real permission
  // evaluator must check membership, actions and domain sensitivity separately.
  assert.equal(fixtureMatchesResourceScope(fixture, { scope: 'business', tenantId: 'T1', businessId: 'B1' }), true);
});
