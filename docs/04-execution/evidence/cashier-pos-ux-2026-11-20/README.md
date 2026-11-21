# Cashier POS UX evidence — 2026-11-20 / 2026-11-21

## Founder inspect URL (LIVE)

**https://erp-stage.drvotech.com/demo/salon**

- Opens on **نقطة البيع** with shared 3-pane Cashier workstation shell
- Marker: `data-demo-revision="cashier-workstation-shell-v1"`
- Deployed SHA: `d617ee2a470bae55707e676e899a915671b38299` (merge of [#158](https://github.com/tarek-saad-dev/drvo-erp/pull/158))

## CI / deploy evidence

| Evidence | Result | Link |
|---|---|---|
| PR #158 CI | all required checks PASS | https://github.com/tarek-saad-dev/drvo-erp/pull/158 |
| Staging Deploy | SUCCESS · receiver accepted `d617ee2` | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44935626730 |
| External Preview Smoke (post-deploy) | PASS · marker found | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44935802244 |
| Manual re-dispatch smoke | PASS | https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44935833925 |

Push-triggered smoke `#44935626776` failed only because it raced before deploy finished; post-deploy smokes PASS.

## BEFORE (staging before #158)

- `cashier-pos-BEFORE-staging-demo-salon-2026-11-20.png` — overview first paint
- `cashier-pos-BEFORE-staging-pos-tab-2026-11-20.png` — stacked single-column POS (**not** 3-pane)

## AFTER — local production build (pre-merge)

- `cashier-pos-AFTER-local-1440-empty-2026-11-20.png`
- `cashier-pos-AFTER-local-1440-with-cart-2026-11-20.png`

## AFTER — staging LIVE (`d617ee2`, viewport 1440×900)

- `cashier-pos-AFTER-staging-pos-tab-2026-11-21.png` — 3-pane shell + synthetic banner
- `cashier-pos-AFTER-staging-pos-tab-with-cart-2026-11-21.png` — cart line + qty ± after add

## Interaction checklist (verified on staging)

| Action | Result |
|---|---|
| First paint is POS workstation | ✓ |
| 3 panes ≥960px (customer / catalog / invoice) | ✓ |
| Synthetic banner (تجربة عامة محاكاة) | ✓ |
| Barber select | ✓ |
| Catalog tabs + search | ✓ |
| Add service → cart qty ± | ✓ |
| Discount / split preview NOT_COLLECTED | ✓ |
| F9 / save draft = session only | ✓ |
| Fake paid success | **absent** (ADR-031 blocked) |

See also [CASHIER-POS-WORKSTATION-UX-TRANSPLANT-2026-11-20.md](../../CASHIER-POS-WORKSTATION-UX-TRANSPLANT-2026-11-20.md).
