# Private Pilot — one-command live activation — 2026-11-21

**Goal:** Founder-accessible HTTPS Private Pilot on a **new isolated** SQL database `DRVO_ERP_PILOT` (synthetic data only), shared Cashier 3-pane UI, persistence after refresh/re-login.

**2026-11-22 migration-note:** New SQL041 Booking NO_SHOW is applied only to future authorized isolated synthetic Pilot activation after the reviewed main is pulled. Never re-run the one-time activator after a partial failure; SQL041 on any live Cut database requires separate approvals.

**Not claimed:** `PILOT_VERIFIED`, ADR-031 posting, Cut live import, production readiness.

## Already done in GitHub

- PR #160 merged → `main` SHA includes `/pilot` entry + SQL040 + flag templates.
- Staging Deploy succeeded for that SHA → `https://erp-stage.drvotech.com/pilot` is live (flags still OFF until activator runs).

## Exact one-time external blocker

VPS **interactive root** + existing SQL Admin password (hidden). No chat/GitHub secret paste.

```bash
sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main
sudo bash /srv/drvo-erp/repo/ops/staging/pilot/activate-isolated-pilot-once.sh
```

Confirm phrase: `APPROVE CREATE DRVO_ERP_PILOT SYNTHETIC`

The script will:

1. Create `DRVO_ERP_PILOT` (leaves `DRVO_ERP_STAGING` data untouched)
2. Map existing app/migrator logins into Pilot DB
3. Apply SQL001–041 + COPY_ONLY backup + restore witness
4. Seed synthetic Owner `pilot.owner` (password only in `/root/drvo-erp-pilot-owner.once`)
5. Install systemd SQL + K5/module flag drop-ins
6. Restart API/Web

Then open:

- `https://erp-stage.drvotech.com/pilot`
- `https://erp-stage.drvotech.com/sign-in` with credentials from the once file
- Workspace POS: path printed in the once file

## After activation

Re-run GitHub workflow **Private Pilot Live Bootstrap** with `confirm_database=DRVO_ERP_PILOT` to probe HTTPS. Founder browser acceptance still required before any `PILOT_VERIFIED` claim.
