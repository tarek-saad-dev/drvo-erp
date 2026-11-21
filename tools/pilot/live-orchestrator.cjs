'use strict';
/**
 * Single Private Pilot delivery status probe.
 * Offline by default. Never claims PILOT_VERIFIED.
 * Against HTTPS staging: reports exact external blocker when Pilot is not live.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = process.env.DRVO_PILOT_ORIGIN || 'https://erp-stage.drvotech.com';

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function buildOfflinePackage() {
  const evidence = Object.freeze({
    activateSh: exists('ops/staging/pilot/activate-isolated-pilot-once.sh'),
    activateSql: exists('ops/staging/pilot/activate-pilot-sql.cjs'),
    flagApi: exists('ops/staging/pilot/40-k5-pilot-api.conf.example'),
    flagWeb: exists('ops/staging/pilot/40-k5-pilot-web.conf.example'),
    sqlDropin: exists('ops/staging/pilot/45-pilot-sql.conf.example'),
    migration040: exists('db/migrations/040_owner_pilot_module_permissions.sql'),
    pilotPage: exists('apps/web/src/app/pilot/page.tsx'),
    workstation: exists(
      'apps/web/src/components/cashier-pos/cashier-workstation-shell.tsx'
    ),
  });
  const missing = Object.entries(evidence)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  return Object.freeze({
    schema: 'drvo.pilot.live-orchestrator.v1',
    targetDatabase: 'DRVO_ERP_PILOT',
    stagingDatabaseUntouched: true,
    origin: ORIGIN,
    productionVerificationClaimed: false,
    pilotVerified: false,
    adr031Posting: 'BLOCKED',
    cutLiveImport: 'BLOCKED',
    evidence,
    missing,
    oneTimeOperatorAction: Object.freeze({
      required: true,
      host: 'VPS root TTY',
      commands: Object.freeze([
        'sudo -u drvoerp -H git -C /srv/drvo-erp/repo pull --ff-only origin main',
        'sudo bash /srv/drvo-erp/repo/ops/staging/pilot/activate-isolated-pilot-once.sh',
      ]),
      confirmPhrase: 'APPROVE CREATE DRVO_ERP_PILOT SYNTHETIC',
      after: 'Read /root/drvo-erp-pilot-owner.once for synthetic Owner credentials; open /pilot',
    }),
    status: missing.length ? 'BLOCKED_IN_REPO' : 'READY_FOR_ONE_TIME_ROOT_ACTIVATION',
  });
}

async function probeLive(origin = ORIGIN) {
  assert.notEqual(process.env.DRVO_PILOT_CLAIM_VERIFIED, 'YES');
  const report = {
    origin,
    pilotHttp: null,
    signInHttp: null,
    health: null,
    flagsLikelyOn: false,
    releaseShaHint: null,
    productionVerificationClaimed: false,
    pilotVerified: false,
  };
  try {
    const health = await fetch(origin + '/health', {
      signal: AbortSignal.timeout(15000),
    });
    report.health = {status: health.status, body: await health.text()};
  } catch (error) {
    report.health = {error: String(error && error.message ? error.message : error)};
  }
  try {
    const pilot = await fetch(origin + '/pilot', {
      signal: AbortSignal.timeout(20000),
    });
    const html = await pilot.text();
    report.pilotHttp = pilot.status;
    report.flagsLikelyOn =
      html.includes('جاهز للدخول') || html.includes('href="/sign-in"');
    report.flagsAllOff = html.includes('Private Pilot غير مفعّل');
  } catch (error) {
    report.pilotHttp = String(error && error.message ? error.message : error);
  }
  try {
    const signIn = await fetch(origin + '/sign-in', {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    report.signInHttp = signIn.status;
  } catch (error) {
    report.signInHttp = String(error && error.message ? error.message : error);
  }
  return Object.freeze(report);
}

async function main() {
  const offline = buildOfflinePackage();
  let live = null;
  if (process.env.DRVO_PILOT_PROBE_LIVE === 'YES') {
    live = await probeLive();
  }
  const out = Object.freeze({...offline, live});
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  if (offline.missing.length) process.exitCode = 1;
  if (
    live &&
    live.flagsAllOff &&
    process.env.DRVO_PILOT_REQUIRE_LIVE === 'YES'
  ) {
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {buildOfflinePackage, probeLive};
