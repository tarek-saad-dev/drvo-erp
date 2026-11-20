'use strict';
/**
 * ADR-031 posting readiness board (Track C).
 * Reads ADR docs + synthetic evidence classifier. NEVER approves ADR-031,
 * NEVER enables pos.sale.post, NEVER writes GL / SQL / flags.
 */
const fs = require('node:fs');
const path = require('node:path');
const {firstJournalTruth, tenderTruth} = require('./adr031-decision-evidence.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

const DOC_PATHS = Object.freeze({
  adr031: 'docs/05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md',
  founderPacket: 'docs/04-execution/ADR-031-FOUNDER-FINANCE-DECISION-PACKET-2026-11-12.md',
  readinessPackage: 'docs/04-execution/ADR-031-POSTING-READINESS-PACKAGE-2026-11-20.md',
  decisionsRegister: 'docs/05-decisions/DECISIONS.md',
});

const PENDING_APPROVALS = Object.freeze([
  Object.freeze({
    id: 'H1_FOUNDER',
    role: 'Founder',
    decision: 'Select Option A / Option B / Defer; authorize posting enablement only after evidence',
    status: 'PENDING',
  }),
  Object.freeze({
    id: 'H2_FINANCE',
    role: 'Finance',
    decision: 'CoA, tender E1/E2, VAT/tax timing, period/close, reversal/credit-note, receipt wording',
    status: 'PENDING',
  }),
  Object.freeze({
    id: 'H3_ARCHITECTURE',
    role: 'Architecture',
    decision: 'Module ownership boundaries, typed Sale→GL command, outbox contract, co-location invariant',
    status: 'PENDING',
  }),
  Object.freeze({
    id: 'H4_SECURITY',
    role: 'Security',
    decision: 'Tenant isolation negative tests for posting paths, pos.sale.post entitlement, backup/restore attestation',
    status: 'PENDING',
  }),
]);

const PENDING_EVIDENCE = Object.freeze([
  Object.freeze({
    id: 'E1_DISPOSABLE_SQL_RACE_IDEMPOTENCY',
    title: 'Disposable SQL race / idempotency on domain posting SQL',
    status: 'PENDING',
  }),
  Object.freeze({
    id: 'E2_TENANT_ISOLATION',
    title: 'Cross-Tenant/Business/Branch negative HTTP+SQL on posting paths',
    status: 'PENDING',
  }),
  Object.freeze({
    id: 'E3_OWNER_BROWSER_PAID_PATH',
    title: 'Authenticated Owner browser paid path (no false POSTED)',
    status: 'PENDING',
  }),
  Object.freeze({
    id: 'E4_BACKUP_RESTORE',
    title: 'Independently witnessed backup + restore before posting migration/flag',
    status: 'PENDING',
  }),
]);

const NONPOSTING_INVENTORY = Object.freeze([
  Object.freeze({id: 'POS_DRAFT', label: 'POS draft', state: 'NONPOSTING'}),
  Object.freeze({id: 'POS_TIPS', label: 'POS tips preview', state: 'NONPOSTING'}),
  Object.freeze({id: 'POS_RETURNS', label: 'POS returns/void preview', state: 'NONPOSTING'}),
  Object.freeze({id: 'INV_RECEIVE', label: 'Inventory receive/adjust', state: 'NONPOSTING'}),
  Object.freeze({id: 'INV_TRANSFER', label: 'Inventory transfer', state: 'NONPOSTING'}),
  Object.freeze({id: 'EXPENSES_DRAFT', label: 'Expenses draft', state: 'NONPOSTING'}),
  Object.freeze({id: 'TREASURY_COUNTS', label: 'Treasury counts', state: 'NONPOSTING'}),
  Object.freeze({id: 'TREASURY_MOVEMENTS_READINESS', label: 'Treasury movements readiness', state: 'NONPOSTING'}),
  Object.freeze({id: 'LOYALTY_PREVIEW', label: 'Loyalty preview', state: 'NONPOSTING'}),
]);

const OWNERSHIP_MATRIX = Object.freeze([
  Object.freeze({concern: 'source_sale', owner: 'Sales/POS'}),
  Object.freeze({concern: 'first_balanced_gl', owner: 'Accounting'}),
  Object.freeze({concern: 'cash_custody_tender', owner: 'Treasury'}),
  Object.freeze({concern: 'stock_qty_cost', owner: 'Inventory'}),
  Object.freeze({concern: 'commission_tip_ledger', owner: 'HR'}),
]);

const TENDER_QUESTIONS_OPEN = Object.freeze([
  'physical_cash_gl_custody',
  'card_provider_confirmed_settlement',
  'identified_customer_ar_credit',
  'screenshot_electronic_unverified_claim',
  'partial_tender_tax_receipt_rounding',
]);

function readDoc(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return {path: relPath, present: false, text: ''};
  }
  return {path: relPath, present: true, text: fs.readFileSync(abs, 'utf8')};
}

