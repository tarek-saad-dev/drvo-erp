# DRVO ERP — Salon-first Go-to-Market Strategy V1 (working plan)

**Date:** 2026-11-10  
**Decision status:** Founder-approved strategic direction: focus initial GTM on men's/barber salon operators while retaining **DRVO ERP** as the master multi-industry platform brand.  
**Planning status:** All detailed channel allocations, targets, budget ranges, offer terms, and dates in this document are **proposals to validate**, not approved prices, contractual commitments, or proof of implemented product capabilities.  
**Execution status:** Strategy/documentation only. No customer-facing launch, live sign-up, paid campaign, production deployment, or feature activation is authorized or claimed.

## 1. Strategic fit and non-goals

- Master brand: **DRVO ERP** — a modular, multi-industry Business Operating System ambition. Do not spin off a Salon fork, independent service, or isolated product architecture.
- Initial buyer-facing solution/campaign label: **DRVO for Salons** (working campaign descriptor, not a new software project or legally cleared trademark).
- Initial commercial vertical: men's/barber salons in Egypt; salons with multiple branches are the primary first-year ICP.
- Future industries remain part of DRVO's long-term positioning; **Clinic is next after separate regulated-domain discovery and readiness gates**, not an immediately available feature.
- Egypt and Gulf markets remain founder-approved initial commercial aspirations. Narrow Egypt-first **demand research and channel experiments** are a sequencing recommendation, **not** a change to the founder-approved intended commercial launch geography.
- Keep the comprehensive Salon V1 commercial-release acceptance policy: internal QA and Cut Salon all-branch validation precede commercial launch. No public partial/pilot edition may be advertised as available.

## 2. The current truth gate (read before publishing)

The engineering repository documents staging foundation, identity/onboarding work and protected feature flags. This is not a customer-ready Salon ERP. **Marketing must not claim an available app, registration, live demo, production account, verified accounting/offline workflows, Saudi/Egypt tax certifications, proven uptime, or completed Cut Salon results without separately verified release evidence.** Staging routes and staging API must never become a public sales/signup flow.

Allowed now: brand awareness, concept education, consent-based waitlist, interview invitations, transparent build journey, and clearly labeled conceptual previews. A separate marketing landing page and consent-based lead CRM are proposals; neither is implemented by this decision.

Sources of truth: [Current state](../00-start-here/CURRENT-STATE.md), [Roadmap](../04-execution/ROADMAP.md), [V1 release strategy](MVP-RELEASE-STRATEGY.md), [Vision](VISION.md), [Accepted ADR register](../05-decisions/DECISIONS.md).

## 3. Ideal Customer Profiles / buying committee

| Priority | ICP | Qualification signals | Main pains | Call-to-action now |
|---|---|---|---|---|
| P1 (70% effort hypothesis) | Owner/partner of 2–10-branch men's salon group | Multiple branches; decentralized operations; owner controls purchasing | Reconciling branches, cash close, commissions, visibility and trust in reports | Join a research interview |
| P2 (20%) | Owner of busy one-branch salon preparing second site | Employees, frequent daily services, expansion within 12 months | Excel/WhatsApp/manual handoffs do not scale | Share challenges / interest |
| P3 (10%) | Operations/finance manager at salon chain | Authorized operations decision influencer | Inconsistent branch procedures, fragmented data and reconciliations | Join discovery call |

**Priority percentages and 2–10 branches are targeting hypotheses, not validated market statistics.** Buyers: economic decision maker = owner/partner; influencers = operations manager, accountant, branch supervisor; users = reception, cashier, barber/team.

Discovery screen: number of branches; current systems and reporting process; monthly transaction band (optional); top pain; purchasing role; horizon (0–3 / 3–6 / 6–12+ months); preferred contact and explicit permission.

## 4. Positioning, message testing, and competitive frame

**Category:** salon operations and business-control platform, built on DRVO ERP's modular multi-industry architecture.  
**Working positioning:** For growing salon operators, DRVO aims to connect branch operations with trustworthy financial control, workforce workflows and management visibility in a simple Arabic-first experience. Not proof of delivered functionality.

Message tests (rank using customer interviews):
- M1 **Owner visibility:** "هل بتعرف نتيجة كل فرع من غير ما تستنى تقارير آخر اليوم؟"
- M2 **Commissions + cash close:** "إزاي بتراجع مبيعات وعمولات الفريق وإقفال الخزنة من غير خلافات؟"
- M3 **Growth without chaos:** "فرع تاني ماينفعش معاه نفس الدفاتر والرسائل."

