'use strict';

/**
 * Independent test-only characterization of Cashier pure function:
 * src/modules/operations/domain/businessDayReconciliation.ts
 * Pinned audit SHA: 7a1d0218eec05ba541f65eaee4b665c782845704
 *
 * NOT a DRVO BusinessDay domain service, not a live import of legacy code.
 * Adds input guards beyond legacy reference; parity claims only valid fixtures.
 */
function planBusinessDayCharacterization({ openDayDate, expectedDate, pastRolloverWindow } = {}) {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  function validDate(s) {
    if (!iso.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }
  if (!validDate(expectedDate) || (openDayDate !== null && !validDate(openDayDate)) ||
      typeof pastRolloverWindow !== 'boolean') throw new TypeError('Invalid business day fixture');

  if (openDayDate === expectedDate || (openDayDate !== null && openDayDate > expectedDate)) return 'NO_OP';
  if (openDayDate !== null && openDayDate < expectedDate) {
    return pastRolloverWindow ? 'ROLLED_OVER' : 'NO_OP';
  }
  return 'OPENED_MISSING_DAY';
}
module.exports = { planBusinessDayCharacterization };
