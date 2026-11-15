# ADR-039 — Founder-approved temporary fast development mode: direct main + primary database

**Date:** 2026-11-15  
**Status:** **FOUNDER-APPROVED TEMPORARY WORKFLOW — effective immediately for internal pre-customer development**  
**Supersedes:** previous requirement to use a Pull Request for **every internal development change** while this mode remains active. It does **not** supersede ADR-030 Tenant isolation, ADR-031 financial posting approval, ADR-032 trustworthy activation, ADR-037 domain ownership, or independent external customer launch gates.  
**Decision owner:** Founder  
**Source of truth:** this repository (portable to ChatGPT, Cursor and other editors)

## Context and explicit decision

DRVO ERP presently has **no real customers**. The founder explicitly prioritizes delivering a working product quickly rather than spending development time on repeated PRs, separate staging databases and artificial release bureaucracy.

For the **temporary pre-customer internal development phase**:

1. **Commit directly to `main`**. Creating a feature branch or PR is **not mandatory** for normal approved implementation, tests, bug fixes and documentation. Do not create administrative PRs just to record a development change.
2. The **existing primary DRVO ERP database** is the intended single working development database instead of spinning up another separately operated staging database for day-to-day app work. A dedicated staging topology and PR workflow already exist in architecture and remain available for later reactivation.
3. Prioritize **small, working vertical slices**, rapid iteration and straightforward commits. Run relevant build/tests on direct-main changes and fix regressions. Keep architecture/ADR/current-state docs synchronized with consequential changes **directly on `main`**.
4. CI-only ephemeral SQL and browser tests **may remain** as automated safety regression checks. They do not become the canonical persisted development database and do not need to block an internal feature because a separate staging deployment is unavailable.

## Operational boundaries — intentional, not bureaucracy

- **Primary database means primary DRVO development database**, even if this is hosted on the main VPS. No assumption is made that live DB access, backups, schema version or current permissions have been independently verified. **This ADR records a workflow decision, not evidence that a migration was applied.**
- **Before any actual primary-DB schema/data mutation**, establish a restorable **backup/checkpoint**, confirm the **target DB identity and existing migration state**, run the **exact reviewed incremental change** and verify the resulting schema + application behavior. Use a reversible or explicitly recoverable approach; do not run `DROP` / truncate or wipe rows merely for speed. If the backup or connectivity cannot be verified, implement/commit source now and report the operational DB step as blocked—not completed.
- Never copy real secrets or backup data into GitHub, logs or test fixtures. Restrict DB administrative credentials; prefer short safe migration commands over unrestricted application-user DDL.
- Continue **Tenant / Business / Branch isolation, server-side authorization, least privilege, Default Deny, auditability and independent Module ownership**. Not having real customers is not permission to remove the isolation contract.
- **Development access is internal-only.** This decision alone does **not** authorize Public Auth, real customer PII, issuing real commercial or private Pilot grants, exposing the main DB publicly, enabling financial POSTED / GL or accepting paid transactions. Relevant earlier approvals remain independently required.
- **P1–P7 first real Salon Pilot and C1–C3 commercial gate statuses remain OPEN** in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106). Do not treat direct-main CI success or a primary-DB dev migration as external launch acceptance, live security/restore attestation or approved production access.
- Prefer GitHub's normal direct-file commits and existing workflow checks; if branch protections technically block direct writes, **report the blocker** rather than bypassing security settings without explicit approval.
- For sensitive or destructive operations, scope/backup/checkpoint and verification remain mandatory; the speed decision is not a blanket authorization for irreversible data loss.

## Implementation / reporting contract

For each change: explain cross-module/architecture impact briefly; commit code and relevant docs **direct to main**; execute/check available tests and CI; report exact changed files/commit SHA, tests, confirmed DB modifications (or **not applied**), deployed status (or **unverified**) and next work. Do not claim a successful live deployment without independent evidence.

## Exit criteria / reactivation

Re-enable **PR review + a separate staging database/environment** when the founder explicitly reverses this decision, **before onboarding the first external Salon or storing real customer data**, or when multi-developer collaboration/paid operation requires approvals and review. Restore the existing architectural process rather than designing it again. Document the reactivation decision in a new ADR or amendment here.

**Related:** [START-HERE](../00-start-here/START-HERE.md), [CURRENT-STATE](../00-start-here/CURRENT-STATE.md), [ROADMAP](../04-execution/ROADMAP.md), ADR-030/031/032/037, [First Salon Gates](https://github.com/tarek-saad-dev/drvo-erp/issues/106).
