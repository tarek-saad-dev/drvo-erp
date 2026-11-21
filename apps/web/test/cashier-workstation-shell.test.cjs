'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src');
const shell=fs.readFileSync(path.join(root,'components/cashier-pos/cashier-workstation-shell.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'components/cashier-pos/cashier-workstation.css'),'utf8');
const demoPos=fs.readFileSync(path.join(root,'app/demo/salon/salon-pos-workspace.tsx'),'utf8');
const demoClient=fs.readFileSync(path.join(root,'app/demo/salon/salon-demo-client.tsx'),'utf8');
const privatePos=fs.readFileSync(
 path.join(root,'app/workspace/[businessId]/[branchId]/pos-preview/pos-preview-client.tsx'),'utf8');

test('shared Cashier workstation shell is a 3-pane RTL Light layout',()=>{
 assert.match(shell,/data-cashier-pos="workstation-shell"/);
 assert.match(shell,/data-cashier-pos="pane-customer"/);
 assert.match(shell,/data-cashier-pos="pane-catalog"/);
 assert.match(shell,/data-cashier-pos="pane-invoice"/);
 assert.match(shell,/dir="rtl"/);
 assert.match(shell,/mode==="synthetic"/);
 assert.match(css,/grid-template-columns:\s*var\(--cashier-ws-rail\)/);
 assert.match(css,/@media \(min-width: 960px\)/);
});

test('public demo POS mounts the shared shell with synthetic mode',()=>{
 assert.match(demoPos,/CashierWorkstationShell/);
 assert.match(demoPos,/mode="synthetic"/);
 assert.match(demoClient,/data-demo-revision="cashier-workstation-shell-v1"/);
 assert.doesNotMatch(demoPos,/sd-pos-layout sd-pos-pro/);
 assert.doesNotMatch(demoPos,/fetch\(|\/api\/workspaces/);
});

test('private POS mounts the same shared shell with private mode',()=>{
 assert.match(privatePos,/CashierWorkstationShell/);
 assert.match(privatePos,/mode="private"/);
 assert.match(privatePos,/data-cashier-pos="private-workstation-v1"/);
 assert.match(privatePos,/CashierCatalogBrowser/);
 assert.match(privatePos,/CashierCartPanel/);
 assert.match(privatePos,/CashierBarberSelector/);
 assert.match(privatePos,/e\.key==="F9"/);
 assert.doesNotMatch(privatePos,/localStorage|DEMO_/);
});
