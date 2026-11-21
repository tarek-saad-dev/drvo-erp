'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const webSrc = path.resolve(__dirname, '../src/app');
const pilot = fs.readFileSync(path.join(webSrc, 'pilot/page.tsx'), 'utf8');
const home = fs.readFileSync(path.join(webSrc, 'page.tsx'), 'utf8');

test('Private Pilot entry never exposes anonymous DB or APIs', () => {
  assert.match(pilot, /data-pilot-entry="private-p0"/);
  assert.match(pilot, /DRVO_K5_WEB_ENABLED/);
  assert.match(pilot, /href="\/sign-in"/);
  assert.match(pilot, /\/demo\/salon/);
  assert.match(pilot, /SYNTHETIC|محاكاة|صناعي/);
  assert.match(pilot, /ADR-031/);
  assert.doesNotMatch(pilot, /fetch\(|\/api\/workspaces|localStorage|DEMO_/);
  assert.doesNotMatch(pilot, /DRVO_SQL_|connectionString/);
});

test('home prioritizes Private Pilot over synthetic demo', () => {
  assert.match(home, /href="\/pilot"/);
  assert.match(home, /Demo صناعي|demo\/salon/);
  assert.match(home, /PRIVATE PILOT/);
  const pilotIdx = home.indexOf('href="/pilot"');
  const demoIdx = home.indexOf('href="/demo/salon"');
  assert.ok(pilotIdx >= 0 && demoIdx >= 0 && pilotIdx < demoIdx);
});
