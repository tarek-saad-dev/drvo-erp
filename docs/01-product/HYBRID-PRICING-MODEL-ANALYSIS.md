# DRVO ERP — Hybrid SaaS Pricing Model, Plan Architecture and Simulation

**Date:** 2026-10-29
**Status:** RESEARCH + PRODUCT DESIGN PROPOSAL. Founder has requested continued analysis of Hybrid; has NOT approved a Hybrid billing policy, plan levels, actual EGP/SAR prices, meters or activation.
**Related:** [SaaS Pricing Discovery](SAAS-PRICING-STRATEGY-DISCOVERY.md), [ADR-016](../05-decisions/ADR-016-BUNDLED-REQUIRED-DEPENDENCIES.md), [ADR-021](../05-decisions/ADR-021-CUSTOMIZABLE-RECOMMENDED-INDUSTRY-STARTER.md).

## 1. External benchmark — price context, not DRVO quote
Official Odoo pricing page (accessed 2026-10-29): https://www.odoo.com/pricing
- One App Free: one app, unlimited users; its **Required dependent apps are also included for free** (per official FAQ).
- Standard: all apps, publicly shown promotional **US$24.90/user/month** for annual-billing view; non-promotional shown crossed reference **US$31.10**.
- Custom: all apps, promotional **US$49/user/month** for annual-billing view; reference **US$61**. Advertises additional multi-company, API, Studio features, hosting choices.
- Pricing page notes initial user 12-month discount and other restrictions. Different local quote, taxes, billing period and geography may differ.
Competitive lesson: **charging separately for every technical Required dependency creates bad UX**; DRVO should price customer value not invisible prerequisite plumbing. This lesson is an architectural recommendation, not a copied or approved Odoo pricing model.

## 2. Billable dimensions — explicit separation
- **Tenant** = account/customer organization, not automatically the invoice unit.
- **Business** = separate operational/legal/financial business with its own books, activation and modules.
- **Branch** = operating location in a Business. Could use allowance and per extra branch fee.
- **Employee HR record** ≠ active ERP user ≠ cashier POS device ≠ viewer ≠ API integration. Counting payroll profiles as paid seats would unfairly penalize staff-heavy sectors.
- **Active seat** = user access to operational functions; counts/definition must be specified. Named vs concurrent users and turnover handling are pending.
- **Module entitlement** = ability to enable a premium app, not identical to the base technical ledger/cash invariants.
- **Measured usage** = AI, WhatsApp conversation/API credits, SMS, provider transaction fees, storage overages where contract allows; metered rules visible before opt-in.

## 3. Options comparison
| Model | Pricing simplicity | Small Business affordability | Multi-branch fit | Operational risks |
|---|---|---|---|---|
| Per-App alone | Poor for dependent apps | Looks modular but bill grows erratically | Many line items | hidden prerequisites and bill shock |
| Per-user all-apps | Simple | Can become expensive for many salon staff accounts | familiar for larger offices | staff/seat inflation, no value distinctions |
| Per Business flat only | Very simple | predictable | underprices huge multi-site load | one client can be extreme cost outlier |
| **Hybrid (recommended for testing)** | Reasonable if displayed as one coherent quote | configurable included branch/seats | growth in tracked dimensions | requires fair meters and entitlement clarity |

## 4. Candidate price architecture, not amounts
```text
Recurring price (Business, currency, billing period) =
  base plan price
  + extra Branch capacity above allowance
  + extra active operator seats above allowance
  + approved premium Modules/industry capability packages
  + measurable external usage (WhatsApp/AI/providers)
  - recurring approved discount/credits
  + applicable taxes
```
For complex multi-Business Tenant, consider portfolio discount/consolidated SaaS subscription bill WITHOUT merging the Businesses' independent GL books. Define subscription payer and DRVO Tech aggregate revenue separately.

## 5. Three provisional customer bundles (not founder approved)
| Plan | Primary buyer | Included concepts | Possible upgrades |
|---|---|---|---|
| Start | Single small Business | platform, essential accounting/security, basic POS/Bookings where supported; limited branches/operators, baseline reports | more seats/branches; inventory/advanced workflows; premium extensions |
| Growth | Multi-Branch Business | greater operational allowance, advanced reporting, more standard Modules and approvals | premium Industry Modules, extra storage, integrations |
| Enterprise | Large industrial/medical/distributor | negotiated volume and compliant deployment/SLA/integrations/longer retention | scoped implementation, dedicated resources, onboarding contracts |

