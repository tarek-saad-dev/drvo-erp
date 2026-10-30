# DRVO ERP — Remaining Foundation Policy Choices (One Open)

**Date:** 2026-10-30
**Status:** **CONST-01 and CONST-02 RESOLVED by approved ADR-033/034. CONST-03 RESOLVED by approved ADR-035; only CONST-04 remains PROPOSED, not accepted.**
**Scope:** Only cross-platform architectural laws; no POS/Accounting/Module activation schemas, manifests, implementation tests or deployment.
**Already resolved:** CONST-01 mixed-industry Business by [ADR-033 ACCEPTED](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md): Business ≠ Industry; a Business may compose compatible capabilities/Industry Solutions without new ERP fork or mandatory second Business.

## CONST-02 — Enterprise organization (RESOLVED by ADR-034)

**Question:** Is the accepted V1 Tenant → Business → Branch model an eternal exclusive hierarchy, or the first level of an extensible model able to represent legal groups, subsidiaries, franchises and more complex corporate arrangements?

**Founder-approved general direction in [ADR-034](../05-decisions/ADR-034-OPTIONAL-ENTERPRISE-ORGANIZATION-STRUCTURE.md); original brief retained:** [Enterprise Organization Structure — CONST-02](ENTERPRISE-ORGANIZATION-STRUCTURE-POLICY-PROPOSAL.md). It proposes an **optional group relationship layer**, while keeping Tenant/Business/Branch ownership unchanged and separating legal, financial, operational and reporting scope. This is a principle, NOT a proposed SQL schema or Module implementation.

**Accepted general rule (ADR-034; specific implementation deferred):** Keep the V1 Tenant/Business/Branch as the concrete baseline, **but design enterprise organizational identity and permissions with a path to extend the group hierarchy** rather than hard-coding assumptions that a Branch must represent every future subsidiary or that every group has one legally shared ledger. Separate real legal/financial ownership, operating structure and reporting structure. Any cross-Business consolidated views require explicit authorized contracts; do not merge books by default. Avoid building a speculative infinite generic org-tree now.

**Risk of not resolving:** future enterprise onboarding might require changing fundamental identity and authorization throughout all Modules.

**Deferred:** new group/subsidiary entity schema, memberships, tax group accounting, permissions and SQL table design.

## CONST-03 — Trusted Extension ecosystem (RESOLVED by ADR-035)

**Question:** How can third-party developers eventually contribute Extensions and Integrations without letting an arbitrary Business-uploaded package execute with core SaaS privileges?

**Founder-approved general rule ([ADR-035 ACCEPTED](../05-decisions/ADR-035-GOVERNED-THIRD-PARTY-EXTENSION-ECOSYSTEM.md)):** All extensions capable of executing inside DRVO's platform must be **reviewed, versioned, permission-scoped, compatibility-tested and released through a controlled DRVO release/approval lifecycle**, regardless of whether authored internally or externally. Tenant activation only selects approved compatible releases/configurations. An external Integration must follow explicit APIs/scoped credentials. Exact sandbox/plugin marketplace architecture to be designed when opening third-party publishing.

**Risk of not resolving:** an ecosystem could become a direct security and backwards-compatibility threat to every Tenant.

**Deferred:** runtime sandbox, signing method, SDK, publishing UI, source review rules and marketplace economics.

## CONST-04 — Supported industries and jurisdictions

**Question:** Does a selectable Industry Solution or Module mean it is legally and functionally ready in Egypt or any other target jurisdiction?

**Recommended general rule (NOT YET ACCEPTED):** DRVO declares **validated support scope** for each released capability/industry solution as applicable: relevant workflows, sensitivity/security and geographic/compliance boundaries. Only advertise/enable released combinations where required safety, finance and law have been evaluated. Unsupported combinations are explicitly disclosed; never claim that Egyptian Salon support automatically means GCC Clinic support. Region/industry eligibility is a platform release rule, not a per-client customer fork.

**Risk of not resolving:** unsupported regulated industries can be mistaken for validated ERP offerings.

**Deferred:** country-specific regulations, tax engines, residency rules, detailed compliance certification checklists and legal advice.

## Founder decision matrix — one question remains open

| ID | Recommended principle | Impact if approved | Current status |
|---|---|---|---|
| CONST-02 | V1 hierarchy stays, with optional extensible Enterprise Organization | Future groups/subsidiaries without rearchitecting whole platform | **RESOLVED — ADR-034 ACCEPTED** |
| CONST-03 | No arbitrary executable customer plugins; governed release lifecycle for third parties | Security and controlled ecosystem growth | **RESOLVED — ADR-035 ACCEPTED** |
| CONST-04 | Explicit validated support per industry/jurisdiction before availability claims | Safe multi-sector and cross-border onboarding | **OPEN — PROPOSED** |

## After final CONST-04 approval
1. Update the **seven existing Constitution laws with minimal clarifications**, avoiding new bulky technical specifications.
2. Record accepted founder-level ADR(s) only for genuinely new decisions; do not multiply ADRs where a rule already clearly covers the case.
3. Run a one-page final cross-platform readiness review (Charter consistency + four scenarios + three policy decisions). Mark **Architecture Constitution V1 as stable design direction**, not secure/enterprise-verified production.
4. Move to a **Platform Kernel boundary map** only after general laws are settled and before any specialist Module design.

**No code/SQL/migrations/tests/server/deployment.**
