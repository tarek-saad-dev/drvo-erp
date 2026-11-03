#!/usr/bin/env bash
# Root-owned SSH forced command. Executed ONLY as drvoerp-dbdeploy.
# No arbitrary SSH shell, no forwarded ports, no sudo, no user arguments except SHA.
set -Eeuo pipefail
umask 077
export PATH=/usr/local/bin:/usr/bin:/bin
[[ "$(id -un)" == "drvoerp-dbdeploy" ]] || { echo "Wrong DB automation identity" >&2; exit 77; }
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^migrate[[:space:]]([a-f0-9]{40})$ ]]; then
  sha="${BASH_REMATCH[1]}"
else
  echo "Unsupported DRVO DB operation" >&2
  exit 64
fi
exec 9>/var/lib/drvoerp-dbdeploy/migration.lock
flock -w 30 9 || { echo "DRVO migration already running" >&2; exit 75; }
cd /opt/drvo-erp-db-automation
exec /usr/bin/node /opt/drvo-erp-db-automation/receive-sql.cjs "$sha"
