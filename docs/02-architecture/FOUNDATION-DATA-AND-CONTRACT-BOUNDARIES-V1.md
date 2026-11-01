# DRVO ERP — Foundation Data Ownership & Trusted Contract Seams V1

**Date:** 2026-11-01  
**Status:** **P0 ENGINEERING DESIGN BLUEPRINT — NOT SQL DDL OR AN APPROVED ADR-030/031/032 IMPLEMENTATION.**  
**Purpose:** State boundaries early so a new Industry Module cannot compromise isolation or accounting. [Constitution](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md) / [ADR-037](../05-decisions/ADR-037-LEAN-PLATFORM-KERNEL-BOUNDARY.md) / [Isolation Proposal](TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md).

## 1. Minimal ownership ledger (conceptual, not tables)

| Data or rule | Canonical owner | Scope / constraint |
|---|---|---|
| Tenant, Business, Branch ancestry | Kernel tenancy | Tenant boundary, Business belongs exactly one Tenant, Branch to exactly one Business |
| Platform account, login, scoped role assignment | Kernel Identity/Authorization | Platform-global username; account attached to one Tenant; explicit Business Membership even Owner; One Role per Branch; Default Deny |
| Reviewed Module release/version/extension compatibility | Kernel release governance | Platform-global registry metadata only; no customer record |
| Business active Module/configuration and effective entitlement | Kernel capability governance | Per-Business, but commercial issuer/grant facts have distinct ownership |
| DRVO customer subscriptions, pricing, receipting | Adjacent SaaS billing owner (proposed placement) | Not the Business Accounting/GL |
| Business customer/contact | Customers/CRM business owner (candidate) | Business-scoped; clinic medical details MUST be separate protected domain |
| Products, services, price definitions | Catalog business owner (candidate) | Business catalog with authorized Branch overrides where accepted |
| Sale/order/invoice source | POS/Sales business owner | Business/Branch and unique source operation; cannot silently post without mandatory GL contract |
| Posted GL journals, books, AR | Accounting business owner | Business independent books; balanced, immutable posted entries |
| Physical cash custody, Treasury operations | Treasury business owner | Branch-scoped treasury, manager transfer authorization |
| Stock movement/valuation | Inventory/Purchasing owners | Branch stock; COST_PENDING vs invented zero |
| Employee profile/payroll/commission | HR business owner | Distinct from Kernel account identity; Business/Branch scoped |
| Booking / appointment resources | Booking business owner | Appointment/resource scope; clinical encounter data not in generic Booking |
| Clinical consent/medical record | Conditional independent Clinical Domain owner | Strict sensitive access and jurisdiction validation |
| Industry starter composition | Adjacent Solution catalog (proposed placement) | Released versioned references; Business selections independent |
| Infrastructure/backup/capacity | Operations | Responsible for tested recovery, logs, placements and monitoring |

**Any ambiguous owner is blocked for that module's implementation** until a named owner and contract is approved. The initial actual V1 app catalog and dependency graph remain to be ratified; do not interpret example owners as final commercial modules.

## 2. Trusted scope and relationship contract

- All protected API/query/event/worker/report/file paths run with server-authorized **Tenant** and, when applicable, **Business** / **Branch** context plus actor/service principal and permitted actions; a user-supplied ID never widens scope.
- Domain tables/relationships must preserve Tenant→Business→Branch ancestry with database constraints (composite scoped FKs or proven equivalent) and query predicates. **Do not use TenantId on every global catalog table indiscriminately.**
- Module-level repository methods accept trusted context and assert record relationship before mutation; UUID uniqueness is not isolation.
- Cross-Branch aggregation or stock movement are explicit authorized domain workflows, not accidental joins; historical financial data remains Business-owned.
- An explicitly Business-scoped operation is not equivalent to universal Branch access. Owner and Manager grants must be verified by scope.
- DB RLS is an optional defense-in-depth after compatibility tests of pooled SQL sessions and worker/privileged access. No platform operator gets universal sensitive data by default.

## 3. Shared communication seam

