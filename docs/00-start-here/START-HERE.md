# Start here — project handoff

**Project:** DRVO ERP  
**Baseline date:** 2026-10-27  
**Phase:** 0 — documentation / architecture  
**Implementation:** not started

DRVO ERP is a new multi-tenant, multi-industry, modular ERP SaaS product. Cashier POS remains separate and operational; useful features may be adapted after review. DRVO's UI direction is **inspired by Odoo**, not a verbatim copy.

The initial implementation strategy is a **modular monolith** with a shared POS core and optional industry extensions. Salon is the first vertical, Retail the second, while Clinic requirements need separate discovery.

## Handoff checklist

Before planning or coding, read:
- [Current state](CURRENT-STATE.md)
- [Architecture](../02-architecture/ARCHITECTURE.md)
- [Decisions](../05-decisions/DECISIONS.md)
- [Open questions](../04-execution/OPEN-QUESTIONS.md)
- [Roadmap](../04-execution/ROADMAP.md)
- [Modules](../03-modules/MODULES.md)

Before editing: identify impacted docs, tests and architecture. After editing: update status, changelog, ADR(s), roadmap and implementation evidence as appropriate. Never claim deployment without verification.

**Repository:** https://github.com/tarek-saad-dev/drvo-erp
