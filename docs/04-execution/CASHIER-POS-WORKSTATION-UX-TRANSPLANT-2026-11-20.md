# Cashier POS Workstation UX Transplant — 2026-11-20

## Founder course correction

Visible product experience is the milestone — not another commit table. Staging target: `https://erp-stage.drvotech.com/demo/salon` after deploy of this SHA.

## What shipped (this PR)

1. **Shared shell** `apps/web/src/components/cashier-pos/`
   - Compact Light RTL **3-column** layout matching Cashier `src/app/income/pos/page.tsx` (pin `046bf19`): customer | barber/catalog | invoice draft.
2. **Public `/demo/salon`** mounts the same shell in `mode="synthetic"` with in-memory adapter only; banner states SIMULATED / NOT COLLECTED.
3. **Private `pos-preview`** mounts the same shell in `mode="private"` with existing Cashier-adapted panes + ADR-031-blocked quick actions / tips / returns.
4. Demo revision marker: `data-demo-revision="cashier-workstation-shell-v1"`.
5. Public demo **opens on نقطة البيع** so the workstation is the first viewport founders inspect.

## Interaction checklist (founder)

| Action | Demo | Private |
|---|---|---|
| 3-column workstation visible ≥960px | ✓ | ✓ |
| Customer search / create | Synthetic local | K5 Customers API |
| Barber / executor select | Demo staff | HR roster |
| Catalog tabs + `/` search | ✓ synthetic | ✓ + barcode |
| Packages expand into cart | Demo package cards | SQL025/038 expand |
| Cart qty ± / remove | ✓ | ✓ + package groups |
| Discount / split preview | NOT_COLLECTED only | NOT_COLLECTED only |
| F9 save DRAFT | Session memory only | SQL draft (flags) |
| Collect / paid invoice / GL | **Blocked / not shown as success** | **ADR-031 blocked** |
| Tips / void / expense quick actions | N/A on demo shell | Visible **disabled** |

## Implemented vs blocked

**Implemented (UX):** shared workstation composition; demo/private convergence on shell; keyboard `/` + `F9`; honest synthetic vs private banners.

**Still OPEN / NOT parity:** Cashier luxury carousel/catalog visual skins, handoff inbox, vouchers, attendance-in-POS, mobile invoice sheet parity, thermal print agent, paid sale, stock decrement, Treasury settle.

**Never claim:** visual parity with Cashier screenshots until founder acceptance + browser evidence for this SHA; functional financial parity (ADR-031).

## Evidence required before “seen by founder”

1. Staging Deploy SUCCESS for exact commit SHA.
2. External smoke finds `data-demo-revision="cashier-workstation-shell-v1"`.
3. Browser screenshots: demo POS 3-pane desktop + private POS 3-pane (or CI Chromium capture).
4. This checklist checked against the live URL.
