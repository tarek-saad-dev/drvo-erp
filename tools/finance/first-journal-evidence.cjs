'use strict';

/**
 * REVIEW-ONLY synthetic evidence classifier for ADR-031 Option A / Option B.
 * Not a posting engine, not an authorization check, not a GL or tender calculator.
 * Never import from API/Web runtime or use to authorize a business transaction.
 */
function classifyFirstJournalEvidence(input) {
  if (!input || (input.strategy !== 'ATOMIC_A' && input.strategy !== 'ASYNC_B')) {
    throw new TypeError('Explicit proposed strategy required');
  }
  for (const key of ['saleCommitted', 'journalCommitted', 'journalBalanced']) {
    if (typeof input[key] !== 'boolean') throw new TypeError(key + ' must be boolean');
  }
  const { strategy, saleCommitted, journalCommitted, journalBalanced } = input;
  if ((!journalCommitted && journalBalanced) ||
      (journalCommitted && (!journalBalanced || !saleCommitted))) {
    return 'INVALID_EVIDENCE';
  }
  if (!saleCommitted) return 'NOT_COMMITTED';
  if (!journalCommitted) return strategy === 'ATOMIC_A' ? 'INVALID_EVIDENCE' : 'ACCOUNTING_PENDING';
  return 'POSTED';
}

/**
 * A selected payment method or customer-supplied reference is not settlement.
 * This intentionally models only the minimum proof bar, not country-specific GL.
 */
function classifyTenderEvidence(input) {
  if (!input || !['CASH', 'PROVIDER'].includes(input.method) ||
      typeof input.receiptVerified !== 'boolean') {
    throw new TypeError('Invalid tender evidence');
  }
  return input.receiptVerified ? 'VERIFIED' : 'UNVERIFIED';
}

module.exports = { classifyFirstJournalEvidence, classifyTenderEvidence };
