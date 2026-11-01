#!/usr/bin/env bash
# Root-owned launcher for NEW DRVO ERP API only.
# Safe on reboots before the first deployment: continue serving the repo build.
set -Eeuo pipefail
managed=/srv/drvo-erp/deploy/current/api
if [[ -f "$managed/dist/main.js" ]]; then
  cd "$managed"
  exec /usr/bin/node dist/main.js
fi
cd /srv/drvo-erp/repo/apps/api
exec /usr/bin/node dist/main.js
