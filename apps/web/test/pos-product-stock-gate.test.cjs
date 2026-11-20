'use strict';
/**
 * POS-05: PRODUCT catalog uses SQL027 stock overlay to disable OUT items (nonposting draft only).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scope = path.resolve(
  __dirname,
  '../src/app/workspace/[businessId]/[branchId]/pos-preview'
);
const read = (name) => fs.readFileSync(path.join(scope, name), 'utf8');

test('catalog browser disables OUT products and labels SQL027 stock', () => {
  const ui = read('cashier-catalog-browser.tsx');
  assert.match(ui, /ProductStockHint/);
  assert.match(ui, /stockStatus==="OUT"/);
  assert.match(ui, /disabled=\{disabled\|\|!!outOfStock\}/);
  assert.match(ui, /data-product-stock/);
  assert.match(ui, /data-stock-status/);
  assert.doesNotMatch(ui, /decrement|GlPost|POSTED|whatsapp\.send/i);
});

test('POS client loads inventory workspace for product stock overlay', () => {
  const ui = read('pos-preview-client.tsx');
  assert.match(ui, /\/inventory"/);
  assert.match(ui, /setProductStock/);
  assert.match(ui, /productStock=\{productStock\}/);
  assert.match(ui, /stockStatus/);
  assert.doesNotMatch(ui, /CreateStockAdjust|CancelStockReceive|sale\.post/i);
});
