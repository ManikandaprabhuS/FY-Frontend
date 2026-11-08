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
for (const empty of [false, true]) {
  test('filtered order PDF: ' + (empty ? 'no matches' : 'one match with combined filters'), async () => {
    const orders = empty ? [] : [{ createdAt: '2026-11-01T10:00:00Z', orderNumber: 'FY-99053085', user: { name: 'Mahesh' }, orderStatus: 'PROCESSING', totalAmount: 1300 }];
    const doc = mod.exports.createRevenueReportPdf({
      range: empty ? 'Last 7 Days' : 'Last 90 Days | Status: PROCESSING | Search: FY-9905',
      generatedAt: new Date(2026, 10, 8, 14, 0), totalRevenue: empty ? 0 : 1300, paidActiveOrders: orders.length, averageOrderValue: empty ? 0 : 1300, orders,
      logo: new Uint8Array(await readFile(new URL('../src/assets/fy-logo-icon.jpeg', import.meta.url))),
    });
    assert.equal(doc.getNumberOfPages(), 1);
    const folder = new URL('../tmp/pdfs/', import.meta.url);
    await mkdir(folder, { recursive: true });
    await writeFile(new URL(empty ? 'orders-filtered-empty.pdf' : 'orders-filtered.pdf', folder), Buffer.from(doc.output('arraybuffer')));
  });
}
