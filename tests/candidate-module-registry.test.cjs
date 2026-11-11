const test = require('node:test');
const assert = require('node:assert/strict');
const { createCandidateModuleRegistry } = require('../dist/packages/kernel/src/index.js');

const m = (key, required = [], optional = [], conflicts = [], version = '1.0.0') =>
  ({key, version, required, optional, conflicts});

test('canonical candidate manifests and dependency preview are deterministic', () => {
  const a = [m('Booking', ['Catalog', 'Customers'], ['Sms']),
    m('Customers'), m('Catalog')];
  const left = createCandidateModuleRegistry(a);
  const right = createCandidateModuleRegistry([...a].reverse());
  assert.deepEqual(left.manifests, right.manifests);
  assert.deepEqual(left.preview(['Booking']), right.preview(['Booking']));
  assert.deepEqual(left.preview(['Booking']).newlyRequired,
    ['Catalog', 'Customers', 'Booking']);
  assert.equal(left.preview(['Booking']).items.some(x => x.key === 'Sms'), false);
});

test('snapshot deeply clones and freezes caller-provided arrays', () => {
  const original = [m('Booking', ['Catalog']), m('Catalog')];
  const registry = createCandidateModuleRegistry(original);
  original[0].required.push('Future');
  original.push(m('Future'));
  assert.deepEqual(registry.preview(['Booking']).newlyRequired,
    ['Catalog', 'Booking']);
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.manifests), true);
  assert.equal(Object.isFrozen(registry.manifests[0]), true);
  assert.equal(Object.isFrozen(registry.manifests[1].required), true);
  assert.throws(() => registry.manifests.push(m('C')), TypeError);
});

test('missing required releases and cycles fail during registry construction', () => {
  assert.throws(() => createCandidateModuleRegistry(
    [m('Booking', ['Catalog'])]), /Missing/);
  assert.throws(() => createCandidateModuleRegistry(
    [m('A', ['B']), m('B', ['A'])]), /cycle/);
});

test('invalid versions and malformed, duplicate or overlapping dependency groups fail closed', () => {
  assert.throws(() => createCandidateModuleRegistry(
    [m('A', [], [], [], 'not-a-version')]), /Invalid/);
  assert.throws(() => createCandidateModuleRegistry(
    [m('A', [], [], [], '01.0.0')]), /Invalid/);
  assert.throws(() => createCandidateModuleRegistry([m('A'), m('A')]), /duplicate/);
  assert.throws(() => createCandidateModuleRegistry(
    [m('A', ['B', 'B']), m('B')]), /duplicate/);
  assert.throws(() => createCandidateModuleRegistry(
    [m('A', ['B'], ['B']), m('B')]), /overlapping/);
  assert.throws(() => createCandidateModuleRegistry(
    [m('A', ['A'])]), /Self-reference/);
});

test('incompatible candidates coexist but selecting both fails', () => {
  const registry = createCandidateModuleRegistry([
    m('A', [], [], ['B']), m('B'),
  ]);
  assert.deepEqual(registry.preview(['A']).newlyRequired, ['A']);
  assert.throws(() => registry.preview(['A', 'B']), /Incompatible/);
  assert.throws(() => registry.preview(['A'], ['B']), /Incompatible/);
});

test('active fixture prerequisite is not newly required or silently activated', () => {
  const registry = createCandidateModuleRegistry([
    m('Booking', ['Catalog']), m('Catalog'),
  ]);
  const preview = registry.preview(['Booking'], ['Catalog']);
  assert.deepEqual(preview.newlyRequired, ['Booking']);
  assert.deepEqual(preview.items.map(i => [i.key, i.alreadyActive]),
    [['Catalog', true], ['Booking', false]]);
  assert.deepEqual(registry.preview(['Booking']).newlyRequired,
    ['Catalog', 'Booking']);
});

test('malformed active or selected inputs fail closed', () => {
  const registry = createCandidateModuleRegistry([m('A')]);
  assert.throws(() => registry.preview(['unknown']), /Missing/);
  assert.throws(() => registry.preview(['A', 'A']), /duplicate/);
  assert.throws(() => registry.preview(['A'], [' ../A']), /Invalid/);
});

test('empty candidate catalog is a valid read-only zero-offering state', () => {
  const registry = createCandidateModuleRegistry([]);
  assert.deepEqual(registry.manifests, []);
  assert.deepEqual(registry.preview([]), {items: [], newlyRequired: []});
  assert.throws(() => registry.preview(['A']), /Missing/);
});
