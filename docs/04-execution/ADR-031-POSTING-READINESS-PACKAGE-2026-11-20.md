# ADR-031 — Financial Posting Readiness Package (2026-11-20)

**Track C — decision readiness only. Status: PROPOSED. Self-approval forbidden. Posting activation BLOCKED.**

This package consolidates founder / finance / architecture evidence requirements so humans can approve [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md). It does **not** mark ADR-031 APPROVED, does **not** enable `pos.sale.post`, and does **not** authorize GL / settlement / paid sale SQL.

Machine board: `tools/finance/adr031-readiness-board.cjs` · verifier: `tools/finance/verify-adr031-readiness.cjs` · prior packet: [Founder/Finance decision packet](ADR-031-FOUNDER-FINANCE-DECISION-PACKET-2026-11-12.md) · Option A mechanics (non-decision): [F-1a SQL probe](FINANCE-F1A-OPTION-A-ATOMIC-SQL-PROBE-2026-11-12.md).

---

## 1. Current DRVO nonposting inventory

All surfaces below are **NONPOSTING** (draft, preview, qty-only, or readiness). None may claim `POSTED`, paid settlement, or first journal.

| Surface | What exists today | Explicitly blocked | File pointers |
|---|---|---|---|
| **POS draft** | Immutable Branch DRAFT / V2 rich draft with Catalog price snapshots, Customer/HR executor refs, idempotent create/read | No invoice, no tender settlement, no `pos.sale.post`, no GL | `apps/api/src/pos-drafts/`; `db/migrations/014_*.sql`, `022_*`, `023_*`; [POS durable drafts](POS-DURABLE-DRAFTS-EXECUTION-2026-11-12.md); [S2](CASHIER-POS-RICH-DRAFT-S2-2026-11-17.md) |
| **POS tips preview** | Pure tip-entry preview (`previewTipEntry`); UI disabled record button | Cash-in, employee ledger credit, WhatsApp, Treasury payout | `packages/business-modules/pos/src/tip-preview.ts`; `_cashier_source/pos-tips/`; [POS-S3](POS-S3-TIPS-PREVIEW-2026-11-20.md) |
| **POS returns / void preview** | Confirm-gate preview only; always `BLOCKED_ADR_031_SALES_VOID` | Sale reverse, stock+, Treasury remove, loyalty reverse, GL, WhatsApp | `packages/business-modules/pos/src/return-preview.ts`; `_cashier_source/pos-returns/`; [POS-S4](POS-S4-RETURNS-PREVIEW-2026-11-20.md) |
| **Inventory receive / adjust** | SQL027 Branch stock balances + nonposting receive/adjust documents; qty ownership only | Sale decrement, COGS, AP, Treasury, GL | `apps/api/src/inventory/inventory.service.ts`; `db/migrations/027_inventory_branch_stock.sql`; `packages/business-modules/inventory/src/stock-preview.ts` |
| **Inventory transfer** | SQL032 atomic APPLIED branch transfer + reverse-delta cancel | GL/COGS/AP; Cashier IN_TRANSIT/receive hop | `db/migrations/032_inventory_branch_transfers.sql`; `packages/business-modules/inventory/src/transfer-rules.ts`; [INV-03](INV-03-BRANCH-TRANSFERS-2026-11-20.md) |
| **Expenses draft** | SQL019 category + Branch DRAFT/CANCELLED expense docs | Paid expense, Treasury cash-out, journal | `apps/api/src/expenses/`; `db/migrations/019_*.sql`; [Expenses S1](CASHIER-EXPENSES-S1-PERSISTENT-NONPOSTING-2026-11-15.md) |
| **Treasury counts** | SQL021 physical cash-count DRAFT/CANCELLED observations | Balance as ledger truth, GL variance, settlement | `apps/api/src/treasury/treasury.service.ts`; `db/migrations/021_*.sql`; [Treasury T1](CASHIER-TREASURY-T1-COUNT-AND-PRIMARY-PREFLIGHT-2026-11-15.md) |
| **Treasury / ops movements readiness** | Day-close readiness, movement filters, handoff **preview**; lists only | Day/shift close, cash movement write, recon adjustment GL | `packages/business-modules/treasury/`; `apps/api/src/treasury/treasury-ops.service.ts`; [TREAS-S1](TREAS-S1-TREASURY-OPS-READINESS-PREVIEW-2026-11-20.md) |
| **Loyalty preview** | Points/tier/reward/redeem/adjust/reverse **preview** + Cut Club config validate | Earn/redeem/adjust/reverse posting, store/mystery box, messaging send | `packages/business-modules/loyalty/`; `apps/api/src/loyalty/`; [LOY-S1](LOY-S1-LOYALTY-CUT-CLUB-PREVIEW-2026-11-20.md) |

Synthetic first-journal classifier (not an implementation): `tools/finance/adr031-decision-evidence.cjs`.

---

## 2. Posting ownership matrix

| Concern | Owner Module | Must not be owned by | Gate until ADR-031 + evidence |
|---|---|---|---|
| Source sale identity / version / human-visible source status | **Sales / POS** | Accounting, Treasury, Inventory | `DRAFT` OK; `POSTED` requires Accounting first-journal proof |
| First balanced mandatory GL + AR / period rules | **Accounting** | POS routes, Treasury UI, Inventory SP callers | No Accounting table writes from POS |
| Cash custody, counted drawer, verified external tender | **Treasury** | POS (may *claim* tender only), Accounting (GL ≠ custody) | Counts/readiness only today |
| On-hand qty, receive/transfer documents, provisional cost | **Inventory** | Sales fabricating COGS; HR | Qty nonposting OK; sale COGS/GL blocked |
| Commission accrual / tip employee ledger | **HR** (Salon Extension for barber attribution) | POS as payroll authority | Tip/commission preview only |
| Outbox / notifications / BI | Asynchronous consumers | Never substitute for mandatory GL | Explicit pending statuses |

