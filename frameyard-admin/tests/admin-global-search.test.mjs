import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function compile(path, overrides) {
  const source = await readFile(new URL('../src/' + path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const mod = { exports: {} }; new Function('require', 'module', 'exports', output.outputText)(name => overrides[name] ?? require(name), mod, mod.exports); return mod.exports;
}
const requests = [];
const api = { get: async (url, config) => { requests.push({ url, config }); return { data: { data: {} } }; } };
const service = await compile('services/admin-search.service.ts', { './api': { default: api, __esModule: true } });
const order = { id: 'order-id', orderNumber: 'FY-99053085', status: 'SHIPPED', user: { name: 'Mahesh' } };
const customer = { id: 'customer-id', name: 'Mahesh', email: 'mahesh@example.com', phoneNumber: '8910943111' };
const data = { query: 'Mahesh', kind: 'text', orders: [order], customers: [customer], counts: { orders: 1, customers: 1 } };
test('single order routes to Orders with an exact search and popup ID', () => {
  const path = service.adminSearchPath({ ...data, kind: 'order', customers: [], counts: { orders: 1, customers: 0 } });
  const url = new URL(path, 'http://local'); assert.equal(url.pathname, '/admin/orders'); assert.equal(url.searchParams.get('search'), order.orderNumber); assert.equal(url.searchParams.get('openOrder'), order.id);
});
test('phone routes to customer details for one match and filtered list for many', () => {
  const phone = { ...data, kind: 'phone', query: '8910943111', orders: [], counts: { orders: 0, customers: 1 } };
  assert.equal(new URL(service.adminSearchPath(phone), 'http://local').pathname, '/admin/customers/customer-id');
  const url = new URL(service.adminSearchPath({ ...phone, counts: { orders: 0, customers: 2 } }), 'http://local');
  assert.equal(url.pathname, '/admin/customers'); assert.equal(url.searchParams.get('search'), '8910943111');
});
test('both groups wait for a choice and no matches never invent a destination', () => {
  assert.equal(service.adminSearchPath(data), null);
  assert.equal(service.adminSearchPath({ ...data, orders: [], customers: [], counts: { orders: 0, customers: 0 } }), null);
  assert.match(service.adminSearchPath(data, { kind: 'customer', value: customer }), /^\/admin\/customers\/customer-id/);
});
test('one backend search request sends trimmed q and a bounded timeout', async () => {
  requests.length = 0; const controller = new AbortController();
  await service.adminSearch('  FY-99053085  ', controller.signal);
  assert.deepEqual(requests[0], { url: '/admin/search', config: { params: { q: 'FY-99053085' }, signal: controller.signal, timeout: 15000 } });
});
async function searchTree(result) {
  let state = 0; let ref = 0; const routes = []; const warnings = [];
  const values = ['Mahesh', true, false, -1, { query: 'Mahesh', data: result }, false];
  const react = { ...require('react'), useState: () => [values[state++], () => {}], useEffect: () => {}, useId: () => 'test-search', useRef: initial => ({ current: ref++ === 1 ? { value: 'Mahesh' } : initial }) };
  const component = await compile('components/admin/GlobalAdminSearch.tsx', {
    react, 'react-router-dom': { useNavigate: () => path => routes.push(path) },
    '../../services/admin-search.service': { ...service, adminSearch: async () => result },
    '../../utils/toast': { showWarning: (message, options) => warnings.push({ message, options }), showApiError: () => {} },
  });
  return { tree: component.default({}), routes, warnings };
}
function findAll(node, predicate) { if (!node || typeof node !== 'object') return []; const children = node.props?.children; return [...(predicate(node) ? [node] : []), ...[children].flat(Infinity).flatMap(child => findAll(child, predicate))]; }
test('live results render readable Orders/Customers groups with details and icons', async () => {
  const { tree } = await searchTree(data); const html = renderToStaticMarkup(tree);
  for (const text of ['Orders', 'Customers', 'FY-99053085', 'Mahesh', '8910943111']) assert.ok(html.includes(text));
  assert.equal(findAll(tree, node => node.props?.role === 'option').length, 2);
});
test('clicking each grouped result navigates to its correct section', async () => {
  const one = await searchTree(data); findAll(one.tree, node => node.props?.role === 'option')[0].props.onClick(); assert.match(one.routes[0], /^\/admin\/orders\?/);
  const two = await searchTree(data); findAll(two.tree, node => node.props?.role === 'option')[1].props.onClick(); assert.match(two.routes[0], /^\/admin\/customers\/customer-id/);
});
test('no-match Enter shows one warning and stays on the current page', async () => {
  const result = await searchTree({ ...data, orders: [], customers: [], counts: { orders: 0, customers: 0 } });
  findAll(result.tree, node => node.type === 'input')[0].props.onKeyDown({ key: 'Enter', preventDefault: () => {} });
  await Promise.resolve();
  assert.equal(result.routes.length, 0); assert.equal(result.warnings.length, 1); assert.equal(result.warnings[0].message, "No orders or customers found for 'Mahesh'");
});
test('header keeps bell/profile/logout but removes help and sidebar avatars', async () => {
  const source = await readFile(new URL('../src/layouts/AdminLayout.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /HelpCircle|isLikelyOrderNumber|window.alert|customerService/);
  const asides = source.slice(source.indexOf('<aside'), source.indexOf('MAIN VIEWPORT WRAPPER'));
  assert.doesNotMatch(asides, /avatarInitial/); assert.equal((source.match(/\{avatarInitial\}/g) ?? []).length, 1);
  assert.match(source, /Account menu/); assert.match(source, /role="menuitem" to="\/admin\/profile"/); assert.match(source, /<Bell/); assert.match(source, /handleLogout/);
  assert.equal((source.match(/<GlobalAdminSearch/g) ?? []).length, 2);
});
test('shared URLs reopen order results and do not hide normalized customer matches', async () => {
  const orders = await readFile(new URL('../src/pages/orders/OrdersPage.tsx', import.meta.url), 'utf8');
  assert.match(orders, /get\('openOrder'\)/); assert.match(orders, /setDetailsModalOpen\(true\)/);
  const customers = await readFile(new URL('../src/pages/customers/CustomersPage.tsx', import.meta.url), 'utf8');
  assert.match(customers, /fetchCustomers\(currentPage, PAGE_SIZE, debouncedSearch\)/);
  assert.match(customers, /const filteredCustomers = customers;/);
});
