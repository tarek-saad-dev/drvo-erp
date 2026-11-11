# Shared Catalog initial vertical slice — 2026-11-12

**Approved goal:** Founder requested accelerate product delivery with Shared Catalog, then separate Customers and Booking PRs and ADR-032 review in parallel. **Status:** Feature PR, **NOT released or active**.

### Slice acceptance
- Core/Salon boundary: reusable shared category/service/product catalog and list prices, no Salon-specific hard-coded fields. No POS posting, inventory effects or payment.
- SQL 011: composite Tenant/Business/Category/Offering ownership with retry-safe create/list SQL procedures; no seeds, no cross-tenant data.
- Nest API: existing K5 session, `catalog.read/manage` exact action intersection, strict inputs, frozen flags OFF, no direct data table reads from app SQL principal.
- Next Web: private RTL Catalog forms and listing under same gated Business/Branch workspace, no public marketing route or fake demo.
- Unit tests + disposable SQL/HTTP CI; K0/K1 and existing K5/K6C regressions must be reviewed on final head.
- Docs: Catalog Contract, Current State, Roadmap, Changelog, Architecture.
- **Operational gate:** No VPS SQL 010/011; K5F migration checker upgrade + security sign-off first. Flags remain OFF; no customer users/emails.

### Security cases
- Valid Branch actor reads Business-shared Catalog; unassigned Branch, same-Tenant other Business, other Tenant all deny.
- RolePermission read vs manage separately, revoked membership/session deny even for known IDs.
- SQL stage app cannot SELECT/UPDATE Catalog tables directly; restricted fixed stored procedures only.
- Retry of same ClientRequestId and payload returns original ID, changed payload is 409; generated UUID and HTTP Origin required.

### Known missing functionality
Edit/archive, price history, currency scale policy, advanced rates/discounts, multi-branch overrides, industry-specific Salon Extensions, category reparenting, full pricing and global release entitlement are not present. Commercial Module activation still blocked on ADR-032. Booking/Customers are future PRs; no assumption they exist.

**Rollback before applying migration:** Revert code/PR. **After any future approved migration**, use forward-only corrective procedure and independently verified backup/restore — no dropping historical customer data.

**Deployment:** not attempted; no staging DB alteration or feature enabling authorized.
