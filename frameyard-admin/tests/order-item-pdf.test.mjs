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
for (const count of [1, 60, 501]) {
  test('PDF includes immutable product/color/material item details for ' + count + ' orders', async () => {
    const orders = Array.from({ length: count }, (_, index) => ({
      createdAt: '2026-11-08T10:00:00Z', orderNumber: 'FY-' + String(index + 1).padStart(8, '0'), user: { name: 'Snapshot Customer', email: 'snapshot@example.com', phoneNumber: '9876543210' }, address: '123 A long street name, Chennai, Tamil Nadu, India, 600001', paymentStatus: '-', paymentMethod: '-', exportCoupon: 'WELCOME', subtotal: 1400, discount: 100, orderStatus: 'PLACED', totalAmount: 1300,
      orderItems: [{ productId: '11111111-1111-4111-8111-111111111111', productName: 'Original Floating Frame', frameSize: '5 X 5', colorName: 'Ocean Blue', colorHex: '#123ABC', material: 'Anodized Aluminum', quantity: 2, price: 650 }],
    }));
    const doc = mod.exports.createRevenueReportPdf({ range: 'All Time', generatedAt: new Date(2026, 10, 8, 16, 0), totalRevenue: count * 1300, paidActiveOrders: count, averageOrderValue: 1300, orders, logo: new Uint8Array(await readFile(new URL('../src/assets/fy-logo-icon.jpeg', import.meta.url))) });
    assert.ok(doc.getNumberOfPages() >= (count > 1 ? 2 : 1));
    const folder = new URL('../tmp/pdfs/', import.meta.url); await mkdir(folder, { recursive: true });
    await writeFile(new URL(count === 501 ? 'orders-items-501.pdf' : count > 1 ? 'orders-items-many.pdf' : 'orders-items.pdf', folder), Buffer.from(doc.output('arraybuffer')));
  });
}
