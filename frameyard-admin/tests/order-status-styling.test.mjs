import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as statusHelpers from '../src/components/ui/order-status.ts';

const source = await readFile(new URL('../src/components/ui/StatusBadge.tsx', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
const require = createRequire(import.meta.url); const mod = { exports: {} };
new Function('require', 'module', 'exports', output.outputText)(name => name === './order-status' ? statusHelpers : name.endsWith('.css') ? {} : require(name), mod, mod.exports);
const { default: StatusBadge, OrderStatusFilter } = mod.exports;

test('status spelling and separators normalize case-insensitively', () => {
  for (const status of ['ready_to_ship', 'Ready To Ship', 'READY TO SHIP', ' ready-to-ship ']) {
    assert.equal(statusHelpers.normalizeOrderStatus(status), 'READY_TO_SHIP');
    assert.deepEqual(statusHelpers.getOrderStatusStyle(status), statusHelpers.orderStatusStyles.READY_TO_SHIP);
  }
});
for (const [status, background, color] of [
  ['PLACED', '#111827', '#ffffff'], ['PROCESSING', '#ffffff', '#2563eb'],
  ['READY_TO_SHIP', '#ffffff', '#111827'], ['SHIPPED', '#dcfce7', '#15803d'],
  ['DELIVERED', '#16a34a', '#ffffff'], ['CANCELLED', '#fee2e2', '#dc2626'],
  ['CONFIRMED', '#e5e7eb', '#374151'], ['NEW_UNKNOWN', '#e5e7eb', '#374151'],
]) {
  test(status + ' renders the requested readable pill colors', () => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { status }));
    assert.match(html, new RegExp('background-color:' + background));
    assert.match(html, new RegExp('color:' + color));
    assert.match(html, /font-bold/); assert.match(html, /rounded-full/);
    assert.ok(html.includes(status.replaceAll('_', ' ')));
  });
}
test('status select retains every original API value and readable white options', () => {
  let selected;
  const select = StatusBadge({ status: 'PROCESSING', onStatusChange: value => { selected = value; } });
  select.props.onChange({ target: { value: 'SHIPPED' } });
  assert.equal(selected, 'SHIPPED');
  const html = renderToStaticMarkup(select);
  assert.match(html, /color-scheme:light/);
  for (const value of statusHelpers.orderStatusValues) assert.ok(html.includes('value="' + value + '"'));
  assert.equal((html.match(/<option[^>]*background-color:#ffffff;color:#111827/g) ?? []).length, 7);
});
test('All Statuses filter uses light scheme and readable options', () => {
  const html = renderToStaticMarkup(createElement(OrderStatusFilter, { value: 'all', onChange: () => {} }));
  assert.match(html, /All Statuses/); assert.match(html, /color-scheme:light/);
  assert.equal((html.match(/<option[^>]*background-color:#ffffff;color:#111827/g) ?? []).length, 8);
});
test('admin table/mobile/details, overview and customer history share StatusBadge', async () => {
  for (const file of ['pages/orders/OrdersPage.tsx', 'pages/overview/OverviewPage.tsx', 'features/customer/components/CustomerAccountDashboard.tsx']) {
    const text = await readFile(new URL('../src/' + file, import.meta.url), 'utf8');
    assert.match(text, /<StatusBadge/);
    assert.doesNotMatch(text, /getDropdownStyles|const statusStyle:|getOrderStatusBadge/);
  }
});
