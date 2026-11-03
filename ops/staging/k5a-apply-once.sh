#!/usr/bin/env bash
# One-time manual operator K5A SQL migration only, using EXISTING SQL admin.
# No new SQL user. No public Login or Owner bootstrap enabled by this action.
set -Eeuo pipefail
umask 077
[[ "$EUID" -eq 0 && -t 0 ]] || { echo "Run interactively as root on DRVO VPS" >&2; exit 1; }

repo="/srv/drvo-erp/repo"
[[ "$(sudo -u drvoerp -H git -C "$repo" branch --show-current)" == "main" ]] || {
  echo "DRVO repo must be on main" >&2; exit 1;
}
[[ -z "$(sudo -u drvoerp -H git -C "$repo" status --porcelain)" ]] || {
  echo "Local checkout is modified; stop rather than overwrite" >&2; exit 1;
}
sudo -u drvoerp -H git -C "$repo" pull --ff-only origin main
cd "$repo"
node --check ops/staging/k5a-sql-apply.cjs

[[ -f /srv/drvo-erp/deploy/current/api/dist/identity/identity.service.js ]] || {
  echo "K5 API release not deployed yet. Check GitHub Actions." >&2; exit 1;
}
curl -fsS --max-time 5 http://127.0.0.1:3311/api/health/db |
  grep -q '"database":"ready"' || {
    echo "K4 DB readiness is not healthy" >&2; exit 1;
  }
[[ ! -f /etc/systemd/system/drvoerp-api.service.d/40-k5-auth.conf ]] || {
  echo "Unexpected K5 Auth activation found. Stop for review" >&2; exit 1;
}
echo "Target database: DRVO_ERP_STAGING only. K5 HTTP Auth stays OFF."
read -r -p "Existing SQL administrator login [sa]: " admin_login
admin_login="${admin_login:-sa}"
[[ "$admin_login" =~ ^[A-Za-z0-9_.-]{1,64}$ ]] || { echo "Invalid admin login" >&2; exit 1; }
read -r -s -p "Existing SQL administrator password (hidden): " admin_pass
echo
[[ -n "$admin_pass" ]] || { echo "SQL admin password is required" >&2; exit 1; }
export DRVO_K5_ADMIN_LOGIN="$admin_login"
export DRVO_K5_ADMIN_PASSWORD="$admin_pass"
export DRVO_K5_OPERATOR_APPLY=YES
unset admin_login admin_pass

node ops/staging/k5a-sql-apply.cjs
unset DRVO_K5_ADMIN_LOGIN DRVO_K5_ADMIN_PASSWORD DRVO_K5_OPERATOR_APPLY

echo "=== VERIFY SERVICES WITHOUT RESTARTING ANY ==="
systemctl is-active drvoerp-api.service drvoerp-web.service
curl -fsS http://127.0.0.1:3311/api/health/db
echo
echo "K5A VPS SQL FOUNDATION: PASS"
