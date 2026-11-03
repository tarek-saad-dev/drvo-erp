#!/usr/bin/env bash
# ONE-TIME root install: isolated Unix SSH principal + database-only SQL migrator.
# No root SSH access, no sudoers, no changes to Casher/old staging/prod units.
set -Eeuo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
[[ "$EUID" == 0 && -t 0 ]] || { echo "Interactive root session on DRVO VPS required" >&2; exit 1; }
# Ubuntu/Debian normally install useradd in /usr/sbin, absent from non-login
# root shells that use a minimal PATH. Fail before provisioning anything.
for required in useradd install chown chmod sudo node git curl ssh-keygen; do
  command -v "$required" >/dev/null 2>&1 || {
    echo "Missing installer prerequisite: $required. Check /usr/sbin or OS package" >&2
    exit 1
  }
done

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
# A failed SQL login on the older installer already created this fixed OS
# scaffold. Resume is opt-in and ONLY accepted when it matches that exact state.
mode="${1:-}"
case "$mode" in
  "") mode=fresh ;;
  --resume-after-admin-login-failure) mode=resume ;;
  *) echo "Use no arguments or --resume-after-admin-login-failure" >&2; exit 64 ;;
esac
[[ $# -le 1 ]] || { echo "Too many installer arguments" >&2; exit 64; }

bash -n "$repo/ops/staging/db-automation/receive-sql.sh"
node --check "$repo/ops/staging/db-automation/receive-sql.cjs"
node --check "$repo/ops/staging/db-automation/sql-bootstrap.cjs"
node --check "$repo/ops/staging/db-automation/build-payload.cjs"

if [[ "$mode" == fresh ]]; then
  for item in "$bundle" "$sql_env" "$key_dir" /usr/local/libexec/drvoerp-db-receiver; do
    [[ ! -e "$item" && ! -L "$item" ]] || {
      echo "Existing automation resource: $item (refusing overwrite)" >&2
      exit 1
    }
  done
  ! id "$unix_user" >/dev/null 2>&1 || {
    echo "DB SSH user already exists; use the documented resume mode ONLY after a failed SQL login" >&2
    exit 1
  }
else
  # The previous run stopped while authenticating to master, BEFORE it could
  # create a migrator SQL login, SQL env file, host key, or authorized SSH key.
  [[ -d "$bundle" && ! -L "$bundle" &&
     -d "$bundle/node_modules/mssql" &&
     -f "$bundle/receive-sql.cjs" &&
     -f "$bundle/sql-bootstrap.cjs" &&
     -f /usr/local/libexec/drvoerp-db-receiver ]] || {
    echo "Known partial installer scaffold missing; refusing unsafe resume" >&2; exit 1;
  }
  [[ ! -e "$sql_env" && ! -L "$sql_env" &&
     ! -e "$key_dir" && ! -L "$key_dir" &&
     ! -e "/var/lib/$unix_user/.ssh/authorized_keys" ]] || {
    echo "SQL or SSH setup has progressed beyond a failed admin login; refusing resume" >&2
    exit 1
  }
  [[ "$(getent passwd "$unix_user" | cut -d: -f6,7)" == "/var/lib/$unix_user:/bin/bash" &&
     "$(id -gn "$unix_user")" == "$unix_user" ]] || {
    echo "Unexpected DB user home, shell or group; refusing resume" >&2; exit 1;
  }
  [[ "$(stat -c '%u:%g:%a' "$bundle")" == "0:0:755" &&
     "$(stat -c '%u:%g:%a' /usr/local/libexec/drvoerp-db-receiver)" == "0:0:755" ]] || {
    echo "Existing receiver permissions changed; refusing resume" >&2; exit 1;
  }
  [[ -z "$(find "$bundle" -xdev ! -user root -print -quit)" &&
     -z "$(find "$bundle" -xdev \( -type f -o -type d \) -perm /022 -print -quit)" ]] || {
    echo "Existing runner content ownership/mode changed; refusing resume" >&2; exit 1;
  }
  cmp -s "$bundle/receive-sql.cjs" "$repo/ops/staging/db-automation/receive-sql.cjs" || {
    echo "Installed SQL receiver has changed; refusing resume" >&2; exit 1;
  }
  cmp -s /usr/local/libexec/drvoerp-db-receiver \
    "$repo/ops/staging/db-automation/receive-sql.sh" || {
      echo "Installed forced-command receiver differs; refusing resume" >&2; exit 1;
    }
  # The old bootstrap was installed from this verified main commit BEFORE the
  # SQL password failure. Only that exact known version may be reused.
  baseline=72e5ce5b5326d8d9d060eba49c8fedc1543e942a
  # The DRVO checkout is owned by 'drvoerp', NOT root. Git rejects a
  # root-owned caller with 'dubious ownership' (correctly). Read historical
  # source as the repo owner, never disable Git's safe.directory checks.
  if ! sudo -u drvoerp -H git -C "$repo" cat-file -e \
      "$baseline:ops/staging/db-automation/sql-bootstrap.cjs"; then
    echo "Historical bootstrap commit inaccessible as repository owner" >&2
    exit 1
  fi
  installed_sha="$(sha256sum "$bundle/sql-bootstrap.cjs" | cut -d' ' -f1)"
  original_sha="$(sudo -u drvoerp -H git -C "$repo" show \
      "$baseline:ops/staging/db-automation/sql-bootstrap.cjs" | sha256sum | cut -d' ' -f1)"
  [[ "$installed_sha" == "$original_sha" ]] || {
    echo "Installed SQL bootstrap is not the verified pre-failure version" >&2
    exit 1
  }
  unset installed_sha original_sha
  echo "PASS: verified exact partial install from failed SQL administrator login"
fi

# Validate the existing Admin credentials BEFORE touching any host state.
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
NODE_PATH=/srv/drvo-erp/deploy/current/api/node_modules \
  node "$repo/ops/staging/db-automation/sql-bootstrap.cjs" --check-admin

if [[ "$mode" == fresh ]]; then
  useradd --system --user-group --create-home \
    --home-dir /var/lib/drvoerp-dbdeploy --shell /bin/bash "$unix_user"
  chmod 0700 /var/lib/drvoerp-dbdeploy
  install -d -o root -g root -m 0755 "$bundle"
  install -o root -g root -m 0644 "$repo/ops/staging/db-automation/receive-sql.cjs" "$bundle/receive-sql.cjs"
  install -o root -g root -m 0644 "$repo/ops/staging/db-automation/sql-bootstrap.cjs" "$bundle/sql-bootstrap.cjs"
  install -o root -g root -m 0755 "$repo/ops/staging/db-automation/receive-sql.sh" /usr/local/libexec/drvoerp-db-receiver

  # Pin SQL driver deps into the root-owned immutable automation bundle.
  cp -a /srv/drvo-erp/deploy/current/api/node_modules "$bundle/node_modules"
  chown -R root:root "$bundle"
  chmod -R go-w "$bundle"
fi
node -e "require('$bundle/node_modules/mssql')"
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
