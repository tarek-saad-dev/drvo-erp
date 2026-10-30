# DRVO ERP — Module Activation / Dependency / Entitlement Adversarial Test Matrix

**Date:** 2026-10-30  
**Status:** **FUTURE TEST DESIGN ONLY. ZERO TESTS EXECUTED.** This is not a load benchmark, valid implementation or financial entitlement guarantee.
**Basis:** founder-approved ADR-006/007/015/016/017/019/020/021/029; [Module Activation Engine Contract (PROPOSED)](MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md); [ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md); [Tenant Isolation](TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md); [Financial Contract](FINANCIAL-CONSISTENCY-CONTRACT.md).

## 1. Hypothetical fixtures (not live deployment)
- Tenant T1 → B1 micro Salon (one Branch), B2 five-Branch Salon chain; Tenant T2 → B3 manufacturer; Clinic future-only sensitive domain.
- Deployed Module releases `Catalog@1`, `POS@1`, `Accounting@1`, `Inventory@1`, `Booking@1`, optional `WhatsApp@1` (illustrative names and versions, NOT final released catalog). A future `MRP@1` is a hypothetical independent owned Domain Module, not an available plugin.
- Graph for synthetic tests: `A→B→C`; missing `D`; cyclic `E→F→E`; conflicting `X ⟂ Y`; incompatible Extension `X@v2`; `B` already ACTIVE; selected paid Optional and an unpriced protected platform capability.
- Owner/Manager (different Branch scopes)/unauthorized staff; manual payment evidence pending; quote versions Q1/Q2; entitlement revision E1/E2; activation graph G1/G2.
- Inject duplicate browser tabs, stale plan/quote, concurrent enable-disable, worker crash, SQL timeout, billing pending and event replay.

## 2. Required/Optional and Industry Starter tests

| ID | Adversarial or normal case | Expected invariant |
|---|---|---|
| ACT-001 | B1 selects target A with Required A→B→C | Full transitive closure displayed and one explicit approval; clear each price |
| ACT-002 | B is already ACTIVE in B1 | Never reseeded or charged again; only new required items priced |
| ACT-003 | User removes merely Recommended Booking | Allowed if not required; recompute total |
| ACT-004 | User tries removing Required C while A remains chosen | Explain dependency; block invalid choice or offer removing A |
| ACT-005 | Optional WhatsApp unavailable | POS/Booking still work; no forced purchase |
| ACT-006 | Required Module version unavailable/deployed mismatch | No activation or hidden code download |
| ACT-007 | Dependency cycle E→F→E | Graph invalid; no entitlement/activation/charge |
| ACT-008 | X conflicts with Y | Explicit conflict; no silent winner |
| ACT-009 | Two Extensions hook same function with incompatible policy | Block or require reviewed deterministic choice; never install-order override |
| ACT-010 | Business chooses unsupported Clinic capability in Salon release | Clear unsupported/not released status; no pretend active Clinical domain |
| ACT-011 | New B1 selected starter omits optional apps | Minimum valid workflow + mandatory finance/security remains |
| ACT-012 | Custom industry solution assignment changes | Does not fork Core code or remove historically posted data |
| ACT-013 | Future Manufacturer MRP chosen | Independently owned domain and contracts required; no Salon fork or phantom launch |
| ACT-014 | B1's Solution/Extensions change | B2's active config and invoices unchanged |

## 3. Exact quote, approval, payment and concurrency tests

| ID | Adversarial or normal case | Expected invariant |
|---|---|---|
| ACT-015 | Full quote Q1 approved then pricing changed Q2 | Reject stale approval; re-preview full prices and seek fresh consent |
| ACT-016 | Graph G1 approved then Required dependency added G2 | No silent added module/price; re-plan and reconfirm |
| ACT-017 | Actor role revoked after quote before commit | Server denies; frontend button cannot grant rights |
| ACT-018 | Branch-only Manager attempts Business-wide paid activation | Reject unless explicit broader permission approved; no privilege escalation |
| ACT-019 | Tenant T1 user forges T2/B3 Business ID | Deny; no foreign billing or module config access |
| ACT-020 | Same approved bundle submitted 20 times in parallel | One logical operation, no duplicate entitlement/seed/charge |
| ACT-021 | Same idempotency key with changed bundle/price | Reject payload-hash conflict; never mutate accepted quote |
| ACT-022 | Two tabs enable same Module concurrently | One valid transition; both receive same operation outcome |
| ACT-023 | One actor enables a target while another disables its Required prerequisite | Deterministic scoped serializable graph validation; no invalid ACTIVE dependent |
| ACT-024 | Another Business activates independently during B1 operation | No cross-Business config changes or global lock requirement |
| ACT-025 | Manual transfer screenshot provided for paid add-on | Not a verified settlement; do not imply paid/ACTIVE without approved entitlement process |
| ACT-026 | Payment/entitlement approved then activation initialization fails | Truthful pending/failure; no false ACTIVE; compensation/credit per approved finance rules |
| ACT-027 | Remote provider retries webhook after it was already processed | One entitlement business effect, no duplicate billing outcome |
| ACT-028 | Quote expires mid-flow | Reject and re-quote rather than reuse old approval |
| ACT-029 | Quote currency/taxes/discount snapshot changes | Reject changed financial terms; require new explicit approval |
| ACT-030 | Already active prerequisite listed as billable again | Reject duplicate charge; show existing entitlements |

