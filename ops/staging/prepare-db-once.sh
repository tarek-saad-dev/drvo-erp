#!/usr/bin/env bash
# Manual one-time EMPTY DRVO ERP staging DB bootstrap.
# Requires an existing privileged SQL Server login; NEVER prints passwords.
# No tables, migrations, tenant records, data imports or prod DB writes.
set -Eeuo pipefail
umask 077

[[ "$EUID" -eq 0 ]] || { echo "Run as root on the intended VPS" >&2; exit 1; }
db="DRVO_ERP_STAGING"
app_login="drvo_erp_stage_app"
secret_dir="/etc/drvo-erp"
secret_file="$secret_dir/staging-sql.env"

if [[ -e "$secret_file" ]]; then
  echo "Refusing to overwrite existing $secret_file" >&2
  exit 1
fi

sqlcmd=""
for candidate in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd; do
  if [[ -x "$candidate" ]]; then sqlcmd="$candidate"; break; fi
done
if [[ -z "$sqlcmd" ]]; then
  sqlcmd="$(command -v sqlcmd || true)"
fi
[[ -n "$sqlcmd" ]] || {
  echo "sqlcmd is not installed; SQL staging was NOT modified." >&2
  echo "Install/review an appropriate Microsoft SQL client later without restarting production workloads." >&2
  exit 1
}

echo "Preparing only EMPTY SQL database: $db and new limited login: $app_login"
read -r -p "Existing SQL administrator login [sa]: " admin_login
admin_login="${admin_login:-sa}"
[[ "$admin_login" =~ ^[A-Za-z0-9_.-]+$ ]] || {
  echo "Unexpected administrator username characters" >&2; exit 1;
}
read -r -s -p "Existing SQL administrator password (hidden): " admin_pass
echo
[[ -n "$admin_pass" ]] || { echo "Password is required" >&2; exit 1; }

# SQLCMDPASSWORD is used instead of embedding privileged credentials in ps argv.
export SQLCMDPASSWORD="$admin_pass"
unset admin_pass
"$sqlcmd" -S 127.0.0.1,1433 -U "$admin_login" -C -l 5 -b -V 11 \
  -Q "SET NOCOUNT ON; IF DB_ID(N'$db') IS NOT NULL THROW 51001, 'DRVO staging database already exists. Refusing to modify it.', 1; IF SUSER_ID(N'$app_login') IS NOT NULL THROW 51002, 'DRVO staging login already exists. Refusing to modify it.', 1; SELECT N'New staging database/login names available' AS Result;"

# Strong generated password with upper, lower, number and punctuation.
app_pass="Drvo!A9$(openssl rand -hex 28)"
install -d -o root -g root -m 0700 "$secret_dir"
{
  printf 'DRVO_SQL_HOST=127.0.0.1\n'
  printf 'DRVO_SQL_PORT=1433\n'
  printf 'DRVO_SQL_DATABASE=%s\n' "$db"
  printf 'DRVO_SQL_USER=%s\n' "$app_login"
  printf 'DRVO_SQL_PASSWORD=%s\n' "$app_pass"
} > "$secret_file"
chmod 0600 "$secret_file"
chown root:root "$secret_file"

# Feed SQL through STDIN, never with -Q command-line secrets.
# -b halts on errors; a partial failure requires a DBA to review safely.
"$sqlcmd" -S 127.0.0.1,1433 -U "$admin_login" -C -l 10 -b -V 11 <<SQL
SET NOCOUNT ON;
IF DB_ID(N'$db') IS NOT NULL
    THROW 51003, 'Staging database already exists.', 1;
IF SUSER_ID(N'$app_login') IS NOT NULL
    THROW 51004, 'Staging login already exists.', 1;
GO
CREATE DATABASE [$db];
GO
CREATE LOGIN [$app_login] WITH PASSWORD = N'$app_pass',
    CHECK_POLICY = ON,
    CHECK_EXPIRATION = OFF,
    DEFAULT_DATABASE = [$db];
GO
USE [$db];
GO
CREATE USER [$app_login] FOR LOGIN [$app_login];
GRANT CONNECT TO [$app_login];
GO
SQL

# Test the separate least-privilege login, without printing credentials.
export SQLCMDPASSWORD="$app_pass"
"$sqlcmd" -S 127.0.0.1,1433 -U "$app_login" -d "$db" -C -l 5 -b -V 11 \
  -Q "IF DB_NAME() <> N'$db' THROW 51005, 'Wrong staging database', 1; SELECT N'DRVO_ERP_STAGING isolated login connection OK' AS Result;"
unset SQLCMDPASSWORD app_pass admin_login
echo "Staging SQL database + CONNECT-only app login are created and checked."
echo "Credentials are stored root-only at $secret_file; NEVER print/share them."
echo "This is EMPTY DB PROVISIONING ONLY: no schema migrations, backend wiring or live customer access."
