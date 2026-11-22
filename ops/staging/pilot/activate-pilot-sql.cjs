'use strict';
/**
 * Root-invoked SQL activator for isolated DRVO_ERP_PILOT only.
 * Migrates SQL001–042, backup+restore witness, seeds synthetic Owner.
 * Never targets DRVO_ERP_STAGING / production / Cut.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID, randomBytes} = require('node:crypto');

const DB = 'DRVO_ERP_PILOT';
const ROOT = path.resolve(__dirname, '../../..');

function requireEnv(name) {
  const value = process.env[name];
  assert.ok(value && String(value).length >= 8, name + ' required');
  return String(value);
}

async function main() {
  assert.equal(process.getuid?.(), 0, 'root required');
  assert.ok(process.stdin.isTTY && process.stdout.isTTY, 'interactive TTY required');
  assert.notEqual(DB, 'DRVO_ERP_STAGING');

  const adminUser = requireEnv('DRVO_PILOT_ADMIN_LOGIN');
  const adminPass = requireEnv('DRVO_PILOT_ADMIN_PASSWORD');
  const ownerOnce = requireEnv('DRVO_PILOT_OWNER_ONCE');
  assert.ok(!fs.existsSync(ownerOnce), 'owner once-file already exists — refuse overwrite');

  const sql = require(path.join(ROOT, 'apps/api/node_modules/mssql'));
  const {applyMigrations} = require(path.join(ROOT, 'tools/k4-db/migrate.cjs'));
  const {hashNewPassword} = require(path.join(ROOT, 'apps/api/dist/identity/password.js'));
  const {PILOT_OWNER_MODULE_ACTIONS} = require(path.join(
    ROOT,
    'tools/pilot/owner-module-permissions.cjs'
  ));

  const base = {
    server: '127.0.0.1',
    port: 1433,
    user: adminUser,
    password: adminPass,
    options: {encrypt: true, trustServerCertificate: true},
    connectionTimeout: 8000,
    requestTimeout: 180000,
    pool: {min: 0, max: 2},
  };

  const pool = new sql.ConnectionPool({...base, database: DB});
  await pool.connect();
  const who = await pool.request().query('SELECT DB_NAME() AS db');
  assert.equal(who.recordset[0].db, DB);

  const applied = await applyMigrations(pool);
  assert.ok(applied.length >= 42, 'expected migrations through SQL042');
  assert.equal(applied[applied.length - 1].filename, '042_booking_completed_pos_handoff.sql');

  const stamp = Date.now();
  const bak = `/var/opt/mssql/data/${DB}_pilot_${stamp}.bak`;
  const restoreDb = `DrvoPilotActivateRestore_${stamp}`;
  await pool.request().batch(
    `BACKUP DATABASE [${DB}] TO DISK = N'${bak}' WITH COPY_ONLY, INIT, COMPRESSION, CHECKSUM`
  );

  const master = new sql.ConnectionPool({...base, database: 'master'});
  await master.connect();
  await master.request().batch(`RESTORE VERIFYONLY FROM DISK = N'${bak}' WITH CHECKSUM`);
  const files = await master.request().query(`RESTORE FILELISTONLY FROM DISK = N'${bak}'`);
  const dataLogical = files.recordset.find((r) => r.Type === 'D')?.LogicalName;
  const logLogical = files.recordset.find((r) => r.Type === 'L')?.LogicalName;
  assert.ok(dataLogical && logLogical);
  await master.request().batch(`
    RESTORE DATABASE [${restoreDb}] FROM DISK = N'${bak}'
    WITH MOVE N'${dataLogical}' TO N'/var/opt/mssql/data/${restoreDb}.mdf',
         MOVE N'${logLogical}' TO N'/var/opt/mssql/data/${restoreDb}_log.ldf',
         REPLACE, RECOVERY, CHECKSUM`);
  const restorePool = new sql.ConnectionPool({...base, database: restoreDb});
  await restorePool.connect();
  const hist = await restorePool.request().query('SELECT COUNT(*) AS n FROM core.SchemaMigration');
  assert.ok(Number(hist.recordset[0].n) >= 42);
  await restorePool.close();
  await master.request().batch(`DROP DATABASE [${restoreDb}]`);
  await master.close();

  const tenantId = randomUUID();
  const businessId = randomUUID();
  const branchId = randomUUID();
  const accountId = randomUUID();
  const ownerRoleId = randomUUID();
  const username = 'pilot.owner';
  const password = 'Pilot!' + randomBytes(18).toString('base64url') + '9a';
  const hashed = await hashNewPassword(password);

  await pool
    .request()
    .input('t', sql.UniqueIdentifier, tenantId)
    .input('b', sql.UniqueIdentifier, businessId)
    .input('br', sql.UniqueIdentifier, branchId)
    .input('a', sql.UniqueIdentifier, accountId)
    .input('r', sql.UniqueIdentifier, ownerRoleId)
    .input('name', sql.NVarChar(80), username)
    .input('salt', sql.VarBinary(32), hashed.salt)
    .input('hash', sql.VarBinary(64), hashed.passwordHash)
    .query(`
      INSERT INTO core.Tenant(TenantId, DisplayName) VALUES(@t, N'DRVO Pilot Tenant');
      INSERT INTO core.Business(TenantId, BusinessId, DisplayName)
        VALUES(@t, @b, N'DRVO Pilot Salon');
      INSERT INTO core.Branch(TenantId, BusinessId, BranchId, DisplayName)
        VALUES(@t, @b, @br, N'Pilot Branch');
      INSERT INTO core.Account(TenantId, AccountId, Username) VALUES(@t, @a, @name);
      INSERT INTO core.AccountCredential
        (TenantId, AccountId, Salt, PasswordHash, PasswordAlgorithm, MustChangePassword)
        VALUES(@t, @a, @salt, @hash, 'scrypt-v1', 0);
      INSERT INTO core.BusinessRole(TenantId, BusinessId, RoleId, RoleCode, DisplayName)
        VALUES(@t, @b, @r, N'OWNER', N'Owner');
      INSERT INTO core.BusinessMembership(TenantId, BusinessId, AccountId) VALUES(@t, @b, @a);
      INSERT INTO core.BranchAssignment(TenantId, BusinessId, BranchId, AccountId)
        VALUES(@t, @b, @br, @a);
      INSERT INTO core.BranchRole(TenantId, BusinessId, BranchId, AccountId, RoleId)
        VALUES(@t, @b, @br, @a, @r);
    `);

  for (const action of PILOT_OWNER_MODULE_ACTIONS) {
    await pool
      .request()
      .input('t', sql.UniqueIdentifier, tenantId)
      .input('b', sql.UniqueIdentifier, businessId)
      .input('r', sql.UniqueIdentifier, ownerRoleId)
      .input('action', sql.VarChar(64), action)
      .query(
        `INSERT INTO core.RolePermission(TenantId, BusinessId, RoleId, ActionCode)
         VALUES(@t, @b, @r, @action)`
      );
  }

  fs.writeFileSync(
    ownerOnce,
    [
      'DRVO_ERP_PILOT synthetic Owner (NOT production / NOT PILOT_VERIFIED)',
      'url=https://erp-stage.drvotech.com/pilot',
      'sign_in=https://erp-stage.drvotech.com/sign-in',
      'username=' + username,
      'password=' + password,
      'businessId=' + businessId,
      'branchId=' + branchId,
      'workspace=/workspace/' + businessId + '/' + branchId + '/pos-preview',
      'adr031=BLOCKED',
      'cut_live_import=BLOCKED',
      '',
    ].join('\n'),
    {mode: 0o600, flag: 'wx'}
  );
  fs.chmodSync(ownerOnce, 0o600);

  await pool.close();
  process.stdout.write(
    JSON.stringify({
      ok: true,
      database: DB,
      migrationsTip: '042_booking_completed_pos_handoff.sql',
      migrationRows: applied.length,
      ownerUsername: username,
      ownerOnceFile: ownerOnce,
      productionVerificationClaimed: false,
      pilotVerified: false,
      adr031Posting: 'BLOCKED',
    }) + '\n'
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      'PILOT SQL ACTIVATE FAILED:',
      error instanceof Error ? error.message.slice(0, 400) : 'unknown'
    );
    process.exitCode = 1;
  });
}

module.exports = {main, DB};
