# DRVO ERP — SaaS Pricing Architecture and Packaging Discovery

**Date:** 2026-10-29
**Status:** DISCUSSION DRAFT. No price points, billing tiers, entitlements, module-specific charges, discounts or payment execution have been approved by founder.
**Purpose:** Commercial rules that scale across independently activated Apps, optional add-ons, multi-Business/Branch Tenants and new Industry Solutions.

## 1. Confirmed constraints / prior ADRs
- Multi-tenant: Tenant Owner → Businesses with independent books → Branches; each Business has its own selected active Modules/Extensions.
- ADR-015: each selected Module shows as an independent user-facing App.
- ADR-016: show every Required dependency and applicable charges in one priced activation preview and receive one explicit approval.
- ADR-017/018: reusable industry solutions and cross-industry scaling; custom enterprise readiness is not guaranteed.
- ADR-020: start each Business with essentials, add Modules later.
- ADR-021: recommended but editable Industry Starter with immutable security/financial integrity.
- Comprehensive Salon commercial V1 feature requirement stays in force despite light **per-Business** starter bundles; standalone Salon Service Execution not in V1.
- ERP subscription billing is separate from DRVO Tech's other products unless an explicit cross-product commercial policy is approved.

## 2. Current market benchmark — not DRVO prices
Odoo public pricing page accessed 2026-10-29: https://www.odoo.com/pricing
- One App Free: one App, unlimited users.
- Standard: all apps; reference page displayed US$24.90/user/month for a discounted annual-billing offer.
- Custom: all apps; reference page displayed US$49/user/month for a discounted annual-billing offer, with listed multi-company/API/Studio differences.
- Official page indicates these displayed discounts may apply for the first 12 months and are subject to region and billing terms. Do not assume local Egypt/Gulf applicability without quote.
These figures are **external competitive context**, never a DRVO price or commitment. Odoo uses all-apps per-user billing as a contrasting strategy to DRVO modular commercial possibilities.

## 3. Pricing hypotheses to compare (NOT approved)
A. **Per Module:** platform fee + each activated app separately. Extremely transparent technically, but customers are penalized for required accounting/catalog/supporting apps, lots of line items and complex onboarding.
B. **All Apps per User:** simple known bill, easier self-service, but can price out small salons with many staff and obscure value of specialist industry capabilities.
C. **Hybrid (recommended for discussion):** clear base plan / Business with included standard business capabilities; branch or active operational-seat allowance and fair expansion tiers; only value-rich premium add-ons or metered external services charged explicitly; custom Enterprise contracts for unusual support/performance/compliance.

## 4. Suggested billing primitives (draft)
- **Tenant/account:** organization identity and owner portal, not automatically a duplicate ERP license for every Business.
- **Billable Business:** commercial entity / independent business deployment and financial books; explicit policy for multi-business bundle discounts.
- **Included branches and active operator seats:** configurable allowances per plan; separate view-only role and actual staff payroll profiles from billable logins (do NOT equate every salon employee record with a paid user).
- **Capability tier / bundle:** define value/performance/features without imposing separate fees for every Required technical prerequisite.
- **Premium Module / industry extension:** charge only when differentiated value justifies it and approval is explicit.
- **Metered external use:** WhatsApp/provider charges, AI tokens, SMS or costly integrations, billed with clear rates, limits and alerts; avoid surprise pass-through or unlimited promises.
- **Enterprise services:** onboarding/migration/training, bespoke integration or dedicated environments/SLA/security paid separately when contracted.

## 5. Candidate plan architecture (labels and contents not final)
| Tier | Who | Included concept | Optional monetization |
|---|---|---|---|
| Start | Small business starting operations | Valid business operations, required accounting/security controls, simple reporting, limited business/branch/operator allowances | Premium apps, messaging, extra branch/seats |
| Growth | Growing multi-branch operations | More included modules/branches/users, better workflows/reporting and management controls | Specialized industry apps, communications/AI usage |
| Enterprise | Large companies needing bespoke governance | Negotiated capacity, support, integrations, deployment/availability and compliance scope | Quoted onboarding/migrations/dedicated resource costs |

The starter wizard must never preselect a paid add-on merely because the app is recommended. A Recommended app that is included at no extra cost **may** be preselected; this exact default behavior remains to be approved. A Required technical capability is never sold as an unexpected surprise.

## 6. Proposed pricing formula (conceptual)
Recurring invoice =
**agreed base tier per Business (or Tenant arrangement)**
+ explicit permitted expansion units (extra Branches, active operational users or other measured allowances)
+ expressly accepted premium Module subscriptions
+ accurately measured metered consumption
+ applicable taxes
− documented discounts/credits.

Separate one-time implementation, import, training and integration fees from recurring license. Keep recurring/one-time/tax breakdown per Business, avoid double charging existing active Required dependencies. Country currency/list prices, tax presentation, renewal FX and invoicing rules require locale-aware policy.

## 7. Customer-facing activation price preview
For any starter or later add-on show:
- selected Business, billing plan/period and currency;
- included and already-entitled apps (no extra charge), newly selected premium apps, technical Required dependencies (charge if legitimately billable, show how covered), and optional apps not selected;
- immediate due, future recurring amount, proration if relevant, taxes, any consumption limits and renewal date;
- pending manual payment status vs entitlement ACTIVE, depending on separately approved policy;
- one explicit consent/approval with actor, quote version/expiry and audit, as ADR-016.

Never equate a draft invoice, offered payment method or manual payment claim to confirmed receipt. Cross-product payments do not automatically count twice.

## 8. Lifecycle edge cases to explicitly settle
- trial/intro package and free plan; no false promise of free unlimited production finance;
- manual collection before payment gateways, unpaid/pending activation behavior, grace/expiry, paid suspension, data/history/export access;
- upgrade immediate or at period boundary, downgrade effective date, paid Module disable while dependent feature needs it;
- refunds/credit notes/proration, 100% discounts/manager approval/abuse audit, immutable ledger, taxes and invoice/receipt issuance;
- inactivity, employee turnover and active-seat accounting, branch closures/reopens;
- multi-business Tenant with independently billed Business or consolidated invoice while maintaining separate ledgers;
- Egypt vs Gulf currencies, local tax/e-invoicing/consumer rights and billing language.

## 9. Measurements before choosing real price points
- Interviews/willingness-to-pay with single Salon, multi-branch Salon, clinic, distributor and enterprise personas.
- True costs: SQL/backups, workers, support, messaging, AI, integrations, onboarding, payments, security and capacity margins.
- Competitor context per country and buyer; pilot quotes and conversion/churn/ARPU, branch and operator distribution.
- Simulate: single salon, 2-branch salon, multi-branch group with different Businesses, large B2B importer.
- Exact plans/price points must be separately founder-approved; no commitments from benchmark numbers.

## 10. Outstanding founder decisions
1. Billing unit preference: per **Business**, per Tenant with business allowance, per active operator seat, or chosen Hybrid.
2. Exactly which operational capabilities included at each plan (don't confuse user-visible App count with technical requirements).
3. Whether included no-extra-cost Recommended apps start preselected; paid add-ons remain unselected until explicit approval.
4. Trials/free tier, limits, one-time onboarding, Enterprise support and country-specific price books.
5. Payment/renewal/proration/suspension/refund controls and activation permission roles.

**No prices finalized; no code, database changes or deployment authorized.**
