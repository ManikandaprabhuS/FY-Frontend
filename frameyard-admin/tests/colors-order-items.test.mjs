import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function compile(path, overrides = {}) {
  const source = await readFile(new URL('../src/' + path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputText)(name => overrides[name] ?? require(name), mod, mod.exports);
  return mod.exports;
}
const colors = [{ name: 'Black', hex: '#000000' }, { name: 'White', hex: '#FFFFFF' }];
const legacy = [{ name: 'Dark Walnut', hex: '#4A3728' }];
const colorModule = await compile('store/frameColorStore.ts', { '../services/api': { default: { get: async () => ({ data: { data: { colors, legacyColors: legacy } } }) }, __esModule: true } });
colorModule.useFrameColorStore.setState({ colors, legacyColors: legacy, loaded: true });
const picker = await compile('components/ui/ProductColorPicker.tsx', {
  '../../store/frameColorStore': { ...colorModule, useFrameColors: () => colorModule.useFrameColorStore.getState() }, '../../services/api': { getApiErrorMessage: () => '' },
  './Modal': { default: () => null, __esModule: true }, './FormAction': { default: () => null, __esModule: true },
  '../../utils/toast': { showLoading: () => {}, showSuccess: () => {}, showApiError: () => {}, dismissToast: () => {} },
});
test('fresh product has only Black and White default swatches and no preselection', () => {
  const html = renderToStaticMarkup(createElement(picker.default, { selected: [], onChange: () => {}, busy: false, onBusyChange: () => {} }));
  assert.match(html, /aria-label="Black"/); assert.match(html, /aria-label="White"/);
  assert.doesNotMatch(html, /Dark Walnut/); assert.doesNotMatch(html, /aria-pressed="true"/);
  assert.match(html, /Add colour/);
});
test('existing product colours remain selected with their legacy names', () => {
  const html = renderToStaticMarkup(createElement(picker.default, { selected: ['#4a3728'], onChange: () => {}, busy: false, onBusyChange: () => {} }));
  assert.match(html, /Dark Walnut/); assert.match(html, /aria-pressed="true"/);
});
test('custom names and hexes resolve from the shared catalogue', () => {
  const custom = { name: 'Ocean Blue', hex: '#123ABC' };
  assert.deepEqual(colorModule.resolveColorOption('#123abc', [...colors, custom], legacy), custom);
  assert.deepEqual(colorModule.resolveColorOption('ocean blue', [...colors, custom], legacy), custom);
});
test('order item views show snapshots, a swatch and safe dashes', async () => {
  const view = await compile('components/orders/OrderItemOptions.tsx');
  const html = renderToStaticMarkup(createElement(view.default, { item: { productId: 'product-123', frameSize: '5 X 5', colorName: 'Ocean Blue', colorHex: '#123ABC', material: 'Anodized Aluminum' } }));
  for (const value of ['product-123', '5 X 5', 'Ocean Blue', 'Anodized Aluminum', 'background-color:#123ABC']) assert.ok(html.includes(value));
  const missing = renderToStaticMarkup(createElement(view.default, { item: { frameSize: 'Not specified' } }));
  assert.doesNotMatch(missing, /Not specified|undefined|null/);
  const unsafe = renderToStaticMarkup(createElement(view.default, { item: { colorName: '<script>alert(1)</script>' } }));
  assert.doesNotMatch(unsafe, /<script>/);
});
test('different colours remain separate cart lines without changing unit prices', async () => {
  const storeModule = await compile('store/customerCommerceStore.ts', { '../services/customer-wishlist.service': { customerWishlistService: {} } });
  const store = storeModule.useCustomerCommerceStore;
  const item = { productId: 'product', variantId: 'variant', name: 'Frame', material: 'Wood', frameSize: '5 X 5', mountType: 'NONE', glassType: 'NONE', unitPrice: 650, quantity: 1, stockQuantity: 10 };
  store.getState().addCartItem({ ...item, color: '#000000', colorName: 'Black', colorHex: '#000000' });
  store.getState().addCartItem({ ...item, color: '#FFFFFF', colorName: 'White', colorHex: '#FFFFFF' });
  assert.equal(store.getState().cartItems.length, 2);
  assert.deepEqual(store.getState().cartItems.map(value => value.unitPrice), [650, 650]);
});
test('product forms share one picker and keep optional image controls', async () => {
  const source = await readFile(new URL('../src/pages/products/ProductDetailsPage.tsx', import.meta.url), 'utf8');
  assert.equal((source.match(/<ProductColorPicker/g) ?? []).length, 2);
  assert.doesNotMatch(source, /setColors\(\['#0f172a'/);
  assert.match(source, /OptionalImageUpload/);
  const checkout = await readFile(new URL('../src/features/customer/pages/CheckoutPage.tsx', import.meta.url), 'utf8');
  assert.match(checkout, /Checkout will continue through the existing order flow/);
});
