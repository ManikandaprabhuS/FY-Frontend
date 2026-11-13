import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as statuses from '../src/components/ui/order-status.ts';

const source = await readFile(new URL('../src/utils/revenue-report-pdf.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url); const mod = { exports: {} };
new Function('require', 'module', 'exports', output.outputText)(name => name === '../components/ui/order-status' ? statuses : require(name), mod, mod.exports);
const { createRevenueReportPdf, formatReportAmount, formatReportDate } = mod.exports;
test('amounts and dates have consistent report formatting', () => {
  assert.equal(formatReportAmount(1300), 'INR 1,300.00');
  assert.equal(formatReportAmount(123456.5), 'INR 1,23,456.50');
  assert.equal(formatReportDate(new Date(2026, 6, 3)), '03/07/2026');
});
for (const [count, range, filename] of [
  [0, 'This Month', 'revenue-empty.pdf'],
  [4, 'This Month', 'revenue-four.pdf'],
  [65, 'This Year', 'revenue-many.pdf'],
  [65, '01/06/2026 - 31/07/2026', 'revenue-custom.pdf'],
]) {
  test('table PDF handles ' + count + ' rows for ' + range, async () => {
    const orders = Array.from({ length: count }, (_, index) => ({
      createdAt: '2026-07-03T10:00:00.000Z', orderNumber: 'FY-' + String(index + 1).padStart(8, '0'),
      user: { name: index % 4 === 0 ? 'A very long customer name that wraps safely within its fixed table column without overlapping the status or amount' : 'Customer ' + (index + 1) },
      orderStatus: statuses.orderStatusValues[index % statuses.orderStatusValues.length], totalAmount: 1300,
    }));
    const logo = new Uint8Array(await readFile(new URL('../src/assets/fy-logo-icon.jpeg', import.meta.url)));
    const doc = createRevenueReportPdf({ range, generatedAt: new Date(2026, 10, 8, 12, 30), totalRevenue: count * 1300, paidActiveOrders: count, averageOrderValue: count ? 1300 : 0, orders, logo });
    if (count >= 50) assert.ok(doc.getNumberOfPages() > 1);
    else assert.equal(doc.getNumberOfPages(), 1);
    assert.equal(orders.length, count);
    const folder = new URL('../tmp/pdfs/', import.meta.url);
    await mkdir(folder, { recursive: true });
    await writeFile(new URL(filename, folder), Buffer.from(doc.output('arraybuffer')));
  });
}
test('export keeps the existing range/revenue expressions and does not truncate rows', async () => {
  const code = await readFile(new URL('../src/pages/overview/OverviewPage.tsx', import.meta.url), 'utf8');
  assert.match(code, /range: reportDateRange.label/);
  assert.match(code, /totalRevenue: fresh.summary.totalRevenue/);
  assert.match(code, /averageOrderValue: fresh.summary.averageOrderValue/);
  assert.match(code, /orders: fresh.orders/);
  assert.doesNotMatch(code, /slice\(0, 28\)|%PDF-1.4|escapePdfText/);
  assert.match(code, /Please wait, your report is being generated/);
});