Don't claim booking, POS, stock, payroll, multi-branch, or offline as exclusive advantages. Fresha, Muzain and regional competitors already advertise overlapping capabilities; validate differentiation through proof and workflow fit, not "only platform" superlatives. Reference sites: https://www.fresha.com/for-business/features and https://www.muzain.com/ (vendor statements, not independent audited evidence).

## 5. Brand system and tone

- Use **DRVO ERP** as the primary brand on profiles, handles, domain, footer, design system and product story. Campaign: "DRVO for Salons".
- Apply accepted ADR-024 **Plum #74536E, Teal #1A7B80, soft neutrals**. A brand identity design pack, logo and tagline require separate approval; neither generic campaign descriptor nor sample tagline is accepted brand identity.
- Primary language: natural Egyptian Arabic for owner/operator messaging, English technical terminology where appropriate. Simple, useful, non-hyperbolic, low-jargon.
- Never copy Odoo/Fresha brand assets or UI. Product mockups not derived from real code must be labeled **concept / planned**.
- One central corporate presence plus salon-specific website landing section/campaign; avoid separate technology/product branches, conflicting social brands or independently priced editions.

## 6. Funnel and planned assets

Funnel: **target account / organic reach → relevant problem content / individual approach → salon landing page or WhatsApp → consented lead → qualification → 20-minute discovery call → candidate design partner/waitlist → release-gated product demo → post-release commercial sales**.

Assets, in order:
1. Brand minimum viable kit: approved lockups, color/font rules, 4 social templates, profile copy and disclosure.
2. Marketing-only landing page at a separately reviewed public URL, not a staging business route; hero, three core pains, vision/roadmap disclaimer, FAQs, research/waitlist CTA, data consent/privacy/contact.
3. CRM pipeline with source + campaign UTMs, role, branches, pain, stage, interview date, consent and unsubscribed state. Avoid taking customer financial/employee/client datasets.
4. Discovery call guide, short qualification form, follow-up templates, interview log and feedback themes.
5. Product screenshots/verified case study only after feature testing, brand approval and explicit customer consent.

Lead stages: New → Consented → Contacted → Qualified → Interviewed → Design Partner Candidate → Nurture → Release-Ready Demo → Customer (after commercial approval); Closed / Unsubscribed separately. No fictitious revenue or customer counts.

### Landing copy (illustrative)

Hero: **"عندك أكتر من فرع؟ محتاج تشوف شغلك كله بوضوح."**  
Subhead: "DRVO ERP منصة إدارة أعمال قيد التطوير، وأول تركيز لينا صالونات الحلاقة. بنسمع من أصحاب الصالونات علشان نبني نظام يخدم التشغيل الحقيقي."  
Primary CTA: **"شاركنا تحديات إدارة صالونك"**. Secondary CTA: **"سجل اهتمامك بتحديثات الإطلاق"**.  
Footer: **"المنتج قيد التطوير. التسجيل للاهتمام أو البحث فقط، ولا يتيح حسابًا أو تجربة تجارية حاليًا."**

## 7. Channel strategy and sales motion

- **Founder-led account outreach, highest priority:** develop a manually reviewed target list of 80–120 salon groups/owners in initial experiment; prioritize warm introductions. Invite to research, not a product pitch disguised as available service. No bulk scraping or spam; comply with consent requirements.
- **Facebook + Instagram:** pain-based short video, carousels and relevant local salon community conversations; one salon landing destination and honest call to action.
- **LinkedIn:** reach business owners/operations managers; transparent build-in-public and accounting/operations themes.
- **Partners:** barber training academies, suppliers, accountants and consultants; offer a joint educational session first, not unapproved referral commissions or incentives.
- **SEO:** Arabic evergreen pages focused on multi-branch salon operations, commission reconciliation, booking workflow and branch closing; avoid claiming unverified functionality.
- **Paid experiments only after consent/attribution & landing readiness:** test small Meta click-to-WhatsApp or Lead Form campaigns. Count **qualified leads**, not raw chats. Budget is a cost cap proposal, not an approved expense. Suggested later test: EGP 5,000–10,000 over 30 days, split across 2–3 messages and evaluate on qualified conversation and interview booking. No automatic spend.
- **Gulf:** interview prospects and research regulatory/operational gaps separately before country-specific ads or live-support claims.

## 8. Editorial plan (four weeks, reusable)

Cadence hypothesis: **three useful posts weekly**, one of them a 30–60s video. Optional interactive story/poll once weekly. Theme mix: 60% operations education, 25% discovery/build transparency, 15% brand.

