# LOY-S1 Loyalty / Cut Club rules + non-posting preview

Date: 2026-11-20. Branch `feat/cashier-crm-hr-ledger-20261120` (PR #138). Cashier pin `046bf19b0d5833a07fe4b2891cbf3032d03b7cef`.

## Landed
- `_cashier_source/loyalty/` read-only excerpts, blob-locked: `helpers.ts` (`bcc16172`), `types.ts` (`438a908f`), `cutClubSettingsPage.tsx` (`6850a000`).
- `packages/business-modules/loyalty/src/loyalty-rules.ts` (+ byte-identical Nest copy `apps/api/src/loyalty/loyalty-rules.ts`): pure, NON-POSTING
  - tier rank / reward tier gate, Cashier static reward catalog (ids 1-4, costs 220/400/600/1200, VIP-upgrade gated to GOLD), progress, next-reward, levels, personal-offer (clock injected), movement-type labels,
  - manual adjustment preview (non-zero, mandatory note, never negative),
  - reward redemption preview (confirm -> reward -> tier -> balance order; **no redemption code is minted**),
  - sale-reversal preview (needs earned points, refuses double reversal, flags a negative result),
  - Cut Club config: Cashier settings defaults + strict bounded validation; `notifyOnUpgrade` is refused.
- `GET .../loyalty/config`, `POST .../loyalty/{rewards-preview,redeem-preview,adjust-preview,reverse-sale-preview,config-validate}` on `LoyaltyController`: `DRVO_K5_AUTH_ENABLED` + `DRVO_LOYALTY_ENABLED` + Origin gates (POST), strict bodies, bounds, scope enforced through the existing `readAuthorizedBranch(..., "branch.read")`. No SQL, no new permission, no flag turned on anywhere.
- Private UI stub `.../[branchId]/loyalty` behind `DRVO_K5_WEB_ENABLED` + `DRVO_LOYALTY_WEB_ENABLED` (preview form, reward list, redeem preview, read-only default config).
- Tests: `tests/loyalty-rules-source.test.cjs` (executes the pinned Cashier `helpers.ts` and compares across tiers x balances), `apps/api/test/loyalty-preview.test.cjs`, `apps/web/test/loyalty-preview.test.cjs`; workflow `.github/workflows/shared-loyalty-ci.yml` (no SQL).
- Ledger: LOY-01 / LOY-03 / LOY-05 -> `PORTING`; LOY-02 stays `BLOCKED`; LOY-04 stays `SOURCE_IDENTIFIED`. All browser/data/pilot/SQL proof OPEN.

## Hard limits (unchanged)
Every response says `state: UNPOSTED_LOYALTY_PREVIEW`, `persisted: false`, `financialPostingState: NOT_AUTHORIZED`, `messagingSend: NOT_AUTHORIZED`. No points earn/redeem/adjust/reverse, no store buy, no mystery box, no referral payout, no WhatsApp/notification send, no ADR-031 posting path. Balances in requests are hypothetical, never a stored customer balance.

## Findings from the pinned source (kept honest, not "fixed" silently)
- The earn calculation and tier promotion live in SQL procedures (`sp_Loyalty_*`) that are **not** in the pinned repo: DRVO has intentionally **no earn rule** (`earnRule: NOT_PORTED_...`). `resolveTierForLifetime` is DRVO-derived, not source-proven.
- Cashier "Cut Club settings" are React state only (never persisted/enforced); "Cut Club analytics" is hard-coded mock data. Neither is evidence of real behaviour.
- Cashier redeem never persisted the voucher code and built its idempotency key from `Date.now()` (retry hazard); the redeem route also trusted a `clientId` query param in dev mode. DRVO preview mints nothing.
- Cashier `labels[type] || fallback` returns prototype members for hostile types; DRVO uses an own-property lookup.
- Cashier reward catalog is "temporary until DB table"; DRVO keeps it as code config, not a tenant-editable catalog.

## Open / next
Migration 032 is intentionally **not** created: a persisted loyalty ledger + tier/reward/store tables need an agreed earn rule, `loyalty.manage` permission and Treasury/Sales (POS-16) owners, and SQL cannot be proven locally (no SQL Server). Then: idempotent adjust/redeem/reverse writes, Cut Club store + client inventory vouchers (POS-12), mystery boxes/referrals (LOY-04), messaging owner, Owner browser walk of `/loyalty`.
