#!/usr/bin/env bash
# Root-installed, immutable on the host. Invoked ONLY by an SSH forced command.
# Executing user: drvoerp-deploy. No unrestricted SSH shell required.
set -Eeuo pipefail
umask 027

if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy[[:space:]]([0-9a-f]{40})$ ]]; then
  sha="${BASH_REMATCH[1]}"
else
  echo "Unsupported DRVO ERP staging action" >&2
  exit 64
fi

base="/srv/drvo-erp/deploy"
releases="$base/releases"
[[ -d "$releases" ]] || { echo "Deployment layout missing" >&2; exit 65; }
exec 9>"$base/.deploy.lock"
flock -w 30 9 || { echo "Another DRVO deployment is running" >&2; exit 75; }
tmp="$(mktemp -d "$base/.incoming.XXXXXXXX")"
previous=""
switched=0
complete=0

cleanup() {
  status=$?
  trap - EXIT
  if [[ "$status" -ne 0 && "$switched" -eq 1 && -n "$previous" ]]; then
    echo "Health check failed: restoring previous release" >&2
    ln -s "$previous" "$base/.current-rollback"
    mv -Tf "$base/.current-rollback" "$base/current"
    sudo -n /usr/bin/systemctl restart drvoerp-api.service || true
    sudo -n /usr/bin/systemctl restart drvoerp-web.service || true
  elif [[ "$status" -ne 0 && "$switched" -eq 1 ]]; then
    echo "First deploy failed: no prior version to restore; operator must restore saved systemd units" >&2
  fi
  rm -rf -- "$tmp"
  exit "$status"
}
trap cleanup EXIT

# Do not accept arbitrary filesystem paths from a tar stream.
archive="$tmp/staged.tgz"
head -c 600000001 > "$archive"
[[ $(stat -c%s "$archive") -le 600000000 ]] || {
  echo "Artifact too large" >&2
  exit 65
}
while IFS= read -r member; do
  case "$member" in
    "."|"./"|"./release.sha"|"./web"|"./web/"|"./web/"*|"./api"|"./api/"|"./api/"*) ;;
    *) echo "Unexpected archive path" >&2; exit 65 ;;
  esac
  case "$member" in
    *"/../"*|*"/.."|*"//"*|/*) echo "Unsafe archive path" >&2; exit 65 ;;
  esac
done < <(tar -tzf "$archive")

mkdir "$tmp/extracted"
tar -xzf "$archive" -C "$tmp/extracted" --no-same-owner --no-same-permissions
[[ -f "$tmp/extracted/release.sha" && -f "$tmp/extracted/web/server.js" && -f "$tmp/extracted/api/dist/main.js" ]] || {
  echo "Incomplete release artifact" >&2; exit 65;
}
[[ "$(tr -d '\r\n' < "$tmp/extracted/release.sha")" == "$sha" ]] || {
  echo "Release SHA mismatch" >&2; exit 65;
}

# Prevent symlink escape outside extracted bundle, including symlinks to host files.
while IFS= read -r -d '' link; do
  target="$(realpath -m "$link")"
  [[ "$target" == "$tmp/extracted/"* ]] || {
    echo "Archive contains a symlink outside its release directory" >&2; exit 65;
  }
done < <(find "$tmp/extracted" -type l -print0)

release="$releases/$sha"
if [[ ! -e "$release" ]]; then
  mv "$tmp/extracted" "$release"
fi
[[ -f "$release/release.sha" && "$(tr -d '\r\n' < "$release/release.sha")" == "$sha" ]] || {
  echo "Existing release directory is not valid" >&2; exit 65;
}

if [[ -L "$base/current" ]]; then previous="$(readlink "$base/current")"; fi
if [[ "$previous" != "releases/$sha" ]]; then
  ln -s "releases/$sha" "$base/.current-next"
  mv -Tf "$base/.current-next" "$base/current"
  switched=1
fi

sudo -n /usr/bin/systemctl restart drvoerp-api.service
sudo -n /usr/bin/systemctl restart drvoerp-web.service

for service in "3311/api/health/drvo-api" "3310/health/drvo-web"; do
  port="${service%%/*}"
  endpoint="${service#*/}"
  # Service states may require a short startup; fail closed on permanent error.
  ready=0
  for attempt in {1..25}; do
    if [[ "$port" == "3311" ]]; then
      url="http://127.0.0.1:3311/api/health"
      expected="drvo-api"
    else
      url="http://127.0.0.1:3310/health"
      expected="drvo-web"
    fi
    if curl -fsS --max-time 2 "$url" | grep -q "\"service\":\"$expected\""; then ready=1; break; fi
    sleep 1
  done
  [[ "$ready" -eq 1 ]] || { echo "Health check failed: $expected" >&2; exit 1; }
done
complete=1
printf 'DRVO ERP staging deployment successful: %s\n' "$sha"
