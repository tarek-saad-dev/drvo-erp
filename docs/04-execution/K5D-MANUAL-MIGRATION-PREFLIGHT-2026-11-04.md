# K5D — Manual Staging SQL migration dispatch guard (2026-11-04)

## Why this is necessary
A manual run of `staging-db-migrate.yml`, run
[#41769638419](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41769638419),
completed with job `db-migrate=skipped`. A skipped run is NOT proof
that SQL migration 006/007/008 ran; GitHub records no `APPLIED` lines.
It may happen if the operator selected a branch other than `main` or
entered `confirm_database` differently from `DRVO_ERP_STAGING`.

## Fixed UX / unchanged security
- An unconditional `confirm-staging-target` preflight runs first.
- It fails RED with a clear GitHub Actions annotation when the branch
  is not exactly `refs/heads/main` or the confirmation input is
  not exactly `DRVO_ERP_STAGING`, including a concrete corrective action.
- Only after preflight success can the existing manually-approved
  `db-migrate` job run in the **same** `staging-db` Environment,
  using unchanged pinned SSH known-hosts, forced-command receiver,
  scoped SQL migrator, database backup, checksum drift protection
  and commit SHA pinning.
- It does NOT change migrations, secrets, hosts, permissions, or
  authorization to run the database job. It cannot self-trigger.
- The correct operator flow remains Actions > Staging SQL Migrations
  (Manual) > Run workflow > branch `main` >
  `confirm_database=DRVO_ERP_STAGING`.
- Validate actual job logs, not only the run banner:
  expect `APPLIED: 006_owner_operator_approval_audit.sql`,
  `APPLIED: 007_scoped_employee_invitation_procedures.sql`,
  `APPLIED: 008_invitation_management.sql` (if not already present),
  then `DRVO DB MIGRATION PASS: ... 8 total`. If other relevant
  migrations were applied earlier, `UNCHANGED:` is correct; the
  ultimate proof is `DRVO DB MIGRATION PASS` or explicit NOOP.
- This is **not** a green light to enable public auth, Owner onboarding
  or invitations. Staging mail/key/proxy provisioning and real isolated
  E2E checks must still be approved independently.
