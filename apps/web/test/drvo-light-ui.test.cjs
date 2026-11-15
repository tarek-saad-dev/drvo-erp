'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = path.join(__dirname, '../src/app');
const get = (p) => fs.readFileSync(path.join(app, p), 'utf8');

test('Light V1 is the sole initial presentation mode with centralized ADR-024 palette', () => {
  const layout = get('layout.tsx');
  const light = get('drvo-light.css');
  assert.match(layout, /import "\.\/globals\.css";\s*import "\.\/drvo-light\.css";/);
  for(const hex of ['#74536e','#553e53','#1a7b80','#f7f6f8','#ffffff','#27242b']) {
    const normalized = light.toLowerCase();
    assert.ok(normalized.includes(hex === '#ffffff' ? '#fff' : hex), 'missing token '+hex);
  }
  assert.match(light,/color-scheme:\s*light/);
  assert.doesNotMatch(light,/prefers-color-scheme:\s*dark|\.dark\s*\{/);
});
test('synthetic Cashier-like salon experience consumes a later light CSS layer', () => {
  const page = get('demo/salon/page.tsx');
  const css = get('demo/salon/salon-demo-light.css');
  const client = get('demo/salon/salon-demo-client.tsx');
  assert.match(client,/data-drvo-ui="light-v1"/);
  assert.match(page,/import "\.\/salon-demo\.css";\s*import "\.\/salon-demo-light\.css";/);
  assert.match(css,/\.sd-sidebar/);
  assert.match(css,/\.sd-pos-layout|\.sd-service-card/);
  assert.match(css,/\.sd-book-form/);
  assert.match(css,/\.sd-nav-btn\.sd-selected/);
  assert.match(css,/\.sd-status-confirmed/);
  assert.match(css,/\.sd-status-completed/);
  assert.match(css,/\.sd-status-cancelled/);
  assert.match(css,/color-scheme:light/);
  assert.doesNotMatch(css,/fetch\s*\(|localStorage|sessionStorage/);
});
test('branch app launcher links remain derived from existing K5-authorized API checks', () => {
  const page = get('workspace/[businessId]/[branchId]/workspace-home-client.tsx');
  assert.match(page,/className="k5-admin-card drvo-launcher"/);
  assert.match(page,/setCanViewHr\(hrResult\.ok\)/);
  assert.match(page,/setCanViewReports\(reportResult\.ok\)/);
  assert.match(page,/salonWebEnabled&&canViewBooking/);
  assert.match(page,/canPreviewPos &&/);
  assert.match(page,/canManageMembers &&/);
  assert.doesNotMatch(page,/\/treasury\/|\/expenses\/|\/payroll\//);
});
test('new DRVO brand mark is served locally, no remote SVG / injected JS', () => {
  const svg=fs.readFileSync(path.join(__dirname,'../public/brand/drvo-mark.svg'),'utf8');
  const approved=fs.readFileSync(path.join(__dirname,'../../../assets/brand/approved/drvo-symbol-primary.svg'),'utf8');
  assert.equal(svg,approved,'published mark must match the approved ADR-038 SVG exactly');
  assert.match(svg,/<svg\s/);
  assert.match(svg,/#74536E/i);
  assert.match(svg,/#1A7B80/i);
  assert.doesNotMatch(svg,/<script|https?:\/\/[^"']+\.(png|jpg|js)|onload=/i);
});
