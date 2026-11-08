import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { safeAuthReturnPath } from '../src/utils/auth-return-path.ts';
const require = createRequire(import.meta.url);
async function compile(path, overrides = {}) {
  const source = await readFile(new URL('../src/' + path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputText)(name => overrides[name] ?? require(name), mod, mod.exports);
  return mod.exports;
}
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const admin = { id: 'admin', role: 'ADMIN', name: 'Admin' };
const customer = { id: 'customer', role: 'CUSTOMER', name: 'Customer' };
async function setup(token = 'stored-token', implementation = async () => admin) {
  globalThis.sessionStorage = storage(); globalThis.localStorage = storage();
  if (token) sessionStorage.setItem('fy_auth_token', token);
  const warnings = []; const errors = []; const owners = []; const calls = [];
  let me = implementation;
  const service = { me: async () => { calls.push('me'); return me(); }, logout: async () => {}, login: async () => ({ user: admin, accessToken: 'new-login-token' }) };
  const compiled = await compile('store/authStore.ts', {
    '../utils/toast': { showApiError: () => {}, showError: (message, options) => errors.push({ message, options }), showWarning: (message, options) => warnings.push({ message, options }), dismissToast: () => {} },
    '../services/auth.service': { authService: service },
    './customerCommerceStore': { useCustomerCommerceStore: { getState: () => ({ setCartOwner: (...args) => owners.push(args) }) } },
  });
  return { store: compiled.useAuthStore, warnings, errors, owners, calls, changeMe: value => { me = value; } };
}
test('auth starts checking synchronously, with a stored token but no trusted role', async () => {
  const { store } = await setup();
  assert.equal(store.getState().status, 'checking'); assert.equal(store.getState().token, 'stored-token');
  assert.equal(store.getState().user, null); assert.equal(store.getState().authChecked, false);
});
test('a tokenless start also checks first, then becomes unauthenticated without an API call', async () => {
  const { store, calls } = await setup(null);
  assert.equal(store.getState().status, 'checking'); await store.getState().checkAuth();
  assert.equal(store.getState().status, 'unauthenticated'); assert.deepEqual(calls, []);
});
test('slow restoration stays checking and deduplicates StrictMode/guard requests', async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const { store, calls } = await setup('stored-token', () => pending);
  const first = store.getState().checkAuth(); const second = store.getState().checkAuth();
  await Promise.resolve(); assert.equal(store.getState().status, 'checking'); assert.equal(calls.length, 1);
  finish(admin); await Promise.all([first, second]);
  assert.equal(store.getState().status, 'authenticated'); assert.equal(store.getState().user.role, 'ADMIN');
});
test('an invalid/expired token clears the session and shows one warning', async () => {
  const { store, warnings, calls, owners } = await setup('expired', async () => { throw { isAxiosError: true, response: { status: 401 } }; });
  await Promise.all([store.getState().checkAuth(), store.getState().checkAuth()]); await store.getState().checkAuth();
  assert.equal(store.getState().status, 'unauthenticated'); assert.equal(sessionStorage.getItem('fy_auth_token'), null);
  assert.equal(warnings.length, 1); assert.equal(warnings[0].message, 'Your session expired. Please login again.'); assert.equal(calls.length, 1); assert.deepEqual(owners, [[null]]);
});
for (const failure of [{ isAxiosError: true }, { isAxiosError: true, code: 'ECONNABORTED' }, { isAxiosError: true, response: { status: 500 } }, { isAxiosError: true, response: { status: 503 } }]) {
  test('temporary verification failure preserves the token and supports retry: ' + JSON.stringify(failure), async () => {
    const { store, errors, owners } = await setup('valid-token', async () => { throw failure; });
    await store.getState().checkAuth();
    assert.equal(sessionStorage.getItem('fy_auth_token'), 'valid-token'); assert.equal(store.getState().status, 'checking');
    assert.ok(store.getState().verificationError); assert.deepEqual(owners, []); assert.equal(errors.length, 1); assert.equal(typeof errors[0].options.retry, 'function');
    store.setState({ verificationError: null });
  });
}
test('retry recovers the current URL session without a forced logout', async () => {
  const fixture = await setup('valid-token', async () => { throw { isAxiosError: true }; });
  await fixture.store.getState().checkAuth(); fixture.changeMe(async () => customer);
  fixture.errors[0].options.retry(); await fixture.store.getState().checkAuth();
  assert.equal(fixture.store.getState().status, 'authenticated'); assert.equal(fixture.store.getState().user.id, 'customer');
  assert.equal(sessionStorage.getItem('fy_auth_token'), 'valid-token');
});
test('a late session check cannot resurrect a logged-out account', async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const { store } = await setup('old-token', () => pending);
  const checking = store.getState().checkAuth(); await store.getState().logout(); finish(admin); await checking;
  assert.equal(store.getState().status, 'unauthenticated'); assert.equal(store.getState().user, null);
});
test('a late session check cannot overwrite a new login', async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const { store } = await setup('old-token', () => pending);
  const checking = store.getState().checkAuth(); await store.getState().login('admin@example.test', 'test-only-password');
  finish(customer); await checking;
  assert.equal(store.getState().status, 'authenticated'); assert.equal(store.getState().user.role, 'ADMIN'); assert.equal(store.getState().token, 'new-login-token');
});
const pendingComponent = () => createElement('div', { 'data-auth-pending': true });
const routeError = () => createElement('div', { 'data-forbidden': true });
const Navigate = props => createElement('div', { 'data-redirect': props.to, 'data-replace': props.replace });
const outlet = () => createElement('div', { 'data-protected': true });
async function guard(path, state) {
  return compile(path, {
    '../store/authStore': { useAuthStore: selector => selector ? selector(state) : state },
    'react-router-dom': { Navigate, Outlet: outlet, useLocation: () => ({ pathname: '/admin/orders', search: '?search=FY-1', hash: '#item' }) },
    '../components/auth/AuthPendingScreen': { default: pendingComponent, __esModule: true },
    '../pages/errors/RouteErrorPage': { default: routeError, __esModule: true },
  });
}
test('admin/customer guards never render login or protected content while checking', async () => {
  for (const path of ['layouts/ProtectedRoute.tsx', 'layouts/CustomerProtectedRoute.tsx']) {
    const mod = await guard(path, { status: 'checking', user: null, verificationError: null, checkAuth: async () => {} });
    const html = renderToStaticMarkup(createElement(mod.default, { children: 'PRIVATE CUSTOMER CONTENT' }));
    assert.match(html, /data-auth-pending/); assert.doesNotMatch(html, /data-redirect|data-protected|PRIVATE CUSTOMER CONTENT/);
  }
});
test('unauthenticated guard uses replace and preserves the full original URL', async () => {
  const mod = await guard('layouts/ProtectedRoute.tsx', { status: 'unauthenticated', user: null });
  const result = mod.default(); assert.equal(result.type, Navigate); assert.equal(result.props.replace, true);
  assert.equal(result.props.to, '/fyadminlogin'); assert.equal(result.props.state.returnTo, '/admin/orders?search=FY-1#item');
});
test('verified staff see protected content only after the role is available', async () => {
  for (const role of ['ADMIN', 'EMPLOYEE']) {
    const mod = await guard('layouts/ProtectedRoute.tsx', { status: 'authenticated', user: { role } });
    assert.match(renderToStaticMarkup(createElement(mod.default)), /data-protected/);
  }
});
test('admin login renders no form while checking or already authenticated', async () => {
  let session = { status: 'checking', user: null, loading: false, error: null, verificationError: null, checkAuth: async () => {}, clearError: () => {}, login: async () => true };
  const page = await compile('pages/auth/LoginPage.tsx', {
    '../../hooks/useAuth': { default: () => session, __esModule: true },
    '../../components/auth/AuthPendingScreen': { default: pendingComponent, __esModule: true },
    '../../utils/auth-return-path': { safeAuthReturnPath }, '../../assets/fy-logo-icon.jpeg': { default: 'logo.jpeg', __esModule: true },
    '../../utils/toast': { showSuccess: () => {}, showWarning: () => {} },
    'react-router-dom': { Navigate, Link: props => createElement('a', { href: props.to }, props.children), useLocation: () => ({ state: { returnTo: '/admin/orders?search=FY-1' } }) },
  });
  assert.match(renderToStaticMarkup(createElement(page.default)), /data-auth-pending/);
  session = { ...session, status: 'authenticated', user: admin };
  const html = renderToStaticMarkup(createElement(page.default)); assert.match(html, /data-redirect/); assert.doesNotMatch(html, /<form/);
  session = { ...session, status: 'unauthenticated', user: null };
  assert.match(renderToStaticMarkup(createElement(page.default)), /<form/);
});
test('neutral loader delays its visual spinner for 150ms', async () => {
  let visible = false; let effect; let timer; const previous = globalThis.window;
  globalThis.window = { setTimeout: (callback, delay) => { timer = { callback, delay }; return 1; }, clearTimeout: () => {} };
  try {
    const component = await compile('components/auth/AuthPendingScreen.tsx', { react: { ...require('react'), useState: () => [visible, value => { visible = value; }], useEffect: callback => { effect = callback; } } });
    const initial = component.default({}); const cleanup = effect(); assert.equal(timer.delay, 150); assert.doesNotMatch(renderToStaticMarkup(initial), /<svg/);
    timer.callback(); assert.match(renderToStaticMarkup(component.default({})), /<svg/); cleanup();
  } finally { globalThis.window = previous; }
});
test('return paths retain query/hash but reject external, wrong-portal and looping paths', () => {
  assert.equal(safeAuthReturnPath('/admin/orders?search=FY-1#item', 'admin'), '/admin/orders?search=FY-1#item');
  assert.equal(safeAuthReturnPath('/checkout?from=cart#address', 'customer'), '/checkout?from=cart#address');
  for (const value of ['https://evil.test', '//evil.test', '/admin/../fyadminlogin', '/admin/%2e%2e/fyadminlogin', '/fyadminlogin', '/admin/\\evil']) assert.equal(safeAuthReturnPath(value, 'admin'), '/admin/overview');
  assert.equal(safeAuthReturnPath('/%61dmin/orders', 'customer'), '/profile');
});
test('public routes remain ungated, protected customer routes wait, and HTML has no login markup', async () => {
  const routes = await readFile(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');
  assert.match(routes, /path: '\/', element: <CustomerHomePage/); assert.match(routes, /path: '\/products', element: <CustomerProductsPage/);
  assert.match(routes, /path: '\/orders', element: <CustomerProtectedRoute>/); assert.match(routes, /path: '\/checkout', element: <CustomerProtectedRoute>/);
  assert.match(routes, /const LazyFallback = <AuthPendingScreen/);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8'); assert.match(html, /<div id="root"><\/div>/); assert.doesNotMatch(html, /<form/);
});