function classifyAdr031Status(docs) {
  const joined = [docs.adr031, docs.decisionsRegister, docs.readinessPackage]
    .filter((d) => d.present)
    .map((d) => d.text)
    .join('\n');
  if (!joined) return 'MISSING_DOCS';
  // Fail closed: any explicit APPROVED acceptance language without PROPOSED guard is rejected by verify.
  const hasProposed =
    /\bPROPOSED\b/i.test(joined) &&
    !/\bADR-031\b[^\n]{0,120}\bACCEPTED\b/i.test(docs.decisionsRegister.text || '');
  const registerProposed = /ADR-031[^\n]*\*\*PROPOSED/i.test(docs.decisionsRegister.text || '');
  const adrHeaderProposed = /Status:\s*\*\*PROPOSED/i.test(docs.adr031.text || '');
  if (registerProposed || adrHeaderProposed || hasProposed) return 'PROPOSED';
  if (/\bAPPROVED\b/i.test(joined) && !/\bPROPOSED\b/i.test(joined)) return 'APPROVED';
  return 'PROPOSED';
}

function classifierSmoke() {
  // Prove board wires the synthetic classifier; never claims real posting.
  const atomicPosted = firstJournalTruth({
    strategy: 'ATOMIC_A',
    sourceCommitted: true,
    firstJournalCommitted: true,
    balanced: true,
    outboxCommitted: true,
  });
  const asyncPending = firstJournalTruth({
    strategy: 'ASYNC_B',
    sourceCommitted: true,
    firstJournalCommitted: false,
    balanced: false,
    outboxCommitted: true,
  });
  const screenshot = tenderTruth({
    evidenceKind: 'SCREENSHOT_ONLY',
    verifiedByAuthority: false,
  });
  return Object.freeze({
    atomicPosted,
    asyncPending,
    screenshot,
    screenshotNeverVerifiedBank: screenshot === 'UNVERIFIED_CLAIM',
  });
}

function buildAdr031ReadinessBoard() {
  const docs = Object.freeze({
    adr031: readDoc(DOC_PATHS.adr031),
    founderPacket: readDoc(DOC_PATHS.founderPacket),
    readinessPackage: readDoc(DOC_PATHS.readinessPackage),
    decisionsRegister: readDoc(DOC_PATHS.decisionsRegister),
  });
  const adr031Status = classifyAdr031Status(docs);
  const missingDocs = Object.values(docs)
    .filter((d) => !d.present)
    .map((d) => d.path);

  return Object.freeze({
    packageId: 'ADR-031-POSTING-READINESS-2026-11-20',
    adr031Status,
    postingActivation: 'BLOCKED',
    recommendation: 'OPTION_A_CONDITIONAL',
    optionAApproved: false,
    optionBApproved: false,
    posSalePostEnabled: false,
    selfApprovalForbidden: true,
    pendingApprovals: PENDING_APPROVALS,
    pendingEvidence: PENDING_EVIDENCE,
    nonpostingInventory: NONPOSTING_INVENTORY,
    ownershipMatrix: OWNERSHIP_MATRIX,
    tenderQuestionsOpen: TENDER_QUESTIONS_OPEN,
    docs: Object.freeze({
      paths: DOC_PATHS,
      missing: Object.freeze(missingDocs),
      allPresent: missingDocs.length === 0,
    }),
    classifierSmoke: classifierSmoke(),
    generatedAt: new Date().toISOString(),
  });
}

module.exports = {
  buildAdr031ReadinessBoard,
  PENDING_APPROVALS,
  PENDING_EVIDENCE,
  DOC_PATHS,
};

if (require.main === module) {
  const board = buildAdr031ReadinessBoard();
  process.stdout.write(JSON.stringify(board, null, 2) + '\n');
}
