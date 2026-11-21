'use strict';
/**
 * Root TTY only. Grants SQL040 Pilot module actions to an existing OWNER role
 * on DRVO_ERP_STAGING via core.EnsureOwnerPilotModulePermissions.
 * Never enables ADR-031 posting. Never prints secrets.
 */
const fs = require('node:fs');
const readline = require('node:readline/promises');
const sql = require('../../apps/api/node_modules/mssql');
const {PILOT_OWNER_MODULE_ACTIONS} = require('../pilot/owner-module-permissions.cjs');

const DB_ENV = '/etc/drvo-erp-db-automation/staging-db-automation.env';

function secrets(file, maxMode) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0 ||
      (stat.mode & 0o777 & (~maxMode)) !== 0) {
    throw Error('Migrator configuration must be a protected root-owned regular file');
  }
  const data = fs.readFileSync(file, 'utf8');
  const result = Object.create(null);
  for (const line of data.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]{2,80})=([^\r\n]*)$/.exec(line);
    if (!match || Object.hasOwn(result, match[1])) {
      throw Error('Migrator configuration file format is invalid');
    }
    result[match[1]] = match[2];
  }
  return result;
}

async function main() {
  if (process.getuid?.() !== 0 || !process.stdin.isTTY || !process.stdout.isTTY) {
    throw Error('Interactive root console required; no automated invocation');
  }
  const db = secrets(DB_ENV, 0o640);
  if (db.SQL_HOST !== '127.0.0.1' || db.SQL_PORT !== '1433' ||
      db.SQL_DATABASE !== 'DRVO_ERP_STAGING' ||
      db.SQL_USER !== 'drvo_erp_stage_migrator' ||
      !db.SQL_PASSWORD || db.SQL_PASSWORD.length < 12) {
    throw Error('Strictly scoped staging SQL migrator credentials missing');
  }

  const input = readline.createInterface({input: process.stdin, output: process.stdout});
  let tenantId, businessId, confirm;
  try {
    console.log('DRVO ERP — Grant Pilot Owner module permissions (SQL040)');
    console.log('Actions:', PILOT_OWNER_MODULE_ACTIONS.join(', '));
    tenantId = (await input.question('TenantId (GUID): ')).trim();
    businessId = (await input.question('BusinessId (GUID): ')).trim();
    confirm = await input.question('Type GRANT PILOT OWNER PERMISSIONS ON DRVO_ERP_STAGING: ');
  } finally {
    input.close();
  }
  if (confirm !== 'GRANT PILOT OWNER PERMISSIONS ON DRVO_ERP_STAGING') {
    throw Error('Not confirmed; no SQL writes');
  }
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guid.test(tenantId) || !guid.test(businessId)) {
    throw Error('TenantId/BusinessId must be GUIDs');
  }

  let pool;
  try {
    pool = new sql.ConnectionPool({
      server: '127.0.0.1', port: 1433, database: 'DRVO_ERP_STAGING',
      user: db.SQL_USER, password: db.SQL_PASSWORD,
      options: {encrypt: true, trustServerCertificate: true},
      pool: {min: 0, max: 1}, connectionTimeout: 5000, requestTimeout: 15000,
    });
    await pool.connect();
    const identity = await pool.request().query('SELECT DB_NAME() AS db');
    if (identity.recordset[0]?.db !== 'DRVO_ERP_STAGING') {
      throw Error('wrong database');
    }
    await pool.request()
      .input('t', sql.UniqueIdentifier, tenantId)
      .input('b', sql.UniqueIdentifier, businessId)
      .execute('core.EnsureOwnerPilotModulePermissions');
    console.log('PASS: EnsureOwnerPilotModulePermissions executed (NONPOSTING Pilot actions only)');
  } finally {
    await pool?.close().catch(() => {});
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(String(err && err.message ? err.message : err));
    process.exitCode = 1;
  });
}
