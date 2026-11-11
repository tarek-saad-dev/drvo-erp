const test = require('node:test');
const assert = require('node:assert/strict');
const {previewRequiredFixtureModules} = require('../dist/packages/kernel/src/index.js');
const m = (key, required = [], optional = [], conflicts = []) =>
  ({key, version: '1.0.0', required, optional, conflicts});

test('full deterministic dependency preview; optional excluded', () => {
  const manifests = [
    m('Booking', ['Customers', 'Catalog'], ['Sms']),
    m('Catalog'), m('Customers'),
  ];
  const p = previewRequiredFixtureModules(manifests, ['Booking']);
  assert.deepEqual(p.items.map(x => x.key), ['Catalog', 'Customers', 'Booking']);
  assert.deepEqual(p.newlyRequired, ['Catalog', 'Customers', 'Booking']);
  assert.equal(p.items[2].origin, 'selected');
  assert.equal(p.items[0].origin, 'required');
  assert.deepEqual(p, previewRequiredFixtureModules([...manifests].reverse(), ['Booking']));
  assert.equal(p.items.some(x => x.key === 'Sms'), false);
});

test('already active prerequisites remain visible but are not newly required', () => {
  const p = previewRequiredFixtureModules(
    [m('Booking', ['Catalog']), m('Catalog')], ['Booking'], ['Catalog'],
  );
  assert.deepEqual(p.newlyRequired, ['Booking']);
  assert.equal(p.items[0].alreadyActive, true);
  assert.equal(p.items[0].origin, 'existing');
});

test('fail closed on missing modules, cycles and existing-module conflicts', () => {
  assert.throws(() => previewRequiredFixtureModules(
    [m('Booking', ['Catalog'])], ['Booking']), /Missing/);
  assert.throws(() => previewRequiredFixtureModules(
    [m('A', ['B']), m('B', ['A'])], ['A']), /cycle/);
  assert.throws(() => previewRequiredFixtureModules(
    [m('A', [], [], ['B']), m('B')], ['A'], ['B']), /Incompatible/);
});

test('reject invalid, duplicated or malformed keys before planning', () => {
  assert.throws(() => previewRequiredFixtureModules([m('A'), m('A')], ['A']), /duplicate/);
  assert.throws(() => previewRequiredFixtureModules([m('A')], ['A', 'A']), /duplicate/);
  assert.throws(() => previewRequiredFixtureModules([m('A', [' ../B'])], ['A']), /Invalid/);
  assert.throws(() => previewRequiredFixtureModules(
    [m('A', [], ['B', 'B'])], ['A']), /duplicate/);
  assert.throws(() => previewRequiredFixtureModules(
    [m('A')], ['A'], ['unknown']), /Missing/);
});

test('does not mutate caller manifests, selections or active state', () => {
  const manifests = Object.freeze([
    Object.freeze({
      key: 'A', version: '1.0.0',
      required: Object.freeze(['B']),
      optional: Object.freeze([]),
      conflicts: Object.freeze([]),
    }),
    Object.freeze(m('B')),
  ]);
  const req = Object.freeze(['A']);
  const active = Object.freeze(['B']);
  const p = previewRequiredFixtureModules(manifests, req, active);
  assert.deepEqual(p.newlyRequired, ['A']);
  assert.deepEqual(manifests[0].required, ['B']);
});
