'use strict';

/**
 * Fail-closed gates for the Cut Salon adapter track.
 * Live Cut/Cashier/VPS SQL access is NEVER authorized from this package.
 * Founder-approved connection + explicit scope are required before any
 * separate live-read tool may be introduced outside this fixture-only path.
 */

const FORBIDDEN_KEYS = Object.freeze([
  'connectionString',
  'connection_string',
  'sqlConnectionString',
  'DATABASE_URL',
  'DRVO_SQL_HOST',
  'SQL_HOST',
  'SQL_PASSWORD',
  'password',
  'pwd',
  'userName',
  'user',
  'uid',
  'server',
  'dataSource',
  'host',
  'hostname',
  'port',
  'mssql',
  'tedious',
]);

/** Host/DSN fragments that imply a live network SQL target (not fixture JSON). */
const LIVE_HOST_PATTERNS = Object.freeze([
  /\bServer\s*=/i,
  /\bData\s*Source\s*=/i,
  /\bInitial\s*Catalog\s*=/i,
  /\bUser\s*Id\s*=/i,
  /\bPassword\s*=/i,
  /\bmssql:\/\//i,
  /\bsqlserver:\/\//i,
  /\bjdbc:sqlserver:/i,
  /\b1433\b/,
  /\b14333\b/,
  /\.database\.windows\.net\b/i,
  /\.drvotech\.com\b/i,
  /\berp-stage\b/i,
  /\bvps\b/i,
  /\bcut[-_]?salon\b/i,
  /\bcashier[-_]?prod\b/i,
  /\bproduction\b/i,
  /\blive[-_]?db\b/i,
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,
]);

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function walkStrings(node, visit) {
  if (typeof node === 'string') {
    visit(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkStrings(item, visit);
    return;
  }
  if (!isPlainObject(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new TypeError(
        'Live Cut/Cashier DB access blocked: forbidden field "' + key +
        '". Fixture-only JSON exports are allowed; founder-approved connection + scope required for live source access.'
      );
    }
    walkStrings(value, visit);
  }
}

function assertNoLiveConnectionMarkers(input) {
  walkStrings(input, (text) => {
    for (const pattern of LIVE_HOST_PATTERNS) {
      if (pattern.test(text)) {
        throw new TypeError(
          'Live Cut/Cashier DB access blocked: connection string / hostname marker detected. ' +
          'Use exported JSON fixtures only until founder-approved connection + scope exist.'
        );
      }
    }
  });
  return true;
}

function assertFixtureOnlyMode(meta) {
  if (!isPlainObject(meta)) {
    throw new TypeError('Fixture meta object required');
  }
  if (meta.mode !== 'EXPORTED_JSON_FIXTURE_ONLY') {
    throw new TypeError(
      'Adapter accepts EXPORTED_JSON_FIXTURE_ONLY mode; live SQL/network DB mode is BLOCKED'
    );
  }
  if (meta.liveConnectionAuthorized === true) {
    throw new TypeError(
      'liveConnectionAuthorized=true refused: live Cut source access requires founder-approved connection + scope outside this tool'
    );
  }
  assertNoLiveConnectionMarkers(meta);
  return true;
}

module.exports = {
  FORBIDDEN_KEYS,
  LIVE_HOST_PATTERNS,
  assertNoLiveConnectionMarkers,
  assertFixtureOnlyMode,
};
