# Shared Customers/CRM Core — initial V1 vertical slice

**Date:** 2026-11-12 · **Status:** Stacked feature PR, NOT deployed, not authorized for real customer data.

## Domain
Customers is a reusable, industry-neutral **Business-owned contact registry**, separate from K5 `Account` identity and from future medical/clinical records. A Person may be a Customer contact without being a platform user. The same Tenant can have many Businesses, but each Business owns its own Customers; matching phone does NOT automatically merge customer records between Businesses. The first slice stores only display name and an **optional E.164 phone** (PII); no notes, address, health data, payment instruments, consent/marketing state or automated messaging.

## Schema / API
- `core.Customer`: primary key `TenantId,BusinessId,CustomerId`, composite Business FK, stable ID, `ClientRequestId` retry deduplication, status, timestamp, rowversion, name, nullable phone.
- `GET /api/workspaces/:businessId/branches/:branchId/customers`: first 200 active Customers in the same Business; private, limited interim list; pagination/search/redaction and account/contact policies need later slice.
- `POST /api/workspaces/:businessId/branches/:branchId/customers`: strict `{displayName,phoneE164?}` with **UUID Idempotency-Key** and exact trusted Origin. Returns created/replayed scoped CustomerId.
- Only current session/active Tenant/Business/Branch membership and Branch Role with `customers.read` or `customers.manage`; no implied role grants or cross-Business discovery. Trust actor Tenant/Account only from server K5 cookie.
- SQL has scoped read/write procedures revalidating session/version/current membership/permission under SERIALIZABLE transaction and a restricted app principal that cannot directly SELECT/INSERT/UPDATE/DELETE the Customer table.
- API requires `DRVO_K5_AUTH_ENABLED=YES` + `DRVO_CUSTOMERS_ENABLED=YES`; Next private page additionally `DRVO_K5_WEB_ENABLED=YES` + `DRVO_CUSTOMERS_WEB_ENABLED=YES`. **All flags remain OFF**.

## Core/industry boundary and privacy
- Salon Booking later references CustomerId as Business-scoped FK, never duplicates phone as a Booking-owned source of truth.
- Medical clinical records, consents, diagnoses and visit histories are NOT stored as generic Customer data.
- Data is never shared across Businesses on matching name/phone; no marketing send without separate verified consent policy.
- No actual customer contacts/test users on VPS. Use synthetic fixtures only in isolated GitHub CI; K5 staging security/backup/source-IP verification remains open.

## Tests/rollout
- Disposable SQL Server 2022 + real Nest API tests cover migration idempotence, composite FK, no direct table grants, forged session, exact Business read/create, negative 2-Tenant/3-Business/wrong-Branch, cross-scope write denials, Origin, body injection, idempotent retry, RBAC+membership+session revocation.
- SQL 012 is proposed source code; **do not apply on VPS**. PR is stacked on Shared Catalog PR #55; merge #55 first then retarget and independently review Customers. K5F currently expects only SQL 001–009; separate security operation is needed before migrations 010–012 can ever be applied.
- Missing: edit, archive, merge, duplicate resolution, phone formatting UI, search/pagination, privacy retention/export/deletion rights, full CRM pipelines, Booking conversion. No claim of complete CRM or commercial pilot.