Cross-cutting: trusted Tenant/Business/Branch scope, Default Deny, immutable source+effect IDs (ADR-030 baseline). Client-supplied Tenant/Branch IDs never authorize posting.

---

## 3. Option A vs B (recommendation unchanged)

| | **A — atomic first GL (conditionally preferred)** | **B — durable source + async GL** |
|---|---|---|
| Commit | Sale + mandatory balanced GL + financial outbox in one SQL transaction | Sale + outbox atomically; GL later |
| Before GL | Reject/retry; never `POSTED` | `ACCOUNTING_PENDING`; never `POSTED` |
| After GL | `POSTED` only after balanced journal + durable outbox | `POSTED` only after consumer commits balanced GL |
| Main risk | Lock contention / checkout latency | Pending backlog, close/refund races, repair burden |
| Approval now | **NOT GIVEN** | **NOT GIVEN** |

**Engineering recommendation:** Option **A conditional** for shared-SQL V1 **IF** Finance CoA/tender/period policy, typed Accounting command ownership, measured p95/lock evidence, and Tenant isolation negative tests pass. This package does **not** select A or B.

F-1a disposable SQL probe proves *mechanics only* (rollback + concurrent idempotent replay on synthetic tables). It is **not** ADR acceptance.

---

## 4. Tender mapping questions still open

Finance must answer before enablement (cannot be guessed by engineering):

1. **Physical cash** — which GL / custody accounts; shift vs day close semantics.
2. **Card / provider-confirmed** — which verified bank/settlement accounts; failed confirmation treatment.
3. **Identified customer AR / credit** — open receivable vs anonymous collection exception (ADR-010).
4. **Screenshot / electronic claim only** — must remain **UNVERIFIED** (E1 vs E2); never credited as verified provider funds (ADR-011). Classifier: `tenderTruth({evidenceKind:'SCREENSHOT_ONLY',...})` → `UNVERIFIED_CLAIM`.
5. Partial tender splits, tax/VAT timing, legal receipt wording (Egypt / Gulf), currency rounding.

---

## 5. Operational invariants still required before enablement

| Topic | Required proof |
|---|---|
| **Idempotency / replay** | Immutable `sourceOperationId` + `journalEffectId` + payload hash; duplicate/race safe under SERIALIZABLE or equivalent; offline replay identical |
| **Balanced journal** | Mandatory first GL debit=credit; unbalanced → never `POSTED` |
| **Stock side effects** | Inventory qty/COGS independent owner; no silent zero COGS (ADR-012 `COST_PENDING`) |
| **Commission side effects** | HR accrual idempotent; never substitute for mandatory GL |
| **Reconciliation** | Sale / GL / Treasury / stock / commission states independently queryable; no single false `complete` |
| **Reversals** | Immutable posted history; linked reversal/adjustment only; refund/partial-refund concurrency rules |
| **Failure recovery** | Atomic rollback (A) or monitored `ACCOUNTING_PENDING` + DLQ (B); never show paid without evidence |

---

## 6. Exact human approvals still required

All rows **Status = PENDING**. No agent or engineering self-approval.

| # | Role | Decision required | Status |
|---|---|---|---|
| H1 | **Founder** | Select Option A / Option B / Defer; authorize posting enablement only after evidence | **PENDING** |
| H2 | **Finance** | CoA, tender E1/E2, VAT/tax timing, period/close, reversal/credit-note, receipt wording | **PENDING** |
| H3 | **Architecture** | Module ownership boundaries, typed Sale→GL command, outbox contract, co-location invariant | **PENDING** |
| H4 | **Security** | Tenant isolation negative tests for posting paths, `pos.sale.post` entitlement separate from `pos.draft.manage`, backup/restore attestation | **PENDING** |

Until H1–H4 are recorded as ACCEPTED with dated sign-off artifacts, `adr031Status` remains **PROPOSED** and `postingActivation` remains **BLOCKED**.

---

## 7. Exact test evidence still required before enablement

| # | Evidence | What “done” means | Status |
|---|---|---|---|
| E1 | **Disposable SQL race / idempotency** | Real domain-owned posting SQL (not only F-1a synthetic tables): concurrent replay → one effect; partial failure rolls back or stays pending truthfully | **PENDING** |
| E2 | **Tenant isolation** | Cross-Tenant/Business/Branch negative HTTP+SQL on posting, reversal, repair workers | **PENDING** |
| E3 | **Owner browser paid path** | Authenticated Owner on private workspace: authorized paid path after approvals; foreign denial; no false POSTED | **PENDING** |
| E4 | **Backup / restore** | Independently witnessed backup + restore of target DB before any posting migration/flag on that target | **PENDING** |

Present CI that does **not** clear E1–E4: K0 synthetic evidence matrix, F-1a Option A mechanics probe, nonposting module disposable CI, disposable Chromium Salon browser.

---

## 8. Explicit non-goals of this package

- Do not change ADR-031 status to APPROVED.
- Do not enable `pos.sale.post` or any paid settlement flag.
- Do not add production GL-writing SQL / migrations.
- Do not claim Cut Salon / Pilot / commercial GO.

**Next after human A/B + Finance maps:** gated F-1 typed command → F-2 domain posting implementation → F-3 Treasury/stock/HR independence → F-4 K5F/security/backup/staging sign-off (see founder packet).
