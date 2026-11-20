'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAdr031ReadinessBoard,
  PENDING_APPROVALS,
  PENDING_EVIDENCE,
} = require('../tools/finance/adr031-readiness-board.cjs');
const {verifyAdr031Readiness} = require('../tools/finance/verify-adr031-readiness.cjs');

test('ADR-031 readiness board stays PROPOSED with posting BLOCKED', () => {
  const board = buildAdr031ReadinessBoard();
  assert.equal(board.adr031Status, 'PROPOSED');
  assert.notEqual(board.adr031Status, 'APPROVED');
  assert.equal(board.postingActivation, 'BLOCKED');
  assert.equal(board.posSalePostEnabled, false);
  assert.equal(board.optionAApproved, false);
  assert.equal(board.optionBApproved, false);
  assert.equal(board.recommendation, 'OPTION_A_CONDITIONAL');
  assert.equal(board.selfApprovalForbidden, true);
  assert.equal(board.docs.allPresent, true);
});

test('pendingApprovals lists Founder Finance Architecture Security as PENDING', () => {
  const board = buildAdr031ReadinessBoard();
  assert.equal(board.pendingApprovals.length, PENDING_APPROVALS.length);
  const roles = board.pendingApprovals.map((a) => a.role).sort();
  assert.deepEqual(roles, ['Architecture', 'Finance', 'Founder', 'Security']);
  for (const row of board.pendingApprovals) {
    assert.equal(row.status, 'PENDING');
  }
});

test('pendingEvidence lists race isolation Owner-browser backup as PENDING', () => {
  const board = buildAdr031ReadinessBoard();
  assert.equal(board.pendingEvidence.length, PENDING_EVIDENCE.length);
  const ids = board.pendingEvidence.map((e) => e.id);
  assert.ok(ids.includes('E1_DISPOSABLE_SQL_RACE_IDEMPOTENCY'));
  assert.ok(ids.includes('E2_TENANT_ISOLATION'));
  assert.ok(ids.includes('E3_OWNER_BROWSER_PAID_PATH'));
  assert.ok(ids.includes('E4_BACKUP_RESTORE'));
  for (const row of board.pendingEvidence) {
    assert.equal(row.status, 'PENDING');
  }
});

test('nonposting inventory and ownership matrix are present', () => {
  const board = buildAdr031ReadinessBoard();
  assert.ok(board.nonpostingInventory.length >= 7);
  assert.ok(board.nonpostingInventory.every((x) => x.state === 'NONPOSTING'));
  const owners = board.ownershipMatrix.map((r) => r.owner);
  assert.ok(owners.includes('Sales/POS'));
  assert.ok(owners.includes('Accounting'));
  assert.ok(owners.includes('Treasury'));
  assert.ok(owners.includes('Inventory'));
  assert.ok(owners.includes('HR'));
  assert.ok(board.tenderQuestionsOpen.includes('screenshot_electronic_unverified_claim'));
});

test('board wires synthetic classifier without approving posting', () => {
  const board = buildAdr031ReadinessBoard();
  assert.equal(board.classifierSmoke.atomicPosted, 'POSTED');
  assert.equal(board.classifierSmoke.asyncPending, 'ACCOUNTING_PENDING');
  assert.equal(board.classifierSmoke.screenshot, 'UNVERIFIED_CLAIM');
  assert.equal(board.classifierSmoke.screenshotNeverVerifiedBank, true);
});

test('verify-adr031-readiness passes for current PROPOSED package', () => {
  const result = verifyAdr031Readiness();
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.pendingApprovals.length, 4);
  assert.equal(result.pendingEvidence.length, 4);
});

test('verify fails closed if board claims APPROVED or unblocks posting', () => {
  const board = buildAdr031ReadinessBoard();
  const forged = {
    ...board,
    adr031Status: 'APPROVED',
    postingActivation: 'ENABLED',
    posSalePostEnabled: true,
    optionAApproved: true,
    pendingApprovals: board.pendingApprovals.map((a) => ({...a, status: 'ACCEPTED'})),
    pendingEvidence: board.pendingEvidence.map((e) => ({...e, status: 'DONE'})),
  };
  const result = verifyAdr031Readiness(forged);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /APPROVED/.test(e)));
  assert.ok(result.errors.some((e) => /BLOCKED/.test(e)));
});
