#!/usr/bin/env bash
# DRVO ERP K4B — explicit ONE-TIME staging operator command.
# Existing SQL administrator is entered hidden; no third SQL account created.
# No SQL admin secret is persisted in systemd, GitHub, or files.
# GitHub deploy stays limited to code; no automatic privileged DDL.
set -Eeuo pipefail
umask 077
[[ "$EUID" -eq 0 && -t 0 ]] || { echo "Run interactively as root on the VPS" >&2; exit 1; }
[[ "$(systemctl show -P User drvoerp-api.service)" == "drvoerp" ]] || {
  echo "Unexpected API service account, refusing modification" >&2; exit 1;
}
base="/srv/drvo-erp"
repo="$base/repo"
dropdir="/etc/systemd/system/drvoerp-api.service.d"
dropin="$dropdir/30-k4b-sql.conf"

[[ -f "/etc/drvo-erp/staging-sql.env" ]] || {
  echo "Existing staging SQL credentials file is missing" >&2; exit 1;
}
if [[ -e "$dropin" ]]; then
  echo "SQL service drop-in already exists; do not reinstall blindly" >&2; exit 1;
fi
[[ -z "$(sudo -u drvoerp -H git -C "$repo" status --porcelain)" ]] || {
  echo "DRVO ERP checkout has local changes; stop before pull" >&2; exit 1;
}
sudo -u drvoerp -H git -C "$repo" pull --ff-only origin main
cd "$repo"
bash -n ops/staging/k4b-enable-once.sh
node --check ops/staging/k4b-sql-cutover.cjs
[[ -f "$base/deploy/current/api/dist/data/foundation-database.service.js" ]] || {
  echo "New K4B runtime not yet deployed. Check GitHub Actions before applying SQL." >&2
  exit 1
}
systemctl is-active --quiet drvoerp-api.service || {
  echo "DRVO ERP API is not currently active" >&2; exit 1;
}

printf 'Current database: DRVO_ERP_STAGING only\n'
read -r -p "Existing SQL administrator login [sa]: " admin_login
admin_login="${admin_login:-sa}"
[[ "$admin_login" =~ ^[A-Za-z0-9_.-]{1,64}$ ]] || {
  echo "Invalid login format" >&2; exit 1;
}
read -r -s -p "Existing SQL administrator password (hidden): " admin_password
echo
[[ -n "$admin_password" ]] || { echo "Admin password required" >&2; exit 1; }
export DRVO_K4_ADMIN_LOGIN="$admin_login"
export DRVO_K4_ADMIN_PASSWORD="$admin_password"
export DRVO_K4B_EXECUTE=YES
unset admin_password admin_login

echo "=== BACKUP / INDEPENDENT RESTORE / K4 MIGRATION / REPLAY / READ GRANTS ==="
# Fail closed before altering systemd if any SQL step fails.
node ops/staging/k4b-sql-cutover.cjs
unset DRVO_K4_ADMIN_LOGIN DRVO_K4_ADMIN_PASSWORD DRVO_K4B_EXECUTE

echo "=== ENABLE BACKEND DATABASE CONNECTION (ONLY DRVO API) ==="
install -d -o root -g root -m 0755 "$dropdir"
temp="$(mktemp "$dropdir/.30-k4b-sql.XXXXXX")"
cat > "$temp" <<'EOF'
[Service]
EnvironmentFile=/etc/drvo-erp/staging-sql.env
Environment=DRVO_SQL_ENABLED=YES
EOF
chown root:root "$temp"
chmod 0644 "$temp"
mv "$temp" "$dropin"

success=0
rollback_api() {
  status=$?
  trap - EXIT
  if [[ "$success" -ne 1 ]]; then
    echo "Reverting K4B API config ONLY; database migration/backup stays as applied" >&2
    rm -f -- "$dropin"
    systemctl daemon-reload
    systemctl restart drvoerp-api.service || true
  fi
  exit "$status"
}
trap rollback_api EXIT

systemctl daemon-reload
systemctl restart drvoerp-api.service

ready=0
for attempt in {1..25}; do
  if curl -fsS --max-time 3 http://127.0.0.1:3311/api/health/db 2>/dev/null |
     grep -q '"database":"ready"'; then
    ready=1
    break
  fi
  sleep 1
done
[[ "$ready" -eq 1 ]] || { echo "K4B API SQL readiness failed" >&2; exit 1; }
[[ "$(systemctl is-active drvoerp-api.service)" == "active" ]] || exit 1
curl -fsS http://127.0.0.1:3311/api/health
echo
curl -fsS http://127.0.0.1:3311/api/health/db
echo
curl -fsS http://127.0.0.1:3310/health
echo
code="$(curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' https://erp-stage.drvotech.com/)"
[[ "$code" == "200" ]] || { echo "Public staging web no longer healthy: $code" >&2; exit 1; }

success=1
echo "K4B VPS DATABASE + BACKEND CONNECTION: PASS"
echo "No Casher/other service restarted. Admin secret is not stored in service config."
