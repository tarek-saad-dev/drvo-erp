# Implementation Readiness — Final Financial Decisions Assessment

> **ADDITIONAL NON-NEGOTIABLE GATE (ADR-029):** Before authorizing platform code, every new architectural implementation must pass founder's [3-Pillar Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) and [Universal ERP Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). This adds multi-industry reuse, small Business minimum valid starter, enterprise-specific workload/isolation/evolution path to existing money/offline readiness checks. No implementation authorization inferred.

Date: 2026-10-29. Status: **Business rules recorded; NOT authorized to code**.

## Newly approved
1. Offline credit recorded immediately on device; over-limit reviewed after sync (ADR-010). Explicitly weakens prior hard-stop for offline only. Required excess-credit incident, reviewer and remediation decisions remain.
2. Offline e-tender recorded from customer-provided evidence, with discrepancy review (ADR-011). Evidence != provider settlement. Invoice balance and failed-evidence accounting semantics unresolved.
3. Negative stock uses last known cost provisionally then adjusts on purchase (ADR-012). First-ever product without known cost and multi-receipt allocation need design.
4. Late offline sale preserves sale date and posts in currently open period with linked adjustment (ADR-013). Tax/legal period boundaries require validation.

## Readiness outcome
**Ready for detailed technical design and acceptance-contract signoff, NOT fully ready to begin all feature coding.** The user expressly forbids code until explicit approval. Preliminary architecture: SQL Server VPS, Next.js UI, recommended NestJS modular monolith, PWA IndexedDB device queue, outbox, tenancy isolation. No migrations or deployment.

## Critical pre-code product/engineering contracts
- Consequences and owner of excessive offline credit once reconciled; online remains hard stop.
- Offline electronic customer proof: receipt/paid labels, canonical payment states, customer debt if claim fails, who verifies and how.
- Costing gap with no last known cost, negative layer matching, price adjustment journal.
- Late taxes and statutory posting, period-close amendment requirements for Egypt/Gulf.
- Data storage/credential encryption and retention, offline login TTL, queue loss testing.
- SQL Server version/edition/resource/licensing, backup restore test, DB driver/ORM selection.
- Precise chart-of-accounts/tax mapping, monetary rounding and commission rule conflict resolution.

## Cursor Plan (not to run yet)
Gate 0: accept missing financial accounting/payment contracts and operational/security environment. Gate 1: test scaffold SQL Server + Next/Nest, Tenant/Business/Branch security. Gate 2: core business entities and append-only financial outbox. Gate 3: POS and Treasury. Gate 4: Accounting and stock-cost adjustment. Gate 5: Salon HR/commissions. Gate 6: PWA offline replay, loss case and failure recovery. Gate 7: branch pilot with reconciliation, security and rollback tests. No phase starts without user go-ahead.

## Gate tests
Two-device credit limit exceeded flagged and not silently discarded; fake customer screenshot never confirmed money; negative COGS adjusted once; delayed October sale posted in November while showing October business occurrence; tenant/branch isolation; event retry only once; refund reversals; GL debit=credit; loss incident documented.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**