| Week | Post A (educate) | Post B (pain) | Post C (video or dialogue) |
|---|---|---|---|
| 1 | 5 mistakes in multi-branch salon reporting | Why revenue ≠ cash in drawer | Founder: what DRVO is and is not |
| 2 | Commission calculation questions to ask | Owner vs manager reporting needs | One 20-minute discovery invitation |
| 3 | Daily closing checklist for salons | Booking/POS/stock data handoff mistakes | Process map labeled conceptual |
| 4 | Preparing for opening branch two | What to compare between branches | Interview findings (anonymous, consent-safe) |

Every post: one problem + one useful insight + one allowed CTA ("احكيلنا تجربتك" / research interest), disclose **under development** on promotional posts. No invented metrics or fabricated product screenshots. Repurpose one recording across Instagram Reels, Facebook and LinkedIn with channel-appropriate editing.

## 9. 90-day execution plan, conditional on capacity (no release date)

| Interval | Deliverable | Leading indicators | Go/no-go gate |
|---|---|---|---|
| Days 1–15 | minimum brand pack, persona list, interview guide, landing copy, privacy/consent | 40 target accounts, 8 interviews invited | positioning, privacy and publish approval |
| Days 16–30 | publish owned channels + marketing-only landing; direct outreach and organic content | 10–15 interviews completed; 30–50 consented leads aspirational | no false availability, CRM hygiene |
| Days 31–60 | 3 message experiments; publish operations content; partnerships | 20–30 cumulative interviews; 60–80 interested leads target | ≥2 repeatedly observed pains, repeatable qualified outreach |
| Days 61–90 | pick winning persona/message, design partner candidates, small ad test if authorized | 80–120 cumulative consented leads; 15–20 qualified leads; 5 design partner candidates | only convert to demos after actual product release-gate evidence |

**Targets are planning hypotheses**, not forecasts. If 10 interviews invalidate the message, pivot the wording before buying traffic.

## 10. KPI definitions and weekly decision cadence

- **Consented lead:** reachable contact who explicitly accepts relevant follow-up.
- **Qualified lead:** fit to P1/P2/P3, has operational pain, identified buying influence and time horizon.
- **Interview booked/completed:** separate measures; no-shows don't count as completed interviews.
- **Lead→Qualified rate:** qualified leads / consented leads; measured by channel and persona.
- **Lead→Interview rate:** completed discovery calls / consented leads.
- **Cost/qualified lead:** ad spend / qualified leads from that ad (report sample size; not equivalent to CAC).
- **Time to first response:** during stated business hours; measure median.
- **Design partner candidate:** interest in collaboration, not product access or commercial deployment.
- **Paid pilot/customer:** **zero until accepted V1 commercial-release gate**, with verified contract/payment after approval.

Weekly 30-minute review: acquisition source, interview themes, message tests, meaningful opt-ins, channel cost, unsubscriptions, risks and next week's one experiment. Monthly owner review for budget and positioning.

## 11. Pricing and offer guardrails

Price points, trials, branch/user billing, discounts, payment acceptance and Saudi/Gulf country book prices remain **unapproved**. Research willingness-to-pay using neutral questions about current spend, switching cost and perceived value rather than publishing a subscription number. No "free 90-day trial", "founding customer discount" or payment collection without separate written owner approval and tested entitlements/billing.

## 12. Transition to commercial launch

Before enabling any "Book a Demo", "Start Trial", signup, access, paid subscription or public claims of accounting/security:
- Verify the actual Salon V1 end-to-end product workflows and acceptance scope, including POS, accounting, commissions, inventory and booking.
- Complete first-Owner onboarding, tenant/RBAC isolation, anti-abuse and privacy/security release gates.
- Validate data migration, coexistence and full all-branch Cut Salon operational checks; obtain consent for any case study.
- Verify hosting, backup/recovery, support, onboarding documentation, monitoring and country-specific claims.
- Approve real price books, subscriptions, terms, privacy and billing responsibilities.
- Attach deployment/testing proof to CURRENT-STATE and release decision. **No launch date can be promised before these gates pass.**

## 13. Decision and change impact

**Approved now:** salon-first go-to-market focus under the unchanged DRVO ERP master brand.

**Proposed / unapproved:** the detailed execution calendar, ICP branch bands, spend, lead targets, asset designs, tone/taglines and exact message variants, which require iteration from research and owner review.

**Architecture impact:** none. No Module boundaries, tenant rules, industry sequencing, commercial V1 scope, pricing policy, staging flags, SQL schema, integrations or security controls are changed. This documentation is portable across ChatGPT/Cursor and should be read alongside up-to-date engineering status, not as product capability evidence.

**Implementation/tests/deployment:** docs-only; no app/code changes, tests run, users enrolled, campaigns launched or deployments made by this GTM plan.
