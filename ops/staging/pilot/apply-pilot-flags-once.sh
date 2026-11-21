#!/usr/bin/env bash
# Root TTY only. Installs Pilot Private feature-flag drop-ins for staging.
# Does NOT migrate SQL, approve Owners, or enable ADR-031 posting.
# Target database identity remains DRVO_ERP_STAGING (isolated staging Pilot).
set -Eeuo pipefail

if [[ "$(id -u)" -ne 0 || ! -t 0 || ! -t 1 ]]; then
  echo "Interactive root console required" >&2
  exit 64
fi

repo_templates="/srv/drvo-erp/repo/ops/staging/pilot"
api_dst="/etc/systemd/system/drvoerp-api.service.d/40-k5-pilot-api.conf"
web_dst="/etc/systemd/system/drvoerp-web.service.d/40-k5-pilot-web.conf"

[[ -f "$repo_templates/40-k5-pilot-api.conf.example" ]] || {
  echo "Pilot API template missing under $repo_templates" >&2
  exit 65
}
[[ -f "$repo_templates/40-k5-pilot-web.conf.example" ]] || {
  echo "Pilot Web template missing under $repo_templates" >&2
  exit 65
}

echo "DRVO ERP — Private Pilot flag activation (staging)"
echo "This turns on K5 + Customer/Booking/POS Draft/HR/Inventory module flags."
echo "Public /demo/salon remains synthetic. Paid posting stays BLOCKED."
echo
read -r -p "Type APPROVE DRVO_ERP_STAGING_PILOT_FLAGS to continue: " confirm
[[ "$confirm" == "APPROVE DRVO_ERP_STAGING_PILOT_FLAGS" ]] || {
  echo "Not confirmed; no files written" >&2
  exit 66
}

install -d -m 0755 /etc/systemd/system/drvoerp-api.service.d
install -d -m 0755 /etc/systemd/system/drvoerp-web.service.d
install -m 0644 "$repo_templates/40-k5-pilot-api.conf.example" "$api_dst"
install -m 0644 "$repo_templates/40-k5-pilot-web.conf.example" "$web_dst"

# Operator must still ensure HMAC/mail EnvironmentFile is present on API.
systemctl daemon-reload
systemctl restart drvoerp-api.service
systemctl restart drvoerp-web.service
systemctl is-active --quiet drvoerp-api.service drvoerp-web.service

echo "PASS: Pilot flag drop-ins installed and services restarted"
echo "NEXT: confirm /sign-in returns 200, run Owner approve/claim, then EnsureOwnerPilotModulePermissions if Owner pre-dates SQL040"
echo "REVIEW: Nginx X-Real-IP overwrite, access restriction, offsite restore evidence remain human gates"