**Important:** excluded optional app may mean not activated, not necessarily not licensed; plan defines what is INCLUDED, while industry Starter defines what is INSTALLED. Distinguish `AVAILABLE`, `INCLUDED`, `ACTIVATED`, `USAGE`. A plan must never omit mandatory financial control merely to reduce cost.

## 6. Scenarios using algebra rather than fabricated prices
Define B = plan/base fee per Business, R = included branch count, U = included billable active seats, pR = price per extra Branch, pU = price per extra seat, P = approved premium apps, C = metered external consumption, T = taxes, D = discounts.
- **One-branch salon, seats <= U:** B + P + C - D + T.
- **Three-branch salon:** B + max(0,3-R)*pR + max(0,activeSeats-U)*pU + P + C - D + T.
- **Tenant with Salon Business + Clinic Business:** separately calculate licensed fees for each Business, then apply explicitly approved portfolio discount or consolidated subscription billing without combining Accounting GL.
- **Large timber manufacturer:** custom quote from concurrency/sites/regions/modules/integration, availability, privacy, support, onboarding/migration and workload benchmark; not automatically serviced by Start/Growth under untested unlimited limits.

## 7. Starter + Activation quote example (no invented amounts)
A small salon chooses POS + Booking + recommends Inventory (included by selected plan), skips WhatsApp Premium:
- Platform access / mandatory finance controls **included** and not charged as separate hidden apps.
- POS/Catalog and Booking appear as Included/Active or Newly selected depending on actual plan.
- Inventory appears as Recommended, possibly Included by license but not activated if deselected.
- WhatsApp Premium shows optional fee and/or usage if selected, otherwise excluded.
- Quote shows **Due now**, **Recurring at renewal**, **One-time implementation**, taxes, users/branches and next period. All Required dependencies visible by ADR-016; price calculations must come from versioned Billing service, not an Industry manifest.
- If user switches off Booking, recompute any changed needed dependencies and bill rather than silently retain billable app.

## 8. Billing and entitlement lifecycle policies to decide explicitly
- Source of subscription truth and owner authorization for paid bundle; manual-payment reconciliation vs claim that payment succeeded.
- Trial and free plan abuse controls, per plan branch/user limits and downgrade/grace/expiry.
- Upgrade starts immediately vs next renewal; downgrade effective at period end; proration and refund/credit note accounting.
- Premium App uninstall versus retention of posted data and dependency graph.
- Usage alert thresholds and cutoffs without unexpected stop for legally necessary access/export to historical finance.
- Distinguish provider payment evidence, actual settlement and SaaS entitlement activation to avoid false paid states.
- Country currency and VAT/e-invoicing billing policy for Egypt and intended Gulf markets, per legal review.

## 9. Proposed unit economics & research before amounts
For each customer scenario, collect:
- COGS: API/SQL/worker usage, backup/restore, storage, outbound communication/AI, third-party licensing, payment provider charges, support labor and onboarding.
- CAC and sales effort by industry, conversion/trial churn, retention, expected lifetime, customer support complexity.
- Business profile: active branches, peak concurrent operational logins, billable operator seats, invoice/day, messages/month and inventory complexity.
- Model cost and gross margin at p50/p90/p99 usage and stress case; avoid cross-subsidizing one extremely expensive Tenant unexpectedly.
- Interview actual Egypt + country-specific Gulf buyers; choose price books/taxes/terms per jurisdiction.
No real DRVO prices are approved or supplied in these docs.

## 10. Recommendations for founder discussion (NOT accepted)
1. **Prefer Business-based plan** with included Branch/operational seat allowances + premium added capabilities and true metered communications/AI.
2. Keep ordinary required technical Module prerequisites included within plan; charge separately only for differentiated value rather than necessary hidden system engines.
3. **Included + recommended** modules may be preselected in onboarding, removable. Any **extra-cost** add-on remains unselected until explicit consent. ADR-021 approves editability, not preselection policy.
4. Avoid billing each HR employee record: separate HR profile from paid sign-in operator and from POS device use.
5. Pricing page: show one comprehensible monthly/annual plan view plus clear custom Enterprise path, not a 20-column matrix of modules; App Store can show add-on prices and entitlement impact.

## 11. Unresolved sign-off
- Billing metric and plan package boundaries; included allowance values and whether branch or active seat should dominate.
- Which exact Modules are included/free vs premium, base reporting/CRM/booking tiers, whether Inventory has paid advanced functions.
- Exact monthly/yearly prices/country currency and taxes; setup/migration/training and support fees.
- Trial, grace, upgrade/downgrade, refunds, support and backup limits and activation approver.
- Whether included recommended Apps are preselected and how price preview indicates genuinely zero incremental charge.

**Documentation only. Not a priced offer, accepted model, code change or production deployment.**
