# DRVO ERP — Salon V1 Ownership & Dependency Starter (Pre-Code)

**Date:** 2026-11-01  
**Status:** **PROPOSED PER-MODULE OWNER / INITIAL ACTIVATION GRAPH; does NOT override ADR-020/021 or approve specific Required edges, prices or V1 App tile inventory.**  
**First target:** comprehensive Salon commercial V1 / Cut Salon validation; one recommended customizable Business Starter with minimum valid selected Modules and additive growth. Separate commercial launch from staged *engineering*, per accepted product strategy.

## 1. Make Salon a composition, not a custom ERP

| Capability | Suggested accountable owner | Industry-specific adaptation / notes | First use in build |
|---|---|---|---|
| Tenant, Business, Branch, membership, username/session, permissions, activation | **Lean Kernel** | Same for Salon, Clinic, Retail, Manufacturer; business not hard-typed as Salon | Foundation Milestone |
| Products/services, variant/service duration, pricing snapshots | **Catalog Module** | Salon packages and service attributes at bounded extension points | Early domain dependency for POS |
| Customer/contact/phone and scoped lookups | **Customers/CRM Module** | Booking identity/contact channels; medical clinical records not part of it | POS/Booking when relevant |
| Sales/order, quote/draft, invoice/return, source operation ID | **POS / Sales Module** | Executor/barber, optional opener and service attribution through Salon extension; must not own GL | Initial online Salon slice |
| GL accounts, balanced journals, AR, period close/reversal | **Accounting Module** | Verified country tax rules, distinct Business ledgers | Must contract with mandatory POS posting before operational rollout |
| Cash drawer, branch treasury, cash count and provider settlement status | **Treasury Module** | Branch-level custody/shift interactions with POS; tender evidence != settled payment | Alongside finance/POS slice |
| Appointment, time slot, barber/chair resource booking | **Booking Module** | Salon barber/chair allocation via bounded Salon extension | Booking slice |
| Employee profiles, commission plans, targets, attendance, payroll | **HR Module** | Executor/optional opener, service commission plans, and attribution | Later operational slice |
| Products/consumables, recipes, stock, purchase and costing | **Inventory/Purchasing Module(s)** | Salon consumable recipe, branch stock/cost pending; decide Purchasing ownership when spec authored | Later operational slice |
| Reporting dashboards / exports | **Owned domain read models + optional shared Reporting capability** | No universal unscoped joins | Parallel read-only after source contracts |
| WhatsApp reminders and notifications | **Optional scoped Integration** | Booking, consent and template mapping; never blocks POS posting | Optional; NOT mandatory to first financial correctness |
| Print receipts / POS device | **Device adapter + POS-approved receipt contract** | Printer portability and offline device constraints | After basic POS transactional semantics |
| DRVO subscription and plan charging | **Adjacent DRVO commercial billing + Kernel entitlement gate** | Distinct from Salon income/Accounting | Foundation test grant first, real billing before commercial release |

**Explicit accepted exception:** **No standalone Salon Service Execution Domain Module in V1** (ADR-020). Barber service execution/commissions must fit approved POS/Booking/HR/Inventory contracts and bounded Salon Extensions; if a genuine new lifecycle emerges later, propose a separately owned Module via ADR-019 rather than forcing it now.

## 2. Dependency graph: candidate edges to ratify, NOT silently accepted

| Proposed use case | Candidate Required | Optional / conditional | Needs owner signoff |
|---|---|---|---|
| POS selling catalog-defined products/services | Catalog price snapshot contract; mandatory Accounting posting dependency for POSTED sale where adopted | Customers for anonymous cash sales; optional customer credit requires Customer/AR scope | Exact POS/Catalog/Accounting/Treasury edges + critical finance invariant |
| POS recording physical cash/tender | Defined Treasury custody/settlement contract on applicable tenders | Payment gateways and AI/WhatsApp do NOT become required | Treasury critical versus eventual effects |
| Booking authenticated client appointments | Valid Customer/contact reference if business model requires | WhatsApp reminders, HR barber availability API | Whether Customer Module is Required for all booking types |
| HR commission from paid services | POS owned service execution attribution event/contract | Booking linkage; inventory recipes | Actual event names, effective earning and refund reversal |
| Inventory consumption from service sale | POS source contract, Inventory-owned recipe/cost rules | HR executor fields only as needed | Offline negative stock and Cost Pending |
| Country-specific Salon starter | Verified eligible Module/Extension versions | Optional integration and extra modules | Egypt actual localization, country compliance |

**Policy already approved:** platform enforces **Required and Optional** declared dependencies, rejects conflicts/invalid combos and previews the full Required transitive closure with prices in **one explicit approval** (ADR-007/016). The examples above are **candidate edges**, NOT ratified dependencies or an installed package.

## 3. Define the minimum valid demo starter without hiding comprehensive Salon V1

**Engineering fixture (not a commercial SKU):** create one disposable test Tenant, one Business, one Branch, an Owner with explicit Membership, two scoped users, static free test grant and mock approved Catalog/Customers capabilities with one independently shown App tile each. This proves Kernel auth + registry + scoped activation without pretending Accounting/POS is implemented.

**First actual business vertical slice:** propose Catalog → minimal online POS draft → mandatory Accounting/Treasury financial contract and posting verification. Do not mark real Posted invoices before the chosen ADR-031 financial semantics are implemented and tested. Build Booking and later HR/Inventory as separate, composable deliveries. **The commercial V1 scope is still comprehensive; engineering slices are not a reduced public edition.**

## 4. Cut Salon real pilot constraints to preserve

- The legacy Cashier is reference and remains a separately controlled system; **do not copy its codebase as foundation** and do not silently overwrite/migrate customer data.
- DRVO is the planned booking system of record under prior product direction, but coexistence, duplicate avoidance, source of truth for each other domain, import/export, switch-over and rollback need a written pilot data-contract and validation.
- The real first pilot includes all Cut Salon branches before commercial declaration; stage and test with disposable/anonymized data first.
- Every configured offline tender can be selectable under later decisions, but selection/evidence never becomes confirmed bank settlement. PWA device queue, worker replay, credit cap and closed-period behavior follow accepted ADR-009–013 and require implementation safety tests.
- Manual DRVO subscription collection first; price, discount, free grant/trial, payer and approver are still distinct commercial design questions, not Salon POS accounting.

## 5. Required Module sign-off packet (before each domain implementation)

For every owner above fill [Standard Module Contract V1](../02-architecture/STANDARD-MODULE-CONTRACT-V1.md): purpose, canonical tables/aggregates and scope, sensitivity, Core/Extension hook, commands/events, version/Required/Optional/conflicts, account/tax impact, status/retry/disable semantics, and exact negative/finance/performance test plan.

**Pre-code blockers for POS posting:** signed ADR-030 trusted scope; accounting and tender source-of-truth/GL mapping + selected ADR-031 posting contract; testable idempotency and refund/period contract; actual SQL Server transaction driver.  
**Pre-code blockers for paid module activation:** final ADR-032 lifecycle, billing authorization/rights and concurrency; not needed for static **free test-grant prototype** after authorized engineering begins.

**This document does not approve the final Salon App catalog/edges or authorize code, migration, staging, pilots, or Production.**