## 4. Activation partial failure and lifecycle tests

| ID | Failure | Expected invariant |
|---|---|---|
| ACT-031 | Crash before transactional activation plan commit | No false ACTIVE; can safely retry one operation |
| ACT-032 | Crash after state commit before HTTP acknowledgement | Retry returns same committed operation/result |
| ACT-033 | Required initializer succeeds for B, target A fails | A NOT ACTIVE; B state unchanged if originally active; newly staged state pending/retry/compensation |
| ACT-034 | Two simultaneous disabling commands | Idempotent final state and audit, no double cleanup |
| ACT-035 | Disable B while A (requiring B) remains active | Block by conservative draft; future approved cascade must show impact first |
| ACT-036 | Disable HR UI while existing posted employee-pay obligations outstanding | Historical payroll/ledger remains, required reconciler continues; no deletion |
| ACT-037 | Suspend optional WhatsApp | POS/Booking/Accounting healthy, previous notifications reviewed safely |
| ACT-038 | Downgrade entitlement while current Business has historical transactions | Stop unauthorized future commands per policy, preserve legal records/read-only access |
| ACT-039 | Re-enable module after suspension | No duplicate configuration seeds, invoice records, stock or journal entries |
| ACT-040 | Business A has module ACTIVE, user lacks view privilege | No launcher tile or direct API authorization; other user unaffected |
| ACT-041 | Worker processes stale activation job after entitlement revoked | Recheck scope and operation, fail closed or authorized committed obligation handling |
| ACT-042 | Unsupported event version from old Business config | Compatible path/upcast or quarantined review; no silent wrong effect |
| ACT-043 | Platform Module release with DB migration fails | No partial Business activations or unsafely enabled broken code; rollback/runbook evidence |
| ACT-044 | Extension upgrade changes hook priority unexpectedly | Detect conflict; preserve deterministic old Business behavior or explicit migration |
| ACT-045 | Disable Module while its financial outbox is pending | Keep reconciler for previously accepted obligations; no dropped ledger effect |
| ACT-046 | Reconciliation detects `ACTIVE` but entitlement invalid | Deny new unauthorized actions, alert, audit, controlled repair |
| ACT-047 | Activation audit/quote hash missing for billed app | Audit/reconciliation issue, not pretend authorized payment |
| ACT-048 | Business switches Tenant data placement during staged activation | Preserve scoped state/effects, reconcile before cutover, no duplicated activation |
| ACT-049 | Cache has old entitled App list after suspension | Server denies command even if tile stale; scoped invalidation clears client |
| ACT-050 | 100 simultaneous Businesses request activation | Per-Business concurrency, bounded lock/safe rate limits and measured throughput; **no fabricated PASS** |

## 5. Scenario matrix: micro → SME → Enterprise and diverse Industries

| Workload scenario | Evidence expected after future authorization |
|---|---|
| One-chair Salon | Compact starter preview and valid minimal finance/security dependency set; no needless paid optional |
| Multi-branch Salon chain | Business-wide approval limited to authorized role; Branch-specific employee visibility; no data/price mutation across Businesses |
| Large manufacturer | Released MRP-compatible domain + versioned industry solution and substantial dependent modules without a special fork; capacity separately benchmarked |
| Medical Clinic | Clinical privacy/consent requires independent protected domain and validated contracts; Booking alone does not unlock medical records |
| Thousands of Tenants | One Business's state change and lock do not serialize entire SaaS; current DB throughput/SLO remains **unproven** |

## 6. Evidence record to fill only after tests are authorized
```text
Test ID:
Module manifest/Industry Solution revision:
Tenant/Business/Branch, role and entitlement fixture:
Approved quote/plan hash + billing evidence:
Input / concurrent operations / injected fault:
Expected graph and state transitions:
Observed BusinessModule states and audit:
Observed financial billing record count/credits:
Status: PASS / FAIL / BLOCKED:
Latency / DB locks / workload metrics:
Reviewer/date/issue link:
```

**Zero executed tests.** Acceptance of this written matrix does not certify security, double-charge prevention, live enterprise scale, payment settlement or that actual versions of these Modules exist.
