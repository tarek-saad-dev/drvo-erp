'use strict';
/**
 * Fail-closed verifier for ADR-031 posting readiness.
 * Asserts adr031Status !== APPROVED and postingActivation === BLOCKED.
 * Lists pendingApprovals[] and pendingEvidence[]. Never enables posting.
 */
const {
  buildAdr031ReadinessBoard,
} = require('./adr031-readiness-board.cjs');

function verifyAdr031Readiness(board = buildAdr031ReadinessBoard()) {
  const errors = [];
  if (!board || typeof board !== 'object') {
    errors.push('board missing');
    return {ok: false, errors, board: null};
  }
  if (board.adr031Status === 'APPROVED') {
    errors.push("adr031Status must not be 'APPROVED' (self-approval forbidden)");
  }
  if (board.adr031Status !== 'PROPOSED' && board.adr031Status !== 'MISSING_DOCS') {
    errors.push(`unexpected adr031Status: ${board.adr031Status}`);
  }
  if (board.postingActivation !== 'BLOCKED') {
    errors.push("postingActivation must be 'BLOCKED'");
  }
  if (board.posSalePostEnabled === true) {
    errors.push('pos.sale.post must remain disabled');
  }
  if (board.optionAApproved === true || board.optionBApproved === true) {
    errors.push('Option A/B must remain unapproved');
  }
  if (!Array.isArray(board.pendingApprovals) || board.pendingApprovals.length < 4) {
    errors.push('pendingApprovals must list Founder/Finance/Architecture/Security');
  } else if (board.pendingApprovals.some((a) => a.status !== 'PENDING')) {
    errors.push('all human approvals must remain PENDING');
  }
  if (!Array.isArray(board.pendingEvidence) || board.pendingEvidence.length < 4) {
    errors.push('pendingEvidence must list SQL race, tenant isolation, Owner browser, backup/restore');
  } else if (board.pendingEvidence.some((e) => e.status !== 'PENDING')) {
    errors.push('all enablement evidence items must remain PENDING');
  }
  if (!board.docs || board.docs.allPresent !== true) {
    errors.push(`missing ADR docs: ${(board.docs && board.docs.missing || []).join(', ')}`);
  }
  if (!board.classifierSmoke || board.classifierSmoke.screenshotNeverVerifiedBank !== true) {
    errors.push('classifier smoke: screenshot must remain UNVERIFIED_CLAIM');
  }
  if (board.classifierSmoke && board.classifierSmoke.asyncPending !== 'ACCOUNTING_PENDING') {
    errors.push('classifier smoke: Option B without GL must be ACCOUNTING_PENDING');
  }
  return {
    ok: errors.length === 0,
    errors,
    board,
    pendingApprovals: board.pendingApprovals || [],
    pendingEvidence: board.pendingEvidence || [],
  };
}

function main() {
  const result = verifyAdr031Readiness();
  const summary = {
    ok: result.ok,
    adr031Status: result.board && result.board.adr031Status,
    postingActivation: result.board && result.board.postingActivation,
    recommendation: result.board && result.board.recommendation,
    pendingApprovals: result.pendingApprovals.map((a) => ({
      id: a.id, role: a.role, status: a.status,
    })),
    pendingEvidence: result.pendingEvidence.map((e) => ({
      id: e.id, title: e.title, status: e.status,
    })),
    errors: result.errors,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  if (!result.ok) {
    process.stderr.write('ADR-031 readiness verify FAILED\n');
    process.exit(1);
  }
  process.stderr.write('ADR-031 readiness verify PASS (still PROPOSED / posting BLOCKED)\n');
}

module.exports = {verifyAdr031Readiness};

if (require.main === module) {
  main();
}
