# Private Pilot P0 — Database-connected activation — 2026-11-21

**Goal:** Founder can open a **real** K5 Private Pilot, use the shared Cashier 3-pane workstation, persist Customer / Booking / POS Draft to isolated SQL (`DRVO_ERP_STAGING`), refresh/re-login, and still see the data.

**Not claimed:** `PILOT_VERIFIED`, ADR-031 paid posting, Cut live import, or primary production DB use.

**Repo tip at authoring:** build on `main` after this PR. Public demo remains synthetic: `https://erp-stage.drvotech.com/demo/salon`.

## What this PR delivers (in-repo)

| Deliverable | Path |
|---|---|
| Founder entry | `/pilot` + home CTA prioritizing Pilot over demo |
| Owner Pilot permissions | SQL040 `EnsureOwnerPilotModulePermissions` + expanded `ClaimApprovedOwner` |
| Flag templates | `ops/staging/pilot/40-k5-pilot-*.conf.example` + `apply-pilot-flags-once.sh` |
| Grant tool | `tools/k5d/operator-grant-pilot-owner-permissions.cjs` |
| Journey plan | `tools/pilot/owner-journey-plan.cjs` (fail-closed; never claims verified) |

## Required journey (Owner)

Customer → Booking → Barber → POS Draft → Inventory validation → Draft Print (`NOT PAID` / `NOT POSTED`) → Reload / re-login.

UI surface: shared `CashierWorkstationShell` on `/workspace/{businessId}/{branchId}/pos-preview` — **not** `/demo/salon`.

## Operator activation checklist (external)

1. **Confirm DB identity** = `DRVO_ERP_STAGING` only (never Cut / Cashier / AutoResponse / primary live).
2. **Backup + restore witness** into a **new** recovery DB; compare `core.SchemaMigration`.
3. **Staging Deploy** latest reviewed `main` SHA; record `release.sha`.
4. **Manual** `staging-db-migrate.yml` with `confirm_database=DRVO_ERP_STAGING` through **SQL040**.
5. Ensure `/etc/drvo-erp/k5d-operator.env` (HMAC + Resend) and matching API mail/HMAC env.
6. Root: `bash ops/staging/pilot/apply-pilot-flags-once.sh` → type `APPROVE DRVO_ERP_STAGING_PILOT_FLAGS`.
7. Root: `node tools/k5d/operator-approve-owner.cjs` → Owner verifies email → claims → signs in at `/sign-in`.
8. If Owner existed before SQL040: `node tools/k5d/operator-grant-pilot-owner-permissions.cjs`.
9. Founder browser: `/pilot` → `/sign-in` → create customer → booking → POS draft → draft print → reload.
10. Keep ADR-031 posting **OFF**. Restrict public access (Nginx/Basic Auth/IP) once private data exists.

## Still blocked after flags

| Item | Status |
|---|---|
| Paid sale / tender / GL | ADR-031 BLOCKED |
| Cut live import | BLOCKED |
| Thermal fiscal receipt | BLOCKED |
| Claiming `PILOT_VERIFIED` from CI alone | FORBIDDEN — needs Owner acceptance evidence |

## Founder-visible URLs (after activation)

- Entry: `https://erp-stage.drvotech.com/pilot`
- Sign-in: `https://erp-stage.drvotech.com/sign-in`
- Demo (synthetic only): `https://erp-stage.drvotech.com/demo/salon`

## Honesty rule

Disposable S12/S13 Chromium PASS ≠ Private Pilot Owner acceptance. This package makes activation **executable**; it does not replace the human gates above.
