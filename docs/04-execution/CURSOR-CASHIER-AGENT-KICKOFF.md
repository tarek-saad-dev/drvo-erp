# Cursor handoff — paste into Cursor Agent

You are the lead implementation agent for the FULL Cashier → DRVO ERP port. Work directly in the DRVO repo with read-only access to the Cashier source repo.

Before any work, open:
`docs/04-execution/CURSOR-CASHIER-FULL-MIGRATION-EXECUTION-2026-11-19.md`

Execute that whole contract. This is a LONG-RUNNING IMPLEMENTATION PROGRAM, not a request to summarize or produce another plan. Read all authoritative GitHub docs, inspect both repositories and pinned SHA, create and maintain the complete source-to-target workflow ledger, and implement small working PRs continuously.

Immediate first deliveries: (1) scoped server-side Customer phone/name search + duplicate policy tests; (2) original Cashier POS UI/state adaptation to DRVO private workspace, preserving every behavior and displaying blocked financial actions honestly; (3) source read-only historical Cut adapter with id maps and real data reconciliation preflight; (4) expand Booking, HR/Barber, Operations and Treasury in parallel by independent owners. Continue into all remaining modules, UX and integrations; skip no feature silently.

Do not activate public authentication, apply primary VPS SQL migrations, touch Cashier production data, enable paid sales/posting or change critical finance policies without existing ADR gates and verified backups. Develop all unblocked source/test/dry-run slices first and keep moving.

At each commit report exact source feature coverage, target changed files, tests, private browser proof, flags, deployment status and gaps. Do not say the migration is finished until all original Cashier workflows have independently verified parity. If agent context ends, checkpoint exact commit and next executable commands so the next Cursor session can resume without losing anything.
