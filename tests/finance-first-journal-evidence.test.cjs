const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyFirstJournalEvidence, classifyTenderEvidence } = require('../tools/finance/first-journal-evidence.cjs');

const evidence = (strategy, saleCommitted, journalCommitted, journalBalanced) =>
  ({ strategy, saleCommitted, journalCommitted, journalBalanced });

test('ADR-031 A: source and balanced mandatory journal must commit together', () => {
  assert.equal(classifyFirstJournalEvidence(evidence('ATOMIC_A', false, false, false)), 'NOT_COMMITTED');
  assert.equal(classifyFirstJournalEvidence(evidence('ATOMIC_A', true, false, false)), 'INVALID_EVIDENCE');
  assert.equal(classifyFirstJournalEvidence(evidence('ATOMIC_A', true, true, true)), 'POSTED');
});

test('ADR-031 B: accepted source without first GL remains pending, never posted', () => {
  assert.equal(classifyFirstJournalEvidence(evidence('ASYNC_B', true, false, false)), 'ACCOUNTING_PENDING');
  assert.equal(classifyFirstJournalEvidence(evidence('ASYNC_B', true, true, true)), 'POSTED');
});

test('both options reject orphan or unbalanced first journal evidence', () => {
  for (const strategy of ['ATOMIC_A', 'ASYNC_B']) {
    assert.equal(classifyFirstJournalEvidence(evidence(strategy, false, true, true)), 'INVALID_EVIDENCE');
    assert.equal(classifyFirstJournalEvidence(evidence(strategy, true, true, false)), 'INVALID_EVIDENCE');
    assert.equal(classifyFirstJournalEvidence(evidence(strategy, false, false, true)), 'INVALID_EVIDENCE');
  }
});

test('no implied truth from incomplete or invalid evidence', () => {
  assert.throws(() => classifyFirstJournalEvidence({}), /strategy/);
  assert.throws(() => classifyFirstJournalEvidence({ strategy: 'ATOMIC_A', saleCommitted: 1 }), /boolean/);
  assert.throws(() => classifyTenderEvidence({ method: 'BANK_SCREENSHOT', receiptVerified: true }), /Invalid/);
});

test('payment selection and unverified electronic reference do not mean settled', () => {
  assert.equal(classifyTenderEvidence({ method: 'PROVIDER', receiptVerified: false }), 'UNVERIFIED');
  assert.equal(classifyTenderEvidence({ method: 'CASH', receiptVerified: false }), 'UNVERIFIED');
  assert.equal(classifyTenderEvidence({ method: 'CASH', receiptVerified: true }), 'VERIFIED');
  assert.equal(classifyTenderEvidence({ method: 'PROVIDER', receiptVerified: true }), 'VERIFIED');
});
