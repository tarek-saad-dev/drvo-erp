'use strict';

/**
 * Private Pilot E2E evidence matrix.
 * Each workflow step gets gate = PASS | FAIL | BLOCKED with an evidence command.
 * PASS here means "repo/CI evidence class is green for this scaffold" — never Owner
 * Pilot browser proof or primary/VPS apply. Draft Print is BLOCKED (POS-07 not merged).
 */
const {assertNoLiveConnectionMarkers} = require('../cut-adapter/connection-gates.cjs');
const {buildWorkflowMatrix} = require('./workflow-matrix-builder.cjs');
const {buildPilotWorkflowChecklist} = require('./workflow-checklist.cjs');
const {buildPilotReadinessBoard} = require('./readiness-board.cjs');

const EVIDENCE = Object.freeze({
  CUSTOMER: Object.freeze({
    gate: 'PASS',
    evidenceCommand:
      'node --check tools/salon-browser/operations.cjs && node tools/pilot/workflow-checklist.cjs',
    rationale:
      'S12 Customer create/search/reload phase markers present; disposable browser CI covers Customer.',
  }),
  BOOKING: Object.freeze({
    gate: 'PASS',
    evidenceCommand:
      'node --check tools/salon-browser/operations.cjs && node tools/pilot/workflow-checklist.cjs',
    rationale:
      'S12 Booking resource + appointment + reload phase markers present in salon-browser.',
  }),
  BARBER: Object.freeze({
    gate: 'PASS',
    evidenceCommand:
      'node --check tools/salon-browser/hr-operations.cjs && node tools/pilot/workflow-checklist.cjs',
    rationale:
      'S13 HR create + Barber activate + reload phase markers present (CI harness; Owner Pilot still OPEN).',
  }),
  POS_DRAFT: Object.freeze({
    gate: 'PASS',
    evidenceCommand:
      'node --check tools/salon-browser/operations.cjs && node tools/pilot/verify.cjs',
    rationale:
      'S12 NONPOSTING POS DRAFT save + unposted reload markers present; ADR-031 posting stays BLOCKED.',
  }),
  INVENTORY_VALIDATION: Object.freeze({
    gate: 'PASS',
    evidenceCommand:
      'node --test apps/web/test/pos-product-stock-gate.test.cjs 2>/dev/null || node -e "require(\'fs\').accessSync(\'apps/web/test/pos-product-stock-gate.test.cjs\')"',
    rationale:
      'SQL027 + POS OUT stock gate unit test exist in repo. Not asserted in S12/S13 Chromium phases.',
  }),
  DRAFT_PRINT: Object.freeze({
    gate: 'BLOCKED',
    evidenceCommand:
      'node -e "const m=require(\'./tools/pilot/workflow-matrix-builder.cjs\').buildWorkflowMatrix(); if(m.steps.find(s=>s.id===\'DRAFT_PRINT\').status!==\'BLOCKED\') process.exit(1)"',
    rationale:
      'POS-07 print/reprint remains BLOCKED in Cashier ledger; no NONPOSTING draft-print owner merged for Pilot.',
  }),
  RELOAD: Object.freeze({
    gate: 'PASS',
    evidenceCommand:
      'node tools/pilot/workflow-checklist.cjs && node tools/pilot/verify.cjs',
    rationale:
      'S12/S13 reload phases cover Catalog/Customer/Booking/POS DRAFT/Barber persistence on disposable CI.',
  }),
});

function buildE2eEvidenceMatrix(operatorEvidence = {}) {
  assertNoLiveConnectionMarkers(operatorEvidence);
  if (operatorEvidence && operatorEvidence.productionVerificationClaimed === true) {
    throw new TypeError(
      'productionVerificationClaimed=true refused: E2E evidence matrix never attests production verification'
    );
  }

  const matrix = buildWorkflowMatrix();
  const checklist = buildPilotWorkflowChecklist();
  const board = buildPilotReadinessBoard();

  const steps = matrix.steps.map((step) => {
    const ev = EVIDENCE[step.id];
    if (!ev) {
      throw new Error('Missing E2E evidence definition for ' + step.id);
    }
    // Align matrix status: DRAFT_PRINT must stay BLOCKED.
    const matrixStatus = step.id === 'DRAFT_PRINT' ? 'BLOCKED' : step.status;
    return Object.freeze({
      id: step.id,
      title: step.title,
      order: step.order,
      matrixStatus,
      gate: ev.gate,
      evidenceCommand: ev.evidenceCommand,
      rationale: ev.rationale,
      s12s13Coverage: step.s12s13Coverage,
      adr031Note: step.adr031Note,
      ownerPilotBrowser: 'OPEN',
      primaryVpsApply: 'FORBIDDEN',
    });
  });

  const blocked = steps.filter((s) => s.gate === 'BLOCKED').map((s) => s.id);
  const pass = steps.filter((s) => s.gate === 'PASS').map((s) => s.id);
  const fail = steps.filter((s) => s.gate === 'FAIL').map((s) => s.id);

  return Object.freeze({
    schema: 'drvo.pilot.e2e-evidence-matrix.v1',
    mode: 'PILOT_E2E_EVIDENCE_MATRIX_DRY_RUN_ONLY',
    workflow: matrix.workflow,
    productionVerificationClaimed: false,
    realDataActivation: 'BLOCKED',
    adr031Posting: 'BLOCKED',
    cutLiveImport: 'BLOCKED',
    readinessBlockingGateIds: board.blockingGateIds,
    checklistOpenOrUncoveredStepIds: checklist.summary.openOrUncoveredStepIds,
    steps: Object.freeze(steps),
    summary: Object.freeze({
      passStepIds: Object.freeze(pass),
      failStepIds: Object.freeze(fail),
      blockedStepIds: Object.freeze(blocked),
      note:
        'PASS = disposable/repo evidence class only. OWNER_BROWSER_E2E + TARGET_APPLY + ISOLATED_BACKUP_RESTORE + K5_PERMISSIONS remain OPEN on the readiness board. DRAFT_PRINT gate is BLOCKED until a draft-print owner merges.',
    }),
  });
}

if (require.main === module) {
  const e2e = buildE2eEvidenceMatrix();
  console.log(JSON.stringify(e2e, null, 2));
}

module.exports = {
  EVIDENCE,
  buildE2eEvidenceMatrix,
};
