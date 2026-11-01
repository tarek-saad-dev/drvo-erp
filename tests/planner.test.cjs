const test = require('node:test');
const assert = require('node:assert/strict');
const { planRequiredFixtureModules } = require('../dist/packages/kernel/src/index.js');
const m = (key, required = [], conflicts = []) => ({ key, version: '1.0.0', required, optional: [], conflicts });

test('transitive required closure with prerequisites first', () => {
  const p = planRequiredFixtureModules([m('A',['B']),m('B',['C']),m('C')],['A']);
  assert.deepEqual(p.ordered, ['C','B','A']);
  assert.deepEqual(p.newlyRequired, ['C','B','A']);
});
test('already active prerequisite does not appear in new activation list', () => {
  const p = planRequiredFixtureModules([m('POS',['Catalog']),m('Catalog')],['POS'],['Catalog']);
  assert.deepEqual(p.newlyRequired,['POS']);
});
test('missing release, duplicates, cycles, conflicts reject before returning plan', () => {
  assert.throws(() => planRequiredFixtureModules([m('A',['B'])],['A']), /Missing/);
  assert.throws(() => planRequiredFixtureModules([m('A'),m('A')],['A']), /duplicate/);
  assert.throws(() => planRequiredFixtureModules([m('A',['B']),m('B',['A'])],['A']), /cycle/);
  assert.throws(() => planRequiredFixtureModules([m('A',[],['B']),m('B')],['A','B']), /Incompatible/);
});
test('optional dependencies are not force-installed', () => {
  const p = planRequiredFixtureModules([{...m('A'),optional:['WhatsApp']}],['A']);
  assert.deepEqual(p.ordered,['A']);
});
