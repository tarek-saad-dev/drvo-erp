'use strict';

/**
 * Builds the operational Pilot workflow readiness matrix.
 * Status vocabulary:
 *   READY_IN_REPO — source/contracts exist in git (not pilot proof)
 *   CI_ONLY       — disposable Chromium/SQL CI covers the step (not Owner/pilot proof)
 *   OPEN          — still needs operator/pilot evidence
 *   BLOCKED       — intentionally forbidden (e.g. ADR-031 posting side-effects)
 */
const fs = require('node:fs');
const path = require('node:path');
const {assertNoLiveConnectionMarkers} = require('../cut-adapter/connection-gates.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const MATRIX_PATH = path.join(__dirname, 'workflow-matrix.json');

const ADR031_NOTE =
  'ADR-031 remains PROPOSED. This workflow step must stay NONPOSTING: no paid sale, tender settlement, stock decrement-on-sale, or first mandatory GL journal.';

const WORKFLOW_STEPS = Object.freeze([
  Object.freeze({
    id: 'CUSTOMER',
    title: 'Customer',
    order: 1,
    status: 'CI_ONLY',
    evidencePaths: Object.freeze([
      'tools/salon-browser/operations.cjs',
      'db/migrations/012_business_customers.sql',
      'db/migrations/024_customer_business_search.sql',
      'apps/web/src/app/workspace/[businessId]/[branchId]/customers',
    ]),
    s12s13Coverage: Object.freeze([
      'S12 create Customer via UI',
      'S12 Customer survives reload',
      'S12 customer Business search via UI',
    ]),
    adr031Note: ADR031_NOTE,
    notes:
      'Disposable S12 Chromium creates/searchs a synthetic Customer under K5 scope. Owner Pilot browser and primary SQL apply remain OPEN.',
  }),
  Object.freeze({
    id: 'BOOKING',
    title: 'Booking',
    order: 2,
    status: 'CI_ONLY',
    evidencePaths: Object.freeze([
      'tools/salon-browser/operations.cjs',
      'db/migrations/013_branch_booking_foundation.sql',
      'db/migrations/015_booking_appointment_lifecycle.sql',
      'apps/web/src/app/workspace/[businessId]/[branchId]/booking',
    ]),
    s12s13Coverage: Object.freeze([
      'S12 create Booking Resource through UI',
      'S12 create scoped Booking via UI',
      'S12 Booking survives browser reload',
    ]),
    adr031Note: ADR031_NOTE,
    notes:
      'S12 proves Category→Service→Resource→future Booking on disposable SQL. Private Owner acceptance on Pilot DB is still OPEN.',
  }),
  Object.freeze({
    id: 'BARBER',
    title: 'Barber',
    order: 3,
    status: 'CI_ONLY',
    evidencePaths: Object.freeze([
      'tools/salon-browser/hr-operations.cjs',
      'tools/salon-browser/check.cjs',
      'db/migrations/018_hr_employee_salon_barber.sql',
      'apps/web/src/app/workspace/[businessId]/[branchId]/hr',
    ]),
    s12s13Coverage: Object.freeze([
      'S13 HR employee create POST',
      'S13 Barber activate POST',
      'S13 reload proves SQL persisted HR employee and Barber status',
      'S13 staff denied HR create and Salon Barber mutation',
    ]),
    adr031Note: ADR031_NOTE + ' HR payout/commission posting is separately blocked.',
    notes:
      'S13 harness links HR Employee ↔ Booking PERSON resource as Salon Barber on disposable CI. Harness PASS is CI_ONLY, not Owner Pilot proof.',
  }),
  Object.freeze({
    id: 'POS_DRAFT',
    title: 'POS Draft',
    order: 4,
    status: 'CI_ONLY',
    evidencePaths: Object.freeze([
      'tools/salon-browser/operations.cjs',
      'db/migrations/014_branch_pos_drafts.sql',
      'db/migrations/022_pos_cashier_draft_pricing.sql',
      'apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview',
    ]),
    s12s13Coverage: Object.freeze([
      'S12 POS DRAFT created through UI only',
      'S12 real POS quick cart from authorized Catalog',
      'S12 POS DRAFT persisted and still unposted',
    ]),
    adr031Note: ADR031_NOTE,
    notes:
      'S12 saves a NONPOSTING POS DRAFT (qty 2) and asserts unposted banner. Paid sale remains BLOCKED by ADR-031.',
  }),
  Object.freeze({
    id: 'INVENTORY_VALIDATION',
    title: 'Inventory Validation',
    order: 5,
    status: 'READY_IN_REPO',
    evidencePaths: Object.freeze([
      'db/migrations/027_inventory_branch_stock.sql',
      'apps/web/test/pos-product-stock-gate.test.cjs',
      'docs/04-execution/CHANGELOG.md',
    ]),
    s12s13Coverage: Object.freeze([]),
    adr031Note:
      ADR031_NOTE +
      ' SQL027 overlay may disable OUT products on draft cart; sale-time stock decrement stays unauthorized.',
    notes:
      'Repo has SQL027 branch stock + private POS OUT product gate unit coverage. S12/S13 Chromium journeys do not assert inventory validation → not CI_ONLY for Pilot workflow.',
  }),
  Object.freeze({
    id: 'DRAFT_PRINT',
    title: 'Draft Print',
    order: 6,
    status: 'READY_IN_REPO',
    evidencePaths: Object.freeze([
      'packages/business-modules/pos/src/draft-print.ts',
      'apps/api/src/pos-drafts/draft-print.ts',
      'apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/cashier-draft-print.ts',
      'apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/cashier-draft-print-view.tsx',
      'docs/04-execution/POS-S5-DRAFT-PRINT-PREVIEW-2026-11-20.md',
      '.github/workflows/shared-pos-draft-print-ci.yml',
    ]),
    s12s13Coverage: Object.freeze([]),
    adr031Note:
      ADR031_NOTE +
      ' Any print surface must remain DRAFT/NONPOSTING and must not imply a fiscal receipt.',
    notes:
      '#151 merged NONPOSTING DRAFT print preview (window.print only). Fiscal/paid receipt remains BLOCKED (ADR-031). S12/S13 do not assert print; Owner Pilot browser proof still OPEN.',
  }),
  Object.freeze({
    id: 'RELOAD',
    title: 'Reload',
    order: 7,
    status: 'CI_ONLY',
    evidencePaths: Object.freeze([
      'tools/salon-browser/operations.cjs',
      'tools/salon-browser/hr-operations.cjs',
    ]),
    s12s13Coverage: Object.freeze([
      'S12 Catalog survives browser reload',
      'S12 Customer survives reload',
      'S12 Booking survives browser reload',
      'S12 POS DRAFT persisted and still unposted',
      'S13 reload proves SQL persisted HR employee and Barber status',
    ]),
    adr031Note: ADR031_NOTE,
    notes:
      'S12/S13 reload phases prove disposable SQL persistence for Customer/Booking/POS DRAFT/Barber. Owner Pilot reload acceptance remains OPEN.',
  }),
]);

function buildWorkflowMatrix(operatorEvidence = {}) {
  assertNoLiveConnectionMarkers(operatorEvidence);
  if (operatorEvidence && operatorEvidence.productionVerificationClaimed === true) {
    throw new TypeError(
      'productionVerificationClaimed=true refused: workflow matrix never attests production verification'
    );
  }

  const steps = WORKFLOW_STEPS.map((step) =>
    Object.freeze({
      id: step.id,
      title: step.title,
      order: step.order,
      status: step.status,
      evidencePaths: step.evidencePaths,
      s12s13Coverage: step.s12s13Coverage,
      adr031Note: step.adr031Note,
      notes: step.notes,
    })
  );

  const byStatus = Object.freeze({
    READY_IN_REPO: steps.filter((s) => s.status === 'READY_IN_REPO').map((s) => s.id),
    CI_ONLY: steps.filter((s) => s.status === 'CI_ONLY').map((s) => s.id),
    OPEN: steps.filter((s) => s.status === 'OPEN').map((s) => s.id),
    BLOCKED: steps.filter((s) => s.status === 'BLOCKED').map((s) => s.id),
  });

  return Object.freeze({
    schema: 'drvo.pilot.workflow-matrix.v1',
    mode: 'PILOT_WORKFLOW_MATRIX_DRY_RUN_ONLY',
    generatedAtSource: 'tools/pilot/workflow-matrix-builder.cjs',
    workflow:
      'Customer → Booking → Barber → POS Draft → Inventory Validation → Draft Print → Reload',
    productionVerificationClaimed: false,
    realDataActivation: 'BLOCKED',
    adr031Posting: 'BLOCKED',
    cutLiveImport: 'BLOCKED',
    architectureNote:
      'Modular Monolith Tenant isolation; disposable CI ≠ isolated Pilot DB Owner proof.',
    steps: Object.freeze(steps),
    summary: Object.freeze({
      stepCount: steps.length,
      byStatus,
      openStepIds: byStatus.OPEN,
      note:
        'CI_ONLY/READY_IN_REPO are repository evidence classes only. Pilot activation stays blocked until TARGET_APPLY, ISOLATED_BACKUP_RESTORE, K5_PERMISSIONS, and OWNER_BROWSER_E2E close outside this tool.',
    }),
  });
}

function writeWorkflowMatrixJson(targetPath = MATRIX_PATH) {
  const matrix = buildWorkflowMatrix();
  const payload = JSON.stringify(matrix, null, 2) + '\n';
  fs.writeFileSync(targetPath, payload, 'utf8');
  return matrix;
}

function loadCommittedWorkflowMatrix(targetPath = MATRIX_PATH) {
  const raw = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  assertNoLiveConnectionMarkers(raw);
  return raw;
}

if (require.main === module) {
  const matrix = writeWorkflowMatrixJson();
  console.log(
    JSON.stringify(
      {
        ok: true,
        wrote: path.relative(ROOT, MATRIX_PATH).replace(/\\/g, '/'),
        openStepIds: matrix.summary.openStepIds,
        productionVerificationClaimed: matrix.productionVerificationClaimed,
      },
      null,
      2
    )
  );
}

module.exports = {
  WORKFLOW_STEPS,
  MATRIX_PATH,
  buildWorkflowMatrix,
  writeWorkflowMatrixJson,
  loadCommittedWorkflowMatrix,
};
