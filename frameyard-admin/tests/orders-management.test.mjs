import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/order.service.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url); const mod = { exports: {} }; const requests = [];
const payload = { range: 'Last 90 Days', generatedAt: '2026-11-08T00:00:00Z', summary: { totalRevenue: 0, orderCount: 0, averageOrderValue: 0 }, orders: [] };
const api = { get: async (url, config) => { requests.push({ url, config }); return { data: { data: url === '/orders/export' ? payload : { orders: [], pagination: { page: 1, total: 0 }, summary: {} } } }; } };
new Function('require', 'module', 'exports', output.outputText)(name => name === './api' ? { __esModule: true, default: api } : require(name), mod, mod.exports);
const { orderService } = mod.exports;
test('export sends every applied filter to the staff export endpoint without page limits', async () => {
  requests.length = 0;
  assert.equal(await orderService.getExportReport({ dateFilter: '90', status: 'PROCESSING', search: '  FY-9905  ' }), payload);
  assert.deepEqual(requests[0], { url: '/orders/export', config: { params: { dateFilter: '90', status: 'PROCESSING', search: 'FY-9905',refundStatus:undefined }, timeout: 60000 } });
  assert.equal(requests[0].config.params.page, undefined);
  assert.equal(requests[0].config.params.limit, undefined);
});
test('All Time/empty search remove restrictive search and status parameters', async () => {
  requests.length = 0;
  await orderService.getExportReport({ dateFilter: 'all', status: 'all', search: '   ' });
  assert.equal(requests[0].config.params.search, undefined);
  assert.equal(requests[0].config.params.status, undefined);
  assert.equal(requests[0].config.params.dateFilter, 'all');
});
test('table requests combine date, status, search and pagination on the backend', async () => {
  requests.length = 0;
  await orderService.getOrders({ page: 2, limit: 5, dateFilter: '7', status: 'PROCESSING', search: '89109' });
  assert.deepEqual(requests[0].config.params, { page: 2, limit: 5, dateFilter: '7', status: 'PROCESSING', search: '89109', userId: undefined,refundStatus:undefined });
});
test('summary icons replace dots and all date choices remain available', async () => {
  const page = await readFile(new URL('../src/pages/orders/OrdersPage.tsx', import.meta.url), 'utf8');
  for (const icon of ['Clock', 'Package', 'CheckCircle2', 'XCircle']) assert.ok(page.includes('<' + icon + ' className="h-4 w-4 text-secondary"'));
  assert.doesNotMatch(page, /h-1\.5 w-1\.5 rounded-full/);
  for (const label of ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'All Time', 'Today']) assert.ok(page.includes(label));
  assert.match(page, /}, 350\)/);
  assert.match(page, /No orders found for the selected filters/);
  assert.match(page, /setCurrentPage\(1\)/);
});
test('PDF export renders only server-filtered orders and server-calculated totals', async () => {
  const page = await readFile(new URL('../src/pages/orders/OrdersPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /orderService.getExportReport\(\{ search: debouncedSearchTerm, status: statusFilter, dateFilter,refundStatus:refundFilter \}\)/);
  assert.match(page, /orders: report.orders/);
  assert.match(page, /totalRevenue: report.summary.totalRevenue/);
  assert.match(page, /averageOrderValue: report.summary.averageOrderValue/);
  assert.match(page, /Please wait, your report is being generated/);
  assert.doesNotMatch(page, /orders\.map\(\(order\) => \[/);
});
