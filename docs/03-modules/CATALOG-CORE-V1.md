# Shared Catalog Core V1 — implementation contract

**Date:** 2026-11-12 · **Status:** engineering PR, not an approved launch/released Module.

## Domain boundary

Catalog is a **shared, industry-neutral Business Module**, NOT Salon-only and NOT the SaaS Module Release Registry. It owns Business-wide categories, products/services, default list price (integer minor units with currency), optional service duration and active status. A Branch member with `catalog.read` can view the shared Business catalog; a Branch member with `catalog.manage` can add entries. Category and offering are Business-owned, **not Branch-owned**. An offering's category must share its Tenant and Business.

**Not owned:** Tenant identity, Bookings, employee execution, inventory quantity/recipe, tax calculation, invoices, payments, stock movements, entitlement, sale prices captured at invoicing, promotions or historical price changes. POS eventually stores immutable sale-line price snapshots under separate ADR-031 approval; Booking may reference approved Catalog Service IDs later. Core can gain bounded Salon service-specific extension metadata in a separately reviewed PR; no hard-coded Salon columns in generic Catalog. No client code may access SQL directly.

## V1 persisted records

- `core.CatalogCategory` composite `(TenantId,BusinessId,CategoryId)` key and composite Business FK, status, display name, scoped client request ID for retry deduplication
- `core.CatalogOffering` composite scoped key, composite FKs to Business and optional Category, `Kind: SERVICE | PRODUCT`, name, `PriceMinor: BIGINT`, uppercase ISO-like 3-letter currency, `DurationMinutes` only for services, active status, scoped client request ID
- `PriceMinor` records list price only. It is NOT an authorized tax-inclusive invoice total, exchange rate, booking deposit, or paid financial document. Starter private UI allows EGP/SAR/AED/USD (two-decimal currencies only); generalized currency scale, tax/market eligibility and per-Branch/contract price books remain separate decisions.
- Initial PR supports **create and list**, not edit, archive, variants, inventory or discounts. Do not claim complete Catalog V1 after this slice.

## API / RBAC / multi-tenancy

- `GET /api/workspaces/:businessId/branches/:branchId/catalog` returns categories + offerings ordered by name
- `POST .../catalog/categories` accepts exactly `{displayName}` and a fresh UUID `Idempotency-Key`
- `POST .../catalog/offerings` accepts exactly `{kind,displayName,priceMinor,currency,categoryId?,durationMinutes?}` and UUID `Idempotency-Key`
- Both `DRVO_K5_AUTH_ENABLED=YES` and `DRVO_CATALOG_ENABLED=YES` required on API; private Web route additionally requires `DRVO_K5_WEB_ENABLED=YES` and `DRVO_CATALOG_WEB_ENABLED=YES`. **All flags remain OFF.**
- Existing HttpOnly K5 session yields server-resolved Actor/Tenant. SQL procedures check live token hash, session version, credential status, current active membership + Branch Assignment + RolePermission. Requests use typed parameters; no client-provided TenantId, AccountId or arbitrary role. Auth/authorization is repeated under SERIALIZABLE SQL transaction to protect the query/write from concurrent revocation. Idempotent retry with same request ID+payload yields original ID; changed payload yields 409. No external financial effect.
- Mutations require exact configured HTTPS Origin; `Cache-Control: no-store` on all responses. Missing auth is 401, invalid/unauthorized scope is 404, disabled flags return 503. Table direct SELECT/INSERT/UPDATE/DELETE is denied to staging app; only audited scoped procedure EXECUTE is allowed. This is *not* SQL Server RLS and does not settle future pooled-session protection rules.

## Testing and delivery rules

- API unit tests: disabled-by-default, malicious extra fields, malformed scope, amounts/durations, Origin enforcement.
- Disposable SQL Server with synthetic T1/B1/B2 and T2/B3; real HTTP; composite FK cross-Business rejection, restricted SQL principal, idempotent replay/conflict, authorized create+list, unauthorized read/write, role+session+membership revocation.
- Architecture review: broader ADR-030 RLS questions unresolved; ADR-032 no real activation/entitlement; ADR-031 no sale/financial posting. UI displays only a route which **API currently authorizes**, never implies that a Module is a released paid app tile.
- **NO SQL migrations to VPS** in this PR. Staging K5F checker is pinned to 001–009; SQL 010+011 have not been authorized/applied. CI SQL is completely disposable. Do not activate K5, Catalog Web or Catalog API flags. If this PR merges, auto code Staging Deploy is not a SQL schema authorization.
