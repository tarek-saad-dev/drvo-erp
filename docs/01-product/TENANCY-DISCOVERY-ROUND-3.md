# DRVO ERP — Tenant & Business Discovery (Founder Answers)

**Date:** 2026-10-28  
**Status:** Founder choices recorded; detailed schema/contracts not approved  
**Scope:** 40 answered prompts; deferred choices explicitly unresolved.

## Tenant / Business Ownership

| # | Founder answer / status |
|---|---|
| 1 | Tenant represents owner account able to own multiple Businesses |
| 2 | One Tenant supports mixed industry types |
| 3 | Independent Business name/logo/branding |
| 4 | Independent Business financials with consolidated reports |
| 5 | Owner consolidated financial and operational dashboards |
| 6 | DEFER: transfer Business between Tenants |
| 7 | DEFER: business co-owners and equity shares |
| 8 | Multiple Businesses of same industry per Tenant |

## Branches / Data Sharing

| # | Founder answer / status |
|---|---|
| 9 | Every Branch belongs to exactly one Business |
| 10 | Customer directory shared across Branches within a Business |
| 11 | Central catalog prices with Branch overrides |
| 12 | Employee may work in multiple Branches with schedule and scoped permissions |
| 13 | Branch-level inventory and interbranch transfers |
| 14 | Branch-level treasuries and shifts |
| 15 | Customer may book any Branch using same Business customer account |
| 16 | Staff, goods and funds transfers between Branches with movement history and approvals |

## Users / Access

| # | Founder answer / status |
|---|---|
| 17 | Separate account per Tenant, no single user membership spanning Tenants |
| 18 | RBAC scopes Tenant, Business, Branch |
| 19 | Default roles with owner customization |
| 20 | Different role per Branch for same User |
| 21 | Profit and service-cost visibility restricted to managers (owner/admin exception TBD) |
| 22 | Restore last-used authorized workspace; allow switching |
| 23 | Username and password login |
| 24 | Audit all sensitive operations |

## Modules / Entitlements

| # | Founder answer / status |
|---|---|
| 25 | Module activation per Business |
| 26 | Different modules per Business |
| 27 | Deactivate module while retaining its data |
| 28 | Industry defaults with custom overrides |
| 29 | Multiple Extensions per Module supported |
| 30 | RECOMMEND: explicit checked module dependencies; not yet approved |
| 31 | DEFER: subscription limits |
| 32 | Paid modules: Owner requests; Super Admin approves |

## Isolation / Lifecycle / Scale

| # | Founder answer / status |
|---|---|
| 33 | Shared database with tenant isolation |
| 34 | DEFER: expired subscription access |
| 35 | DEFER: tenant/business export |
| 36 | Decide deletion policy by data type and law |
| 37 | Disable former employee account while retaining history |
| 38 | Language/currency/timezone at Business level |
| 39 | Expected branches per customer: 1–5 |
| 40 | Expected Users per Tenant: 1–20 |

## Important interpretation constraints

- A separate account for each Tenant means no shared **login membership** across Tenants. Identity uniqueness strategy (tenant-qualified usernames, emails, credentials and invitations) is not yet defined.
- Business financial segregation and Tenant-wide reports do not authorize cross-Business mutations or automatic ledger consolidation. Consolidation policy and currency translation remain open.
- Owner/Super Admin access to profit reporting is to be clarified; "managers only" is not yet a full permission matrix.
- Business-level currency/language/timezone is approved as preference, but multiple countries/branches within one Business need a design decision.
- Paid module workflow is **Owner requests → Super Admin approves**; manual subscription collection is separately approved, while entitlement/payment reconciliation is open.
- Module Dependencies (Q30) were referred to architect recommendation. **No founder approval yet**; recommend explicit dependency declarations, dependency DAG checks, activation validation and safe deactivation.
- Items Q6, Q7, Q31, Q34, Q35, Q36 are deferred; do not assume specifics.

## Acceptance criteria to design

- Two Tenants cannot read or mutate each other's data even using guessed IDs.
- Two Businesses of same type within one Tenant have separate branding, accounting and settings.
- Cross-Branch customer access works only within the Business and approved scope.
- Per-Branch roles and scoped staff schedules are enforced server-side.
- Module activation/deactivation is per Business, retains existing data, and enforces extension compatibility and approved entitlements.
- Branch transfers record actor, source, destination, approvals and balanced operational/accounting effects where relevant.
- Consolidated reports show provenance and do not violate Business boundaries.

[Tenancy blueprint](../02-architecture/TENANCY-ARCHITECTURE.md) · [Open questions](../04-execution/OPEN-QUESTIONS.md).

## Final follow-up answers (2026-10-28)

1. Module Dependencies: discuss design first — **Open**.
2. Profit/cost visibility: Managers always see these within their authorized scope — **Approved**.
3. Currency/language/timezone: Business-level only, no Branch overrides — **Approved**.

These answers supersede any conflicting proposals in this document; original survey answers are preserved as history.
