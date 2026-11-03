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
legacy_sql_env=/etc/drvo-erp/staging-db-automation.env
secret_dir=/etc/drvo-erp-db-automation
sql_env="$secret_dir/staging-db-automation.env"
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
  --resume-after-secret-traversal-failure) mode=resume-secret ;;
  *) echo "Use no arguments, --resume-after-admin-login-failure or --resume-after-secret-traversal-failure" >&2; exit 64 ;;
esac
[[ $# -le 1 ]] || { echo "Too many installer arguments" >&2; exit 64; }

bash -n "$repo/ops/staging/db-automation/receive-sql.sh"
node --check "$repo/ops/staging/db-automation/receive-sql.cjs"
node --check "$repo/ops/staging/db-automation/sql-bootstrap.cjs"
node --check "$repo/ops/staging/db-automation/build-payload.cjs"

# Known partial states: (1) incorrect admin credentials, before SQL work;
# (2) successful K5 migration + SQL bootstrap, but the shared root-private
# /etc/drvo-erp directory blocked traversal by drvoerp-dbdeploy.
baseline=72e5ce5b5326d8d9d060eba49c8fedc1543e942a
check_pinned_source() {
  local installed="$1" source="$2" actual expected
  sudo -u drvoerp -H git -C "$repo" cat-file -e "$baseline:$source" || {
    echo "Historical bootstrap code unavailable from repository owner" >&2; exit 1;
  }
  actual="$(sha256sum "$installed" | cut -d' ' -f1)"
  expected="$(sudo -u drvoerp -H git -C "$repo" show "$baseline:$source" | sha256sum | cut -d' ' -f1)"
  if [[ "$actual" != "$expected" ]]; then
    # Recovery may have previously moved the secret and pinned this exact
    # currently reviewed main-branch receiver before a later smoke failure.
    [[ "$mode" == resume-secret && -f "$repo/$source" &&
       "$actual" == "$(sha256sum "$repo/$source" | cut -d' ' -f1)" ]] || {
      echo "Installed $source differs from both approved recovery versions" >&2; exit 1;
    }
  fi
}
if [[ "$mode" == fresh ]]; then
  for item in "$bundle" "$sql_env" "$legacy_sql_env" "$secret_dir" "$key_dir" /usr/local/libexec/drvoerp-db-receiver; do
    [[ ! -e "$item" && ! -L "$item" ]] || {
      echo "Existing automation resource: $item (refusing overwrite)" >&2; exit 1;
    }
  done
  ! id "$unix_user" >/dev/null 2>&1 || {
    echo "DB SSH user already exists; use recovery only for a known partial install" >&2; exit 1;
  }
else
  [[ -d "$bundle" && ! -L "$bundle" && -d "$bundle/node_modules/mssql" &&
     -f "$bundle/receive-sql.cjs" && ! -L "$bundle/receive-sql.cjs" &&
     -f "$bundle/sql-bootstrap.cjs" && ! -L "$bundle/sql-bootstrap.cjs" &&
     -f /usr/local/libexec/drvoerp-db-receiver &&
     ! -L /usr/local/libexec/drvoerp-db-receiver ]] || {
    echo "Known partial installer scaffold missing; refusing unsafe resume" >&2; exit 1;
  }
  [[ ! -e "$key_dir" && ! -L "$key_dir" &&
     ! -e "/var/lib/$unix_user/.ssh/authorized_keys" &&
     ! -L "/var/lib/$unix_user/.ssh/authorized_keys" ]] || {
    echo "SSH setup has progressed beyond the supported partial install" >&2; exit 1;
  }
  [[ "$(getent passwd "$unix_user" | cut -d: -f6,7)" == "/var/lib/$unix_user:/bin/bash" &&
     "$(id -gn "$unix_user")" == "$unix_user" ]] || {
    echo "Unexpected DB user home, shell or group; refusing resume" >&2; exit 1;
  }
  [[ "$(stat -c '%u:%g:%a' "$bundle")" == "0:0:755" &&
     "$(stat -c '%u:%g:%a' /usr/local/libexec/drvoerp-db-receiver)" == "0:0:755" ]] || {
    echo "Existing receiver ownership or permissions changed" >&2; exit 1;
  }
  [[ -z "$(find "$bundle" -xdev ! -user root -print -quit)" &&
     -z "$(find "$bundle" -xdev \( -type f -o -type d \) -perm /022 -print -quit)" ]] || {
    echo "Existing runner content ownership/mode changed" >&2; exit 1;
  }
  cmp -s /usr/local/libexec/drvoerp-db-receiver \
    "$repo/ops/staging/db-automation/receive-sql.sh" || {
      echo "Installed SSH forced command differs from verified source" >&2; exit 1;
    }
  check_pinned_source "$bundle/receive-sql.cjs" \
    ops/staging/db-automation/receive-sql.cjs
  check_pinned_source "$bundle/sql-bootstrap.cjs" \
    ops/staging/db-automation/sql-bootstrap.cjs
  if [[ "$mode" == resume ]]; then
    [[ ! -e "$sql_env" && ! -L "$sql_env" &&
       ! -e "$legacy_sql_env" && ! -L "$legacy_sql_env" &&
       ! -e "$secret_dir" && ! -L "$secret_dir" ]] || {
      echo "Database bootstrap already created resources; use the correct recovery mode" >&2; exit 1;
    }
    echo "PASS: verified exact partial install after failed SQL administrator login"
  else
    [[ "$mode" == resume-secret ]] || exit 64
    [[ ! -L "$secret_dir" ]] || { echo "Symlinked secret directory rejected" >&2; exit 1; }
    expected="0:$(id -g "$unix_user"):640"
    if [[ -f "$legacy_sql_env" && ! -L "$legacy_sql_env" &&
          ! -e "$sql_env" && ! -L "$sql_env" ]]; then
      [[ ! -e "$secret_dir" ||
         "$(stat -c '%u:%g:%a' "$secret_dir")" == "0:$(id -g "$unix_user"):710" ]] || {
        echo "Unexpected pre-existing dedicated secret directory" >&2; exit 1;
      }
      [[ "$(stat -c '%u:%g:%a' "$legacy_sql_env")" == "$expected" ]] || {
        echo "Legacy SQL secret ownership or permissions changed" >&2; exit 1;
      }
    elif [[ ! -e "$legacy_sql_env" && ! -L "$legacy_sql_env" &&
            -d "$secret_dir" && -f "$sql_env" && ! -L "$sql_env" ]]; then
      [[ "$(stat -c '%u:%g:%a' "$secret_dir")" == "0:$(id -g "$unix_user"):710" &&
         "$(stat -c '%u:%g:%a' "$sql_env")" == "$expected" ]] || {
        echo "Migrated SQL secret ownership or permissions changed" >&2; exit 1;
      }
    else
      echo "Secret-directory recovery state differs from the reported failure" >&2; exit 1;
    fi
    echo "PASS: existing K5 SQL migration and root-owned secret verified; no SQL bootstrap replay"
  fi
fi

if [[ "$mode" != resume-secret ]]; then
  # Fresh SQL provisioning only. Existing K5-success state needs NO admin login.
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
    cp -a /srv/drvo-erp/deploy/current/api/node_modules "$bundle/node_modules"
    chown -R root:root "$bundle"
    chmod -R go-w "$bundle"
  fi
  # Dedicated credential directory instead of opening the shared /etc/drvo-erp.
  install -d -o root -g "$unix_user" -m 0710 "$secret_dir"
  install -o root -g root -m 0644 \
    "$repo/ops/staging/db-automation/receive-sql.cjs" "$bundle/receive-sql.cjs"
  install -o root -g root -m 0644 \
    "$repo/ops/staging/db-automation/sql-bootstrap.cjs" "$bundle/sql-bootstrap.cjs"
  if [[ "$mode" == fresh ]]; then
    install -o root -g root -m 0755 \
      "$repo/ops/staging/db-automation/receive-sql.sh" \
      /usr/local/libexec/drvoerp-db-receiver
  fi
  node -e "require('$bundle/node_modules/mssql')"
  node "$bundle/sql-bootstrap.cjs"
  unset DRVO_DB_ADMIN_LOGIN DRVO_DB_ADMIN_PASSWORD DRVO_DB_BOOTSTRAP
else
  # K5 SQL migrations, SQL login and its password already succeeded.
  # Do not prompt for SQL admin, rerun K5 DDL or recreate any SQL principal.
  install -d -o root -g "$unix_user" -m 0710 "$secret_dir"
  if [[ -f "$legacy_sql_env" && ! -L "$legacy_sql_env" ]]; then
    [[ ! -e "$sql_env" && ! -L "$sql_env" ]] || {
      echo "Dedicated SQL secret already exists; refusing overwrite" >&2; exit 1;
    }
    mv -T -- "$legacy_sql_env" "$sql_env"
  fi
  install -o root -g root -m 0644 \
    "$repo/ops/staging/db-automation/receive-sql.cjs" "$bundle/receive-sql.cjs"
  install -o root -g root -m 0644 \
    "$repo/ops/staging/db-automation/sql-bootstrap.cjs" "$bundle/sql-bootstrap.cjs"
  echo "PASS: existing SQL secret moved to a dedicated directory; no SQL migration repeated"
fi

[[ "$(stat -c '%u:%g:%a' "$secret_dir")" == "0:$(id -g "$unix_user"):710" ]] || {
  echo "Dedicated SQL secret directory permissions are incorrect" >&2; exit 1;
}
chown root:drvoerp-dbdeploy "$sql_env"
chmod 0640 "$sql_env"
install -o root -g root -m 0644 \
  "$repo/ops/staging/db-automation/check-runtime.cjs" "$bundle/check-runtime.cjs"
sudo -u "$unix_user" -H /usr/bin/node "$bundle/check-runtime.cjs"

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
echo "K5A migration state preserved; login/RBAC HTTP is still disabled."
