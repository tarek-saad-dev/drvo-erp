#!/usr/bin/env bash
# ONE interactive root session for isolated Private Pilot (synthetic DB only).
# Creates DRVO_ERP_PILOT, migrates SQL001–042, seeds Owner, wires systemd SQL+flags.
# Does NOT modify rows inside DRVO_ERP_STAGING. ADR-031 posting stays OFF.
set -Eeuo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[[ "$(id -u)" -eq 0 && -t 0 && -t 1 ]] || {
  echo "Interactive root console required" >&2
  exit 64
}

REPO="${DRVO_PILOT_REPO:-/srv/drvo-erp/repo}"
DB='DRVO_ERP_PILOT'
APP_LOGIN='drvo_erp_stage_app'
MIG_LOGIN='drvo_erp_stage_migrator'
APP_ENV='/etc/drvo-erp/pilot-sql.env'
OWNER_ONCE='/root/drvo-erp-pilot-owner.once'
API_D='/etc/systemd/system/drvoerp-api.service.d'
WEB_D='/etc/systemd/system/drvoerp-web.service.d'
TEMPLATES="$REPO/ops/staging/pilot"

[[ -d "$REPO/.git" && -f "$TEMPLATES/activate-pilot-sql.cjs" ]] || {
  echo "Pull reviewed main into $REPO first" >&2
  exit 65
}
[[ -f /etc/drvo-erp/staging-sql.env ]] || {
  echo "Existing /etc/drvo-erp/staging-sql.env required" >&2
  exit 65
}
[[ ! -e "$OWNER_ONCE" ]] || {
  echo "Refusing to overwrite $OWNER_ONCE" >&2
  exit 65
}

echo "DRVO ERP — Isolated Private Pilot activation (synthetic)"
echo "Target database: $DB"
echo "DRVO_ERP_STAGING data will not be migrated or rewritten."
echo "Public /demo/salon stays synthetic. ADR-031 posting stays BLOCKED."
echo
read -r -p "Type APPROVE CREATE DRVO_ERP_PILOT SYNTHETIC to continue: " confirm
[[ "$confirm" == "APPROVE CREATE DRVO_ERP_PILOT SYNTHETIC" ]] || {
  echo "Not confirmed" >&2
  exit 66
}

read -r -p "Existing SQL administrator login [sa]: " admin_login
admin_login="${admin_login:-sa}"
[[ "$admin_login" =~ ^[A-Za-z0-9_.-]+$ ]] || { echo "Bad admin login" >&2; exit 67; }
read -r -s -p "Existing SQL administrator password (hidden): " admin_pass
echo
[[ -n "$admin_pass" ]] || { echo "Password required" >&2; exit 67; }

# shellcheck disable=SC1091
source /etc/drvo-erp/staging-sql.env
[[ "${DRVO_SQL_USER:-}" == "$APP_LOGIN" && -n "${DRVO_SQL_PASSWORD:-}" ]] || {
  echo "staging-sql.env app login mismatch" >&2
  exit 68
}

sqlcmd=""
for c in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd; do
  [[ -x "$c" ]] && sqlcmd="$c" && break
done
[[ -n "$sqlcmd" ]] || sqlcmd="$(command -v sqlcmd || true)"
[[ -n "$sqlcmd" ]] || { echo "sqlcmd missing" >&2; exit 69; }

export SQLCMDPASSWORD="$admin_pass"
"$sqlcmd" -S 127.0.0.1,1433 -U "$admin_login" -C -l 8 -b -V 11 <<SQL
SET NOCOUNT ON;
IF DB_ID(N'DRVO_ERP_STAGING') IS NULL
  THROW 52001, 'DRVO_ERP_STAGING missing', 1;
IF SUSER_ID(N'$APP_LOGIN') IS NULL THROW 52002, 'App login missing', 1;
IF SUSER_ID(N'$MIG_LOGIN') IS NULL THROW 52003, 'Migrator login missing', 1;
IF DB_ID(N'$DB') IS NULL CREATE DATABASE [$DB];
SQL