**Proposed synchronous owned command:** Caller requests owner Module operation through typed versioned interface; caller supplies operationId, request correlation and narrowed authorized resource selection; Kernel boundary validates user/service scope; owner Module validates domain preconditions; owner records its own authoritative effect. NO generic cross-module repository import. Transaction participation in mandatory posting must be explicitly defined in ADR-031.

**Proposed asynchronous envelope properties** (NOT finalized schema): event ID, producer Module/contract version, Tenant/Business/Branch scope classification, source aggregate ID/revision, occurredAt/committedAt as relevant, immutable operation correlation/causation, minimized/consent-aware data and checksum/provenance where warranted. Consumers independently validate scope, permission and version, use unique effect IDs and keep retry/reconciliation evidence; no claim of network exactly-once delivery.

**Failure invariant:** If a source transaction commits with outbox event, a crash/replay cannot delete, duplicate or move its money effects across Business scope. A stale worker cannot bootstrap authorization from unsanitized payload alone.

## 4. Initial architectural transaction units — decision boundaries, not assumed SQL code

| Operation | Source owner | Criticality | Still requiring decision |
|---|---|---|---|
| Business creation + explicit Owner membership | Kernel | Prevent orphaned/unauthorized first Business | Bootstrap transactional protocol, role matrix |
| Branch create / transfer user membership | Kernel | Tenant ancestry and authorization | Delegation/role inheritance and audit |
| Activate free test Module | Kernel registry / entitlement gate | Exact Business state and idempotency | ADR-032 final lifecycle/locking and security approval |
| Install paid bundle | Kernel coordinator + DRVO billing owner | Quote/consent/entitlement != settled payment | ADR-032 commercial approver and provider failure semantics |
| POS post sale + first GL | POS source + Accounting journal owner | Mandatory balanced first posting | ADR-031 A conditional; Finance mapping/latency tests |
| Optional WhatsApp | Integration adapter | Must not roll back mandatory posted sale | Delivery/consent/retention, optional module |
| Replay offline sales | POS and affected domain owners | One irreversible effect per operation, truthful tender/period | ADR-009–013 behavior and physical offline/sync security |

## 5. Repo boundary conventions to lock before source code

Proposed conceptual dependency rule:
- `apps/web` depends on **public** shared UI and typed API contracts; never directly calls SQL.
- `apps/api` hosts bounded modules, authorization middleware and authoritative Business commands.
- `apps/worker` runs separately with trusted scoped service identity and explicit queue/outbox contracts.
- `packages/kernel` exposes **stable** identity/scope/module governance contracts; imports NO Business Module internals.
- `modules/<module-key>` owns its domain, repositories, migrations and public contract; cross-module access via exported interfaces.
- `packages/contracts` contains shared envelope/DTO/versioning rules; do not put one Module's entire domain model into Kernel packages.
- `packages/ui` provides shared controls/shell, not server authorization.
- `infrastructure/db` contains migration runner and forward-only migration records; SQL ownership is recorded per Module, no runtime per-Business schema installation.

These are **candidate folder names** for source-code scaffolding; not a mandatory accepted physical monorepo structure or implementation from this document.

## 6. P0 acceptance tests before claiming this seam safe

- Tenant A cannot read/write Tenant B via arbitrary record ID, URL, SQL join, jobs/events, cache, export or asset URL; Business A cannot inspect B inside same Tenant without explicit rights.
- Branch 1 role cannot alter Branch 2 data; Manager profit/cost scope enforced.
- Owner bootstrap creates exactly one authorized membership; malicious Manager cannot self-escalate.
- Conflicting Module activation/disable requests are idempotent, safe and Business-local.
- Sale operation replayed 20 times produces one source sale and one mandatory initial journal; no provider screenshot becomes a verified bank receipt.
- Worker crash/replay preserves authorized scope and domain source-of-truth, emits accurate pending/repair states.
- Restore verifies both Kernel memberships/entitlements and domain business histories.
- Clinic sensitive data never leaks through generic customer or reporting event subscribers.

**No live SQL schema, security/load tests or Production changes exist from this plan.**
