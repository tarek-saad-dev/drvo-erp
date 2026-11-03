#!/usr/bin/env bash
# ONE-TIME root install: isolated Unix SSH principal + database-only SQL migrator.
# No root SSH access, no sudoers, no changes to Casher/old staging/prod units.
set -Eeuo pipefail
umask 077
export PATH=/usr/local/bin:/usr/bin:/bin
[[ "$EUID" == 0 && -t 0 ]] || { echo "Interactive root session on DRVO VPS required" >&2; exit 1; }

repo=/srv/drvo-erp/repo
bundle=/opt/drvo-erp-db-automation
unix_user=drvoerp-dbdeploy
sql_env=/etc/drvo-erp/staging-db-automation.env
key_dir=/root/drvo-erp-db-bootstrap
[[ "$(sudo -u drvoerp -H git -C "$repo" branch --show-current)" == main ]] || {
  echo "DRVO source checkout must be on main" >&2; exit 1;
}
[[ -z "$(sudo -u drvoerp -H git -C "$repo" status --porcelain)" ]] || {
  echo "DRVO checkout not clean; refusing root installation" >&2; exit 1;
}
[[ -x /usr/bin/node ]] || { echo "Expected /usr/bin/node on the DRVO VPS" >&2; exit 1; }
[[ -d /srv/drvo-erp/deploy/current/api/node_modules/mssql ]] || {
  echo "Managed DRVO ERP API dependencies not available" >&2; exit 1;
}
[[ -f /etc/drvo-erp/staging-sql.env ]] || { echo "K4 DB config missing" >&2; exit 1; }
curl -fsS --max-time 5 http://127.0.0.1:3311/api/health/db |
  grep -q '"database":"ready"' || {
    echo "K4 DRVO API database readiness failed, refusing SQL bootstrap" >&2; exit 1;
  }
[[ -f "$repo/apps/api/node_modules/mssql/package.json" ]] || {
  echo "K5A operator module requires installed API SQL driver in the clean checkout" >&2; exit 1;
}
[[ -f "$repo/db/migrations/002_identity_sessions_and_roles.sql" ]] || {
  echo "K5 migration source is missing" >&2; exit 1;
}
for item in "$bundle" "$sql_env" "$key_dir" /usr/local/libexec/drvoerp-db-receiver; do
  [[ ! -e "$item" ]] || { echo "Existing automation resource: $item (refusing overwrite)" >&2; exit 1; }
done
! id "$unix_user" >/dev/null 2>&1 || { echo "DB SSH user exists; review manually" >&2; exit 1; }

bash -n "$repo/ops/staging/db-automation/receive-sql.sh"
node --check "$repo/ops/staging/db-automation/receive-sql.cjs"
node --check "$repo/ops/staging/db-automation/sql-bootstrap.cjs"
node --check "$repo/ops/staging/db-automation/build-payload.cjs"

useradd --system --user-group --create-home \
  --home-dir /var/lib/drvoerp-dbdeploy --shell /bin/bash "$unix_user"
chmod 0700 /var/lib/drvoerp-dbdeploy
install -d -o root -g root -m 0755 "$bundle"
install -o root -g root -m 0644 "$repo/ops/staging/db-automation/receive-sql.cjs" "$bundle/receive-sql.cjs"
install -o root -g root -m 0644 "$repo/ops/staging/db-automation/sql-bootstrap.cjs" "$bundle/sql-bootstrap.cjs"
install -o root -g root -m 0755 "$repo/ops/staging/db-automation/receive-sql.sh" /usr/local/libexec/drvoerp-db-receiver

# Pin node_modules into a root-owned location instead of requiring code from a
# mutable Git checkout at each privileged migration invocation.
cp -a /srv/drvo-erp/deploy/current/api/node_modules "$bundle/node_modules"
chown -R root:root "$bundle"
chmod -R go-w "$bundle"
node -e "require('$bundle/node_modules/mssql')"

echo "Target: DRVO_ERP_STAGING only. Enter the EXISTING SQL Admin locally."
read -r -p "Existing SQL administrator login [sa]: " admin_login
admin_login="${admin_login:-sa}"
[[ "$admin_login" =~ ^[A-Za-z0-9_.-]{1,64}$ ]] || { echo "Invalid admin login" >&2; exit 1; }
read -r -s -p "Existing SQL administrator password (hidden): " admin_pass
echo
[[ -n "$admin_pass" ]] || { echo "Admin password required" >&2; exit 1; }
export DRVO_DB_ADMIN_LOGIN="$admin_login"
export DRVO_DB_ADMIN_PASSWORD="$admin_pass"
export DRVO_DB_BOOTSTRAP=YES
unset admin_login admin_pass
node "$bundle/sql-bootstrap.cjs"
unset DRVO_DB_ADMIN_LOGIN DRVO_DB_ADMIN_PASSWORD DRVO_DB_BOOTSTRAP

chown root:drvoerp-dbdeploy "$sql_env"
chmod 0640 "$sql_env"
sudo -u drvoerp-dbdeploy -H node -e \
  "require('fs').readFileSync('$sql_env','utf8'); console.log('PASS: DB SSH user can read only its scoped credential file')"

install -d -o root -g root -m 0700 "$key_dir"
ssh-keygen -q -t ed25519 -N '' -C drvo-erp-staging-db -f "$key_dir/id_ed25519"
pubkey="$(cat "$key_dir/id_ed25519.pub")"
[[ "$pubkey" =~ ^ssh-ed25519[[:space:]][A-Za-z0-9+/=]+[[:space:]] ]] || {
  echo "Invalid new SSH key" >&2; exit 1;
}

install -d -o drvoerp-dbdeploy -g drvoerp-dbdeploy -m 0700 /var/lib/drvoerp-dbdeploy/.ssh
printf 'restrict,command="/usr/local/libexec/drvoerp-db-receiver" %s\n' "$pubkey" \
  > /var/lib/drvoerp-dbdeploy/.ssh/authorized_keys
chown drvoerp-dbdeploy:drvoerp-dbdeploy /var/lib/drvoerp-dbdeploy/.ssh/authorized_keys
chmod 0600 /var/lib/drvoerp-dbdeploy/.ssh/authorized_keys
unset pubkey

echo
echo "=== DRVO STAGING DB AUTOMATION INSTALLED ==="
echo "DB principal: drvo_erp_stage_migrator, DRVO_ERP_STAGING only"
echo "SSH user: drvoerp-dbdeploy (forced command, no interactive shell or sudo)"
echo "SQL admin password not saved or sent to GitHub"
echo "The new private SSH key is stored temporarily at: $key_dir/id_ed25519"
echo "Copy it into GitHub Environment 'staging-db' secret DRVO_DB_STAGE_SSH_PRIVATE_KEY."
echo "After a successful GitHub SSH check, securely dispose of the VPS private key copy."
echo
echo "=== PUBLIC HOST KEY FINGERPRINT (verify before configuring GitHub) ==="
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
echo "=== GitHub known_hosts public line ==="
printf '187.77.83.120 %s\n' "$(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
echo
echo "GitHub secrets: DRVO_DB_STAGE_HOST=187.77.83.120;"
echo "DRVO_DB_STAGE_USER=drvoerp-dbdeploy; DRVO_DB_STAGE_SSH_PRIVATE_KEY=the private key;"
echo "DRVO_DB_STAGE_KNOWN_HOSTS=the known_hosts line above."
echo "No database migrations were applied by this installation."
