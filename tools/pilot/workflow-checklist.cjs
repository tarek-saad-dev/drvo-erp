'use strict';

/**
 * Assertive mapping of Pilot workflow matrix steps ↔ S12/S13 salon-browser phases.
 * Documents which steps already have disposable Chromium coverage and which remain OPEN.
 * Never claims Owner Pilot browser PASS or ADR-031 posting.
 */
const fs = require('node:fs');
const path = require('node:path');
const {assertNoLiveConnectionMarkers} = require('../cut-adapter/connection-gates.cjs');
const {buildWorkflowMatrix} = require('./workflow-matrix-builder.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

const PHASE_MARKERS = Object.freeze({
  CUSTOMER: Object.freeze([
    "onPhase('S12 create Customer via UI')",
    "onPhase('S12 Customer survives reload')",
    "onPhase('S12 customer Business search via UI')",
  ]),
  BOOKING: Object.freeze([
    "onPhase('S12 create Booking Resource through UI')",
    "onPhase('S12 create scoped Booking via UI')",
    "onPhase('S12 Booking survives browser reload')",
  ]),
  BARBER: Object.freeze([
    "onPhase('S13 HR employee create POST')",
    "onPhase('S13 Barber activate POST')",
    "onPhase('S13 reload proves SQL persisted HR employee and Barber status')",
  ]),
  POS_DRAFT: Object.freeze([
    "onPhase('S12 POS DRAFT created through UI only')",
    "onPhase('S12 POS DRAFT persisted and still unposted')",
  ]),
  INVENTORY_VALIDATION: Object.freeze([]),
  DRAFT_PRINT: Object.freeze([]),
  RELOAD: Object.freeze([
    "onPhase('S12 Catalog survives browser reload')",
    "onPhase('S12 Customer survives reload')",
    "onPhase('S12 Booking survives browser reload')",
    "onPhase('S12 POS DRAFT persisted and still unposted')",
    "onPhase('S13 reload proves SQL persisted HR employee and Barber status')",
  ]),
});

const SOURCE_FILES = Object.freeze([
  path.join(ROOT, 'tools', 'salon-browser', 'operations.cjs'),
  path.join(ROOT, 'tools', 'salon-browser', 'hr-operations.cjs'),
  path.join(ROOT, 'tools', 'salon-browser', 'check.cjs'),
]);

function readSalonBrowserSources() {
  return SOURCE_FILES.map((abs) => {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (!fs.existsSync(abs)) {
      return {path: rel, present: false, text: ''};
    }
    return {path: rel, present: true, text: fs.readFileSync(abs, 'utf8')};
  });
}

function findMarkers(combinedText, markers) {
  return markers.map((marker) =>
    Object.freeze({
      marker,
      present: combinedText.includes(marker),
    })
  );
}

/**
 * Build checklist: matrix status + whether S12/S13 phase markers exist in repo.
 */
function buildPilotWorkflowChecklist(operatorEvidence = {}) {
  assertNoLiveConnectionMarkers(operatorEvidence);
  if (operatorEvidence && operatorEvidence.productionVerificationClaimed === true) {
    throw new TypeError(
      'productionVerificationClaimed=true refused: workflow checklist never attests production verification'
    );
  }

  const matrix = buildWorkflowMatrix();
  const sources = readSalonBrowserSources();
  const missingSources = sources.filter((s) => !s.present).map((s) => s.path);
  const combined = sources.map((s) => s.text).join('\n');

  const steps = matrix.steps.map((step) => {
    const expectedMarkers = PHASE_MARKERS[step.id] || [];
    const markerResults = findMarkers(combined, expectedMarkers);
    const markersPresentCount = markerResults.filter((m) => m.present).length;
    const markersComplete =
      expectedMarkers.length === 0
        ? false
        : markersPresentCount === expectedMarkers.length;

    let coverageClass = 'OPEN';
    if (step.id === 'DRAFT_PRINT') {
      coverageClass = 'BLOCKED_NO_DRAFT_PRINT_OWNER';
    } else if (step.id === 'INVENTORY_VALIDATION') {
      coverageClass = 'READY_IN_REPO_NO_S12_S13_PHASE';
    } else if (markersComplete) {
      coverageClass = 'S12_S13_PHASE_MARKERS_PRESENT';
    } else if (markersPresentCount > 0) {
      coverageClass = 'PARTIAL_S12_S13_MARKERS';
    }

    return Object.freeze({
      id: step.id,
      title: step.title,
      matrixStatus: step.status,
      coverageClass,
      expectedMarkerCount: expectedMarkers.length,
      markersPresentCount,
      markers: Object.freeze(markerResults),
      evidencePaths: step.evidencePaths,
      adr031Note: step.adr031Note,
      remainsOpenForPilot:
        step.status === 'OPEN' ||
        step.id === 'INVENTORY_VALIDATION',
      remainsBlockedForPilot: step.status === 'BLOCKED' || step.id === 'DRAFT_PRINT',
    });
  });

  const openIds = steps.filter((s) => s.remainsOpenForPilot).map((s) => s.id);
  const blockedIds = steps.filter((s) => s.remainsBlockedForPilot).map((s) => s.id);
  const coveredIds = steps
    .filter((s) => s.coverageClass === 'S12_S13_PHASE_MARKERS_PRESENT')
    .map((s) => s.id);

  return Object.freeze({
    schema: 'drvo.pilot.workflow-checklist.v1',
    mode: 'PILOT_WORKFLOW_CHECKLIST_DRY_RUN_ONLY',
    productionVerificationClaimed: false,
    realDataActivation: 'BLOCKED',
    adr031Posting: 'BLOCKED',
    salonBrowserSources: Object.freeze(
      sources.map((s) => Object.freeze({path: s.path, present: s.present}))
    ),
    missingSalonBrowserSources: Object.freeze(missingSources),
    steps: Object.freeze(steps),
    summary: Object.freeze({
      s12s13CoveredStepIds: Object.freeze(coveredIds),
      openOrUncoveredStepIds: Object.freeze(openIds),
      blockedStepIds: Object.freeze(blockedIds),
      draftPrintStatus: steps.find((s) => s.id === 'DRAFT_PRINT')?.matrixStatus || 'BLOCKED',
      inventoryValidationStatus:
        steps.find((s) => s.id === 'INVENTORY_VALIDATION')?.matrixStatus || 'OPEN',
      note:
        'S12/S13 phase markers prove disposable CI journey wiring only. Draft Print is BLOCKED (POS-07). Inventory Validation is READY_IN_REPO without S12/S13 phase markers. Owner Pilot E2E remains an OPEN readiness-board gate.',
    }),
  });
}

if (require.main === module) {
  const checklist = buildPilotWorkflowChecklist();
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: checklist.mode,
        productionVerificationClaimed: checklist.productionVerificationClaimed,
        s12s13CoveredStepIds: checklist.summary.s12s13CoveredStepIds,
        openOrUncoveredStepIds: checklist.summary.openOrUncoveredStepIds,
        draftPrintStatus: checklist.summary.draftPrintStatus,
      },
      null,
      2
    )
  );
}

module.exports = {
  PHASE_MARKERS,
  buildPilotWorkflowChecklist,
};