"$sqlcmd" -S 127.0.0.1,1433 -U "$admin_login" -C -l 8 -b -V 11 <<SQL
SET NOCOUNT ON;
USE [$DB];
IF USER_ID(N'$APP_LOGIN') IS NULL CREATE USER [$APP_LOGIN] FOR LOGIN [$APP_LOGIN];
IF USER_ID(N'$MIG_LOGIN') IS NULL CREATE USER [$MIG_LOGIN] FOR LOGIN [$MIG_LOGIN];
IF IS_ROLEMEMBER('db_ddladmin', N'$MIG_LOGIN') = 0
  ALTER ROLE db_ddladmin ADD MEMBER [$MIG_LOGIN];
IF IS_ROLEMEMBER('db_backupoperator', N'$MIG_LOGIN') = 0
  ALTER ROLE db_backupoperator ADD MEMBER [$MIG_LOGIN];
GRANT CONNECT TO [$APP_LOGIN];
GRANT CONNECT TO [$MIG_LOGIN];
SQL
unset SQLCMDPASSWORD

install -d -o root -g root -m 0700 /etc/drvo-erp
{
  printf 'DRVO_SQL_HOST=127.0.0.1\n'
  printf 'DRVO_SQL_PORT=1433\n'
  printf 'DRVO_SQL_DATABASE=%s\n' "$DB"
  printf 'DRVO_SQL_USER=%s\n' "$APP_LOGIN"
  printf 'DRVO_SQL_PASSWORD=%s\n' "$DRVO_SQL_PASSWORD"
  printf 'DRVO_SQL_ENABLED=YES\n'
} > "$APP_ENV"
chmod 0600 "$APP_ENV"
chown root:root "$APP_ENV"

# Ensure API dist + mssql exist for migrate/seed.
cd "$REPO"
if [[ ! -f apps/api/dist/identity/password.js ]]; then
  npm ci --prefix apps/api --no-audit --no-fund
  npm run build --prefix apps/api
fi
[[ -d apps/api/node_modules/mssql ]] || npm ci --prefix apps/api --omit=dev --no-audit --no-fund

export DRVO_PILOT_ADMIN_LOGIN="$admin_login"
export DRVO_PILOT_ADMIN_PASSWORD="$admin_pass"
export DRVO_PILOT_OWNER_ONCE="$OWNER_ONCE"
unset admin_pass
node "$TEMPLATES/activate-pilot-sql.cjs"
unset DRVO_PILOT_ADMIN_LOGIN DRVO_PILOT_ADMIN_PASSWORD

install -d -m 0755 "$API_D" "$WEB_D"
install -m 0644 "$TEMPLATES/45-pilot-sql.conf.example" "$API_D/45-pilot-sql.conf"
install -m 0644 "$TEMPLATES/40-k5-pilot-api.conf.example" "$API_D/40-k5-pilot-api.conf"
install -m 0644 "$TEMPLATES/40-k5-pilot-web.conf.example" "$WEB_D/40-k5-pilot-web.conf"

systemctl daemon-reload
systemctl restart drvoerp-api.service
systemctl restart drvoerp-web.service
sleep 2
systemctl is-active --quiet drvoerp-api.service
systemctl is-active --quiet drvoerp-web.service

SHA="$(tr -d '\r\n' </srv/drvo-erp/deploy/current/release.sha 2>/dev/null || true)"
echo
echo "PASS: isolated Pilot DB $DB activated (synthetic Owner seeded)"
echo "URL: https://erp-stage.drvotech.com/pilot"
echo "Sign-in: https://erp-stage.drvotech.com/sign-in"
echo "Owner credentials (root-only once file): $OWNER_ONCE"
echo "Deployed release.sha: ${SHA:-unknown}"
echo "NOT PILOT_VERIFIED — founder must accept in browser. ADR-031 BLOCKED."
