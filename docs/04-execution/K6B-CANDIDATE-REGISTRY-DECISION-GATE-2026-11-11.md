# K6B — Candidate Module Registry spike and approval gate

**Recorded:** 2026-11-11.
**Status:** proposed engineering prototype, NOT an accepted registry/runtime specification; PR stacked on K6A PR #50. This does not approve ADR-030 or ADR-032.

## Delivery intent
The founder requested faster implementation. Rather than waiting for nonproduction Resend configuration, work in small reviewed/tested PRs while keeping K5 public auth/verification/invitations OFF. This slice builds upon K6A's deterministic fixture preview to snapshot candidate Module manifests safely.

## What exists in this PR
- Pure developer-only `createCandidateModuleRegistry` in Kernel. It validates fixture module IDs, temporary stable `major.minor.patch` version representation, Required/Optional/conflicts lists, duplicate keys, self-reference/overlapping dependency categories, missing Required releases, dependency cycles, and conflicts within an individual Required closure.
- Deep-clones and freezes candidate metadata (no caller mutation after construction can change the snapshot).
- Candidates can be mutually incompatible in the same catalogue, but a combined requested selection is blocked by the K6A planner.
- Returns read-only dependency previews with selected/required/existing reasons and newly needed candidates. No paid quotes, entitlements, actual activation, account state, SQL, HTTP, queue, file access, external scripts or production releases.
- Integration point is deliberately private TypeScript exports, not a public API. `Booking` / `Catalog` names in tests are *illustrative* only and do not ratify concrete Salon module edges, prices or eligibility.

## Mandatory architectural decisions before customer-facing K6B
| Gate | Recommendation for explicit founder/security/billing review | Not decided yet |
| --- | --- | --- |
| ADR-030 Tenant/Business/Branch isolation | Trusted server-issued context; Default Deny; scoped SQL parent/child FKs and scoped predicates; mandatory negative HTTP/SQL/worker tests | Physical composite FK design, which data zones also use RLS, exact support privileges and revocation |
| ADR-032 Activation | Immutable Business-scoped preview/approval; transitive Required closure and one full-cost consent; recheck under per-Business version/CAS; activation follows verified entitlements; audit/idempotency | Exact payment proof, approver roles, lock scheme, failure recovery, module availability/version rules |
| ADR-031 Financial truth (before POS) | Preserve separate payment/receipt/GL/settlement states and idempotent corrections | Financial posting strategy A vs B and chart of accounts |
| K5 operations | Keep auth/invitation paths OFF, verify secure config, Nginx proxy/trusted IP, offsite restore, synthetic 2-Tenant E2E before public access | Any customer activation, real pilot and K5 closure |

These are **recommendations, not founder approvals**. Record explicit accepted decisions in their ADRs before API, SQL or actual Business activation work; do not silently infer one answer.

## Architecture impact
- Lean Kernel gets a deterministic catalog-snapshot helper reusing K6A fixture planner; it does not own Business workflows and does not import domain Modules.
- No new cross-module runtime contract or datastore. No Tenant/Business/Branch data touched.
- All existing K5 SQL/migrations, API/Web, auth flags and services remain unchanged.
- Roll back by reverting the PR; no DB migration/production rollback is necessary.

## Verification checklist
- [ ] GitHub PR CI green for the exact final head.
- [ ] Tests reject missing Required/cycles/duplicates/malformed releases/overlaps/conflicts and preserve immutability.
- [ ] K6A PR #50 reviewed/merged before retargeting this stacked PR to main.
- [ ] No customer-facing claims, API/SQL/UI changes or activation.
- [ ] ADR-030 and ADR-032 remain explicitly PROPOSED until separately accepted.
