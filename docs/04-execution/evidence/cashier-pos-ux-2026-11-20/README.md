# Cashier POS UX evidence — 2026-11-20

## BEFORE (staging live before this PR)

- `cashier-pos-BEFORE-staging-demo-salon-2026-11-20.png` — overview first paint at `https://erp-stage.drvotech.com/demo/salon`
- `cashier-pos-BEFORE-staging-pos-tab-2026-11-20.png` — POS tab: stacked single-column Cashier-inspired form (**not** 3-column workstation)

## AFTER — local production build (SHA `a967dc24`, viewport 1440×900)

- `cashier-pos-AFTER-local-1440-empty-2026-11-20.png` — 3-pane shell + synthetic banner (empty cart)
- `cashier-pos-AFTER-local-1440-with-cart-2026-11-20.png` — cart line + qty ± after adding خدمة
- HTML markers verified locally: `data-demo-revision="cashier-workstation-shell-v1"`, `data-cashier-pos="workstation-shell"`

## AFTER — staging (fill after merge + Staging Deploy)

- `cashier-pos-AFTER-staging-pos-tab-2026-11-20.png` — same 3-pane at `https://erp-stage.drvotech.com/demo/salon`
- External smoke run URL + Staging Deploy run URL + exact `release.sha`

## Interaction checklist

See [CASHIER-POS-WORKSTATION-UX-TRANSPLANT-2026-11-20.md](../../CASHIER-POS-WORKSTATION-UX-TRANSPLANT-2026-11-20.md).
