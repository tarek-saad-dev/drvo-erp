# DRVO ERP — Technical Design Sign-off Checklist
Date: 2026-10-29
Status: **DRAFT FOR FOUNDER REVIEW — NOT SIGNED OFF — NO CODE AUTHORIZED**

## Baseline (already founder-approved)
SQL Server on VPS; PWA + IndexedDB per-device queue; Required/Optional Module Dependencies; Commission Plan-controlled opening commission rule precedence; all configured tenders selectable online/offline; provisional shift/day close followed by reconciliation; independent Business books, Branch stock and one Branch treasury.

## Four execution policies requiring limited sign-off

### 1. Offline credit exception — ADR-010
**Approved outcome:** immediately record local credit transaction and review credit-limit exceedance after synchronization. The earlier hard stop still applies online only.
**Recommended operational contract (not approved):** canonical sale and receivable preserved; on exceeding credit limit after sync raise a high-priority over-limit case; block *new* credit to the customer pending Manager review (do not void or rewrite the already supplied sale); Manager resolves with collection, adjusted limit under permission, or documented follow-up. Need founder confirmation of blocking new credit and assignment/escalation.

### 2. Offline electronic evidence — ADR-011
**Approved outcome:** record tender using customer-supplied evidence and review discrepancies later.
**Recommended (not approved):** receipt shows 'customer evidence recorded / payment unverified'; invoice sale and tender claim separate from actually settled funds. A customer screenshot/reference alone never marks bank/processor-confirmed payment. After sync, verify provider/settlement record or Manager-approved matching evidence; failed claim creates open settlement exception and due customer balance subject to agreed AR policy. Owner must confirm failed-claim treatment and Manager review power.

### 3. Negative stock costing — ADR-012
**Approved outcome:** last known cost used provisionally and later purchase triggers adjustment.
**Recommended (not approved):** when no historic known cost exists, record quantity movement and mark COGS costing exception, do not invent zero cost; finalization requires available cost and explicit allocation method. Link receipt-based cost adjustments to original movements via immutable entries and deduplication. Define match ordering and Business cost-method set.

### 4. Late offline sales — ADR-013
**Approved outcome:** original sale/business date retained while journal posted to currently open accounting period with documented adjustment.
**Recommended (not approved):** create late-posting exception reference, preserve original device event, shift, invoice dates, sync timestamp and current period journal. Do not reopen/alter closed journal by default. Tax point and filing treatment must be validated per Egypt/Gulf jurisdiction; fiscal reporting cannot automatically assume GL date equals taxable date.

## Cross-cutting constraints requiring technical validation
- SQL Server edition and instance version, licensed environment, disk and backup/restore test, least-privilege app/service accounts and network/TLS.
- Framework baseline recommended Next.js frontend + NestJS modular monolith and independent workers; TypeScript, SQL Server data access driver/ORM to be selected after transaction and migration proof.
- PWA IndexedDB may be deleted/evicted; test device matrix and crash/data-loss drill; preverified offline login lifetime and role revocation risk policy pending.
- Tenant/Business/Branch isolation and employee permissions enforced in database transactions and workers; audit sensitive acts; source financial entries immutable and traceable.
- Currency decimal/rounding; commission rule specificity; journal mapping/tax and receipt proof types remain detailed implementation contracts.

## Sign-off gates and test examples
1. Two offline devices each sell 800 credit against a customer with limit 1000: total 1600 shown, review case raised, nothing silently lost or marked compliant.
2. Fake InstaPay screenshot never produces settled funds; discrepancy visible and attributable.
3. Negative stock with historical cost 100 and replacement cost 120: provisional 100, linked +20 adjustment once; unknown prior cost causes exception not fabricated figure.
4. October 31 sale synced November 3 after close: October sale date retained, November journal clearly linked; applicable tax policy reviewed.
5. 20 retries yield one invoice, ledger, stock and commission effect; accurate provisional/final cash closure; lost device incident manually reconciled.
6. Reopen financial period with permission does not edit posted journal originals; cash-shortage payroll recovery still requires separate approval.

## Explicit sign-off questions
A. On over-limit offline credit, suspend further customer credit until scoped Manager review?
B. On unverified electronic claim, record sale with unsettled tender and on failed verification put amount due into customer account / exception (for unidentified walk-ins, a collection exception instead)?
C. With no last known cost, hold cost calculation as 'requires cost', not zero?
D. Allow accounting posting in open period subject to country tax-compliance review even if fiscal tax period differs?
E. Confirm target POS devices/browser/storage and SQL Server VPS version/backup owner before technical implementation.

No affirmative answers have been recorded for A-E. Approval of this document is not inferred from 'let's go'. Explicit owner permission for code remains separate.
