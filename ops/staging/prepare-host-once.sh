#!/usr/bin/env bash
# ONE-TIME STAGING OPERATOR ACTION: review this script before running as root.
# Usage: sudo bash ops/staging/prepare-host-once.sh /root/drvo-erp-ci-deploy-key.pub
# Never touches drvo-erp-staging.service, staging-erp.drvotech.com or customer DBs.
set -Eeuo pipefail
umask 027
[[ "${EUID}" -eq 0 ]] || { echo "Must be run as root by the VPS operator" >&2; exit 1; }
[[ $# -eq 1 && -r "$1" ]] || { echo "Pass an existing ED25519 deploy PUBLIC key file" >&2; exit 1; }
pubkey="$(cat "$1")"
[[ "$pubkey" =~ ^ssh-ed25519[[:space:]][A-Za-z0-9+/=]+([[:space:]].*)?$ ]] || {
  echo "Expected a valid-looking ED25519 public key" >&2; exit 1;
}

for unit in drvoerp-web.service drvoerp-api.service; do
  systemctl cat "$unit" > /dev/null || { echo "Missing $unit" >&2; exit 1; }
done
[[ -d /srv/drvo-erp/repo/apps/web && -d /srv/drvo-erp/repo/apps/api ]] || {
  echo "New DRVO ERP source checkout is missing" >&2; exit 1;
}
id drvoerp > /dev/null || { echo "Existing runtime account missing" >&2; exit 1; }
getent group drvoerp > /dev/null

# Never reuse the existing drvoerp runtime account for SSH deployment.
if ! id drvoerp-deploy >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/drvoerp-deploy \
    --shell /bin/bash --gid drvoerp drvoerp-deploy
fi
[[ "$(getent passwd drvoerp-deploy | cut -d: -f6)" == "/var/lib/drvoerp-deploy" ]] || {
  echo "Unexpected deploy user home" >&2; exit 1;
}
chmod 0700 /var/lib/drvoerp-deploy

# Source tree stays runnable by the existing drvoerp account.
# This prevents the public app process from replacing our deploy directory.
chown root:drvoerp /srv/drvo-erp
chmod 0750 /srv/drvo-erp
install -d -o drvoerp-deploy -g drvoerp -m 2750 /srv/drvo-erp/deploy
install -d -o drvoerp-deploy -g drvoerp -m 2750 /srv/drvo-erp/deploy/releases

install -d -o root -g root -m 0755 /usr/local/libexec
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
install -o root -g root -m 0755 \
  "$source_dir/receive-release.sh" /usr/local/libexec/drvoerp-receive
install -o root -g root -m 0755 \
  "$source_dir/start-web.sh" /usr/local/libexec/drvoerp-web-start
install -o root -g root -m 0755 \
  "$source_dir/start-api.sh" /usr/local/libexec/drvoerp-api-start
bash -n /usr/local/libexec/drvoerp-receive
bash -n /usr/local/libexec/drvoerp-web-start
bash -n /usr/local/libexec/drvoerp-api-start

# Grant restart authority ONLY for these two specific staging units.
sudoers="/etc/sudoers.d/drvoerp-deploy"
if [[ -e "$sudoers" ]]; then
  echo "Existing sudoers entry found, refusing overwrite: $sudoers" >&2
  exit 1
fi
printf '%s\n' \
  'drvoerp-deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart drvoerp-api.service, /usr/bin/systemctl restart drvoerp-web.service' \
  > "$sudoers"
chmod 0440 "$sudoers"
if ! visudo -cf "$sudoers"; then rm -f "$sudoers"; exit 1; fi

# SSH key can only invoke the immutable receiver; no interactive SSH, PTY,
# forwarding, unrestricted shell, rsync or root access.
ssh_home="/var/lib/drvoerp-deploy/.ssh"
install -d -o drvoerp-deploy -g drvoerp -m 0700 "$ssh_home"
authfile="$ssh_home/authorized_keys"
if [[ -s "$authfile" ]]; then
  echo "authorized_keys already exists; refusing to replace it" >&2
  exit 1
fi
printf 'restrict,command="/usr/local/libexec/drvoerp-receive" %s\n' "$pubkey" > "$authfile"
chown drvoerp-deploy:drvoerp "$authfile"
chmod 0600 "$authfile"

# Change only the new DRVO ERP systemd units. The new root-owned launchers
# preserve the existing /repo-based processes on unexpected restarts/reboots
# until the first successful GitHub managed release; no downtime gap.
for unit in drvoerp-web.service drvoerp-api.service; do
  install -d -o root -g root -m 0755 "/etc/systemd/system/$unit.d"
done
cat > /etc/systemd/system/drvoerp-web.service.d/20-managed-release.conf <<'EOF'
[Service]
WorkingDirectory=/srv/drvo-erp/repo/apps/web
ExecStart=
ExecStart=/usr/local/libexec/drvoerp-web-start
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3310
Environment=NEXT_TELEMETRY_DISABLED=1
EOF
cat > /etc/systemd/system/drvoerp-api.service.d/20-managed-release.conf <<'EOF'
[Service]
WorkingDirectory=/srv/drvo-erp/repo/apps/api
ExecStart=
ExecStart=/usr/local/libexec/drvoerp-api-start
Environment=NODE_ENV=production
Environment=API_HOST=127.0.0.1
Environment=API_PORT=3311
Environment=DRVO_K3_PROOF_ONLY=NO
EOF
chmod 0644 /etc/systemd/system/drvoerp-{web,api}.service.d/20-managed-release.conf
systemctl daemon-reload

echo "DRVO ERP staging deployment receiver prepared."
echo "The existing running services have NOT been restarted or switched yet."
echo "NEXT: configure GitHub Environment secrets and manually run staging-deploy.yml on main."
echo "NEVER paste private SSH keys or DB credentials into ChatGPT."
