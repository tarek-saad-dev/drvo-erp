const test = require('node:test');
const assert = require('node:assert/strict');
const { planBusinessDayCharacterization: plan } = require('../tools/cashier-reuse/business-day-characterization.cjs');

// Fixtures manually derived from Cashier source at the pinned audit SHA.
// These do not prove production parity; verify against Cashier CI later.
test('same open business date -> no mutation', () => {
  assert.equal(plan({ openDayDate: '2026-11-12', expectedDate: '2026-11-12', pastRolloverWindow: true }), 'NO_OP');
});
test('older open date holds before rollover, rolls after window', () => {
  assert.equal(plan({ openDayDate: '2026-11-11', expectedDate: '2026-11-12', pastRolloverWindow: false }), 'NO_OP');
  assert.equal(plan({ openDayDate: '2026-11-11', expectedDate: '2026-11-12', pastRolloverWindow: true }), 'ROLLED_OVER');
});
test('missing day gets opened, future open day never rolled backwards', () => {
  assert.equal(plan({ openDayDate: null, expectedDate: '2026-11-12', pastRolloverWindow: false }), 'OPENED_MISSING_DAY');
  assert.equal(plan({ openDayDate: '2026-11-13', expectedDate: '2026-11-12', pastRolloverWindow: true }), 'NO_OP');
});
test('skip dates without synthesizing intermediate business days', () => {
  assert.equal(plan({ openDayDate: '2026-11-01', expectedDate: '2026-11-12', pastRolloverWindow: true }), 'ROLLED_OVER');
});
test('DRVO rejects ambiguous dates and invalid fixture input (intentional hardening)', () => {
  assert.throws(() => plan({ openDayDate: undefined, expectedDate: '2026-11-12', pastRolloverWindow: true }), TypeError);
  assert.throws(() => plan({ openDayDate: null, expectedDate: '2026-02-30', pastRolloverWindow: true }), TypeError);
  assert.throws(() => plan({ openDayDate: null, expectedDate: '2026-11-12', pastRolloverWindow: 1 }), TypeError);
});
