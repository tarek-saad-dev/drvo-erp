# Current state

> **2026-11-12 K5F-3 REVIEW BRANCH (DISPOSABLE RESTORE PROOF ONLY):** Extended existing SQL Server CI to take an independent post-014 COPY_ONLY backup, RESTORE VERIFYONLY and restore into a second throwaway DB, compare exact 14 migration checksums and POS Draft scoped objects. This is GitHub CI, **not off-host/VPS disaster recovery, K5F operator acceptance or SQL 010–014 authorization**. [K5F-3 report](../04-execution/K5F3-POST-MIGRATION-ISOLATED-RESTORE-2026-11-12.md). All K5/Auth/Module flags OFF; ADR-031/032 PROPOSED.


> **2026-11-12 VERIFIED K5F-2 + ADR-031 ENGINEERING CHECKPOINT:** [K5F-2 #66](https://github.com/tarek-saad-dev/drvo-erp/pull/66) and [Finance decision evidence #67](https://github.com/tarek-saad-dev/drvo-erp/pull/67) **MERGED to main**. #66 source tests K0/K1 and K5D SQL CI PASS; #67 synthetic 32-case first-GL truth tests K0/K1 PASS. [Staging code deployment #43208411618](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43208411618) confirms successful SSH receiver for #66 merge SHA `a1477e07a3e6c1b191ba6417a92e6ca7b6d32f9a`; this **does not** deploy SQL or install/execute updated root-owned K5F checker bundle. SQL 010–014 VPS **NOT AUTHORIZED**, module/K5 flags **OFF**, K5F operational sign-off **OPEN**, ADR-031/032 **PROPOSED** and no financial POSTED sale. Historical branch/PR status notes below refer to earlier checkpoints.


> **2026-11-12 ADR-031 FIRST-GL DECISION READINESS (REVIEW PR):** Founder/Finance A/B decision packet and pure test-only 32-case first-journal/outbox evidence matrix added; conditional V1 A recommendation remains **NOT ACCEPTED**, with no GL, Sale POSTED, or tender settlement implemented. [Decision packet](../04-execution/ADR-031-FOUNDER-FINANCE-DECISION-PACKET-2026-11-12.md). ADR-032 and K5F OPEN, SQL 010–014 VPS blocked and all business flags OFF.



> **2026-11-12 K5F-2 STAGING ACTIVATION PREFLIGHT REVIEW PR:** Root-owned read-only K5F checker now blocks all 10 current K5/business API and 7 Web flags (Catalog/Customers/Booking/POS included), keeps exact 001–009 SQL requirement. Test-only read-only source manifest planner checks 001–014 and refuses authorization, never reads VPS or runs migrations. [K5F-2 packet](../04-execution/K5F2-STAGING-ACTIVATION-READINESS-2026-11-12.md). **K5F OPEN, SQL 010–014 VPS blocked, ADR-031/032 PROPOSED; no changes to credentials, feature flags, or runtime.**


> **2026-11-12 VERIFIED MAINLINE CHECKPOINT — PL-1b + CU-2:** PRs [#59](https://github.com/tarek-saad-dev/drvo-erp/pull/59), [#60](https://github.com/tarek-saad-dev/drvo-erp/pull/60), [#61](https://github.com/tarek-saad-dev/drvo-erp/pull/61), [#62](https://github.com/tarek-saad-dev/drvo-erp/pull/62), [#64](https://github.com/tarek-saad-dev/drvo-erp/pull/64) and [#63](https://github.com/tarek-saad-dev/drvo-erp/pull/63) are **merged to main** after successful recorded PR CI. SQL **014 is SOURCE/CI ONLY**; the PL-1b disposable SQL+HTTP CI passed 20 cases; CU-2 mapping tests passed K0/K1. [Staging code deployment](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/43204659041) for PR #64 merge SHA `f3eedaf19d1168d2f2c2222501257fe89e01aae8` succeeded through the authorized SSH receiver; **this is not SQL deployment, VPS E2E proof, customer onboarding or financial activation**. SQL 010–014 remain unapproved for VPS; public K5/domain feature activation unapproved; K5F operational security OPEN, ADR-031/032 PROPOSED. Historical PR-only notes below reflect earlier checkpoints.


> **2026-11-12 CU-2 SYNTHETIC CASHIER MAPPING (PR, NO IMPORT):** Added test-only dry-run identifier plan for source `TblClient`/ `TblPro` → scoped Customers/Catalog targets, explicitly mapped two Branches, deterministic digest, duplicate and cross-Tenant/Business negative tests. Does NOT connect to Cashier, handle PII, write SQL or grant permissions. [CU-2 gate](../04-execution/CASHIER-CU2-SYNTHETIC-MAPPING-2026-11-12.md). ADR-031/032 and K5F remain OPEN; SQL 010–014 not authorized on VPS.



> **2026-11-12 PL-1b DURABLE POS DRAFT SOURCE/CI ONLY:** Feature PR introduces SQL 014 POS-owned Branch DRAFT/line snapshots, idempotent create/list, separate live `pos.draft.read/manage` checks, private RTL save/list and disposable SQL+HTTP isolation CI. **No POSTED sale, payment/GL/Inventory or customer activation. SQL 010–014 NOT authorized on VPS; K5F open, ADR-031/032 proposed, all flags OFF.** [Draft contract](../03-modules/POS-DURABLE-DRAFTS-V0.md) · [review packet](../04-execution/POS-DURABLE-DRAFTS-EXECUTION-2026-11-12.md). No CI/merge/deployment assumption until independently verified.


> **2026-11-12 CU-1 CASHIER PINNED PURE SOURCE PARITY (REVIEW ONLY):** Immutable Cashier BusinessDay and Payroll pure source snapshots from exact legacy commit are placed **under test fixtures only**, checked by Git blob hash, compiled and executed without network/DB to compare supported Branch day decisions and record payroll golden values. [CU-1 report](../04-execution/CASHIER-PINNED-SOURCE-PARITY-2026-11-12.md). No runtime port, production Cashier operation or real payroll/SQL/financial changes. Legacy misuse risks remain; K5F, ADR-031/032, VPS SQL and public flags unchanged.



> **2026-11-12 PL-1 POS PREVIEW BRANCH — SOURCE/CI ONLY:** First guarded Shared POS cart/Checkout Preview uses live scoped `catalog.read` and re-reads list prices server-side, no write, no POSTED sale, no tax/GL/payment. [PL-1 report](../04-execution/POS-NONPOSTING-PREVIEW-2026-11-12.md). New POS API/Web preview flags remain OFF; SQL 010–013 unapproved for VPS. ADR-031/032 remain PROPOSED and K5F operational security OPEN. Code PR/CI/deploy must be verified independently. Older statuses below are historical.



> **2026-11-12 CASHIER REUSE AUDIT BRANCH (NO PRODUCTION PORT):** [Pinned source audit](../04-execution/CASHIER-REUSE-AUDIT-2026-11-12.md) maps Cashier rules to future DRVO Shared Core/Salon Extensions, documents accept/adapt/reject criteria and adds test-only Business Day characterization fixtures. No Cashier production data/code integration, no DRVO runtime module, no live parity/performance claim. ADR-031/032 and K5F are OPEN; SQL 010–013 CI-only and public flags OFF. Branch/PR CI and merge must be verified independently.



> **2026-11-12 POS→LEDGER PREPARATION BRANCH (NO POSTING):** Founder requested parallel readiness for first shared POS→Ledger slice and Cashier reuse audit. [POS→Ledger gate](../04-execution/POS-LEDGER-EXECUTION-GATE-2026-11-12.md) defines module ownership, ADR-031 A/B evidence and a test-only synthetic classifier; no real POS, GL, SQL or API is activated. ADR-031 remains PROPOSED; K5F OPEN, ADR-032 PROPOSED, SQL 010–013 CI-only, all public flags OFF. Branch/PR tests and merge must be verified independently.


> **2026-11-12 BOOKING INITIAL SHARED CORE VERTICAL SLICE — REVIEW ONLY:** Catalog PR #55 and Customers PR #57 have been independently verified merged into `main`. A separate Booking feature branch proposes SQL migration 013, Branch-owned Resource/Appointment with FK-bound Customer+Catalog SERVICE, SQL-serialized conflict prevention, idempotent scoped read/create API, private RTL page, and disposable SQL/HTTP concurrency/negative isolation CI. **Booking has not been deployed, enabled, or accepted as commercial V1**. SQL 010–013 are source/CI-only; no permission to execute them on VPS while K5F checker expects 001–009 and operational K5 gates remain open. All public auth and Booking flags OFF; ADR-032 activation decision remains PROPOSED. See [Booking Core](../03-modules/BOOKING-CORE-V1.md) and [Booking slice report](../04-execution/BOOKING-SLICE-2026-11-12.md). Older PR status notes below are dated history.

> **2026-11-12 CUSTOMERS STACKED PR (NOT MERGED/DEPLOYED):** Separate second Shared Business Module vertical slice (Customer contact name/optional E.164 phone, idempotent create/list, scoped SQL 012 and private Next UI) is in review **on top of Catalog PR #55**. All K5/Customers flags OFF; no live PII, no VPS migrations 010–012, no CRM marketing/clinical records. See [Customers Core](../03-modules/CUSTOMERS-CORE-V1.md) and [Customers delivery](../04-execution/CUSTOMERS-SLICE-2026-11-12.md). New CI results are independently verified; Booking remains a separate next PR.

> **2026-11-12 PRODUCT ACCELERATION: Shared Catalog PR (NOT activated/deployed).** Founder authorized sequential Shared Catalog → Customers → Booking product vertical slices on separate reviewed PRs, with ADR-032 decision prep in parallel. New Shared Catalog adds Business-owned category/service/product list-pricing SQL 011, scoped read/create API and a private RTL UI with disposable SQL+HTTP proof. All Catalog and K5 Web/API flags remain OFF, **SQL 010/011 are NOT authorized/applied on VPS**. This is not an approved global Module activation, paid entitlement, final Salon extensions or operational launch. See [Shared Catalog Slice](../04-execution/SHARED-CATALOG-IMPLEMENTATION-2026-11-12.md) and [Catalog Core contract](../03-modules/CATALOG-CORE-V1.md). PR CI/merge/deploy status are separately verified.

> **2026-11-11 K6C FEATURE BRANCH — CODE/SQL PROPOSAL ONLY, NO VPS MIGRATION:** Founder explicitly approved the **ADR-030 trusted Tenant/Business/Branch baseline**, Default Deny, scoped SQL predicates with composite FK and negative isolation tests; **SQL RLS remains deferred**. K6C introduces a double-flag-gated, existing-session-based read-only Business Module *candidate* API, `core.BusinessModuleCandidate` migration 010 and scoped EXECUTE-only SQL procedure plus isolated SQL/HTTP security CI. All candidates are non-authoritative; no activation/entitlements/pricing, no seeds, no real users. **010 must NOT be applied on the VPS**: K5F root checker still expects exactly 001–009 and requires a reviewed upgrade first. K5 remains OPEN, all public auth flags OFF. See [K6C technical/security report](../04-execution/K6C-SCOPED-BUSINESS-MODULE-CANDIDATES-2026-11-11.md). PR CI/runtime deployment status must be verified separately before any merge claim.

> **2026-11-11 K6B STACKED PROTOTYPE (NOT DEPLOYED):** After K6A PR #50, an independent stacked review branch proposes a read-only, deeply immutable *candidate* Module registry, validates required release graphs and allows deterministic fixture selection previews. This is NOT a published Module Release Registry, real Tenant/Business activation, billing, approved country/industry eligibility, access grant or production authorization. ADR-030/032 remain PROPOSED and K5 remains OPEN. See [K6B decision gate](../04-execution/K6B-CANDIDATE-REGISTRY-DECISION-GATE-2026-11-11.md). No API/SQL/Web/feature flag/server change in this PR.

> **2026-11-11 EXPERIMENTAL K6A PREVIEW PR (not deployed, no activation):** The founder requested faster platform engineering while K5 security readiness remains OPEN. A separate review branch adds a deterministic, read-only fixture Module dependency preview and negative tests in the Lean Kernel, with no new runtime API, SQL, UI, email or customer access. **This is a prototype only**: it does not accept ADR-030/032, prove Tenant isolation, or authorize K6 operational rollout. See [K6A spike](../04-execution/K6A-READONLY-MODULE-PREVIEW-2026-11-11.md). Continue K5 manual Security/Resend/restore gates separately; keep all public flags OFF.

> **2026-11-10 CORPORATE BRAND APPROVAL (LOGO ONLY, NOT LAUNCH):** Founder explicitly approved the pictured DRVO ERP D-with-three-bars-and-Teal-sweep logo and its primary/on-dark/monochrome variations as the multi-industry **master brand**. [ADR-038](../05-decisions/ADR-038-DRVO-MASTER-LOGO-AND-VARIATIONS.md) and [brand usage guidelines](../01-product/DRVO-MASTER-BRAND-LOGO-GUIDELINES.md) define identity and review SVG renditions. This approval makes **no** claim that brand likeness/legal clearance, commercial launch, social pages or production code deployments exist. K5 readiness remains operationally OPEN.

> **2026-11-10 K5F operator transcript — PARTIAL VPS evidence, checker BLOCKED:** Operator-provided console output shows `/srv/drvo-erp/repo` fast-forwarded to `dba53acace2db2005a44d1a3103394a257bed40d`, matching the managed deployed `release.sha`; DRVO API/Web services both reported active, and `nginx -t` passed with nonfatal warnings. Operator installed an early root-owned K5F bundle from that **old main** before PR #46 merged. Running the old checker aborted before any checks with `MODULE_NOT_FOUND` on checkout-relative `mssql` resolution, and the supplied expected SHA was a literal placeholder. **No security checker PASS, Nginx proxy-trust proof, sender/HMAC/DB permission evidence or E2E is established.** Safe replacement/re-run is gated on reviewed K5F PR merge + new successful `main` deployment, then approved root-bundle refresh and actual SHA; see [K5F runbook](../04-execution/K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md). All K5 flags remain OFF; K5 OPEN.


> **K5F security-validation PR — 2026-11-10 (proposed, CI/live proof pending):** Current verified `main` SHA remains `dba53acace2db2005a44d1a3103394a257bed40d` (K5E PR #44); [Staging Deploy #42713547571](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/42713547571) succeeded for that exact revision and [K5D SQL CI #42713547751](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/42713547751) succeeded. K5F hardens the root-only read-only checker to deny direct SELECT/INSERT/UPDATE/DELETE/ALTER/CONTROL on confidential onboarding tables under the actual SQL app login, and rejects migration-history drift; negative unit tests added. **This is not a verified VPS checker run, new deploy, sender-domain proof, offsite restore, activated auth, or real Owner/Staff E2E. K5 stays OPEN and all K5 flags stay OFF.** [K5F execution/gates](../04-execution/K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md). ADR-030 remains PROPOSED.


> **LATEST VERIFIED — 2026-11-10 K5E STAGING READINESS CHECK PROPOSED (NO PUBLIC ACTIVATION):** The separately authorized manual SQL run [#41973725981](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41973725981) **actually applied migrations 006–009** after a validated COPY_ONLY backup: `DRVO DB MIGRATION PASS: 4 applied; 9 total`. The latest preceding Staging Deploy [#41876109076](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41876109076) succeeded at `3c07f817192b6240dd6123b47c0f36e910a045e8`. A new **root-only, read-only** K5E pre-activation tool is proposed in [K5E readiness runbook](../04-execution/K5E-STAGING-ONBOARDING-READINESS-2026-11-10.md), checking 9 SQL migration records, live service env, HMAC/mail configuration, disabled K5 flags, DB permissions, revision and private route gates without sending mail or writing SQL. **Do not infer that a verified sender, protected HMAC secret, offsite restore, live Owner/Staff E2E or real staging feature activation exists. K5 remains OPERATIONALLY OPEN.** Older "migration pending" notes below are historical, not current database state.


> **LATEST — 2026-11-04 K5D VERIFICATION MAIL DELIVERY ADAPTER MERGED (STILL DISABLED).** [PR #33](https://github.com/tarek-saad-dev/drvo-erp/pull/33) merged as `8bfb71882d1cb064cd956bbf756f9a94535082b8`. Added a strictly optional server-only Resend transactional email adapter, fixed destination endpoint, config/HTTPS/sender validation, UUID idempotency key, 10s timeout and sanitized provider failures; tests mock fetch and send **zero real emails**. K0/K1/K3/K5/K5B/K5C/K5D/DevOps CI all green. Existing K5D `004` schema and HMAC crypto from PRs #31/#32 remain code-merged only; **SQL 004 has not been verified on VPS** (user must run manual staging SQL workflow from `main` after approval). **No Owner account, signup endpoint, email provider configured, verification delivery enabled or invitation acceptance flow exists yet**. The `/verify-email` UI and atomic one-time token consumption are pending. Public login, role admin, Web and mail feature flags remain OFF. Older project status notes below are historical.

> **LATEST — 2026-11-04 K5D OWNER/EMAIL/INVITATION FOUNDATION AND CRYPTO MERGED; REAL ONBOARDING NOT ENABLED.** [PR #31](https://github.com/tarek-saad-dev/drvo-erp/pull/31) merged as `02ec238015d7ed1adde5f4c92e6bfb8b1579ac19`: SQL `004_verified_onboarding_foundation.sql` creates operator-approved first Owner proposal, verified email challenge hashes, Account verified email and branch-scoped invitation tables with composite FKs/checks/unique indexes. It creates NO Owner/accounts and grants **NO runtime API SQL privileges** to these tables. Disposable SQL Server 2022 CI proved 001–004 apply/replay, empty records, duplicate/expiry/tenant boundaries and ordinary SQL user cannot read or write those tables. [PR #32](https://github.com/tarek-saad-dev/drvo-erp/pull/32) merged as `56a2392d6df1d32a747bc2c8d4c934d600f21bdb`: 32-byte CSPRNG bearer tokens, purpose-bound HMAC token digest, HMAC email hashing + validation, constant-time digest comparison, all cryptography unit tests and K0/K1/K3/K5/K5B/K5C/K5D/DevOps CI PASS. **Actual VPS `004` DDL has NOT been verified; requires manual `staging-db-migrate.yml` on `main` with `confirm_database=DRVO_ERP_STAGING` when ready.** Verified-mail provider, operator approval/one-time Owner provisioning transactions, employee invitation issuing/acceptance and anti-abuse controls still pending. Public identity, role admin and Web flags remain OFF by default. Existing `003` SQL migration succeeded earlier, older notes below are historical.

> **LATEST — 2026-11-04 K5D VERIFIED ONBOARDING SQL FOUNDATION MERGED, NOT YET ON VPS.** [PR #30](https://github.com/tarek-saad-dev/drvo-erp/pull/30) merged as `72bc3c5edb0f8f5db953784d87b9f2132535afe1`. `004_verified_onboarding_foundation.sql` adds four EMPTY/fail-closed tables: `core.OwnerBootstrapApproval` (operator-specific approved first Owner email+username intent, names, expiry, consumption), `core.EmailVerificationChallenge` (hash-only OTP/token and expiry/purpose/attempt constraints), `core.VerifiedAccountEmail` (scoped FK, globally unique verified email digest), and `core.AccountInvitation` (hash-only token, scope and inviter/role foreign keys). Ordinary application SQL login has **NO** grants on any new table and cannot read/write them. Dedicated **K5D Verified Onboarding SQL Foundation CI PASS**: 001–004 migration apply/replay, empty tables, unique/expiry and purpose checks, cross-Tenant invite and verified-email checks, runtime principal denied. K0/K1/K4/K5/K5B/Staging DB automation CI all PASS. **GitHub merge is code-only**; no SQL `004` has been observed running on actual DRVO_ERP_STAGING VPS. Operator can later launch the existing manual [staging DB workflow](https://github.com/tarek-saad-dev/drvo-erp/actions/workflows/staging-db-migrate.yml) on `main` with `confirm_database=DRVO_ERP_STAGING` (expected one new migration `004`). **No real Owner or email challenge has been issued**: proof-of-email delivery/verification, trusted operator approval creation, transactional Owner provisioning and recovery are still unimplemented. All K5 auth/role/web flags remain OFF. [Report](../04-execution/PHASE-REPORT-K5D-ONBOARDING-SQL-2026-11-04.md).

> **2026-11-04 — K5B SQL 003 APPLIED AND VERIFIED ON STAGING.** Authorized user-triggered [GitHub SQL workflow run #41737664113](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41737664113) completed **SUCCESS** (job #126270922484). Verified exact SQL receiver log: `PASS: pre-migration COPY_ONLY checksum backup`, `APPLIED: 003_branch_role_change_audit.sql`, and **`DRVO DB MIGRATION PASS: 1 applied; 3 total; commit c982b8321500aa47959304fdc5d73f63c34c4988`**. New `core.BranchRoleChangeAudit` is live on **DRVO_ERP_STAGING only**; full owner signup/invitation/login/UI activation still OFF pending secure onboarding. Local backup path logged by workflow; off-host backup and actual post-003 independent restore remain separate operational requirements. Earlier notes describing 003 as pending are historical.

> **LATEST — 2026-11-04 K5C PRIVATE USER INTERFACE MERGED; ALL CI GREEN; PUBLIC ACCESS STILL OFF.** [PR #29](https://github.com/tarek-saad-dev/drvo-erp/pull/29) merged as `4d7c854c4d13a42e76b21b30ff2da36273ecaf3e`. Adds responsive Arabic RTL, server-side feature-gated `/sign-in`, `/change-password` and `/workspace/:businessId/:branchId/access` for existing accounts only. New `GET /api/auth/workspaces` lists ONLY active Business/Branch scopes with `branch.read` from current DB authorization joins; UI never stores session tokens client-side. SQL+HTTP K5B regression tests now cover forged workspace scope and unauthorized branches. Dedicated Next.js runtime CI confirmed the private pages return **404** when `DRVO_K5_WEB_ENABLED` is unset, while public preview stays HTTP 200; K0/K1/K3/K5A/K5B/DevOps CI all passed. Code/CI merge does NOT enable `DRVO_K5_WEB_ENABLED`, `DRVO_K5_AUTH_ENABLED`, or `DRVO_K5_ROLE_ADMIN_ENABLED`. **K5B SQL 003 still needs manual GitHub workflow execution; no VPS schema application is claimed.** Owner bootstrap/verified email/employee invites, app-level rate limits and full production customer security gates remain OPEN. [K5C report](../04-execution/PHASE-REPORT-K5C-PRIVATE-UI-2026-11-04.md).

> **LATEST — 2026-11-04 K5B SCOPED ROLE ADMINISTRATION MERGED; STAGING SQL 003 NOT YET APPLIED.** [PR #28](https://github.com/tarek-saad-dev/drvo-erp/pull/28) merged into `main` at `156952f252a21372f765a4a02d9c791a9db01369`. Added `003_branch_role_change_audit.sql`, `BranchAccessService` and protected branch `GET access/roles`, `GET access/members`, `POST access/members/:accountId/role` for **already existing active accounts only**. Manager delegation requires a live DB-issued session, explicit `users.assign_role` on exact Tenant/Business/Branch, request-role permissions subset of actor's currently-held permissions, and non-Owner roles only; no self-promotion, Owner reassignment or cross-scope access. Each mutation creates a FK-backed audit, increments the target session version and revokes sessions within the same SQL transaction. K5B disposable SQL Server 2022 + live NestJS HTTP **15/15 security checks PASSED**, and K0/K1/K3/K4/K5A/DevOps/Staging SQL automation CI all green on merged PR head. **Feature flags** `DRVO_K5_AUTH_ENABLED` and `DRVO_K5_ROLE_ADMIN_ENABLED` remain OFF on staging by default; code deployment does not create users/Owners or run schema DDL. Owner needs to run existing [manual main-branch SQL migration workflow](https://github.com/tarek-saad-dev/drvo-erp/actions/workflows/staging-db-migrate.yml) with exact input `DRVO_ERP_STAGING` for SQL 003. [Full test evidence and remaining gates](../04-execution/PHASE-REPORT-K5B-SCOPED-ROLES-2026-11-04.md). First Owner bootstrap/verified email, invitation flow, Manager policy sign-off, web UI, IP abuse guards and offsite backups remain open; **full K5 is not complete**.

> **LATEST — 2026-11-04 GITHUB → VPS STAGING SQL WORKFLOW END-TO-END PASS.** Owner executed the GitHub Actions [manual staging DB migration run #41732495823](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41732495823), job `db-migrate` #126253165040. GitHub connector independently verified job **SUCCESS** and all steps successful: checked-out `main` SHA `18c18925c38d06ca79c0921461777fb04929cfc9`, repository/migration payload validation, configured SSH secrets, forced-command SSH migration and completion. Exact server-side log: **`DRVO DB MIGRATION NOOP: all 2 checksums match`**. Therefore existing `001` and `002` migration checksums match the reviewed GitHub payload; no new SQL DDL applied by this verification run. **Database automation is now functioning** with human-triggered `workflow_dispatch` for future schema changes. Owner still needs to securely remove the temporary private SSH key from `/root/drvo-erp-db-bootstrap/id_ed25519` after verifying GitHub key secret is retained. K5 public auth is still OFF pending full onboarding/RBAC/security gates; automatic off-host backups and independent restore rotations are separate TODOs. Historical checkpoints below reflect previous states.

> **LATEST — 2026-11-04 ONE-TIME STAGING DB AUTOMATION VPS INSTALLATION CONFIRMED PASS (OWNER-PROVIDED ROOT CONSOLE OUTPUT).** Following recovery PRs [#23](https://github.com/tarek-saad-dev/drvo-erp/pull/23)–[#27](https://github.com/tarek-saad-dev/drvo-erp/pull/27), owner executed `prepare-once.sh --resume-after-secret-traversal-failure` from `main` on DRVO ERP VPS. Console confirmed `PASS: existing K5 SQL migration and root-owned secret verified; no SQL bootstrap replay`, existing secret moved into dedicated directory, `PASS: pinned mssql module loads as restricted DRVO DB deploy user`, `PASS: dedicated non-root SSH user can read SQL secret and access migrated DRVO staging`, and final **`DRVO STAGING DB AUTOMATION INSTALLED`**. SQL migrator is `drvo_erp_stage_migrator` with staging-only scope, SSH account `drvoerp-dbdeploy` forced command; staging ED25519 fingerprint matched previously verified value. **No GitHub `staging-db` environment secrets or first manual SQL workflow invocation have been independently verified yet**. Owner next: configure four environment secrets without disclosing private key, run [manual staging SQL workflow](https://github.com/tarek-saad-dev/drvo-erp/actions/workflows/staging-db-migrate.yml) on `main` with `confirm_database=DRVO_ERP_STAGING`, verify SQL migration NOOP, then dispose of temporary VPS private-key copy. **K5 login HTTP is still OFF** pending K5B/K5C onboarding and security gates. Older status checkpoints below are historical.

> **LATEST — 2026-11-03 DRVO ERP GITHUB-TRIGGERED STAGING DB MIGRATION TOOLING MERGED; ONE-TIME VPS INSTALL STILL PENDING.** [PR #22](https://github.com/tarek-saad-dev/drvo-erp/pull/22) merged as `e1ece7c174402cc7e3ad9ca4ac82d3bb27b6a399`. Separate root-owned SSH forced-command DB runner under dedicated `drvoerp-dbdeploy`, database-scoped SQL `drvo_erp_stage_migrator` (db_ddladmin, db_backupoperator, core schema CONTROL, **no sysadmin/dbcreator/db_owner**), SQL-only checked payload, SHA/history guards, transaction lock and COPY_ONLY checksum backup. GH `staging-db-migrate.yml` is **manual workflow_dispatch** with exact `DRVO_ERP_STAGING` confirmation and separate `staging-db` secrets, not background/unreviewed SQL DDL. Dedicated SQL 2022 CI passed restricted migrator + independent restore proof and full K5A root bootstrap + two independent restores; K0/K1/DevOps artifact CI green. **Host installation and secrets are not done by merge**; owner must follow [one-time install runbook](../../ops/staging/db-automation/README.md), copy SSH private key straight into GitHub Environment and test manual Run workflow. Installer will execute K5A 002 on actual VPS if missing, under the existing hidden SQL Admin, with independent restores; K5 public auth remains OFF. Staging DB schema status not yet verified post-installer. No other VPS app or DB was changed by GitHub CI.

> **LATEST — 2026-11-03 K5A IDENTITY & RBAC CODE MERGED / ALL CI PASS; VPS K5 DDL NOT YET RUN.** [PR #20](https://github.com/tarek-saad-dev/drvo-erp/pull/20) merged as `b3c81846c4264b223edf2c53163226f3093347b6`. Forward-only SQL `002_identity_sessions_and_roles.sql`: credentials, hashed revocable sessions, Business roles/action permissions, one Role per Branch, username rate limits and security audit. Added scrypt password verification, 12h HttpOnly/Secure/SameSite=Strict session cookies, login/logout/change-password, current actor, one role-checked Branch read API; **DRVO_K5_AUTH_ENABLED remains OFF by default**. Disposable CI **15 SQL+HTTP identity/security checks PASS**, separate real operator script Backup+Restore twice, migration/replay/grants proof PASS; K0/K1/K3/K4/DevOps CI green. [K5A evidence](../04-execution/PHASE-REPORT-K5A-IDENTITY-RBAC-2026-11-03.md). **Next owner-local operator action only after K5 release deployed:** [one-time K5A SQL migration](../../ops/staging/K5A-ONE-TIME.md). The existing K4 VPS SQL connection remains working; K5 schema not independently verified on VPS, public login intentionally not enabled. K5B verified registration/Owner bootstrap/Manager non-escalation, recovery, abuse controls, role management and UI, ADR-030 signoff, staging restriction and offsite backups remain OPEN.

> **LATEST — 2026-11-03 K4 DATABASE FOUNDATION STAGING CUTOVER COMPLETE / OPERATOR PASS.** Owner successfully ran the one-time K4B VPS SQL cutover after [PR #19](https://github.com/tarek-saad-dev/drvo-erp/pull/19) auto-deployed. Explicit `DRVO_ERP_STAGING` preflight passed; pre/post COPY_ONLY checksum backups both independently restored and verified; initial K4 migration applied + replay unchanged; `drvo_erp_stage_app` has SELECT on 7 core tables but **no DDL/write**; API-only SQL systemd connection enabled. `GET /api/health/db` returned `{"status":"ok","service":"drvo-api","database":"ready"}`, regular API/Web health OK, and script ended **`K4B VPS DATABASE + BACKEND CONNECTION: PASS`**. [Operator evidence and remaining gates](../04-execution/PHASE-REPORT-K4B-SQL-CUTOVER-2026-11-03.md). **K4 foundation staging infrastructure done**, but no customer login/RBAC or business APIs; ADR-030 detailed authorization signoff, offsite backup automation, staging access hardening, and K5 remain OPEN. Older snapshots below describe prior checkpoints, not current status.

> **LATEST — 2026-11-03 K4B OPERATOR SQL CUTOVER CODE MERGED, VPS ACTION PENDING.** [PR #19](https://github.com/tarek-saad-dev/drvo-erp/pull/19) merged as `aa200158b6bc7aceef106ba8af8a102d7170c0b2`, adding one-time root-operator guarded backup/restore/migration script using the **existing SQL admin**, object-scoped SELECT on seven K4 core tables for the **existing `drvo_erp_stage_app`**, and opt-in NestJS SQL pool/readiness `GET /api/health/db`. GitHub CI **23 foundational SQL checks + exact K4B operator script on throwaway SQL Server PASS**, all K0/K1/K3/DevOps CI PASS. No new SQL account is required on VPS; privileged SQL migration/backup restore is **NOT** done by code deploy. **Actual `DRVO_ERP_STAGING` still not verified migrated / app-connected:** owner must run the [one-time cutover on VPS](../../ops/staging/K4B-ONE-TIME.md) with existing hidden SQL Admin password and report `K4B VPS DATABASE + BACKEND CONNECTION: PASS`. [K4B CI report](../04-execution/PHASE-REPORT-K4B-SQL-CUTOVER-2026-11-03.md). Keep unrelated services/databases untouched; no customer data, real Login/RBAC, off-host backup rotation or tenant authorization signoff yet.

> **LATEST — 2026-11-03 K4A DATABASE FOUNDATION MERGED / 22 LIVE SQL CHECKS PASS (CI DISPOSABLE).** [PR #18](https://github.com/tarek-saad-dev/drvo-erp/pull/18) merged as `1fbc0e4625ee4f924d63d14809e51952ebdd3394`. Delivered `db/migrations/001_platform_identity_foundation.sql` with physical Tenant/Business/Branch/Account/Membership/Assignment FKs and immutable migration checksums, serializable SQL application-lock runner, opt-in staging-only SQL config and typed internal structural assignment repository. SQL Server 2022 disposable CI **22/22 PASS**, including cross-Tenant denial, revocation, migration rollback and independent backup/restore; K0/K1/K3 and DevOps Artifact CI green. [K4A evidence report](../04-execution/PHASE-REPORT-K4A-DB-FOUNDATION-2026-11-03.md). **IMPORTANT: PR merge DOES NOT apply migrations to VPS database.** The stage `DRVO_ERP_STAGING` remains **empty** until reviewed SQL migration operator/backup+restore process; the current `drvo_erp_stage_app` login is CONNECT-only. No new HTTP identity endpoint, real login/RBAC or customer data has been enabled. K4B (reviewed stage migration, runtime DB connect, DB recovery proof, ADR-030) remains OPEN. Preserve public/demo-only staging policy.

> **LATEST — 2026-11-02 STAGING CI/CD AUTOMATIC DEPLOYMENT FINAL TEST PASS / DEVOPS DELIVERY CLOSED.** [PR #17](https://github.com/tarek-saad-dev/drvo-erp/pull/17) was a non-executable `apps/web/` test marker, PR CI green (K0, K1, Staging Artifact CI), merged as `ad4f5695a1d0152e71cb5bf88d4bfd6c48e0f4a8`. The operator confirmed the **VPS `deploy/current/release.sha` matches this SHA**, both dedicated `drvoerp-web` and `drvoerp-api` services are active, loopback health OK and public `https://erp-stage.drvotech.com` returns HTTP **200**: `AUTO DEPLOY: PASS` / `DRVO ERP STAGING DEVOPS: PASS`. GitHub-to-VPS unattended deployment for reviewed changes to `main` is verified and **routine staging DevOps provisioning is complete**. [Final sign-off](../04-execution/PHASE-REPORT-DEVOPS-STAGING-ACTIVATION-2026-11-02.md#5-final-sign-off--automatic-github-to-vps-deployment-passed). **NOT closed:** actual SQL schema/migrations/API database connection, identity/RBAC, backups/restores and sensitive-data access control. The current public preview remains `mode=scaffold`; keep production systems and the unrelated clinics staging separate.

> **LATEST — 2026-11-02 DRVO ERP STAGING ACTIVE / EMPTY SQL DB CREATED (operator verified).** First GitHub-to-VPS managed release confirmed on 127.0.0.1:3310/3311 and external-facing Nginx HTTPS 200 for `erp-stage.drvotech.com`. VPS `release.sha` is `bc3419ce71b329ded829d86a5df47abde3a6983c` (PR #16 merge), both services active with `mode=scaffold`. Owner ran isolated SQL provisioning: **`DRVO_ERP_STAGING`** and limited **`drvo_erp_stage_app`** CONNECT test succeeded, root-only credentials `600`. [Activation report](../04-execution/PHASE-REPORT-DEVOPS-STAGING-ACTIVATION-2026-11-02.md). **NOT proven:** automatic GitHub push-to-main deployment variable and a second deployment test, actual SQL schema/migrations/API connection, backups/restore, real login/RBAC, any real-business readiness. Staging preview is public/demo only; VPS swap remains full. This status supersedes the older "no VPS deploy/SQL" checkpoints below.

> **LATEST — 2026-11-01 DEVOPS PIPELINE MERGED (HOST BOOTSTRAP PENDING).** [PR #13](https://github.com/tarek-saad-dev/drvo-erp/pull/13) merged (`ad709757`); added app npm lockfiles, K1 `npm ci`, Next.js standalone artifact CI, and protected manual GitHub-to-VPS staging deployment workflow with a distinct forced-command `drvoerp-deploy` account, immutable host receiver and rollback. K0/K1/K3/DevOps CI passed on PR head. **The GitHub deployment has NOT run** and the required VPS one-time installer, GitHub staging environment secrets and verified external release SHA are still outstanding. Follow [one-time VPS/GitHub setup](../../ops/staging/README.md) and [DevOps stage report](../04-execution/DEVOPS-STAGING-PIPELINE-REPORT-2026-11-01.md). Existing clinics staging at `staging-erp.drvotech.com:5501` MUST remain untouched. New DRVO `erp-stage.drvotech.com` preview is currently user-reported public and must contain only synthetic data. **DRVO_ERP_STAGING SQL DB and real login still NOT provisioned.**

> **LATEST — 2026-11-01 K3 SECURITY PROOF MERGED / 15 LIVE HTTP+SQL TESTS PASS.** [K3 PR #10](https://github.com/tarek-saad-dev/drvo-erp/pull/10) merged to `main` (`1dc3c0f`). Signed CI actor subject + current SQL Account, Business Membership, Branch Role and Allowed-action check passed **15** security-negative integration scenarios on disposable SQL Server 2022, plus K0/K1 CI PASS. [K3 Stage Report](../04-execution/PHASE-REPORT-K3-IDENTITY-SCOPE-2026-11-01.md) documents full evidence. **This proof route is disabled in Production and is NOT real username/password login or final ADR-030 acceptance.** [Issue #11](https://github.com/tarek-saad-dev/drvo-erp/issues/11) tracks real secure Identity/RBAC implementation. [VPS Staging Handoff](../04-execution/VPS-DRVO-ERP-STAGING-HANDOFF-V1.md) / [Issue #12](https://github.com/tarek-saad-dev/drvo-erp/issues/12) prepare a separately secured Web preview; no SSH, customer SQL, public HTTPS URL, service restart or VPS deployment performed yet. Follow [Issue #8](https://github.com/tarek-saad-dev/drvo-erp/issues/8) for pinned app lockfiles before Staging.

> **LATEST — 2026-11-01 K2 SQL SERVER SPIKE MERGED / 8 CHECKS PASS.** [PR #9](https://github.com/tarek-saad-dev/drvo-erp/pull/9) merged to `main` at `95d8559`. Temporary isolated SQL Server 2022 Developer GitHub Actions container passed composite Tenant/Business/Branch FK rejection, scoped SELECT fixture, rowversion CAS, rollback, exact decimal, checksum migration and **independent backup/restore**, with successful K0/K1 CI. [Stage Report](../04-execution/PHASE-REPORT-K2-SQLSERVER-DISPOSABLE-2026-11-01.md) contains evidence/limits. **Still not accepted ADR-030 actual actor/role/auth/RLS security, selected production data access/ORM, verified VPS restore, paid Module activation or finance postings. No live web URL or production deployments yet.** Next: K3 trusted scope development, [ADR issue #2](https://github.com/tarek-saad-dev/drvo-erp/issues/2), [DB issue #5](https://github.com/tarek-saad-dev/drvo-erp/issues/5) and [SaaS Phase 2 issue #7](https://github.com/tarek-saad-dev/drvo-erp/issues/7).

> **LATEST — 2026-11-01: K1 RUNTIMES MERGED / CI GREEN (NON-PRODUCTION).** [PR #6](https://github.com/tarek-saad-dev/drvo-erp/pull/6) merged to `main` (commit `9ea4c8e`), introducing real Next.js 16 App Router web, NestJS 11 HTTP API `GET /api/health`, and isolated idle NestJS worker process with scoped build projects. GitHub Actions **K0 Foundation CI and K1 Runtime CI** passed on the PR head: API test + HTTP smoke, Web production build + typecheck + HTTP smoke, worker process startup. No SQL Server, customer identity, Tenant permissions, Business Modules, real queues, DRVO SaaS commercial transactions, or production deployment exists. Nested app dependency lockfiles and broader lint/secret scanning remain future gates. **Next:** [SQL Server isolated spike #5](https://github.com/tarek-saad-dev/drvo-erp/issues/5), protected scope ADR-030 [Issue #2](https://github.com/tarek-saad-dev/drvo-erp/issues/2), and SaaS Commercial Core moved to Phase 2 [Issue #7](https://github.com/tarek-saad-dev/drvo-erp/issues/7). Do not treat process /health as business readiness.

> **LATEST — 2026-11-01: FIRST NON-PRODUCTION CODE MERGED.** [K0 scaffold PR #4](https://github.com/tarek-saad-dev/drvo-erp/pull/4) merged to `main` (`f24f363`): strict TypeScript, minimal Kernel/Contracts fixture functions, separate inert Web/API/Worker boundaries, lockfile and [K0 Foundation CI](https://github.com/tarek-saad-dev/drvo-erp/actions) with eight local tests and successful PR-head workflow. **This is NOT real authentication, SQL Server isolation, Module activation, NestJS/Next.js runtime, payment, financial posting or deployed ERP.** Remaining protected-data/finance/activation decisions [Issue #2](https://github.com/tarek-saad-dev/drvo-erp/issues/2) / ADR-030/031/032 are still open; next isolated SQL Server spike [Issue #5](https://github.com/tarek-saad-dev/drvo-erp/issues/5). No customer data, SQL migration, staging or Production actions.

> **LATEST — 2026-11-01: PHASE-1 FOUNDATION ENGINEERING PREP PACKET (DOCS ONLY).** [Phase-1 Work Package](../04-execution/PHASE-1-FOUNDATION-IMPLEMENTATION-PACKET.md) defines Kernel-first PR-01..06, dependencies and acceptance. [Technical Decisions](../02-architecture/PHASE-1-FOUNDATION-TECHNICAL-DECISION-PACKET.md) record recommended ADR-030/031/032 targets and **remaining explicit security/finance/billing sign-offs**; [Standard Module Contract](../02-architecture/STANDARD-MODULE-CONTRACT-V1.md) and [Salon Ownership/Starter](../03-modules/SALON-V1-OWNERSHIP-AND-DEPENDENCY-STARTER.md) put module work in correct owners. **F0 approved design; F1 usable documented ownership; F2 scoped pre-code pack prepared but not signed/tested. No code, SQL, CI, staging or Production authorization from these files.**

> **2026-10-31 — UNIFIED FOUNDATION ARCHITECTURE HANDOFF (DOCUMENTATION ONLY):** [Master Architecture Map V1](../02-architecture/DRVO-UNIVERSAL-ERP-ARCHITECTURE-MASTER-MAP-V1.md) is the reference for routing a new industry or feature to Kernel / Shared Module / Extension / new owned Domain / Integration / Industry Solution / adjacent platform. [Kernel 03](../02-architecture/PLATFORM-KERNEL-ENTITLEMENTS-AND-SUBSCRIPTION-BOUNDARY-V1.md) separates subscription commerce from access rights; [Kernel 04](../02-architecture/PLATFORM-KERNEL-AUDIT-AND-CONTRACTS-BOUNDARY-V1.md) separates cross-cutting audit from domain truth. [Closure & New-Industry Readiness Gates](../04-execution/FOUNDATION-CLOSURE-AND-NEW-INDUSTRY-READINESS-GATES.md) labels **F0 closed at design level, F1 working map for review, F2 implementation sign-off still OPEN**. ADR-030/031/032 remain proposed. No code, SQL, security tests or Production changes authorized.

> **KERNEL 02 DESIGN CHECKPOINT — 2026-10-31 (docs only):** [Module Registry & Lifecycle Boundary V1](../02-architecture/PLATFORM-KERNEL-MODULE-REGISTRY-AND-LIFECYCLE-BOUNDARY-V1.md) records five distinct notions: approved platform release, Industry Solution composition, Business activation, commercial entitlement and user authorization/App visibility. Existing ADR-007/015/016/020/021 and ADR-035/036 accepted product policies remain authoritative; ADR-032 activation technical details and actual dependency graphs/pricing/approver remain OPEN. This is a working map, not a new acceptance or code authorization.

> **LATEST — 2026-10-31: LEAN PLATFORM KERNEL APPROVED AT RESPONSIBILITY LEVEL.** Founder adopted [ADR-037](../05-decisions/ADR-037-LEAN-PLATFORM-KERNEL-BOUNDARY.md): universal identity/scope, authorization, module governance and trusted audit are common Kernel duties; POS/Accounting/HR and other Business Modules retain operational truth. The [Kernel Boundary Map](../02-architecture/PLATFORM-KERNEL-BOUNDARY-MAP-V1-PROPOSAL.md) now marks this principle ACCEPTED but exact adjacent component placements PROPOSED. [Kernel Boundary 01 — Identity/Tenancy/Authorization](../02-architecture/PLATFORM-KERNEL-IDENTITY-TENANCY-AUTHORIZATION-BOUNDARY-V1.md) is a working map for the next review. **No code/SQL/staging/VPS/Production authorization; ADR-030/031/032 remain proposed.**

> **LATEST — 2026-10-30: ARCHITECTURE CONSTITUTION V1 STABLE AS DESIGN DIRECTION.** All four universal policy questions are founder-approved: [ADR-033](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md) (Business independent of industry), [ADR-034](../05-decisions/ADR-034-OPTIONAL-ENTERPRISE-ORGANIZATION-STRUCTURE.md) (optional Enterprise organization), [ADR-035](../05-decisions/ADR-035-GOVERNED-THIRD-PARTY-EXTENSION-ECOSYSTEM.md) (controlled open Extension ecosystem), and [ADR-036](../05-decisions/ADR-036-GLOBAL-READY-VERIFIED-INDUSTRY-COUNTRY-RELEASES.md) (globally evolvable platform with validated industry/country release eligibility). [Final Phase-0 foundation review](../02-architecture/CORE-CONSTITUTION-V1-FINAL-FOUNDATION-REVIEW.md) finds the seven laws coherent at the general architecture level. **Documentation only; no runtime/SQL/staging/VPS/Production authorization.**

> **IMPORTANT:** The dated 2026-10-28 discovery and subsequent older checkpoints below are historical snapshots, not current launch readiness. ADR-030/031/032 remain PROPOSED; country-specific compliance and enterprise capacity have not been proven.

> **FOUNDATION / NO EXCEPTION:** [Founder Three-Pillar Project Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md). The product must target Egypt-scale platform adoption, an extensible method to serve any *investigated* business industry, and Business sizes micro-to-enterprise. Domain/module composition enables feature growth; operational/capacity scaling is a separate measurable design axis. Mission is accepted, **not yet a verified capacity claim**.


**As of:** 2026-10-28  
**Phase:** Founder Discovery / Documentation (Phase 0)  
**Implementation:** NOT STARTED  
**Production database, staging and deployment:** NOT VERIFIED / NOT DONE

## Confirmed product direction

- Complete modular ERP as vision; staged releases.
- Medium-sized multi-branch target customers.
- Egypt and Gulf countries intended from first commercial launch, with country details pending.
- First vertical: barber salons; **second: medical clinics**.
- **Cut Salon** first real-world pilot.
- **Responsive Web / PWA** as initial mobile channel.
- **Core + Extension architecture required for each module**; technical contracts not yet finalized.
- Modular Monolith, multi-tenant architecture, standalone repository and docs source of truth.

## Next steps

1. Complete detailed MVP discovery for the barber salon pilot.
2. Resolve cross-market launch/compliance and medical clinic scope.
3. Specify extension contracts and tenant model before scaffolding.
4. Decide technology stack, environments and data strategy.
5. Define measurable acceptance criteria.

See [Open questions](../04-execution/OPEN-QUESTIONS.md) and [Roadmap](../04-execution/ROADMAP.md).

## Verification

An accepted decision is not implementation; no feature is considered tested or deployed without evidence.

## MVP discovery update (2026-10-28)

Founder submitted 20 scope preferences: target one-month first test, broad Cashier replacement ambition, Cut Salon pilot alongside legacy, online subscriptions, offline POS, booking, full HR, inventory and accounting. Scope and deadline are not yet approved as feasible. Resolve operational risks and acceptance criteria before committing to delivery. See [MVP Discovery](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Release decision update — 2026-10-28

Founder + Cursor/AI team; one-month test target flexible. **One comprehensive commercial V1** following internal QA and Cut Salon all-branch validation. DRVO is to own bookings while Cashier remains in parallel; cash-only offline sales sync later. Full journals/ledgers/balances mandatory, manual subscription collection initially (gateway deferred). These are requirements, **not implemented or feasibility-proven**. See [release strategy](../01-product/MVP-RELEASE-STRATEGY.md).


## MVP scope closure (2026-10-28)

Confirmed: existing Cut Salon booking site will call the DRVO API; offline cash sales are accepted with post-sync stock shortage review; internal testing is permitted before one commercial V1 launch. Manual accounting journal entry remains undecided until Accounting Module design. This is documentation only; no code, migration or deployment performed. [Release strategy](../01-product/MVP-RELEASE-STRATEGY.md).

## Tenancy discovery checkpoint — 2026-10-28

Forty founder answers captured and reconciled in [Tenancy Discovery](../01-product/TENANCY-DISCOVERY-ROUND-3.md). [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md) records accepted logical boundaries. Technical schema, module dependencies and several lifecycle/access rules remain open. No application code or database implemented.

## Tenancy follow-up (2026-10-28)

Approved: Manager always sees profits and service costs in authorized scope; currency/language/timezone only at Business level. Module Dependencies unresolved pending design discussion. [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md).

## Identity & Access discovery — 2026-10-28

Twelve founder responses recorded. Platform-global usernames and username/password login, tenant self-registration, explicit Business Membership, one Role per Branch, email OTP recovery and mandatory employee first-login change approved. Explicit Deny and temporary permissions remain unresolved; session revocation must be enforced server-side. [Identity & Access](../02-architecture/IDENTITY-ACCESS.md).

## RBAC matrix discovery — 2026-10-28

Founder approved scoped Owner full access, customizable Manager role, restricted manager delegation, dedicated paid-invoice void, refund thresholds, Role discount limits, self-shift vs manager shift access, closed-day reopen permission. Ten questions remain undecided. New user ID / QR-linked discount concept requires clarification and security design. [RBAC Matrix](../02-architecture/RBAC-MATRIX.md). No implementation.

## Permission and QR discovery (2026-10-28)

Allow-only + Default Deny approved; other resource/scope checks remain mandatory. QR card owner-only with extra verification approved, but intended QR function and Discount Engine behavior remain open. Continue with POS Core + Salon Extension requirements; no code implemented.

## POS discovery (2026-10-28)

First 12 POS requirements captured: mixed product/service invoice, one service executor but potentially multiple attribution recipients, optional customer except credit, immutable paid invoice, draft persistence, split tender, temporary catalog line, credit limit and open shifts. Attribution details and payment/refund specs remain open. [POS Discovery](../03-modules/POS-DISCOVERY-ROUND-1.md). No code implemented.

## POS discovery round 2 — 2026-10-28

Approved: built-in/custom payment methods, cash-plus-receivable splits, hard credit limits, partial debt collections, separate employee tips, line/custom partial refunds, refund to customer credit or payment method, executed-service refunds with reason, Manager over-limit approval, employee-specific commission plans and automatic reversal of target/commission effects. Attribution, payroll reversal period and financial day reopening remain open. [Round 2](../03-modules/POS-DISCOVERY-ROUND-2.md). No code implemented.

## POS Round 3 discovery — 2026-10-28

Confirmed shared branch treasury with separate cashier shifts, actual cash counts and manager-reviewed shortages/surpluses; manager can make audited post-payment service-attribution adjustment; offline cash sales attach to same shift; tips accrue to employee ledger; financial day can close with open shifts (warning). Founder requests cashier liability for shortages and recording surplus as sales; accounting classification, investigation and lawful recovery require design, do not treat unverified surplus as real sales. [POS Round 3](../03-modules/POS-DISCOVERY-ROUND-3.md). No code.

## POS Round 4 (2026-10-28)

Confirmed: business-configurable multiple shifts; offline sale retains occurred date with documented adjustment; distinct service opener commission and executor's target (Mohamed opens skin-care service, 10% opener commission; Youssef executes and earns target attribution). Requested shortage association with last cash recipient, separate approval before employee deduction, immediate cash-surplus-as-sales classification and edit of approved adjustment need financial/audit safeguards. Day closing workflow remains open. [Round 4](../03-modules/POS-DISCOVERY-ROUND-4.md). Not implemented.

## POS design draft checkpoint — 2026-10-28

Six founder clarifications approved: opener commission 10% of post-discount pre-tax service price; one opener distinct from executor; refund reversals; cash surplus classified as variance pending verified sales evidence; Manager corrections preserve original approved settlement via linked new entry. Initial POS state machine and shift lifecycle **draft specifications** now exist; API/database implementation and outstanding business-day/offline decisions still open. [POS State Machine](../03-modules/POS-STATE-MACHINE.md) · [Shift Lifecycle](../03-modules/SHIFT-LIFECYCLE.md).

## Offline shift reconciliation follow-up — 2026-10-28

Founder approved provisional close for shifts with unsynced sales, cash counting including actually received offline amounts, and automatic retry followed by Manager-visible errors. Offline electronic payment confirmation remains open. Design specification updated; no code implemented.

## Offline/closing design checkpoint — 2026-10-28

Founder approved provisional financial-day close with later final reconciliation; when a device is lost before sync, log incident and reconcile physical cash manually. Provider-dependent offline payments remain undecided pending discussion by method. Draft [Offline API Contracts](../03-modules/OFFLINE-API-CONTRACTS.md) and [Logical Data Model](../03-modules/OFFLINE-DATABASE-DESIGN.md) exist but remain proposed, not implementation. No deployed backend/database.

## Founder decision — 2026-10-29: payment selection availability

All payment methods configured for a Business must remain visible and selectable in POS both online and offline. Do not gate or hide a method merely because connectivity is lost. Founder explicitly skipped per-payment-method discovery for now.

Selecting a method is NOT equivalent to receiving or verifying funds. Cash may be recorded locally as received; provider-dependent payments must retain an unverified/pending reconciliation status until reliable confirmation or evidence exists. Never manufacture provider authorization, and never post pending electronic payment as settled cash. Payment selection UI availability is APPROVED; exact provider confirmation and settlement semantics are technical design work, not additional UI selection questions.


## POS design checkpoint (2026-10-29)

POS logical data model, accounting event contracts and Inventory/HR/Salon integration boundary docs added to docs/03-modules. All configured tender types remain selectable offline; confirmed settlement remains separate. Documents are engineering drafts, not code or approved SQL schema.


## Accounting Core discovery (2026-10-29)

Founder approved editable industry-based Chart of Accounts per Business, independent Business books with Tenant consolidated reporting, auto and manual immediately-posted balanced journals, reversal-based correction, branch/department/project cost centers, configurable reporting and fiscal start, monthly/annual closing and permissioned reopening. Account depth and minimum report set open; period comparisons deferred. [Accounting Core](../03-modules/ACCOUNTING-CORE-SPEC.md). Documentation only.


## Treasury Core founder decisions — 2026-10-29

One treasury per Branch, bank accounts Business/Branch, manager-approved recorded transfers, cash/bank expenses, permissioned cash movement and Manager balance visibility; bank reconciliation deferred. [Treasury Core](../03-modules/TREASURY-CORE-SPEC.md). No implementation.


## HR & Employee Ledger discovery — 2026-10-29

Twelve HR decisions documented. Per-employee salary/commission models, custom target periods, Branch-separated commissions, variable opening rates, daily accrual and monthly close, advances, auditable corrections and scoped payroll approval. Fixed 10% opening rate now an example, not universal rule; base remains after discount before tax. No HR implementation. [HR Commission](../03-modules/HR-COMMISSION-ENGINE.md) · [Employee Ledger](../03-modules/EMPLOYEE-LEDGER.md).


## Inventory/Purchasing founder decisions (2026-10-29)

Eleven approved requirements: per-Branch stock with inter-Branch transfers, automatic Recipe consumption for services, Business-set valuation, negative stock with alert/review, direct purchase/receipt, Business-scoped shared suppliers, supplier returns, full/partial counting, Manager-approved count adjustments, reorder alerts from V1; Batch/Expiry not needed in V1. Transfer between different Businesses remains undecided. [Inventory](../03-modules/INVENTORY-CORE-SPEC.md) and [Purchasing](../03-modules/PURCHASING-CORE-SPEC.md). No code implemented.


## Architecture readiness checkpoint — 2026-10-29

Cross-module review documented at [Architecture Readiness Review](../04-execution/ARCHITECTURE-READINESS-REVIEW.md). Ready for foundation planning only; production finance/offline schema awaits seven design decisions. No code or deployment.


## Technology baseline — 2026-10-29

Founder selected SQL Server. Engineering recommendation: Next.js + NestJS/TypeScript modular monolith, worker, offline device queue, dedicated SQL Server data layer. See [Technology Architecture](../02-architecture/TECHNOLOGY-ARCHITECTURE.md), [V1 Execution Plan](../04-execution/V1-IMPLEMENTATION-PLAN.md). Critical business and hosting/runtime design blockers remain. NO code implementation authorized.


## Final architecture decision update — 2026-10-29

New ADRs 007-009 approved at business direction level: Required/Optional dependencies with conflict prevention, Commission Plan-defined opener rate precedence, SQL Server VPS + PWA IndexedDB initial offline queue. Four financial policies unresolved (offline credit, payment verification, negative stock costing, late closed-month sales). Cursor pre-code plan exists; NO coding approved.


## Four financial ADRs and implementation readiness — 2026-10-29

Founder approved offline immediate credit with after-sync excess review, record customer evidence of offline electronic tender with later discrepancy review, provisional last-known cost for negative stock with subsequent adjustment, and posting late-arriving offline sale to an open GL period while retaining original sale date. See ADR-010..013 and [Implementation Readiness Gate](../04-execution/IMPLEMENTATION-READINESS-GATE.md). Readiness is **technical design signoff pending**, not permission to code. No app or DB changes.


## Technical Sign-off checkpoint — 2026-10-29

[Technical Design Sign-off](../04-execution/TECHNICAL-DESIGN-SIGNOFF.md) created with proposed financial edge-case contracts and acceptance tests. Status: draft awaiting founder approval. No coding authorized or executed.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**


## Pre-code infrastructure review — 2026-10-29

Created [Infrastructure + Offline Pre-Code Checklist](../04-execution/INFRASTRUCTURE-OFFLINE-PRECODE-CHECKLIST.md). Actual VPS, SQL Server version/capacity, backup restore, POS devices and IndexedDB durability NOT yet inspected or tested. Code remains unauthorized.


## Windows POS browser decision — 2026-10-29

Founder chose Windows Browser as initial POS target. Created [Windows Offline Test Plan](../04-execution/WINDOWS-POS-OFFLINE-TEST-PLAN.md) for IndexedDB queue and PWA cases (20 test scenarios); no testing conducted, no code authorized.


## VPS read-only audit access — 2026-10-29

Prepared [VPS Read-only Audit Runbook](../04-execution/VPS-READONLY-AUDIT-RUNBOOK.md). GitHub access exists, but direct SSH/VPS execution is unavailable here; no VPS/SQL Server inspection or Windows/IndexedDB tests have been performed. Founder code restriction remains active.


## SQL Server data access evaluation — 2026-10-29

Reviewed node-mssql, TypeORM and Prisma SQL Server options. Recommended node-mssql/tedious plus explicit financial repositories and versioned SQL migrations; recommendation NOT approved or tested. [Data Access Memo](../04-execution/SQLSERVER-DATA-ACCESS-SELECTION.md). No code or VPS access.


## Module and UX architecture expansion — 2026-10-29

Draft proposals (NOT approved decisions): [module ecosystem](../02-architecture/MODULE-ECOSYSTEM-DISCOVERY.md), [Odoo-inspired DRVO UI](../02-architecture/ODOO-INSPIRED-UI-DISCOVERY.md), and [Cashier reuse review](../04-execution/CASHER-REUSE-DISCOVERY.md). Founder rightly identified module interoperation, module catalog, optional WhatsApp, cross-industry Clinic evolution, Business activation and new-Business templates as outstanding architecture questions. No application code, test or production change.


## Module App identity — approved 2026-10-29

Founder picked independent visible Modules (Odoo-like App Launcher), ADR-015. This is compatible with existing Modular Monolith, Core+Extensions, Required/Optional Dependencies, Business-scoped activation and one SQL Server database for V1. [Module Registry/Dependencies/Contracts](../02-architecture/MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md) is a draft awaiting product and technical sign-off. No application development approved.


## Required dependency activation policy — founder-approved 2026-10-29

ADR-016 accepted: apps selected with missing Required dependencies show one bundle preview with all prerequisites and applicable charges, for one explicit user approval; no hidden extra paid modules. [ADR-016](../05-decisions/ADR-016-BUNDLED-REQUIRED-DEPENDENCIES.md). [Lifecycle and Contracts](../02-architecture/MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md) is a draft architecture proposal; coding remains explicitly unauthorized.


## Founder approval — multi-industry product platform and scale direction (2026-10-29)

**ADR-017 APPROVED DIRECTION:** Shared Platform Kernel + reusable Shared Business Modules + bounded Industry Extensions + independent Vertical Domain Modules where business invariants genuinely differ + versioned Industry Solution compositions + optional integrations. Still require Core+Extension architecture for *every* module (ADR-006); do not build an ERP fork per industry or over-generalize Booking/CRM. **ADR-018 APPROVED STRATEGIC DIRECTION:** a repeatable Discovery/Fit-Gap/Build/QA/Cutover/Productization process to bring later industries onboard (hypothetical example: large Egyptian importer/supplier/timber manufacturer), and UI for 100+ searchable solutions, while each customer Business sees only its active authorized Apps, with separate internal Platform Control Center. Distinguish number of industries from Tenants, and extensibility from load/enterprise scalability.

**Unchanged constraints:** first comprehensive commercial release Salon validated at Cut Salon; Clinic second; other sectors are examples only. V1 ONE shared SQL Server database. Multiple database pools / dedicated Enterprise deployment only future optional strategies subject to measured load and separate design. No claim any sector/size is ready now; no code, migrations, tests or production deployment. New canonical docs: [Industry Architecture](../02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [Industry Onboarding Playbook](../04-execution/NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md), [SaaS Scale/Control Center](../02-architecture/SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md); ADRs [017](../05-decisions/ADR-017-SHARED-CORE-INDUSTRY-SOLUTIONS.md), [018](../05-decisions/ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md).


## Founder-approved domain boundary choice — 2026-10-29

**ADR-019 accepted (Option B):** create separate Industry Domain Modules only where their independent aggregates/lifecycle/permissions/privacy/financial rules justify them; use bounded Industry Extensions where shared Core already owns the workflow. No compulsory giant Salon/Clinic/Manufacturing operations module for every Industry Solution. Salon V1 likely composes shared POS/Booking/HR/Inventory/etc. with Salon Extensions; independently owned service execution is a candidate only if analysis justifies it. Clinic Clinical Records and Manufacturing/MRP are future domain-boundary stress tests, not planned V1 commitments. See [ADR-019](../05-decisions/ADR-019-CONDITIONAL-DOMAIN-MODULE-BOUNDARY.md) and draft [Matrix](../02-architecture/CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md). No coding authorization.


## Founder-approved progressive Business composition — 2026-10-29

ADR-020: every Business may begin with its own minimum valid set of industry/workflow Modules and add compatible Modules/Extensions later with explicit Required dependency/cost approval, safe versioned contracts and preserved financial history. **No standalone Salon Service Execution Module in V1**. Existing Booking/POS/HR/Inventory Salon-related functionality remains; this is not an unintended reduction of approved comprehensive Salon commercial V1 coverage. [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md) and [growth design](../02-architecture/INCREMENTAL-BUSINESS-MODULE-GROWTH.md). No coding authorized.


## Founder approved recommended, customizable Industry Starters — 2026-10-29

**ADR-021 accepted:** a new Business chooses an Industry Solution and starts with a recommended but editable selection of compatible Modules and Extensions. Recommended/optional apps can be removed unless required by a selected capability. Global Module Registry Required dependency closure plus platform/security/finance integrity always apply; complete prerequisites and any charges get one explicit bundle approval (ADR-016). Industry Solution Registry supplies starter recommendations and config/role templates, **not** authority to override real Module dependencies. This is an onboarding choice, not a reduction to comprehensive Salon V1. [ADR-021](../05-decisions/ADR-021-CUSTOMIZABLE-RECOMMENDED-INDUSTRY-STARTER.md), [design draft](../02-architecture/INDUSTRY-STARTER-AND-ACTIVATION-DESIGN.md). No coding authorized.


## SaaS pricing and original DRVO ERP UI Kit — discovery 2026-10-29

Founder requested comprehensive pricing and an Odoo-like UX Kit. Added [Pricing Discovery](../01-product/SAAS-PRICING-STRATEGY-DISCOVERY.md) and [UI Kit Blueprint](../02-architecture/DRVO-ERP-UI-KIT-BLUEPRINT.md) as **DRAFTS**, not founder-approved price list or coded visual kit. Odoo official pricing and frontend/rights docs were researched; benchmark figures are not DRVO prices. Recommended discussion: Hybrid base Business plan + included essential apps + opt-in value premium/metered add-ons; original DRVO component/view/theme library inspired by Odoo functional patterns. Prior ADR-021 recommended customizable industry starter remains accepted; the preselected-included-app behavior remains OPEN. No code, prototype assets, SQL schema, tests or production changes.


## Founder-approved DRVO UI Kit direction — ADR-022 (2026-10-29)

Selected **A — Odoo Familiarity + original DRVO brand and simpler ERP UI**. Common app launcher and List/Form/Kanban/Calendar/Graph/Pivot patterns, separate Windows POS focus shell, Arabic RTL/English LTR and explicit financial/offline UI statuses; no copyrighted Odoo Enterprise code/assets reused. Detailed [App Shell](../02-architecture/DRVO-APP-SHELL-UX-SPEC.md), [Tokens & Components](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md) and [Views](../02-architecture/DRVO-VIEW-AND-SCREEN-PATTERNS.md) are **unapproved visual/technical proposals**. [ADR-022](../05-decisions/ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md) is approved only at the design-direction level. Hybrid SaaS [pricing study](../01-product/HYBRID-PRICING-MODEL-ANALYSIS.md) remains unapproved; no numeric DRVO prices or packaging determined. No coded UI Kit, visual design file, DB changes, tests or production actions.


## Founder-approved Hybrid App Shell navigation — ADR-023 (2026-10-29)

**ACCEPTED Option C:** one Global DRVO Shell with controlled **Sidebar** (hierarchical business admin), **Tabs** (shallow apps) or **Workspace** (POS/Booking high-focus workflows) according to Module workload. App Launcher and Business/Branch/role scope remain consistent, apps independent (ADR-015), RTL/LTR first-class (ADR-022). The Sidebar is NOT mandated in every module. New [ADR-023](../05-decisions/ADR-023-HYBRID-NAVIGATION-BY-MODULE.md), detailed **draft** [Hybrid Navigation + RTL/App Launcher](../02-architecture/DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md) and [List/Form UX](../02-architecture/DRVO-LIST-FORM-UX-DETAILED.md). Candidate numeric tokens (Topbar 56px, Sidebar 240/64px, table row 36/44px) and final assignments still require visual testing/sign-off. No UI code, Figma, SQL migration or production work.


## Founder-approved DRVO palette — ADR-024 (2026-10-29)

**RESOLVED:** DRVO ERP uses original **Plum + Teal + Soft Neutrals** identity with approved baseline: Plum `#74536E`, Deep Plum `#553E53`, Action Teal `#1A7B80`, Canvas `#F7F6F8`, White `#FFFFFF`, Main Text `#27242B`. This supersedes prior *unapproved* green-first palette candidates. Place primary tasks/apps in first viewport; reduce/avoid huge promotional Home hero (exact reduced vs absent layout pending). Colors will apply consistently to App Launcher, Accounting List/Form and POS with ADR-023 Hybrid Navigation. Final typography, icon/logo assets, UI states/contrast, component layout and real designs are still pending. [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md), [Tokens](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md). Docs only: no code/migrations/deploy or produced Figma kit.


## Founder approved UX North Star — ADR-025 (2026-10-29)

Founder explicitly approved **ERP seriousness/professional power of Odoo + Duolingo-inspired simple, fluid, friendly experience**, with original DRVO Plum/Teal colors, no Odoo/Duolingo asset cloning and no childish finance gamification. **Guide / Work / Analyze** are UX density and task layers within one shared UI Kit, not separate products. Focus one clear action, role-sensitive density, progressive disclosure, calm verifiable states, attention-first Business Home and fast Windows POS. Three new design concept views requested for App Launcher, Accounting and POS; artwork in conversation is not a Figma or coded interface. [ADR-025](../05-decisions/ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md), [Playbook](../02-architecture/DRVO-UX-NORTH-STAR-PLAYBOOK.md), [Review Brief](../02-architecture/DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md). No application code/SQL/production authorization.


## Founder approvals — Business themes, custom fonts, original characters and scene motion (2026-10-29)

**ADR-026 ACCEPTED DIRECTION:** Theme Engine with validated, Business-scoped palette overrides; centrally managed Typography Tokens; supported font choice and **secure licensed custom font upload capability** in architecture. Global DRVO Plum/Teal (ADR-024) becomes default/fallback for Business branding, NOT a compulsory palette. Branding changes restricted by RBAC and a trusted, accessible token resolver; semantic statuses and financial correctness stay protected. Exact font formats, licensing checks, assets/CDN schema, pricing and complete self-service editor V1 timeline remain open.

**ADR-027 ACCEPTED DIRECTION:** original, profession-specific DRVO Character Family, illustrated Industry Scenes (including house/property graphics) and targeted optional scene/page flip motion; reduced-motion/static fallback and POS/finance speed. **ALL previous mockup LAYOUTS rejected**; do not implement their composition as approved UX. Original art/design pack and exact transitions not yet signed off. Technical design drafts: [Theme Engine](../02-architecture/BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md), [Character/Motion](../02-architecture/CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md). Registered [ADR-026](../05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md) and [ADR-027](../05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md). **Documentation only; no code, schema changes, graphics production or production deployment.**


## Founder-selected DRVO Character Art Direction — ADR-028 (2026-10-29)

**ACCEPTED:** unified **Soft 2.5D Editorial characters** + **Miniature/Isometric 3D-inspired industry buildings/scenes** with consistent shapes, lighting and material. First art exploration: DRVO Barber Character, Miniature Salon Storefront, Real Estate/House Miniature and optional scene.flip storyboard. Founder acceptance is of general style/direction, **not** the exact generated illustrations, prior rejected page layouts, any real 3D runtime, animation timing, V1 industry launch expansion or production assets. See [ADR-028](../05-decisions/ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md), [Concept Pack](../02-architecture/DRVO-ART-DIRECTION-FIRST-CONCEPT-PACK.md). No code, graphics asset production pipeline or deployment authorized.


## The project's overriding founder mission — ADR-029, 2026-10-30

Founder explicitly identified 3 non-negotiable foundations: **(1)** aspire to become one of the largest ERP platforms in Egypt, **(2)** architecture expandable into ANY target industry through stable reusable Shared Core, governed Extensions, conditional Domain Modules, Integrations and Industry Solutions without per-client forks, **(3)** capability to serve micro/small/SME/very large Enterprise with minimum valid installed Apps **AND** physically scalable, evidence-driven tenant isolation/SQL/processing/recovery. **Do not infer unlimited operations from Module composition.** This is the primary project definition and is linked at the top of START-HERE, docs README, Product Vision, Architecture and Cursor plan. [Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) · [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md) · [Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). Phase 0/no code/SQL/production changes. V1 Salon Cut Salon; Clinic second, future sectors require actual productization.


## Phase-0 Foundation Gap Review — 2026-10-30

Initial design review against founder Three-Pillar Charter ADR-029 found **a promising modular design with 12 identified documentation/contract gaps**: P0 trusted Tenant/Business/Branch isolation including background processing and reporting; POS Accounting first GL transaction boundary; concurrent priced module activation; domain ownership/events/compatibility. Hypothetical small Salon, multi-branch Salon and large Manufacturing assessments show the conceptual platform supports the intended direction **but do not prove actual implementation readiness or capacity**. [Architecture Review 01](../02-architecture/FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) and [Core Contract Options](../02-architecture/FOUNDATION-CORE-CONTRACTS-PROPOSAL.md) document blockers/options, neither approving a physical schema or new founder decisions. STATUS: NEEDS DESIGN; no code, DB, tests, VPS or production changes.


## Tenant Isolation Security Design Draft — 2026-10-30

Created [P0 Tenant/Business/Branch Isolation Contract](../02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md), [40-case Negative Security Test Matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md), and [PROPOSED ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md). Founder-approved Tenancy/Identity/Default-Deny requirements preserved; details on composite FK vs alternate relational design, optional SQL Server RLS, supported permissions and support access not yet ratified. **Status: P0 FND-01 OPEN; contract specification drafted, no executed test or code.** Next security decision must be explicit rather than interpreting documentation as proven isolation.


## P0 Financial Consistency Contract — documented 2026-10-30

Created [Financial Consistency Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md), [46 Financial Failure/Recovery Test Cases](../02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) and [ADR-031 PROPOSED](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md). Prior founder approved offline credit customer hold (ADR-010), unverified screenshot != settlement (011), negative stock last cost/unknown `COST_PENDING` (012), late offline original date and open-period posting (013), SQL/PWA device queue (009) preserved. New proposed architecture separates status/source owners for POS, Accounting GL, Treasury tender, Inventory valuation, HR commission; compares first GL A same-transaction vs B durable accepted/pending. **A conditionally recommended for V1, NOT APPROVED. FND-02/FND-04 still OPEN. Zero test execution; no code/DB/production changes.**


## P0 Sale-to-Ledger architecture detail — 2026-10-30

Extended FND-02/FND-04 with [Sale-to-Ledger End-to-End Design](../02-architecture/SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md) (same-SQL atomic A vs durable GL_PENDING B, separated owner-derived statuses and failure recovery) and [Financial Account Mapping / Close Gates](../02-architecture/FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md) (cash custody vs bank, verified vs unverified transfer proof, credit/anonymous collection/negative stock/late period). Founder Charter first: invariant reusable across industries and company sizes, plus separately measured enterprise SQL/latency. **No final A/B option, electronic-tender ledger account, Chart of Accounts or tax policy accepted. FND-02/FND-04 OPEN. Documentation only; no source code, SQL, performance testing, VPS or Production.**


## Foundational Module Activation Engine — design reviewed 2026-10-30

Now documented: [Financial A/B Atomicity & Performance Gate](../02-architecture/FINANCIAL-ATOMICITY-DECISION-GATE.md), [Module Activation / Dependency / Entitlement Contract](../02-architecture/MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md), [50 future concurrency/failure/security tests](../02-architecture/MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md), [ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md). Built on existing ADR-007/015/016/020/021 approvals for independently tiled Apps, complete Required bundle/price preview + single approval, customizable valid starter and growth without a customer fork. **P0 FND-03/05 remain OPEN** pending physical design, approver/billing/compatibility choices and authorized tests; **FND-02 remains OPEN** pending first GL A/B signoff and benchmarks. Founder's Egypt-scale/any-industry/micro-to-enterprise charter governs, but no runtime scale claims. Phase 0 documentation only; NO app code, DB, load testing, VPS or production changes.


## Founder clarification — Phase 0 is Core Constitution first (2026-10-30)

Founder explicitly confirmed that the goal NOW is **a strong general-purpose Architecture Foundation and reusable rules**, **not** a complete low-level technical design for every existing/future Module. Canonical concise rulebook: [DRVO Core Architecture Constitution](DRVO-CORE-ARCHITECTURE-CONSTITUTION.md), subordinate to [Founder Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md). Rules: one product, owned Modules, safe Extensions vs truly independent domains, Tenant isolation, standard evolvable contracts, functional+operational scale, mandatory security/reliability/financial correctness. **Current Phase-0 next actions:** cross-check high-level accepted ADR consistency and stress-test these rules conceptually against micro Salon, multi-branch network, large manufacturer and future Clinic. **Not current implementation priorities:** exact POS Accounting first GL A/B, screenshot account coding, module paid activation state enums, exhaustive failure test plans; these documents remain available as specialist proposals **without erasing accepted founder product behavior**. ADR-030/031/032 are STILL PROPOSED. No implementation, SQL, benchmarks, server or Production changes authorized.


## Constitution alignment and four-industry/size stress review — 2026-10-30

[Seven-Law Consistency Review](../02-architecture/CORE-CONSTITUTION-CONSISTENCY-REVIEW-01.md) checked the platform Constitution against accepted architectural ADR-002/003/006/007/015/016/017/018/019/020/021/029: **no direct contradiction found at this high-level scope**, no implementation evidence or comprehensive conflict-proof claim. [Conceptual Four-Scenario Stress Review](../02-architecture/CORE-CONSTITUTION-FOUR-SCENARIO-STRESS-REVIEW.md) considered 1-chair Salon, multi-branch/multi-Business group, large Manufacturer and future Clinic. Four cross-platform policy questions remain OPEN: (1) mixed-industry **same Business** vs separate Businesses, (2) complex enterprise hierarchy above/beside V1 Tenant/Business/Branch, (3) governed external Extension release ecosystem, (4) region/industry validated release eligibility. **Do not solve individual Module transaction mechanics in Phase 0.** Founder Charter and seven Constitution laws remain unchanged. ADR-030/031/032 still PROPOSED. Docs only; no production/test/code.


## Founder's Business/Industry independence approval — 2026-10-30

Founder accepted [ADR-033 Business Identity Is Independent of Industry](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md). CONST-01 RESOLVED at general platform level; one Business may compose multiple industry activities and compatible extensions; primary industry is non-exclusive onboarding recommendation, separate legal/financial Business units remain separate. [Remaining Foundation Brief](../02-architecture/CORE-CONSTITUTION-REMAINING-FOUNDATION-POLICIES.md) tracks CONST-02/03/04 **PROPOSED / open**. Existing high-level Charter and Seven Laws unchanged except clarification; no Module specifics implemented, no actual scale evidence, no SQL/code/VPS/Production changes.


## Founder's enterprise hierarchy approval — ADR-034 (2026-10-30)

Founder accepted [ADR-034](../05-decisions/ADR-034-OPTIONAL-ENTERPRISE-ORGANIZATION-STRUCTURE.md): Enterprise-ready, Small-Business Simple. Keep V1 Tenant/Business/Branch ownership, add **optional** extensible Enterprise relationships when needed, preserve independent legal/financial books and explicit Business/Branch access. **CONST-02 RESOLVED**, along with earlier CONST-01 (ADR-033). **Only CONST-03 external Extension governance and CONST-04 industry/jurisdiction verified support remain OPEN** in [Foundation Policy Brief](../02-architecture/CORE-CONSTITUTION-REMAINING-FOUNDATION-POLICIES.md). No Company/Subsidiary SQL schema, complex generic organization engine or runtime work approved.
