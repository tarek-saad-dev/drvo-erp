# Salon S7 — authorized advisory Booking slots + faster nonposting POS cart

**Verified source checkpoint (2026-11-13):** [PR #92](https://github.com/tarek-saad-dev/drvo-erp/pull/92) and [PR #93](https://github.com/tarek-saad-dev/drvo-erp/pull/93) merged to main, combined product commit `968e2cf2c74a4e2db80ca98d5a284f28955f18e6`. Each PR head passed all nine triggered GitHub Actions workflows: K0, K1, K5C Next build/typecheck/private-404 regression, Shared Booking/Catalog/Customers/POS SQL2022 CI, Interactive Salon Demo and DevOps Staging Artifact CI. Product-main checks and remote Staging Deploy are separate evidence and cannot be inferred from PR-head success.

## Work delivered

**Shared Booking S7-A (#92):** protected Booking screen offers up to eight optional local-time candidate slots given selected Resource, active Catalog SERVICE duration and device-local day. A pure ESM helper examines existing K5-scoped OPEN dated windows and last-200 appointments, excludes visible BOOKED overlaps, ignores CLOSED windows, validates dates/durations and snaps to 15-minute increments. A click fills the appointment form; it NEVER submits. The 300-future-window and 200-appointment result limits, race conditions and unseen past window opt-in mean **these are suggestions, NOT guaranteed availability**. Existing `POST /booking/appointments' and SQL resource row locks/Origin/session/tenant authorization remain the only source of booking success. Includes five Node assertions and K5C Next/HTTP default-404 checks.

**Shared POS S7-B (#93):** independently authorized POS Preview UI now supports client-only search across already fetched active Catalog offerings and +/- buttons for quantities 1–20 on unsaved cart lines. Editing clears the old repriced preview and idempotency retry key; edits lock while preview/save are pending. Original saved DRAFT remains immutable; DRAFT POST still revalidates K5+Catalog and prices from SQL. Existing quick-cart security regression extended and Next build tested.

**Architecture:** entirely presentation-layer Shared Booking and POS UX. No Salon domain fork, extra API, SQL 018, storage, PII export, Cashier runtime import, HR/clinic assumption, new permission, payment, invoice, tax or financial POSTED. ADR-030 trusted Tenant→Business→Branch isolation and separate Booking vs POS authorization are untouched; ADR-031/032 remain PROPOSED.

## Release boundaries and next steps

Source migrations are **001–017** with 017 latest; **VPS 010–017 NOT approved/applied** by this work. Operational K5F root-owned security attestation, encrypted offsite independent restore, proxy/Origin/Owner-Staff negative verification, separately approved SQL activation window and ADR-032 private entitlement still OPEN. Public Auth and commercial module flags OFF. ADR-031 financial accounting/first-GL choice must be approved before any POSTED sale.

**Next parallel engineering candidates:** a guarded user-assisted CLOSE→CREATE window replacement flow respecting SQL017 `BOOKED` conflict denial; positive private Owner/Staff browser E2E when operational authorization exists; continue improving synthetic demo/onboarding separately. Never self-authorize SQL, auth or fees by GitHub merge or CI success alone.
