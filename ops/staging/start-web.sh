#!/usr/bin/env bash
# Root-owned launcher for NEW DRVO ERP web only.
# Safe on reboots before the first deployment: continue serving the repo build.
set -Eeuo pipefail
managed=/srv/drvo-erp/deploy/current/web
if [[ -f "$managed/server.js" ]]; then
  cd "$managed"
  exec /usr/bin/node server.js
fi
cd /srv/drvo-erp/repo/apps/web
exec /usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3310
