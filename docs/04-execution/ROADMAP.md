# Roadmap

**Updated:** 2026-10-28. **Phase 0: Discovery and documentation.** No timeline committed.

## Commercial industry sequence (founder-approved)

1. **Barber salons** — first real pilot at **Cut Salon**.
2. **Medical clinics** — second commercial vertical; launch gated on appropriate clinical privacy/compliance and functional scope.
3. Beauty/aesthetic sectors and supermarkets — subsequent order not yet decided.

The earlier **Retail second** assumption is superseded. Retail remains a future supported vertical and may inform architectural test scenarios, but **is not the second commercial release**.

## Engineering phases (planning, not code completed)

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Founder discovery, MVP, architecture decisions and documentation | In progress |
| 1 | Scaffold, CI/CD, tenant/business/branch identity, permissions, reusable UI foundation | Not started |
| 2 | Catalog, POS sale/payment, receipt and session-close vertical slice | Not started |
| 3 | Barber salon operational workflows + Cut Salon pilot and validation | Not started |
| 4 | Medical clinic discovery, domain, privacy/security, integration and compliance-specific release plan | Not started |
| 5 | Medical clinic edition implementation **after design and safety gates** | Not started |
| Ongoing | SaaS plans, entitlements, subscriptions, support and observability, prioritized before commercial launch as needed | Not started |

**Global-first launch intent:** Egypt and Gulf countries are both targeted for initial commercial launch; specific countries and launch-readiness requirements are outstanding.

**First mobile channel:** responsive web/PWA. Comprehensive ERP is the product vision, not first-release scope. The mandatory core/extension structure for all modules requires explicit technical contracts.

[Open questions](OPEN-QUESTIONS.md) · [Product vision](../01-product/VISION.md).

## MVP discovery note — 2026-10-28

Founder requests a comprehensive Cashier-replacement feature set in one month, including full HR/accounting/inventory, offline POS and SaaS billing. This is a **desired scope/timeline**, not an approved or validated delivery forecast. Queue and printing can be deferred, so **limited pilot**, **Cashier replacement** and **external commercial launch** require separate acceptance gates. See [MVP Discovery Round 2](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Release strategy update — 2026-10-28

Founder confirmed **one comprehensive commercial V1**, not separate pilot/replacement/commercial editions. Development, internal QA and Cut Salon all-branch validation are pre-launch quality gates. The previous split into separate release acceptance stages was a proposal, not approved. One-month first-test goal is flexible, with quality prioritized. Scope includes full GL accounting, HR parity, inventory, booking, cash-only offline POS, and SaaS subscriptions with manual collection; external online subscription payments can follow. No timeline is guaranteed. See [release strategy](../01-product/MVP-RELEASE-STRATEGY.md).


## Final MVP clarification — 2026-10-28

Keep Cut Salon's existing booking website and integrate against the new DRVO API. Cash-only offline sales may result in stock shortages after synchronization; surface these for review. Accounting journal-entry workflow awaits detailed module design. Test internally throughout development, but launch one comprehensive commercial V1 after all release gates. [Decision](../01-product/MVP-RELEASE-STRATEGY.md).
