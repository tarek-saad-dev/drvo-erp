#!/usr/bin/env bash
# Run as root from the reviewed DRVO ERP main checkout.
# The existing deploy bundle can contain root-only (0700/0600) npm files.
# Fix ONLY the immutable /opt DB runner's dependencies, not /srv apps or
# /etc SQL secrets. Grant *read/traverse* exclusively to dbdeploy's group.
set -Eeuo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
[[ "$EUID" == 0 ]] || { echo "Root required for restricted dependency repair" >&2; exit 1; }

bundle=/opt/drvo-erp-db-automation
deps="$bundle/node_modules"
identity=drvoerp-dbdeploy

[[ -d "$bundle" && ! -L "$bundle" && -d "$deps" && ! -L "$deps" &&
   -d "$deps/mssql" && "$(stat -c '%u' "$bundle")" == 0 &&
   "$(stat -c '%u' "$deps")" == 0 ]] || {
  echo "Expected pinned root-owned DB runner dependencies not found" >&2; exit 1;
}
[[ -z "$(find "$deps" -xdev ! -user root -print -quit)" ]] || {
  echo "Untrusted owner found in DB runner dependencies; refusing repair" >&2; exit 1;
}
id "$identity" >/dev/null || { echo "DB deploy user is missing" >&2; exit 1; }
# Do not give any permission to unrelated users; preserve root ownership.
chgrp -R "$identity" "$deps"
chmod -R u+rwX,g+rX,go-w,o-rwx "$deps"
[[ -z "$(find "$deps" -xdev \( -type d -o -type f \) -perm /022 -print -quit)" ]] || {
  echo "Writable dependency permission detected after repair" >&2; exit 1;
}

# Important: run require() as the ACTUAL restricted runtime Linux account.
# Root's ability to require the package is not evidence it can.
sudo -n -u "$identity" -H /usr/bin/node -e "
  const assert=require('node:assert/strict');
  const packagePath='$deps/mssql';
  const sql=require(packagePath);
  assert.equal(typeof sql.ConnectionPool,'function');
  console.log('PASS: pinned mssql module loads as restricted DRVO DB deploy user');
"
